import path from "path";
import fs from "fs/promises";
import { EventEmitter } from "events";
import makeWASocket, {
  Browsers,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  type WASocket,
  type AnyMessageContent,
  type proto,
} from "@whiskeysockets/baileys";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { prisma } from "../../config/prisma";
import { redisPub } from "../../config/redis";
import type { IWhatsappAdapter, OutboundMessage } from "./adapter";

type Status = "pending" | "qr" | "connecting" | "connected" | "disconnected" | "error";

type SessionEntry = {
  sock: WASocket;
  status: Status;
  starting: boolean;
  tenantId: string;
  lastSeenAt: number;
};

export type InboundEvent = {
  tenantId: string;
  sessionId: string;
  remoteJid: string;
  displayName?: string;
  waMessageId?: string;
  kind: "text" | "audio" | "image" | "document";
  text?: string;
  media?: Buffer;
  mimeType?: string;
};

// Silence the noisy baileys logger while still letting it log warnings.
const baileysLogger = {
  level: "warn" as const,
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: (...args: unknown[]) => logger.warn({ baileys: true }, String(args[0] ?? "")),
  error: (...args: unknown[]) => logger.error({ baileys: true }, String(args[0] ?? "")),
  fatal: (...args: unknown[]) => logger.error({ baileys: true }, String(args[0] ?? "")),
  child: () => baileysLogger,
};

const HEARTBEAT_INTERVAL_MS = 60_000;

