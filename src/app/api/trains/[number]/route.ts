import { NextRequest, NextResponse } from 'next/server';
import { getTrainData } from '@/lib/railradar';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  const { number } = await params;

  if (!number) {
    return NextResponse.json({ error: 'Train number required' }, { status: 400 });
  }

  try {
    const trainData = await getTrainData(number);

    // Filter schedule to only include halts (major stops)
    const majorStops = trainData.schedule.filter((s) => s.isHalt === 1);

    return NextResponse.json({
      train: {
        trainNumber: trainData.trainNumber,
        trainName: trainData.trainName,
        hindiName: trainData.hindiName,
        type: trainData.type,
        sourceStationCode: trainData.sourceStationCode,
        sourceStationName: trainData.sourceStationName,
        destinationStationCode: trainData.destinationStationCode,
        destinationStationName: trainData.destinationStationName,
        runningDays: trainData.runningDays.days,
        runsAllDays: trainData.runningDays.allDays,
        returnTrainNumber: trainData.returnTrainNumber,
        travelTimeMinutes: trainData.travelTimeMinutes,
        totalHalts: trainData.totalHalts,
        distanceKm: trainData.distanceKm,
        avgSpeedKmph: trainData.avgSpeedKmph,
      },
      schedule: majorStops.map((stop) => ({
        stationCode: stop.stationCode,
        stationName: stop.stationName,
        arrivalMinutes: stop.scheduledArrival,
        departureMinutes: stop.scheduledDeparture,
        haltMinutes: stop.haltDurationMinutes,
        day: stop.day,
        distanceKm: stop.distanceFromSourceKm,
      })),
      fullSchedule: trainData.schedule.map((stop) => ({
        stationCode: stop.stationCode,
        stationName: stop.stationName,
        isHalt: stop.isHalt === 1,
        arrivalMinutes: stop.scheduledArrival,
        departureMinutes: stop.scheduledDeparture,
        day: stop.day,
        distanceKm: stop.distanceFromSourceKm,
      })),
      metadata: {
        canRefreshLive: trainData.metadata.canRefreshLive,
        hasLiveData: trainData.metadata.hasLiveData,
        lastLiveUpdate: trainData.metadata.lastLiveUpdate,
      },
      liveData: trainData.liveData ? {
        journeyDate: trainData.liveData.journeyDate,
        lastUpdatedAt: trainData.liveData.lastUpdatedAt,
        currentLocation: trainData.liveData.currentLocation,
        route: trainData.liveData.route.map((r) => ({
          stationCode: r.stationCode,
          platform: r.platform,
          delayArrivalMinutes: r.delayArrivalMinutes,
          delayDepartureMinutes: r.delayDepartureMinutes,
        })),
      } : null,
    });
  } catch (error) {
    console.error('Train detail error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch train';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
