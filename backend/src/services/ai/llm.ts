import OpenAI from "openai";
import crypto from "crypto";
import { env } from "../../config/env";
import { cacheGet, cacheSet } from "../../config/redis";
import { logger } from "../../config/logger";

const client = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL })
  : null;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Simple sha256 cache key. Chat completions are not cached (they depend on
// volatile context), but embeddings are — same text produces same vector.
function h(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function chat(messages: ChatMessage[]): Promise<string> {
  if (!client) {
    // Graceful dev fallback when no API key is configured.
    const last = [...messages].reverse().find((m) => m.role === "user");
    return `⚠️ OPENAI_API_KEY non configurée. Echo: ${last?.content ?? ""}`;
  }
  const res = await client.chat.completions.create({
    model: env.LLM_MODEL,
    temperature: env.AI_TEMPERATURE,
    max_tokens: env.AI_MAX_TOKENS,
    messages,
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

export async function embed(text: string): Promise<number[]> {
  if (!client) {
    // Dev-only pseudo embedding: deterministic 1536-d vector so the schema
    // keeps working without API access. DO NOT use in production.
    const seed = crypto.createHash("sha256").update(text).digest();
    return Array.from({ length: 1536 }, (_, i) => ((seed[i % seed.length] / 255) - 0.5));
  }
  const key = `emb:${env.EMBEDDING_MODEL}:${h(text)}`;
  const cached = await cacheGet<number[]>(key);
  if (cached) return cached;

  const res = await client.embeddings.create({
    model: env.EMBEDDING_MODEL,
    input: text,
  });
  const vec = res.data[0].embedding;
  await cacheSet(key, vec, 60 * 60 * 24 * 30).catch(() => {});
  return vec;
}

export async function embedMany(texts: string[]): Promise<number[][]> {
  if (!client) return Promise.all(texts.map((t) => embed(t)));
  if (texts.length === 0) return [];
  try {
    const res = await client.embeddings.create({
      model: env.EMBEDDING_MODEL,
      input: texts,
    });
    return res.data.map((d) => d.embedding);
  } catch (err) {
    logger.error({ err }, "embedMany failed, falling back to per-item");
    return Promise.all(texts.map((t) => embed(t)));
  }
}
