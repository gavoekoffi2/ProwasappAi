import OpenAI from "openai";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

// Multi-provider speech-to-text with automatic fallback.
//
// WhatsApp voice notes arrive as audio/ogg with opus codec. Whisper handles
// them natively, so no transcoding is required.
//
// Providers are tried in order until one returns a non-empty transcript:
//   1) Groq Whisper       (free tier, OpenAI-compatible, recommended primary)
//   2) OpenAI Whisper     (paid, very reliable)
//   3) Local whisper.cpp  (OpenAI-compatible HTTP server, e.g.
//                          https://github.com/fedirz/faster-whisper-server)
//
// If every configured provider fails, this throws — the caller is expected
// to react (e.g. by asking the user to type instead of staying silent).

export type STTResult = {
  text: string;
  durationSec?: number;
  provider: string;
};

const groqClient = env.GROQ_API_KEY
  ? new OpenAI({ apiKey: env.GROQ_API_KEY, baseURL: env.GROQ_BASE_URL })
  : null;

const openaiClient = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL })
  : null;

function pickExt(mimeType: string): string {
  const m = mimeType.toLowerCase();
  if (m.includes("mp3") || m.includes("mpeg")) return "mp3";
  if (m.includes("wav")) return "wav";
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return "m4a";
  if (m.includes("webm")) return "webm";
  return "ogg";
}

async function withTempFile<T>(
  audio: Buffer,
  mimeType: string,
  fn: (filePath: string) => Promise<T>,
): Promise<T> {
  const ext = pickExt(mimeType);
  const tmp = path.join(os.tmpdir(), `stt-${crypto.randomUUID()}.${ext}`);
  await fs.promises.writeFile(tmp, audio);
  try {
    return await fn(tmp);
  } finally {
    fs.promises.unlink(tmp).catch(() => {});
  }
}

async function transcribeOpenAICompatible(
  client: OpenAI,
  model: string,
  filePath: string,
): Promise<{ text: string; durationSec?: number }> {
  // verbose_json gives us the duration, useful for usage tracking.
  const res = (await client.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model,
    response_format: "verbose_json" as never,
  })) as { text?: string; duration?: number };
  return { text: (res.text ?? "").trim(), durationSec: res.duration };
}

async function transcribeLocal(
  filePath: string,
): Promise<{ text: string; durationSec?: number }> {
  // Convention: any OpenAI-compatible Whisper server exposing
  // POST {base}/v1/audio/transcriptions (multipart form-data).
  const base = env.STT_LOCAL_URL!.replace(/\/$/, "");
  const buf = await fs.promises.readFile(filePath);
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buf)]), path.basename(filePath));
  form.append("model", env.STT_LOCAL_MODEL);
  form.append("response_format", "verbose_json");

  const res = await fetch(`${base}/v1/audio/transcriptions`, {
    method: "POST",
    body: form as unknown as BodyInit,
  });
  if (!res.ok) {
    throw new Error(`local STT HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const data = (await res.json()) as { text?: string; duration?: number };
  return { text: (data.text ?? "").trim(), durationSec: data.duration };
}

type Provider = {
  name: string;
  run: (filePath: string) => Promise<{ text: string; durationSec?: number }>;
};

function buildProviderChain(): Provider[] {
  const chain: Provider[] = [];
  if (groqClient) {
    chain.push({
      name: "groq",
      run: (fp) => transcribeOpenAICompatible(groqClient, env.GROQ_STT_MODEL, fp),
    });
  }
  if (openaiClient && env.STT_PROVIDER === "openai") {
    chain.push({
      name: "openai",
      run: (fp) => transcribeOpenAICompatible(openaiClient, env.STT_MODEL, fp),
    });
  }
  if (env.STT_LOCAL_URL) {
    chain.push({ name: "local", run: (fp) => transcribeLocal(fp) });
  }
  return chain;
}

export async function stt(audio: Buffer, mimeType = "audio/ogg"): Promise<STTResult> {
  const chain = buildProviderChain();
  if (chain.length === 0) {
    throw new Error(
      "No STT provider configured. Set GROQ_API_KEY, OPENAI_API_KEY, or STT_LOCAL_URL.",
    );
  }

  return withTempFile(audio, mimeType, async (filePath) => {
    const errors: string[] = [];
    for (const provider of chain) {
      try {
        const result = await provider.run(filePath);
        if (result.text) {
          logger.debug(
            { provider: provider.name, len: result.text.length, duration: result.durationSec },
            "stt success",
          );
          return { ...result, provider: provider.name };
        }
        errors.push(`${provider.name}: empty transcript`);
        logger.warn({ provider: provider.name }, "stt returned empty transcript, trying next");
      } catch (err) {
        const message = (err as Error).message ?? String(err);
        errors.push(`${provider.name}: ${message}`);
        logger.warn({ provider: provider.name, err: message }, "stt provider failed, trying next");
      }
    }
    throw new Error(`All STT providers failed → ${errors.join(" | ")}`);
  });
}

// Exposed so the rest of the app can decide if voice replies are even possible.
export function isSttConfigured(): boolean {
  return buildProviderChain().length > 0;
}
