import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middleware/auth";
import { tenantScope } from "../../middleware/tenantScope";
import { asyncHandler } from "../../utils/errors";

export const aiConfigRouter = Router();

aiConfigRouter.use(requireAuth, tenantScope);

aiConfigRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const cfg = await prisma.aiConfig.upsert({
      where: { tenantId: req.auth!.tenantId },
      update: {},
      create: { tenantId: req.auth!.tenantId },
    });
    res.json(cfg);
  }),
);

const updateSchema = z.object({
  systemPrompt: z.string().max(8000).optional(),
  tone: z.string().max(40).optional(),
  language: z.string().max(10).optional(),
  voiceReply: z.boolean().optional(),
  fallbackMessage: z.string().max(500).optional(),
  confidenceFallback: z.number().min(0).max(1).optional(),
  enabled: z.boolean().optional(),
});

aiConfigRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const cfg = await prisma.aiConfig.upsert({
      where: { tenantId: req.auth!.tenantId },
      update: body,
      create: { tenantId: req.auth!.tenantId, ...body },
    });
    res.json(cfg);
  }),
);
