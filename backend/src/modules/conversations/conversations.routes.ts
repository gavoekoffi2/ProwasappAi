import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middleware/auth";
import { tenantScope } from "../../middleware/tenantScope";
import { asyncHandler, notFound } from "../../utils/errors";
import { whatsapp } from "../../services/whatsapp/sessionManager";

export const conversationsRouter = Router();

conversationsRouter.use(requireAuth, tenantScope);

conversationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = z
      .object({
        sessionId: z.string().optional(),
        mode: z.enum(["ai", "human"]).optional(),
        limit: z.coerce.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
      .parse(req.query);

    const convos = await prisma.conversation.findMany({
      where: {
        tenantId: req.auth!.tenantId,
        sessionId: q.sessionId,
        mode: q.mode,
      },
      orderBy: { lastAt: "desc" },
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      include: {
        // Last message preview only — single nested query, no N+1.
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            text: true,
            type: true,
            direction: true,
            createdAt: true,
          },
        },
      },
    });

    const hasMore = convos.length > q.limit;
    const items = hasMore ? convos.slice(0, q.limit) : convos;
    // Expose pagination via header so the body stays an array (frontend-compatible).
    if (hasMore) res.setHeader("X-Next-Cursor", items[items.length - 1]?.id ?? "");
    res.json(items);
  }),
);

conversationsRouter.get(
  "/:id/messages",
  asyncHandler(async (req, res) => {
    const q = z
      .object({
        limit: z.coerce.number().min(1).max(200).default(100),
        before: z.string().optional(),
      })
      .parse(req.query);

    const convo = await prisma.conversation.findFirst({
      where: { id: req.params.id, tenantId: req.auth!.tenantId },
    });
    if (!convo) throw notFound();

    // Defense-in-depth: scope by tenantId too, not only conversationId.
    // If a future bug ever lets a foreign convo id leak through, this
    // still blocks cross-tenant reads.
    const messages = await prisma.message.findMany({
      where: {
        conversationId: convo.id,
        tenantId: req.auth!.tenantId,
        ...(q.before ? { createdAt: { lt: new Date(q.before) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: q.limit,
    });
    // Restore chronological order for the client.
    messages.reverse();

    // Reset unread on fetch (only when reading the latest page).
    if (!q.before && convo.unread > 0) {
      await prisma.conversation.update({ where: { id: convo.id }, data: { unread: 0 } });
    }
    res.json({ conversation: convo, messages });
  }),
);

conversationsRouter.post(
  "/:id/messages",
  asyncHandler(async (req, res) => {
    const { text } = z.object({ text: z.string().min(1).max(4000) }).parse(req.body);
    const convo = await prisma.conversation.findFirst({
      where: { id: req.params.id, tenantId: req.auth!.tenantId },
    });
    if (!convo) throw notFound();

    const waId = await whatsapp.send(convo.sessionId, convo.remoteJid, {
      type: "text",
      text,
    });

    const msg = await prisma.message.create({
      data: {
        tenantId: convo.tenantId,
        conversationId: convo.id,
        direction: "outbound",
        type: "text",
        text,
        aiGenerated: false,
        waMessageId: waId ?? undefined,
      },
    });
    await prisma.conversation.update({
      where: { id: convo.id },
      data: { lastAt: new Date() },
    });
    res.json(msg);
  }),
);

conversationsRouter.post(
  "/:id/handoff",
  asyncHandler(async (req, res) => {
    const { mode } = z
      .object({ mode: z.enum(["ai", "human"]) })
      .parse(req.body);
    const convo = await prisma.conversation.findFirst({
      where: { id: req.params.id, tenantId: req.auth!.tenantId },
    });
    if (!convo) throw notFound();
    const updated = await prisma.conversation.update({
      where: { id: convo.id },
      data: { mode },
    });
    res.json(updated);
  }),
);
