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
        limit: z.coerce.number().min(1).max(200).default(50),
      })
      .parse(req.query);

    const convos = await prisma.conversation.findMany({
      where: {
        tenantId: req.auth!.tenantId,
        sessionId: q.sessionId,
        mode: q.mode,
      },
      orderBy: { lastAt: "desc" },
      take: q.limit,
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    res.json(convos);
  }),
);

conversationsRouter.get(
  "/:id/messages",
  asyncHandler(async (req, res) => {
    const convo = await prisma.conversation.findFirst({
      where: { id: req.params.id, tenantId: req.auth!.tenantId },
    });
    if (!convo) throw notFound();
    const messages = await prisma.message.findMany({
      where: { conversationId: convo.id },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    // Reset unread on fetch.
    if (convo.unread > 0) {
      await prisma.conversation.update({ where: { id: convo.id }, data: { unread: 0 } });
    }
    res.json({ conversation: convo, messages });
  }),
);

conversationsRouter.post(
  "/:id/messages",
  asyncHandler(async (req, res) => {
    const { text } = z.object({ text: z.string().min(1) }).parse(req.body);
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
