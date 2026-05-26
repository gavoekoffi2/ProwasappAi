import { Router } from "express";
import { z } from "zod";
import path from "path";
import fs from "fs/promises";
import QRCode from "qrcode";
import { prisma } from "../../config/prisma";
import { redisSub } from "../../config/redis";
import { env } from "../../config/env";
import { requireAuth } from "../../middleware/auth";
import { tenantScope } from "../../middleware/tenantScope";
import { asyncHandler, notFound } from "../../utils/errors";
import { whatsapp } from "../../services/whatsapp/sessionManager";

export const whatsappRouter = Router();

whatsappRouter.use(requireAuth, tenantScope);

whatsappRouter.get(
  "/sessions",
  asyncHandler(async (req, res) => {
    const sessions = await prisma.whatsappSession.findMany({
      where: { tenantId: req.auth!.tenantId },
      orderBy: { createdAt: "desc" },
    });
    res.json(sessions);
  }),
);

whatsappRouter.post(
  "/sessions",
  asyncHandler(async (req, res) => {
    const body = z.object({ label: z.string().default("Main") }).parse(req.body ?? {});
    const session = await prisma.whatsappSession.create({
      data: {
        tenantId: req.auth!.tenantId,
        label: body.label,
        status: "pending",
      },
    });
    // Kick off connection (non-blocking).
    whatsapp.start(session.id, session.tenantId).catch(() => {});
    res.json(session);
  }),
);

whatsappRouter.delete(
  "/sessions/:id",
  asyncHandler(async (req, res) => {
    const session = await prisma.whatsappSession.findFirst({
      where: { id: req.params.id, tenantId: req.auth!.tenantId },
    });
    if (!session) throw notFound();
    await whatsapp.stop(session.id).catch(() => {});
    await prisma.whatsappSession.delete({ where: { id: session.id } });
    // Wipe Baileys auth state so nothing lingers on disk. Matches the
    // tenant-scoped layout used by sessionManager.start().
    await fs
      .rm(path.join(env.WA_SESSIONS_DIR, session.tenantId, session.id), {
        recursive: true,
        force: true,
      })
      .catch(() => {});
    res.json({ ok: true });
  }),
);

// Real-time health view: combines the DB row with the in-memory socket state.
// Useful for the dashboard "is my bot actually listening right now?" widget.
whatsappRouter.get(
  "/sessions/:id/health",
  asyncHandler(async (req, res) => {
    const session = await prisma.whatsappSession.findFirst({
      where: { id: req.params.id, tenantId: req.auth!.tenantId },
    });
    if (!session) throw notFound();
    const live = whatsapp.inspect(session.id);
    res.json({
      id: session.id,
      label: session.label,
      phone: session.phone,
      dbStatus: session.status,
      lastError: session.lastError,
      live,
      healthy: live.inMemory && live.status === "connected" && live.wsReady,
    });
  }),
);

// Force a reconnect (e.g. after the user noticed the bot is offline).
whatsappRouter.post(
  "/sessions/:id/reconnect",
  asyncHandler(async (req, res) => {
    const session = await prisma.whatsappSession.findFirst({
      where: { id: req.params.id, tenantId: req.auth!.tenantId },
    });
    if (!session) throw notFound();
    await whatsapp.stop(session.id).catch(() => {});
    whatsapp.start(session.id, session.tenantId).catch(() => {});
    res.json({ ok: true });
  }),
);

// Server-Sent Events stream of QR codes + status for a session.
whatsappRouter.get(
  "/sessions/:id/qr",
  asyncHandler(async (req, res) => {
    const session = await prisma.whatsappSession.findFirst({
      where: { id: req.params.id, tenantId: req.auth!.tenantId },
    });
    if (!session) throw notFound();

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const send = (event: string, data: string) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${data}\n\n`);
    };

    // Send current state immediately.
    if (session.lastQr) {
      const dataUrl = await QRCode.toDataURL(session.lastQr);
      send("qr", dataUrl);
    }
    send("status", session.status);

    const sub = redisSub.duplicate();
    await sub.subscribe(`wa:qr:${session.id}`, `wa:status:${session.id}`);
    sub.on("message", async (channel, payload) => {
      try {
        if (channel === `wa:qr:${session.id}`) {
          const dataUrl = await QRCode.toDataURL(payload);
          send("qr", dataUrl);
        } else if (channel === `wa:status:${session.id}`) {
          send("status", payload);
        }
      } catch {
        /* client likely disconnected; cleanup will fire from req close */
      }
    });

    const keepAlive = setInterval(() => res.write(":keepalive\n\n"), 20_000);
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      clearInterval(keepAlive);
      sub.unsubscribe().catch(() => {});
      sub.quit().catch(() => {});
    };
    req.on("close", cleanup);
    res.on("close", cleanup);
    // Force-close streams left open more than 10 min so dead clients can't
    // keep redis subscribers and file descriptors alive forever.
    const maxLifetime = setTimeout(() => {
      try {
        res.end();
      } catch {
        /* noop */
      }
      cleanup();
    }, 10 * 60_000);
    maxLifetime.unref?.();
  }),
);
