import { getRedis } from '@/lib/redis';

type CacheResult<T> = {
  data: T;
  cache: 'hit' | 'miss' | 'bypass';
};

export async function getOrSetJson<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<CacheResult<T>> {
  const redis = getRedis();
  if (!redis) {
    return { data: await compute(), cache: 'bypass' };
  }

  try {
    const cached = await redis.get(key);
    if (cached) {
      return { data: JSON.parse(cached) as T, cache: 'hit' };
    }
  } catch {
    // If Redis is unavailable or JSON is bad, just fall back.
  }

  const data = await compute();

  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch {
    // Best-effort.
  }

  return { data, cache: 'miss' };
}
