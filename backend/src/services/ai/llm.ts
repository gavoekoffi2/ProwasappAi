import OpenAI from "openai";
import crypto from "crypto";
import { env } from "../../config/env";
import { cacheGet, cacheSet } from "../../config/redis";
import { logger } from "../../config/logger";

// ─────────────────────────────────────────────────────────────────────────────
//  LLM provider factory.
//
//  Supports any OpenAI-compatible endpoint via env:
//   - openai           → https://api.openai.com/v1 + OPENAI_API_KEY
//   - github-models    → https://models.github.ai/inference + GITHUB_TOKEN
//                        (https://docs.github.com/github-models)
//   - azure / local    → custom OPENAI_BASE_URL + OPENAI_API_KEY
// ─────────────────────────────────────────────────────────────────────────────

function buildClient(): OpenAI | null {
  const provider = env.LLM_PROVIDER;

  if (provider === "github-models") {
    if (!env.GITHUB_TOKEN) {
      logger.warn("LLM_PROVIDER=github-models but GITHUB_TOKEN is not set");
      return null;
    }
    return new OpenAI({
      apiKey: env.GITHUB_TOKEN,
      baseURL: env.GITHUB_MODELS_BASE_URL,
    });
  }

  // Default: any OpenAI-compatible endpoint.
  if (!env.OPENAI_API_KEY) return null;
  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL,
  });
}

const client = buildClient();

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function h(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

// Hard caps so a stuck upstream can't tie up a worker forever.
const LLM_TIMEOUT_MS = 30_000;
const EMBED_TIMEOUT_MS = 20_000;

export async function chat(messages: ChatMessage[]): Promise<string> {
  if (!client) {
    const last = [...messages].reverse().find((m) => m.role === "user");
    return `⚠️ Aucun fournisseur d'IA configuré. Echo: ${last?.content ?? ""}`;
  }
  try {
    const res = await client.chat.completions.create(
      {
        model: env.LLM_MODEL,
        temperature: env.AI_TEMPERATURE,
        max_tokens: env.AI_MAX_TOKENS,
        messages,
      },
      { timeout: LLM_TIMEOUT_MS, maxRetries: 1 },
    );
    return res.choices[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    logger.error({ err }, "chat completion failed");
    throw err;
  }
}

export async function embed(text: string): Promise<number[]> {
  if (!client) {
    // Deterministic pseudo-embedding so the schema keeps working in dev
    // without an API key. DO NOT use in production — retrieval will be random.
    const seed = crypto.createHash("sha256").update(text).digest();
    return Array.from({ length: 1536 }, (_, i) => seed[i % seed.length] / 255 - 0.5);
  }
  const key = `emb:${env.EMBEDDING_MODEL}:${h(text)}`;
  const cached = await cacheGet<number[]>(key);
  if (cached) return cached;

  const res = await client.embeddings.create(
    {
      model: env.EMBEDDING_MODEL,
      input: text,
    },
    { timeout: EMBED_TIMEOUT_MS, maxRetries: 1 },
  );
  const vec = res.data[0].embedding;
  await cacheSet(key, vec, 60 * 60 * 24 * 30).catch(() => {});
  return vec;
}

export async function embedMany(texts: string[]): Promise<number[][]> {
  if (!client) return Promise.all(texts.map((t) => embed(t)));
  if (texts.length === 0) return [];
  try {
    const res = await client.embeddings.create(
      {
        model: env.EMBEDDING_MODEL,
        input: texts,
      },
      { timeout: EMBED_TIMEOUT_MS, maxRetries: 1 },
    );
    return res.data.map((d) => d.embedding);
  } catch (err) {
    logger.error({ err }, "embedMany failed, falling back to per-item");
    return Promise.all(texts.map((t) => embed(t)));
  }
}
