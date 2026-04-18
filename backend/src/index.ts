import express from "express";
import helmet from "helmet";
import cors from "cors";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import { corsOrigins, env } from "./config/env";
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

  if (env.TRUST_PROXY) app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet());
  const allowed = corsOrigins();
  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin / tools (no Origin header) and any listed origin.
        if (!origin) return cb(null, true);
        if (allowed.includes("*") || allowed.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(
    pinoHttp({
      logger,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
      // Don't log the Authorization header.
      redact: { paths: ['req.headers.authorization', 'req.headers.cookie'], remove: true },
    }),
  );

  // Basic health probes.
  app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));
  app.get("/health/db", async (_req, res) => {
    try {
      await prisma.$queryRawUnsafe("SELECT 1");
      res.json({ ok: true });
    } catch (err) {
      res.status(503).json({ ok: false, error: (err as Error).message });
    }
  });

  // Rate-limit auth routes to slow down credential stuffing.
  const authLimiter = rateLimit({
    windowMs: 60_000,
    limit: env.AUTH_RATE_LIMIT_PER_MIN,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many requests, slow down." },
  });

  app.use("/api/v1/auth", authLimiter, authRouter);
  app.use("/api/v1/tenant", tenantRouter);
  app.use("/api/v1/ai-config", aiConfigRouter);
  app.use("/api/v1/whatsapp", whatsappRouter);
  app.use("/api/v1/conversations", conversationsRouter);
  app.use("/api/v1/knowledge", knowledgeRouter);
  app.use("/api/v1/billing", billingRouter);

  app.use((_req, res) => res.status(404).json({ error: "NotFound" }));
  app.use(errorHandler);

  // Start the inbound pipeline and resurrect any connected sessions.
  startInboundWorker();
  resumeSessions().catch((err) => logger.error({ err }, "resumeSessions failed"));

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, provider: env.LLM_PROVIDER }, "🚀 API started");
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
  // Resume anything that wasn't explicitly logged-out. "pending" is included
  // so a session created moments before a restart still gets bootstrapped.
  const sessions = await prisma.whatsappSession.findMany({
    where: { status: { in: ["pending", "connected", "connecting", "qr", "disconnected"] } },
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
