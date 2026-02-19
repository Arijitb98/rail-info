import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!code) {
    return NextResponse.json({ error: 'Station code required' }, { status: 400 });
  }

  try {
    const station = await prisma.station.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!station) {
      return NextResponse.json({ error: 'Station not found' }, { status: 404 });
    }

    // Get trains that originate or terminate at this station
    const trains = await prisma.train.findMany({
      where: {
        OR: [
          { sourceStationCode: code.toUpperCase() },
          { destinationStationCode: code.toUpperCase() },
        ],
      },
      take: 50,
      orderBy: { trainNumber: 'asc' },
    });

    return NextResponse.json({
      station,
      trains,
    });
  } catch (error) {
    console.error('Station detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch station' }, { status: 500 });
  }
}
