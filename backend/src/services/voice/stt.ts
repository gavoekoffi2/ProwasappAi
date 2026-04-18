import OpenAI from "openai";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

const client = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL })
  : null;

export async function stt(audio: Buffer, mimeType = "audio/ogg"): Promise<{
  text: string;
  durationSec?: number;
}> {
  if (env.STT_PROVIDER !== "openai" || !client) {
    logger.warn("STT provider not configured; returning empty transcript");
    return { text: "" };
  }

  const ext = mimeType.includes("mp3") ? "mp3" : mimeType.includes("wav") ? "wav" : "ogg";
  const tmp = path.join(os.tmpdir(), `stt-${crypto.randomUUID()}.${ext}`);
  await fs.promises.writeFile(tmp, audio);

  try {
    const res = await client.audio.transcriptions.create({
      file: fs.createReadStream(tmp),
      model: env.STT_MODEL,
    });
    return { text: (res as { text?: string }).text ?? "" };
  } finally {
    fs.promises.unlink(tmp).catch(() => {});
  }
}
