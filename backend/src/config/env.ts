import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().default("http://localhost:3000"),

  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().default("https://api.openai.com/v1"),
  LLM_MODEL: z.string().default("gpt-4o-mini"),
  EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  AI_TEMPERATURE: z.coerce.number().default(0.3),
  AI_MAX_TOKENS: z.coerce.number().default(600),
  AI_CONTEXT_TURNS: z.coerce.number().default(10),
  AI_RAG_TOP_K: z.coerce.number().default(4),
  AI_CONFIDENCE_THRESHOLD: z.coerce.number().default(0.55),

  STT_PROVIDER: z.enum(["openai", "local"]).default("openai"),
  STT_MODEL: z.string().default("whisper-1"),
  TTS_PROVIDER: z.enum(["openai", "elevenlabs", "none"]).default("openai"),
  TTS_MODEL: z.string().default("tts-1"),
  TTS_VOICE: z.string().default("alloy"),
  ELEVENLABS_API_KEY: z.string().optional(),

  WA_SESSIONS_DIR: z.string().default("./wa_sessions"),

  BILLING_PROVIDER: z.enum(["manual", "stripe"]).default("manual"),
  STRIPE_SECRET_KEY: z.string().optional(),

  PLAN_STARTER_MSG_LIMIT: z.coerce.number().default(1000),
  PLAN_PRO_MSG_LIMIT: z.coerce.number().default(10000),
  PLAN_BUSINESS_MSG_LIMIT: z.coerce.number().default(50000),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
