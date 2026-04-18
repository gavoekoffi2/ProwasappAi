import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { errorHandler } from "./utils/errors";
import { authRouter } from "./modules/auth/auth.routes";
import { tenantRouter } from "./modules/tenant/tenant.routes";
import { aiConfigRouter } from "./modules/aiConfig/aiConfig.routes";
import { whatsappRouter } from "./modules/whatsapp/whatsapp.routes";
import { conversationsRouter } from "./modules/conversations/conversations.routes";
import { knowledgeRouter } from "./modules/knowledge/knowledge.routes";
import { billingRouter } from "./modules/billing/billing.routes";
import { startInboundWorker } from "./services/whatsapp/inboundWorker";
import { whatsapp } from "./services/whatsapp/sessionManager";
import { prisma } from "./config/prisma";

async function main() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.APP_URL, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/tenant", tenantRouter);
  app.use("/api/v1/ai-config", aiConfigRouter);
  app.use("/api/v1/whatsapp", whatsappRouter);
  app.use("/api/v1/conversations", conversationsRouter);
  app.use("/api/v1/knowledge", knowledgeRouter);
  app.use("/api/v1/billing", billingRouter);

  app.use(errorHandler);

  // Start the inbound pipeline and resurrect any connected sessions.
  startInboundWorker();
  resumeSessions().catch((err) => logger.error({ err }, "resumeSessions failed"));

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 API listening on :${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    server.close();
    await prisma.$disconnect().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

// On boot, try to reconnect sessions that were previously connected.
// Baileys' multi-file auth state survives restarts, so this is safe.
async function resumeSessions() {
  const sessions = await prisma.whatsappSession.findMany({
    where: { status: { in: ["connected", "connecting", "qr"] } },
  });
  for (const s of sessions) {
    whatsapp.start(s.id, s.tenantId).catch((err) =>
      logger.warn({ err, id: s.id }, "failed to resume session"),
    );
  }
}

main().catch((err) => {
  logger.error({ err }, "fatal startup error");
  process.exit(1);
});
