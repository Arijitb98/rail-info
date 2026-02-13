import { prisma } from '@/lib/prisma';
import { getRedis } from '@/lib/redis';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const db = { ok: false as boolean };
  const redisStatus = { ok: false as boolean, enabled: false as boolean };

  try {
    await prisma.$queryRaw`SELECT 1`;
    db.ok = true;
  } catch {
    db.ok = false;
  }

  const redis = getRedis();
  if (redis) {
    redisStatus.enabled = true;
    try {
      const pong = await redis.ping();
      redisStatus.ok = pong === 'PONG';
    } catch {
      redisStatus.ok = false;
    }
  }

  return NextResponse.json({ ok: db.ok, db, redis: redisStatus });
}
