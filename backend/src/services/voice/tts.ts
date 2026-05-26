import OpenAI from "openai";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

const openai = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL })
  : null;

const TTS_TIMEOUT_MS = 20_000;

export async function tts(text: string): Promise<Buffer | null> {
  if (env.TTS_PROVIDER === "none") return null;
  const trimmed = text.slice(0, 1000);

  if (env.TTS_PROVIDER === "openai") {
    if (!openai) return null;
    try {
      const r = await openai.audio.speech.create(
        {
          model: env.TTS_MODEL,
          voice: env.TTS_VOICE as "alloy",
          input: trimmed,
          response_format: "opus",
        },
        { timeout: TTS_TIMEOUT_MS, maxRetries: 1 },
      );
      const ab = await r.arrayBuffer();
      return Buffer.from(ab);
    } catch (err) {
      logger.error({ err }, "openai tts failed");
      return null;
    }
  }

  if (env.TTS_PROVIDER === "elevenlabs") {
    if (!env.ELEVENLABS_API_KEY) return null;
    try {
      const r = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${env.TTS_VOICE}?output_format=ogg_opus_48000`,
        {
          method: "POST",
          headers: {
            "xi-api-key": env.ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: trimmed, model_id: env.TTS_MODEL }),
          signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
        },
      );
      if (!r.ok) throw new Error(`eleven ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    } catch (err) {
      logger.error({ err }, "elevenlabs tts failed");
      return null;
    }
  }

  return null;
}
