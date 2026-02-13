import { prisma } from '@/lib/prisma';
import { getOrSetJson } from '@/lib/cache';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseLimit(value: string | null): number {
  const n = Number.parseInt(value ?? '20', 10);
  if (Number.isNaN(n)) return 20;
  return Math.max(1, Math.min(50, n));
}

export async function GET(req: NextRequest) {
  const qRaw = req.nextUrl.searchParams.get('q');
  const q = (qRaw ?? '').trim();
  const limit = parseLimit(req.nextUrl.searchParams.get('limit'));

  if (!q) {
    return NextResponse.json({ error: 'Missing required query param: q' }, { status: 400 });
  }

  const qUpper = q.toUpperCase();
  const cacheKey = `stations:search:v1:${q.toLowerCase()}:${limit}`;

  const { data, cache } = await getOrSetJson(cacheKey, 7 * 24 * 60 * 60, async () => {
    return prisma.station.findMany({
      where: {
        OR: [
          { code: { startsWith: qUpper } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        code: true,
        name: true,
        nameHindi: true,
        latitude: true,
        longitude: true,
      },
      orderBy: [{ code: 'asc' }],
      take: limit,
    });
  });

  return NextResponse.json(
    { cache, data },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
