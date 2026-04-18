import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middleware/auth";
import { tenantScope } from "../../middleware/tenantScope";
import { asyncHandler, notFound } from "../../utils/errors";

export const tenantRouter = Router();

tenantRouter.use(requireAuth, tenantScope);

tenantRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.auth!.tenantId },
      include: { subscription: true, aiConfig: true },
    });
    if (!tenant) throw notFound("Tenant not found");
    res.json(tenant);
  }),
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  industry: z.enum(["ecommerce", "realestate", "services", "other"]).optional(),
  locale: z.string().optional(),
});

tenantRouter.patch(
  "/",
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const tenant = await prisma.tenant.update({
      where: { id: req.auth!.tenantId },
      data: body,
    });
    res.json(tenant);
  }),
);
