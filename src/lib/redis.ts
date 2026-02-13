import Redis from 'ioredis';

declare global {
  var __redis: Redis | undefined;
}

export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (globalThis.__redis) return globalThis.__redis;

  const redis = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  if (process.env.NODE_ENV !== 'production') globalThis.__redis = redis;
  return redis;
}
