'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Train {
  trainNumber: string;
  trainName: string;
  hindiName?: string;
  type: string;
  sourceStationCode: string;
  sourceStationName: string;
  destinationStationCode: string;
  destinationStationName: string;
  runningDays: string[];
  runsAllDays: boolean;
  returnTrainNumber?: string;
  travelTimeMinutes: number;
  totalHalts: number;
  distanceKm: number;
  avgSpeedKmph: number;
}

interface ScheduleStop {
  stationCode: string;
  stationName: string;
  arrivalMinutes: number;
  departureMinutes: number;
  haltMinutes: number;
  day: number;
  distanceKm: number;
}

interface LiveData {
  journeyDate: string;
  lastUpdatedAt: string;
  currentLocation: {
    latitude: number;
    longitude: number;
    stationCode: string;
    status: string;
    distanceFromOriginKm: number;
  };
  route: Array<{
    stationCode: string;
    platform?: string;
    delayArrivalMinutes?: number;
    delayDepartureMinutes?: number;
  }>;
}

interface Metadata {
  canRefreshLive: boolean;
  hasLiveData: boolean;
  lastLiveUpdate?: string;
}

// Helper to convert minutes from midnight to HH:MM format
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Helper to format duration
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export default function TrainDetailPage() {
  const params = useParams();
  const router = useRouter();
  const trainNumber = params.number as string;

  const [train, setTrain] = useState<Train | null>(null);
  const [schedule, setSchedule] = useState<ScheduleStop[]>([]);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trainNumber) return;

    const fetchTrain = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/trains/${encodeURIComponent(trainNumber)}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to fetch train');
          return;
        }

        setTrain(data.train);
        setSchedule(data.schedule || []);
        setLiveData(data.liveData);
        setMetadata(data.metadata);
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchTrain();
  }, [trainNumber]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
          <p className="text-zinc-600 dark:text-zinc-400">Loading train details...</p>
        </div>
      </div>
    );
  }

  if (error || !train) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/50">
          <div className="mb-4 text-4xl">🚫</div>
          <h1 className="mb-2 text-xl font-semibold text-red-800 dark:text-red-200">
            Train Not Found
          </h1>
          <p className="mb-6 text-red-600 dark:text-red-400">{error || 'The train you are looking for does not exist.'}</p>
          <button
            onClick={() => router.push('/')}
            className="rounded-xl bg-red-600 px-6 py-2 font-medium text-white transition-colors hover:bg-red-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Get live delay info for stations
  const getLiveInfo = (stationCode: string) => {
    if (!liveData?.route) return null;
    return liveData.route.find(r => r.stationCode === stationCode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Rail<span className="text-blue-600">Info</span>
            </span>
          </Link>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Train Header */}
        <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-zinc-900/50">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-900/40">
              <svg className="h-8 w-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="inline-block rounded-lg bg-orange-100 px-3 py-1 text-sm font-bold text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                  #{train.trainNumber}
                </span>
                <span className="inline-block rounded-lg bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {train.type}
                </span>
                {metadata?.hasLiveData && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
                    Live
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-zinc-100">
                {train.trainName}
              </h1>
              {train.hindiName && (
                <p className="mt-1 text-lg text-zinc-600 dark:text-zinc-400">{train.hindiName}</p>
              )}
            </div>
          </div>

          {/* Live Status Banner */}
          {liveData && (
            <div className="mt-6 rounded-xl bg-green-50 p-4 dark:bg-green-900/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-200 dark:bg-green-800">
                  <span className="text-lg">📍</span>
                </div>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Currently at <span className="font-bold">{liveData?.currentLocation?.stationCode}</span>
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {liveData?.currentLocation?.status?.replace('_', ' ')} • {liveData?.currentLocation?.distanceFromOriginKm} km from origin
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{formatDuration(train.travelTimeMinutes)}</div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">Duration</div>
            </div>
            <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{train.distanceKm} km</div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">Distance</div>
            </div>
            <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{train.totalHalts}</div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">Halts</div>
            </div>
            <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{train.avgSpeedKmph} kmph</div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">Avg Speed</div>
            </div>
          </div>
        </div>

        {/* Route Card */}
        <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-zinc-900/50">
          <h2 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Route Information
          </h2>

          <div className="relative flex items-center justify-between">
            {/* Source Station */}
            <Link
              href={`/station/${train.sourceStationCode}`}
              className="flex-1 rounded-xl border-2 border-green-200 bg-green-50 p-4 transition-all hover:border-green-400 hover:shadow-md dark:border-green-900 dark:bg-green-950/30 dark:hover:border-green-700"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-200 text-lg dark:bg-green-900">🚀</span>
                <span className="text-xs font-medium uppercase tracking-wider text-green-700 dark:text-green-400">Origin</span>
              </div>
              <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {train.sourceStationCode}
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                {train.sourceStationName}
              </div>
            </Link>

            {/* Arrow */}
            <div className="mx-4 flex flex-col items-center">
              <div className="h-0.5 w-8 bg-gradient-to-r from-green-400 to-orange-400 sm:w-16" />
              <svg className="my-1 h-6 w-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <div className="h-0.5 w-8 bg-gradient-to-r from-green-400 to-orange-400 sm:w-16" />
            </div>

            {/* Destination Station */}
            <Link
              href={`/station/${train.destinationStationCode}`}
              className="flex-1 rounded-xl border-2 border-orange-200 bg-orange-50 p-4 transition-all hover:border-orange-400 hover:shadow-md dark:border-orange-900 dark:bg-orange-950/30 dark:hover:border-orange-700"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-200 text-lg dark:bg-orange-900">🏁</span>
                <span className="text-xs font-medium uppercase tracking-wider text-orange-700 dark:text-orange-400">Destination</span>
              </div>
              <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {train.destinationStationCode}
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                {train.destinationStationName}
              </div>
            </Link>
          </div>

          {/* Running Days */}
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">Running Days</h3>
            <div className="flex flex-wrap gap-2">
              {train.runsAllDays ? (
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                  Daily
                </span>
              ) : (
                train.runningDays.map((day) => (
                  <span key={day} className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {day}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Schedule */}
        {schedule.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-zinc-900/50">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              <span>📋</span> Schedule ({schedule.length} stops)
            </h2>
            
            <div className="space-y-0">
              {schedule.map((stop, index) => {
                const liveInfo = getLiveInfo(stop.stationCode);
                const isFirst = index === 0;
                const isLast = index === schedule.length - 1;
                
                return (
                  <div key={`${stop.stationCode}-${index}`} className="relative flex items-stretch gap-4">
                    {/* Timeline */}
                    <div className="flex flex-col items-center">
                      <div className={`h-4 w-0.5 ${isFirst ? 'bg-transparent' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                      <div className={`h-4 w-4 rounded-full border-2 ${
                        isFirst ? 'border-green-500 bg-green-500' :
                        isLast ? 'border-orange-500 bg-orange-500' :
                        'border-zinc-400 bg-white dark:border-zinc-600 dark:bg-zinc-800'
                      }`} />
                      <div className={`flex-1 w-0.5 ${isLast ? 'bg-transparent' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                    </div>

                    {/* Stop Info */}
                    <Link
                      href={`/station/${stop.stationCode}`}
                      className="flex flex-1 items-center gap-4 rounded-lg p-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <div className="w-16 flex-shrink-0 text-center">
                        <div className="text-xs font-medium text-zinc-400">Day {stop.day}</div>
                        <div className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {minutesToTime(stop.arrivalMinutes)}
                        </div>
                        {liveInfo?.delayArrivalMinutes !== undefined && liveInfo.delayArrivalMinutes !== 0 && (
                          <div className={`text-xs ${liveInfo.delayArrivalMinutes > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {liveInfo.delayArrivalMinutes > 0 ? '+' : ''}{liveInfo.delayArrivalMinutes}m
                          </div>
                        )}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{stop.stationName}</span>
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            {stop.stationCode}
                          </span>
                          {liveInfo?.platform && (
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                              PF {liveInfo.platform}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {stop.distanceKm} km • {stop.haltMinutes > 0 ? `${stop.haltMinutes}m halt` : 'No halt'}
                        </div>
                      </div>

                      <svg className="h-5 w-5 flex-shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
