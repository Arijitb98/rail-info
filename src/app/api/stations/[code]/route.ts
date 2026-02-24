import { NextRequest, NextResponse } from 'next/server';
import { getStationInfo, getStationLive } from '@/lib/railradar';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!code) {
    return NextResponse.json({ error: 'Station code required' }, { status: 400 });
  }

  try {
    // Fetch station info and live data in parallel
    const [stationInfo, stationLive] = await Promise.all([
      getStationInfo(code),
      getStationLive(code, 8).catch(() => null), // Live data is optional
    ]);

    return NextResponse.json({
      station: {
        code: stationInfo.code,
        name: stationInfo.name,
        nameHindi: stationInfo.hindi_name,
        address: stationInfo.address,
        zone: stationInfo.zone,
        latitude: stationInfo.lat,
        longitude: stationInfo.lng,
        city: stationInfo.city,
      },
      live: stationLive ? {
        totalTrains: stationLive.totalTrains,
        queryingForNextHours: stationLive.queryingForNextHours,
        trains: stationLive.trains.map((t) => ({
          trainNumber: t.train.number,
          trainName: t.train.name,
          trainType: t.train.type,
          sourceStationCode: t.train.sourceStationCode,
          destinationStationCode: t.train.destinationStationCode,
          platform: t.platform,
          journeyDate: t.journeyDate,
          scheduledArrival: t.schedule.arrival,
          scheduledDeparture: t.schedule.departure,
          expectedArrival: t.live.expectedArrival,
          expectedDeparture: t.live.expectedDeparture,
          arrivalDelay: t.live.arrivalDelayDisplay,
          departureDelay: t.live.departureDelayDisplay,
          isCancelled: t.status.isCancelled,
          hasArrived: t.status.hasArrived,
          hasDeparted: t.status.hasDeparted,
        })),
      } : null,
    });
  } catch (error) {
    console.error('Station detail error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch station';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
