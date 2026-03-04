import { NextResponse } from 'next/server';
import { getLiveTrainMap, LiveTrainMapData } from '@/lib/railradar';

export const dynamic = 'force-dynamic';
export const revalidate = 30; // Revalidate every 30 seconds

export async function GET() {
  try {
    const liveTrains: LiveTrainMapData[] = await getLiveTrainMap();
    
    return NextResponse.json({
      success: true,
      data: liveTrains,
      meta: {
        timestamp: new Date().toISOString(),
        totalTrains: liveTrains.length,
      },
    });
  } catch (error) {
    console.error('Error fetching live train map:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'LIVE_MAP_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch live train map data',
        },
      },
      { status: 500 }
    );
  }
}
