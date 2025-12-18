import { Redis } from '@upstash/redis';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;

let redisClient: Redis | null = null;
if (UPSTASH_URL && UPSTASH_TOKEN) {
  redisClient = new Redis({
    url: UPSTASH_URL,
    token: UPSTASH_TOKEN,
  });
}

export type LogoCacheValue = {
  logoUrl: string;
  source: string;
};

export async function getCachedLogo(key: string): Promise<LogoCacheValue | null> {
  if (!redisClient) return null;
  try {
    const stored = await redisClient.get<string>(key);
    if (!stored) return null;
    return JSON.parse(stored) as LogoCacheValue;
  } catch (error) {
    console.error('[LogoCache] read failed', error);
    return null;
  }
}

export async function setCachedLogo(key: string, value: LogoCacheValue) {
  if (!redisClient) return;
  try {
    await redisClient.set(key, JSON.stringify(value), { ex: CACHE_TTL_SECONDS });
  } catch (error) {
    console.error('[LogoCache] write failed', error);
  }
}