class WhatsappSessionManager extends EventEmitter implements IWhatsappAdapter {
  private sessions = new Map<string, SessionEntry>();
  private reconnectAttempts = new Map<string, number>();
  private reconnectTimers = new Map<string, NodeJS.Timeout>();
  private heartbeat: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startHeartbeat();
  }

  // ── Public API ───────────────────────────────────────────────────────────

  async start(sessionId: string, tenantId: string): Promise<SessionEntry> {
    // Idempotent: if already starting/running, return current entry.
    const existing = this.sessions.get(sessionId);
    if (existing) return existing;

    // Clear any pending reconnect timer — we're starting fresh.
    const pending = this.reconnectTimers.get(sessionId);
    if (pending) {
      clearTimeout(pending);
      this.reconnectTimers.delete(sessionId);
    }

    const authDir = path.join(env.WA_SESSIONS_DIR, sessionId);
    await fs.mkdir(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({
      version: [2, 3000, 0] as [number, number, number],
    }));

    const sock = makeWASocket({
      version,
      auth: state,
      browser: Browsers.macOS("Chrome"),
      printQRInTerminal: false,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      logger: baileysLogger as unknown as Parameters<typeof makeWASocket>[0]["logger"],
    });

    const entry: SessionEntry = {
      sock,
      status: "connecting",
      starting: true,
      tenantId,
      lastSeenAt: Date.now(),
    };
    this.sessions.set(sessionId, entry);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (u) => {
      const { connection, lastDisconnect, qr } = u;
      entry.lastSeenAt = Date.now();

      if (qr) {
        entry.status = "qr";
        await prisma.whatsappSession
          .update({ where: { id: sessionId }, data: { status: "qr", lastQr: qr } })
          .catch((err) => logger.warn({ err }, "failed to persist qr"));
        redisPub.publish(`wa:qr:${sessionId}`, qr).catch(() => {});
      }

      if (connection === "open") {
        entry.status = "connected";
        entry.starting = false;
        this.reconnectAttempts.delete(sessionId);
        const phone = sock.user?.id?.split(":")[0]?.split("@")[0];
        await prisma.whatsappSession
          .update({
            where: { id: sessionId },
            data: { status: "connected", phone, lastQr: null, lastError: null },
          })
          .catch(() => {});
        redisPub.publish(`wa:status:${sessionId}`, "connected").catch(() => {});
        logger.info({ sessionId, phone }, "whatsapp connected");
      }

      if (connection === "close") {
        const code = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)
          ?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        entry.status = "disconnected";
        entry.starting = false;

        await prisma.whatsappSession
          .update({
            where: { id: sessionId },
            data: {
              status: loggedOut ? "error" : "disconnected",
              lastError: (lastDisconnect?.error as Error | undefined)?.message,
            },
          })
          .catch(() => {});
        redisPub
          .publish(`wa:status:${sessionId}`, loggedOut ? "error" : "disconnected")
          .catch(() => {});

        // Tear the socket down cleanly before forgetting it. If we don't,
        // orphaned listeners and ws connections leak and can fire callbacks
        // for a session that no longer exists in the map.
        this.teardownSocket(entry.sock);
        this.sessions.delete(sessionId);

        if (loggedOut) {
          await fs.rm(authDir, { recursive: true, force: true }).catch(() => {});
          return;
        }

        this.scheduleReconnect(sessionId, tenantId);
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      entry.lastSeenAt = Date.now();
      if (type !== "notify") return;
      // Drop events that belong to an orphaned socket (e.g. arriving after a
      // reconnect already replaced this entry in the map).
      if (this.sessions.get(sessionId) !== entry) return;
      for (const m of messages) {
        try {
          await this.handleIncoming(sessionId, tenantId, m, sock);
        } catch (err) {
          logger.error({ err }, "handleIncoming failed");
        }
      }
    });

    return entry;
  }

  async stop(sessionId: string) {
    const pending = this.reconnectTimers.get(sessionId);
    if (pending) {
      clearTimeout(pending);
      this.reconnectTimers.delete(sessionId);
    }
    const entry = this.sessions.get(sessionId);
    if (!entry) return;
    try {
      await entry.sock.logout();
    } catch {
      /* ignore */
    }
    this.teardownSocket(entry.sock);
    this.sessions.delete(sessionId);
  }

  isConnected(sessionId: string): boolean {
    return this.sessions.get(sessionId)?.status === "connected";
  }

  // Real-time view of a session, used by /health endpoint and frontend.
  inspect(sessionId: string): {
    inMemory: boolean;
    status: Status | null;
    lastSeenAt: number | null;
    wsReady: boolean;
  } {
    const entry = this.sessions.get(sessionId);
    if (!entry) return { inMemory: false, status: null, lastSeenAt: null, wsReady: false };
    const ws = (entry.sock as unknown as { ws?: { readyState?: number } }).ws;
    return {
      inMemory: true,
      status: entry.status,
      lastSeenAt: entry.lastSeenAt,
      wsReady: ws?.readyState === 1,
    };
  }

  async send(
    sessionId: string,
    remoteJid: string,
    msg: OutboundMessage,
  ): Promise<string | null> {
    // Retry with backoff — mobile data in Africa is often spotty.
    const tries = 3;
    let lastErr: unknown;
    for (let i = 0; i < tries; i++) {
      const entry = this.sessions.get(sessionId);
      if (!entry || entry.status !== "connected") {
        lastErr = new Error(`WhatsApp session ${sessionId} not connected`);
        await sleep(500 * (i + 1));
        continue;
      }
      try {
        const content: AnyMessageContent =
          msg.type === "text"
            ? { text: msg.text }
            : { audio: msg.audio, ptt: true, mimetype: "audio/ogg; codecs=opus" };
        const sent = await entry.sock.sendMessage(remoteJid, content);
        entry.lastSeenAt = Date.now();
        return sent?.key?.id ?? null;
      } catch (err) {
        lastErr = err;
        logger.warn({ err, sessionId, attempt: i + 1 }, "wa send failed, retrying");
        await sleep(700 * (i + 1));
      }
    }
    throw lastErr;
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private teardownSocket(sock: WASocket) {
    try {
      sock.ev.removeAllListeners("creds.update");
      sock.ev.removeAllListeners("connection.update");
      sock.ev.removeAllListeners("messages.upsert");
    } catch {
      /* ignore */
    }
    try {
      sock.end(undefined);
    } catch {
      /* ignore */
    }
  }

  private scheduleReconnect(sessionId: string, tenantId: string) {
    const n = (this.reconnectAttempts.get(sessionId) ?? 0) + 1;
    this.reconnectAttempts.set(sessionId, n);
    const delay = Math.min(60_000, 2_000 * Math.pow(2, Math.min(n, 5)));
    logger.info({ sessionId, attempt: n, delay }, "scheduling whatsapp reconnect");
    const timer = setTimeout(() => {
      this.reconnectTimers.delete(sessionId);
      this.start(sessionId, tenantId).catch((err) =>
        logger.error({ err, sessionId }, "reconnect failed"),
      );
    }, delay);
    // Don't keep the process alive just for a pending reconnect.
    timer.unref?.();
    this.reconnectTimers.set(sessionId, timer);
  }

  // Periodically inspect every live session and force a reconnect for any
  // socket whose underlying WebSocket is dead but whose status didn't update
  // (which is the classic "bot stops responding silently" symptom).
  private startHeartbeat() {
    this.heartbeat = setInterval(() => {
      for (const [sessionId, entry] of this.sessions) {
        const ws = (entry.sock as unknown as { ws?: { readyState?: number } }).ws;
        const dead = ws?.readyState !== 1 && entry.status === "connected";
        if (!dead) continue;
        logger.warn(
          { sessionId, readyState: ws?.readyState },
          "heartbeat: socket is dead despite 'connected' status, restarting",
        );
        const tenantId = entry.tenantId;
        this.teardownSocket(entry.sock);
        this.sessions.delete(sessionId);
        prisma.whatsappSession
          .update({ where: { id: sessionId }, data: { status: "disconnected" } })
          .catch(() => {});
        redisPub.publish(`wa:status:${sessionId}`, "disconnected").catch(() => {});
        this.scheduleReconnect(sessionId, tenantId);
      }
    }, HEARTBEAT_INTERVAL_MS);
    this.heartbeat.unref?.();
  }

  private async handleIncoming(
    sessionId: string,
    tenantId: string,
    m: proto.IWebMessageInfo,
    sock: WASocket,
  ) {
    if (m.key.fromMe) return;
    const remoteJid = m.key.remoteJid;
    if (!remoteJid || remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast") return;

    const msg = m.message;
    if (!msg) return;

    const displayName = m.pushName ?? undefined;
    const waMessageId = m.key.id ?? undefined;

    const text =
      msg.conversation ??
      msg.extendedTextMessage?.text ??
      msg.buttonsResponseMessage?.selectedDisplayText ??
      msg.listResponseMessage?.title;
    if (text) {
      this.emit("inbound", {
        tenantId,
        sessionId,
        remoteJid,
        displayName,
        waMessageId,
        kind: "text",
        text,
      } satisfies InboundEvent);
      return;
    }

    // Voice notes (ptt) AND regular audio messages.
    const audioMessage = msg.audioMessage ?? msg.ephemeralMessage?.message?.audioMessage;
    if (audioMessage) {
      const buf = await downloadMediaMessage(
        m,
        "buffer",
        {},
        { logger: baileysLogger as never, reuploadRequest: sock.updateMediaMessage },
      ).catch((err) => {
        logger.warn({ err }, "audio download failed");
        return null;
      });
      if (!buf) return;
      this.emit("inbound", {
        tenantId,
        sessionId,
        remoteJid,
        displayName,
        waMessageId,
        kind: "audio",
        media: buf as Buffer,
        mimeType: audioMessage.mimetype ?? "audio/ogg",
      } satisfies InboundEvent);
      return;
    }

    if (msg.imageMessage) {
      this.emit("inbound", {
        tenantId,
        sessionId,
        remoteJid,
        displayName,
        waMessageId,
        kind: "image",
        text: msg.imageMessage.caption ?? "",
      } satisfies InboundEvent);
      return;
    }

    if (msg.documentMessage) {
      this.emit("inbound", {
        tenantId,
        sessionId,
        remoteJid,
        displayName,
        waMessageId,
        kind: "document",
        text: msg.documentMessage.fileName ?? "",
      } satisfies InboundEvent);
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const whatsapp = new WhatsappSessionManager();
