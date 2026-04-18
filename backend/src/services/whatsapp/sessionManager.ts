import path from "path";
import fs from "fs/promises";
import { EventEmitter } from "events";
import {
  makeWASocket,
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

type SessionEntry = {
  sock: WASocket;
  status: "pending" | "qr" | "connecting" | "connected" | "disconnected" | "error";
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

class WhatsappSessionManager extends EventEmitter implements IWhatsappAdapter {
  private sessions = new Map<string, SessionEntry>();

  async start(sessionId: string, tenantId: string) {
    if (this.sessions.has(sessionId)) return this.sessions.get(sessionId)!;
    const authDir = path.join(env.WA_SESSIONS_DIR, sessionId);
    await fs.mkdir(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({
      version: [2, 3000, 0] as [number, number, number],
    }));

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    const entry: SessionEntry = { sock, status: "connecting" };
    this.sessions.set(sessionId, entry);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (u) => {
      const { connection, lastDisconnect, qr } = u;
      if (qr) {
        entry.status = "qr";
        await prisma.whatsappSession.update({
          where: { id: sessionId },
          data: { status: "qr", lastQr: qr },
        });
        redisPub.publish(`wa:qr:${sessionId}`, qr).catch(() => {});
      }
      if (connection === "open") {
        entry.status = "connected";
        const phone = sock.user?.id?.split(":")[0]?.split("@")[0];
        await prisma.whatsappSession.update({
          where: { id: sessionId },
          data: { status: "connected", phone, lastQr: null, lastError: null },
        });
        redisPub.publish(`wa:status:${sessionId}`, "connected").catch(() => {});
      }
      if (connection === "close") {
        const code = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;
        entry.status = "disconnected";
        await prisma.whatsappSession.update({
          where: { id: sessionId },
          data: {
            status: shouldReconnect ? "disconnected" : "error",
            lastError: (lastDisconnect?.error as Error | undefined)?.message,
          },
        });
        redisPub.publish(`wa:status:${sessionId}`, "disconnected").catch(() => {});
        this.sessions.delete(sessionId);
        if (shouldReconnect) {
          setTimeout(() => this.start(sessionId, tenantId).catch((err) =>
            logger.error({ err, sessionId }, "reconnect failed"),
          ), 3000);
        }
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      for (const m of messages) {
        try {
          await this.handleIncoming(sessionId, tenantId, m);
        } catch (err) {
          logger.error({ err }, "handleIncoming failed");
        }
      }
    });

    return entry;
  }

  async stop(sessionId: string) {
    const entry = this.sessions.get(sessionId);
    if (!entry) return;
    try {
      await entry.sock.logout();
    } catch {
      /* ignore */
    }
    this.sessions.delete(sessionId);
  }

  getStatus(sessionId: string) {
    return this.sessions.get(sessionId)?.status ?? "disconnected";
  }

  getLastQr(sessionId: string) {
    // Fetched from DB where connection.update writes it.
    return prisma.whatsappSession.findUnique({ where: { id: sessionId } })
      .then((s) => s?.lastQr ?? null);
  }

  async send(sessionId: string, remoteJid: string, msg: OutboundMessage): Promise<string | null> {
    const entry = this.sessions.get(sessionId);
    if (!entry || entry.status !== "connected") {
      throw new Error(`WhatsApp session ${sessionId} not connected`);
    }
    let content: AnyMessageContent;
    if (msg.type === "text") {
      content = { text: msg.text };
    } else {
      content = {
        audio: msg.audio,
        ptt: true,
        mimetype: "audio/ogg; codecs=opus",
      };
    }
    const sent = await entry.sock.sendMessage(remoteJid, content);
    return sent?.key?.id ?? null;
  }

  private async handleIncoming(
    sessionId: string,
    tenantId: string,
    m: proto.IWebMessageInfo,
  ) {
    if (m.key.fromMe) return;
    const remoteJid = m.key.remoteJid;
    if (!remoteJid || remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast") return;

    const msg = m.message;
    if (!msg) return;

    const displayName = m.pushName ?? undefined;
    const waMessageId = m.key.id ?? undefined;

    // Text
    const text = msg.conversation ?? msg.extendedTextMessage?.text;
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

    // Audio
    if (msg.audioMessage) {
      const buf = await downloadMediaMessage(m, "buffer", {}).catch(() => null);
      if (!buf) return;
      this.emit("inbound", {
        tenantId,
        sessionId,
        remoteJid,
        displayName,
        waMessageId,
        kind: "audio",
        media: buf as Buffer,
        mimeType: msg.audioMessage.mimetype ?? "audio/ogg",
      } satisfies InboundEvent);
      return;
    }

    // Image with caption → treat caption as text prompt
    if (msg.imageMessage) {
      const caption = msg.imageMessage.caption ?? "";
      this.emit("inbound", {
        tenantId,
        sessionId,
        remoteJid,
        displayName,
        waMessageId,
        kind: "image",
        text: caption,
      } satisfies InboundEvent);
      return;
    }

    // Document — best-effort caption
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

export const whatsapp = new WhatsappSessionManager();
