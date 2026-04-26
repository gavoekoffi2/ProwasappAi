import "dotenv/config";
import { z } from "zod";

const schema = z
  .object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().default("http://localhost:3000"),
  // Comma-separated list of origins allowed by CORS. Falls back to APP_URL.
  CORS_ORIGINS: z.string().optional(),
  TRUST_PROXY: z.coerce.boolean().default(false),

  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // ── LLM provider ─────────────────────────────────────────────────────────
  LLM_PROVIDER: z
    .enum(["openai", "github-models", "azure", "local", "custom"])
    .default("openai"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().default("https://api.openai.com/v1"),
  // GitHub Models (docs.github.com/github-models) — OpenAI-compatible endpoint
  // authenticated with a GitHub PAT.
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_MODELS_BASE_URL: z.string().default("https://models.github.ai/inference"),

  LLM_MODEL: z.string().default("gpt-4o-mini"),
  EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  AI_TEMPERATURE: z.coerce.number().default(0.3),
  AI_MAX_TOKENS: z.coerce.number().default(600),
  AI_CONTEXT_TURNS: z.coerce.number().default(10),
  AI_RAG_TOP_K: z.coerce.number().default(4),
  AI_CONFIDENCE_THRESHOLD: z.coerce.number().default(0.55),

  // ── Voice ────────────────────────────────────────────────────────────────
  STT_PROVIDER: z.enum(["openai", "local"]).default("openai"),
  STT_MODEL: z.string().default("whisper-1"),
  TTS_PROVIDER: z.enum(["openai", "elevenlabs", "none"]).default("openai"),
  TTS_MODEL: z.string().default("tts-1"),
  TTS_VOICE: z.string().default("alloy"),
  ELEVENLABS_API_KEY: z.string().optional(),

  // ── WhatsApp ─────────────────────────────────────────────────────────────
  WA_SESSIONS_DIR: z.string().default("./wa_sessions"),

  // ── Billing ──────────────────────────────────────────────────────────────
  BILLING_PROVIDER: z.enum(["manual", "stripe"]).default("manual"),
  STRIPE_SECRET_KEY: z.string().optional(),

  PLAN_STARTER_MSG_LIMIT: z.coerce.number().default(1000),
  PLAN_PRO_MSG_LIMIT: z.coerce.number().default(10000),
  PLAN_BUSINESS_MSG_LIMIT: z.coerce.number().default(50000),

  // ── Rate limits / limits ────────────────────────────────────────────────
  AUTH_RATE_LIMIT_PER_MIN: z.coerce.number().default(20),
  UPLOAD_MAX_MB: z.coerce.number().default(20),
  TENANT_STORAGE_MAX_MB: z.coerce.number().default(200),
})
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== "production") return;

    if (
      value.JWT_SECRET === "replace-with-a-long-random-string" ||
      value.JWT_SECRET.toLowerCase().includes("change-me")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_SECRET"],
        message: "JWT_SECRET must be a real production secret",
      });
    }

    if (value.APP_URL.includes("localhost")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["APP_URL"],
        message: "APP_URL must be the public production dashboard URL",
      });
    }

    if (value.LLM_PROVIDER === "github-models" && !value.GITHUB_TOKEN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["GITHUB_TOKEN"],
        message: "GITHUB_TOKEN is required when LLM_PROVIDER=github-models",
      });
    }

    if (value.LLM_PROVIDER !== "github-models" && value.LLM_PROVIDER !== "local" && !value.OPENAI_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["OPENAI_API_KEY"],
        message: "OPENAI_API_KEY is required for this LLM provider in production",
      });
    }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

export function corsOrigins(): string[] {
  const raw = env.CORS_ORIGINS ?? env.APP_URL;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
