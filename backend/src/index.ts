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

// Fail loudly on unhandled async errors — silent crashes are the worst.
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "unhandledRejection — exiting");
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  logger.error({ err }, "uncaughtException — exiting");
  process.exit(1);
});

async function main() {
  const app = express();

  if (env.TRUST_PROXY) app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    helmet({
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      // The API never returns HTML — no need for a CSP at this layer.
      contentSecurityPolicy: false,
    }),
  );
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
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));
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
      // Log the full error server-side but never expose it to clients.
      logger.error({ err }, "health/db failed");
      res.status(503).json({ ok: false });
    }
  });

  // Global rate limiter — keeps a single bad actor from saturating the API.
  // Authenticated burst usage (e.g. SSE keepalive, dashboard polling) lives
  // comfortably under this limit; abusive traffic gets throttled fast.
  const globalLimiter = rateLimit({
    windowMs: 60_000,
    limit: 600,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: (req) => req.path === "/health" || req.path === "/health/db",
    message: { error: "Too many requests, slow down." },
  });
  app.use(globalLimiter);

  // Tighter limit on the auth endpoints to slow credential stuffing.
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

  // Drain in-flight requests on SIGTERM/SIGINT before closing the DB pool.
  // Without this, docker-compose restarts can drop responses and corrupt
  // WhatsApp socket teardown.
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutting down gracefully");

    // Stop accepting new connections; existing ones finish.
    server.close(async () => {
      try {
        await prisma.$disconnect();
      } catch (err) {
        logger.warn({ err }, "prisma disconnect failed");
      }
      logger.info("shutdown complete");
      process.exit(0);
    });

    // Hard exit if drain takes too long (e.g. a long-lived SSE stream).
    setTimeout(() => {
      logger.warn("forced shutdown after timeout");
      process.exit(1);
    }, 15_000).unref();
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
  // Stagger reconnects so we don't slam Baileys/network on boot.
  for (const s of sessions) {
    whatsapp.start(s.id, s.tenantId).catch((err) =>
      logger.warn({ err, id: s.id }, "failed to resume session"),
    );
    await new Promise((r) => setTimeout(r, 300));
  }
}

main().catch((err) => {
  logger.error({ err }, "fatal startup error");
  process.exit(1);
});
