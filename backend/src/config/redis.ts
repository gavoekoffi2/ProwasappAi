import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on("error", (err) => logger.warn({ err: err.message }, "redis error"));

// Simple pubsub duplicate — used by WhatsApp events SSE
export const redisPub = redis.duplicate();
export const redisSub = redis.duplicate();

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSec = 3600) {
  await redis.set(key, JSON.stringify(value), "EX", ttlSec);
}
