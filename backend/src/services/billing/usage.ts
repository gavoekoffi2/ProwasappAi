import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { currentPeriod } from "../../utils/period";

export async function incrementUsage(
  tenantId: string,
  delta: Partial<{
    messagesIn: number;
    messagesOut: number;
    aiReplies: number;
    sttSeconds: number;
    ttsChars: number;
  }>,
) {
  const period = currentPeriod();
  await prisma.usageCounter.upsert({
    where: { tenantId_period: { tenantId, period } },
    create: {
      tenantId,
      period,
      messagesIn: delta.messagesIn ?? 0,
      messagesOut: delta.messagesOut ?? 0,
      aiReplies: delta.aiReplies ?? 0,
      sttSeconds: delta.sttSeconds ?? 0,
      ttsChars: delta.ttsChars ?? 0,
    },
    update: {
      messagesIn: { increment: delta.messagesIn ?? 0 },
      messagesOut: { increment: delta.messagesOut ?? 0 },
      aiReplies: { increment: delta.aiReplies ?? 0 },
      sttSeconds: { increment: delta.sttSeconds ?? 0 },
      ttsChars: { increment: delta.ttsChars ?? 0 },
    },
  });
}

export function planLimit(plan: "starter" | "pro" | "business"): number {
  if (plan === "pro") return env.PLAN_PRO_MSG_LIMIT;
  if (plan === "business") return env.PLAN_BUSINESS_MSG_LIMIT;
  return env.PLAN_STARTER_MSG_LIMIT;
}

export async function isOverQuota(tenantId: string): Promise<boolean> {
  const [sub, usage] = await Promise.all([
    prisma.subscription.findUnique({ where: { tenantId } }),
    prisma.usageCounter.findUnique({
      where: { tenantId_period: { tenantId, period: currentPeriod() } },
    }),
  ]);
  if (!sub) return true;
  if (sub.status === "canceled" || sub.status === "past_due") return true;
  const used = (usage?.aiReplies ?? 0);
  return used >= planLimit(sub.plan);
}

export async function currentUsage(tenantId: string) {
  const [sub, usage] = await Promise.all([
    prisma.subscription.findUnique({ where: { tenantId } }),
    prisma.usageCounter.findUnique({
      where: { tenantId_period: { tenantId, period: currentPeriod() } },
    }),
  ]);
  const plan = sub?.plan ?? "starter";
  return {
    plan,
    status: sub?.status,
    limit: planLimit(plan),
    period: currentPeriod(),
    usage: usage ?? {
      messagesIn: 0,
      messagesOut: 0,
      aiReplies: 0,
      sttSeconds: 0,
      ttsChars: 0,
    },
  };
}
