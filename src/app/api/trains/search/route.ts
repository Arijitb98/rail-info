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

  const digitsOnly = /^[0-9]+$/.test(q);
  const qUpper = q.toUpperCase();
  const cacheKey = `trains:search:v1:${q.toLowerCase()}:${limit}`;

  const { data, cache } = await getOrSetJson(cacheKey, 7 * 24 * 60 * 60, async () => {
    return prisma.train.findMany({
      where: {
        OR: digitsOnly
          ? [{ trainNumber: { startsWith: q } }]
          : [
              { trainNumber: { startsWith: q } },
              { trainName: { contains: qUpper, mode: 'insensitive' } },
            ],
      },
      select: {
        trainNumber: true,
        trainName: true,
        sourceStationCode: true,
        destinationStationCode: true,
      },
      orderBy: [{ trainNumber: 'asc' }],
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
