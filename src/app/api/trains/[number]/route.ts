import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  const { number } = await params;

  if (!number) {
    return NextResponse.json({ error: 'Train number required' }, { status: 400 });
  }

  try {
    const train = await prisma.train.findUnique({
      where: { trainNumber: number },
    });

    if (!train) {
      return NextResponse.json({ error: 'Train not found' }, { status: 404 });
    }

    // Get source and destination station details
    let sourceStation = null;
    let destStation = null;

    if (train.sourceStationCode) {
      sourceStation = await prisma.station.findUnique({
        where: { code: train.sourceStationCode },
      });
    }

    if (train.destinationStationCode) {
      destStation = await prisma.station.findUnique({
        where: { code: train.destinationStationCode },
      });
    }

    return NextResponse.json({
      train,
      sourceStation,
      destStation,
    });
  } catch (error) {
    console.error('Train detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch train' }, { status: 500 });
  }
}
