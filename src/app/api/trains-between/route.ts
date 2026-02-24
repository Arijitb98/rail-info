import { NextRequest, NextResponse } from 'next/server';
import { getTrainsBetween } from '@/lib/railradar';

// Helper to convert minutes from midnight to HH:MM format
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Helper to convert minutes to hours and minutes display
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

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
    const data = await getTrainsBetween(from, to);

    return NextResponse.json({
      fromStationCode: data.fromStationCode,
      toStationCode: data.toStationCode,
      totalTrains: data.totalTrains,
      trains: data.trains.map((train) => ({
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        hindiName: train.hindiName,
        type: train.type,
        sourceStationCode: train.sourceStationCode,
        sourceStationName: train.sourceStationName,
        destinationStationCode: train.destinationStationCode,
        destinationStationName: train.destinationStationName,
        runningDays: train.runningDays.days,
        runsAllDays: train.runningDays.allDays,
        isStartingToday: train.runningDays.isStartingToday,
        travelTimeMinutes: train.travelTimeMinutes,
        travelTimeDisplay: formatDuration(train.travelTimeMinutes),
        totalHalts: train.totalHalts,
        distanceKm: train.distanceKm,
        avgSpeedKmph: train.avgSpeedKmph,
        fromStation: {
          arrival: train.fromStationSchedule.arrivalMinutes 
            ? minutesToTime(train.fromStationSchedule.arrivalMinutes) 
            : null,
          departure: train.fromStationSchedule.departureMinutes 
            ? minutesToTime(train.fromStationSchedule.departureMinutes) 
            : null,
          day: train.fromStationSchedule.day,
        },
        toStation: {
          arrival: train.toStationSchedule.arrivalMinutes 
            ? minutesToTime(train.toStationSchedule.arrivalMinutes) 
            : null,
          departure: train.toStationSchedule.departureMinutes 
            ? minutesToTime(train.toStationSchedule.departureMinutes) 
            : null,
          day: train.toStationSchedule.day,
          distanceKm: train.toStationSchedule.distanceFromSourceKm,
        },
      })),
    });
  } catch (error) {
    console.error('Trains between error:', error);
    const message = error instanceof Error ? error.message : 'Failed to search trains';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
