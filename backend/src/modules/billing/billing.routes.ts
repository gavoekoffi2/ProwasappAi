import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { tenantScope } from "../../middleware/tenantScope";
import { asyncHandler, notFound } from "../../utils/errors";
import { billing } from "../../services/billing/provider";
import { currentUsage } from "../../services/billing/usage";

export const billingRouter = Router();

billingRouter.use(requireAuth, tenantScope);

billingRouter.get(
  "/subscription",
  asyncHandler(async (req, res) => {
    const sub = await prisma.subscription.findUnique({
      where: { tenantId: req.auth!.tenantId },
    });
    if (!sub) throw notFound();
    res.json(sub);
  }),
);

billingRouter.post(
  "/subscription",
  requireRole("owner", "admin"),
  asyncHandler(async (req, res) => {
    const { plan } = z
      .object({ plan: z.enum(["starter", "pro", "business"]) })
      .parse(req.body);

    const checkout = await billing.createCheckout(req.auth!.tenantId, plan);
    // For manual providers we mark the subscription active immediately;
    // Stripe sets it active on webhook.
    if (checkout.provider === "manual") {
      await prisma.subscription.update({
        where: { tenantId: req.auth!.tenantId },
        data: { plan, status: "active", externalId: checkout.reference },
      });
    }
    res.json(checkout);
  }),
);

billingRouter.get(
  "/usage",
  asyncHandler(async (req, res) => {
    const u = await currentUsage(req.auth!.tenantId);
    res.json(u);
  }),
);
