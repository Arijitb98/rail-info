import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from')?.toUpperCase();
  const to = searchParams.get('to')?.toUpperCase();

  if (!from || !to) {
    return NextResponse.json(
      { error: 'Both "from" and "to" station codes are required' },
      { status: 400 }
    );
  }

  try {
    // Verify both stations exist
    const [fromStation, toStation] = await Promise.all([
      prisma.station.findUnique({ where: { code: from } }),
      prisma.station.findUnique({ where: { code: to } }),
    ]);

    if (!fromStation) {
      return NextResponse.json({ error: `Station ${from} not found` }, { status: 404 });
    }
    if (!toStation) {
      return NextResponse.json({ error: `Station ${to} not found` }, { status: 404 });
    }

    // Find trains that have source as 'from' and destination as 'to'
    // This is a simplified approach - in reality we'd need schedule data
    const directTrains = await prisma.train.findMany({
      where: {
        sourceStationCode: from,
        destinationStationCode: to,
      },
      orderBy: { trainNumber: 'asc' },
    });

    // Also find trains going the other direction for return journeys
    const reverseTrains = await prisma.train.findMany({
      where: {
        sourceStationCode: to,
        destinationStationCode: from,
      },
      orderBy: { trainNumber: 'asc' },
    });

    // Find trains that pass through both stations (simplified - checking if either endpoint matches)
    const passingTrains = await prisma.train.findMany({
      where: {
        OR: [
          { sourceStationCode: from },
          { sourceStationCode: to },
          { destinationStationCode: from },
          { destinationStationCode: to },
        ],
        NOT: [
          { AND: [{ sourceStationCode: from }, { destinationStationCode: to }] },
          { AND: [{ sourceStationCode: to }, { destinationStationCode: from }] },
        ],
      },
      take: 20,
      orderBy: { trainNumber: 'asc' },
    });

    return NextResponse.json({
      fromStation,
      toStation,
      directTrains,
      reverseTrains,
      passingTrains,
      totalFound: directTrains.length + reverseTrains.length + passingTrains.length,
    });
  } catch (error) {
    console.error('Trains between error:', error);
    return NextResponse.json({ error: 'Failed to search trains' }, { status: 500 });
  }
}
