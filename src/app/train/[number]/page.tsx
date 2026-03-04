'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';

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
  arrivalMinutes?: number;
  departureMinutes?: number;
  haltMinutes?: number;
  day: number;
  distanceKm?: number;
  isHalt?: boolean;
}

interface FullScheduleStop {
  stationCode: string;
  stationName: string;
  arrivalMinutes?: number;
  departureMinutes?: number;
  day: number;
  distanceKm?: number;
  isHalt: boolean;
}

interface TrainInstance {
  startDate: string;
  departureTimestamp?: number;
  status?: string;
  positionSummary?: string;
  exceptionMessage?: string;
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

type DataProvider = 'railradar' | 'NTES';

const DATA_PROVIDERS: DataProvider[] = ['railradar', 'NTES'];

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

function formatJourneyDateDisplay(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function TrainDetailPage() {
  const params = useParams();
  const router = useRouter();
  const trainNumber = params.number as string;

  const [train, setTrain] = useState<Train | null>(null);
  const [schedule, setSchedule] = useState<ScheduleStop[]>([]);
  const [fullSchedule, setFullSchedule] = useState<FullScheduleStop[]>([]);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStops, setExpandedStops] = useState<Set<number>>(new Set());
  const [instances, setInstances] = useState<TrainInstance[]>([]);
  const [instancesLoading, setInstancesLoading] = useState(true);
  const [instancesError, setInstancesError] = useState<string | null>(null);
  const [selectedJourneyDate, setSelectedJourneyDate] = useState<string>('');
  const [activeJourneyDate, setActiveJourneyDate] = useState<string | null>(null);
  const [dataProvider, setDataProvider] = useState<DataProvider>('railradar');
  const isRefreshing = loading && !!train;

  const fetchTrain = useCallback(
    async (journeyDateParam?: string | null) => {
      if (!trainNumber) return;

      setLoading(true);
      setError(null);

      let lastError: string | null = null;

      try {
        for (const provider of DATA_PROVIDERS) {
          try {
            const params = new URLSearchParams();
            if (journeyDateParam) params.set('journeyDate', journeyDateParam);
            params.set('dataProvider', provider);
            const query = params.toString();

            const res = await fetch(
              `/api/trains/${encodeURIComponent(trainNumber)}${query ? `?${query}` : ''}`
            );
            const data = await res.json();

            if (!res.ok) {
              lastError = data.error || `Failed to fetch train via ${provider}`;
              continue;
            }

            setTrain(data.train);
            setSchedule(data.schedule || []);
            setFullSchedule(data.fullSchedule || []);
            setLiveData(data.liveData);
            setMetadata(data.metadata);
            setDataProvider(provider);

            const resolvedJourneyDate = data.liveData?.journeyDate || journeyDateParam || null;
            setActiveJourneyDate(resolvedJourneyDate);
            return;
          } catch (err) {
            console.error(`Train fetch error (${provider}):`, err);
            lastError = 'Network error';
          }
        }

        setError(lastError || 'Failed to fetch train');
      } finally {
        setLoading(false);
      }
    },
    [trainNumber]
  );

  useEffect(() => {
    fetchTrain();
  }, [fetchTrain]);

  const fetchInstances = useCallback(async () => {
    if (!trainNumber) return;

    setInstancesLoading(true);
    setInstancesError(null);

    let lastError: string | null = null;
    const providersToTry = dataProvider
      ? [dataProvider, ...DATA_PROVIDERS.filter(provider => provider !== dataProvider)]
      : DATA_PROVIDERS;

    try {
      for (const provider of providersToTry) {
        try {
          const res = await fetch(
            `/api/trains/${encodeURIComponent(trainNumber)}/instances?dataProvider=${provider}`
          );
          const data = await res.json();

          if (!res.ok) {
            lastError = data.error || `Failed to fetch journey dates via ${provider}`;
            continue;
          }

          setInstances(Array.isArray(data.instances) ? data.instances : []);
          return;
        } catch (err) {
          console.error(`Instances fetch error (${provider}):`, err);
          lastError = 'Unable to load journey dates';
        }
      }

      setInstances([]);
      setInstancesError(lastError || 'Unable to load journey dates');
    } finally {
      setInstancesLoading(false);
    }
  }, [trainNumber, dataProvider]);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  const handleJourneyDateChange = useCallback(
    (value: string) => {
      setSelectedJourneyDate(value);
      fetchTrain(value || undefined);
    },
    [fetchTrain]
  );

  if (loading && !train) {
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

  // Determine if a station has been passed based on live data
  const getStationStatus = (stop: ScheduleStop, index: number): 'passed' | 'current' | 'upcoming' => {
    if (!liveData?.currentLocation) return 'upcoming';
    
    const currentStationCode = liveData.currentLocation.stationCode;
    const status = liveData.currentLocation.status;
    const currentDistanceKm = liveData.currentLocation.distanceFromOriginKm;
    
    // Find current station index in schedule
    const currentStationIndex = schedule.findIndex(s => s.stationCode === currentStationCode);
    
    if (status === 'AT_STATION') {
      // If train is at a station
      if (stop.stationCode === currentStationCode) return 'current';
      if (currentStationIndex >= 0 && index < currentStationIndex) return 'passed';
      if (currentStationIndex >= 0 && index > currentStationIndex) return 'upcoming';
      // Fallback to distance comparison if station not in schedule
      if (stop.distanceKm !== undefined && stop.distanceKm < currentDistanceKm) return 'passed';
    } else if (status === 'DEPARTED') {
      // If train has departed, use distance comparison
      if (stop.distanceKm !== undefined && stop.distanceKm <= currentDistanceKm) return 'passed';
    }
    
    return 'upcoming';
  };

  // Get intermediate stations between two halt stations from fullSchedule
  const getIntermediateStations = (currentStopCode: string, nextStopCode: string): FullScheduleStop[] => {
    if (!fullSchedule.length) return [];
    
    const currentIdx = fullSchedule.findIndex(s => s.stationCode === currentStopCode);
    const nextIdx = fullSchedule.findIndex(s => s.stationCode === nextStopCode);
    
    if (currentIdx === -1 || nextIdx === -1 || nextIdx <= currentIdx + 1) return [];
    
    return fullSchedule.slice(currentIdx + 1, nextIdx).filter(s => !s.isHalt);
  };

  // Toggle expanded state for a stop
  const toggleExpanded = (index: number) => {
    setExpandedStops(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      <SiteHeader />

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
              {train.hindiName && train.hindiName !== 'null' && (
                <p className="mt-1 text-lg text-zinc-600 dark:text-zinc-400">{train.hindiName}</p>
              )}
            </div>
          </div>

          {/* Live Status & Journey Controls */}
          <div className="mt-6 rounded-xl bg-green-50 p-4 dark:bg-green-900/20">
            {liveData ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-200 dark:bg-green-800">
                  <span className="text-lg">📍</span>
                </div>
                <div className="flex-1">
                  {(() => {
                    const curr = liveData.currentLocation;
                    const currCode = curr?.stationCode;
                    const currDistance = curr?.distanceFromOriginKm ?? 0;
                    const status = curr?.status;

                    // Resolve station name from schedule or fullSchedule
                    const haltMatch = schedule.find(s => s.stationCode === currCode);
                    const fullMatch = fullSchedule.find(s => s.stationCode === currCode);
                    const stationName = haltMatch?.stationName || fullMatch?.stationName || currCode;
                    const isIntermediate = !!fullMatch && !fullMatch.isHalt;

                    // Determine label
                    let label = 'Departed from';
                    if (status === 'AT_STATION') label = 'Currently at';
                    else if (isIntermediate) label = 'Crossed';

                    // Determine next stop: find the first upcoming station.
                    // Loop through schedule in order, skip passed/current stations.
                    let nextStop: ScheduleStop | null = null;
                    for (let i = 0; i < schedule.length; i++) {
                      const s = schedule[i];
                      const sDist = s.distanceKm ?? 0;
                      // If this is the current station, next is the one after
                      if (s.stationCode === currCode) {
                        nextStop = schedule[i + 1] ?? null;
                        break;
                      }
                      // Otherwise pick the first station with distance strictly greater than current position
                      if (sDist > currDistance) {
                        nextStop = s;
                        break;
                      }
                    }

                    const nextLiveInfo = nextStop ? liveData.route.find(r => r.stationCode === nextStop.stationCode) : null;
                    const scheduledMinutes = nextStop ? (nextStop.arrivalMinutes ?? nextStop.departureMinutes ?? null) : null;
                    const delayMinutes = nextLiveInfo ? (nextLiveInfo.delayArrivalMinutes ?? nextLiveInfo.delayDepartureMinutes ?? 0) : 0;
                    const expectedMinutes = scheduledMinutes !== null ? scheduledMinutes + (delayMinutes ?? 0) : null;
                    const delayClass = delayMinutes > 0 ? 'text-red-600 dark:text-red-400' : delayMinutes < 0 ? 'text-green-600 dark:text-green-300' : 'text-zinc-600 dark:text-zinc-400';

                    return (
                      <>
                        <p className="font-medium text-green-800 dark:text-green-200">
                          {label} <span className="font-bold">{stationName} ({currCode})</span>
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          {Math.round(currDistance)} km from origin
                          {liveData.lastUpdatedAt && (
                            <> • Updated {new Date(liveData.lastUpdatedAt).toLocaleTimeString()}</>
                          )}
                        </p>

                        {nextStop && scheduledMinutes !== null && (
                          <div className="mt-2 rounded-md bg-white/60 p-2 text-sm text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-200">
                            <div className="font-medium">Next: {nextStop.stationName} <span className="text-xs text-zinc-500">({nextStop.stationCode})</span></div>
                            <div className="text-xs">
                              <span className="text-zinc-600 dark:text-zinc-400">Scheduled: </span>
                              <span className="font-mono">{minutesToTime(scheduledMinutes)}</span>
                              <span className="mx-2 text-zinc-400">•</span>
                              <span className={`${delayClass} font-mono`}>Expected: {expectedMinutes !== null ? minutesToTime(expectedMinutes) : '—'}</span>
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link
                            href={`/live-map?train=${train.trainNumber}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            View on Map
                          </Link>
                          <button
                            onClick={() => fetchTrain(selectedJourneyDate || undefined)}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-50"
                          >
                            <svg className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {loading ? 'Refreshing…' : 'Refresh'}
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
                {liveData?.journeyDate && (
                  <div className="text-right text-sm">
                    <div className="text-green-700 dark:text-green-300">Journey</div>
                    <div className="font-medium text-green-800 dark:text-green-200">
                      {new Date(liveData.journeyDate).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1 text-sm text-green-800 dark:text-green-200">
                <span className="font-medium">Live tracking is unavailable for this train right now.</span>
                <span className="text-green-700/80 dark:text-green-200/80">
                  Pick a past or upcoming journey date below to explore its detailed schedule.
                </span>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-4">
                <div className="flex min-w-[220px] flex-1 flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-green-800 dark:text-green-200">
                    Journey Date
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedJourneyDate}
                      onChange={(event) => handleJourneyDateChange(event.target.value)}
                      className="flex-1 rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-green-900 shadow-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-200 dark:border-green-800 dark:bg-green-950/50 dark:text-green-100"
                      disabled={instancesLoading && instances.length === 0}
                    >
                      <option value="">
                        {activeJourneyDate
                          ? `Auto • ${formatJourneyDateDisplay(activeJourneyDate)}`
                          : 'Auto-detect latest'}
                      </option>
                      {instancesLoading && instances.length === 0 && (
                        <option value="" disabled>
                          Loading journey dates...
                        </option>
                      )}
                      {instances.map((instance) => (
                        <option
                          key={`${instance.startDate}-${instance.departureTimestamp ?? instance.status ?? 'instance'}`}
                          value={instance.startDate}
                        >
                          {formatJourneyDateDisplay(instance.startDate)}
                          {instance.status ? ` • ${instance.status}` : ''}
                        </option>
                      ))}
                    </select>
                    {isRefreshing && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Refreshing…</span>
                    )}
                  </div>
                  <p className="text-xs text-green-700/80 dark:text-green-200/80">
                    Showing data for {activeJourneyDate ? formatJourneyDateDisplay(activeJourneyDate) : 'latest available run'}
                  </p>
                </div>
              </div>

            {instancesError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{instancesError}</p>
            )}
          </div>

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
                const stationStatus = getStationStatus(stop, index);
                const isLive = stationStatus === 'current';
                const isPassed = stationStatus === 'passed';
                const nextStop = schedule[index + 1];
                const intermediateStations = nextStop ? getIntermediateStations(stop.stationCode, nextStop.stationCode) : [];
                const isExpanded = expandedStops.has(index);

                return (
                  <div key={`${stop.stationCode}-${index}`}>
                    <div className="relative flex items-stretch gap-4">
                      {/* Timeline */}
                      <div className="flex flex-col items-center">
                        <div className={`h-4 w-0.5 ${isFirst ? 'bg-transparent' : isPassed || isLive ? 'bg-green-400 dark:bg-green-600' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                        <div className={`h-4 w-4 rounded-full border-2 ${
                          isLive ? 'border-green-500 bg-green-500 animate-pulse ring-4 ring-green-300 dark:ring-green-700' :
                          isPassed ? 'border-green-500 bg-green-500' :
                          isFirst ? 'border-green-500 bg-green-500' :
                          isLast ? 'border-orange-500 bg-orange-500' :
                          'border-zinc-400 bg-white dark:border-zinc-600 dark:bg-zinc-800'
                        }`} />
                        <div className={`flex-1 w-0.5 ${isLast ? 'bg-transparent' : isPassed ? 'bg-green-400 dark:bg-green-600' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                      </div>

                      {/* Stop Info */}
                      <div className={`flex flex-1 items-center gap-4 rounded-lg p-3 transition-colors ${isLive ? 'bg-green-50 dark:bg-green-900/20' : isPassed ? 'opacity-60' : ''}`}>
                        <Link
                          href={`/station/${stop.stationCode}`}
                          className="flex flex-1 items-center gap-4 hover:opacity-80"
                        >
                          <div className="w-16 flex-shrink-0 text-center">
                            <div className="text-xs font-medium text-zinc-400">Day {stop.day}</div>
                            <div className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                              {minutesToTime(stop.arrivalMinutes ?? stop.departureMinutes ?? 0)}
                            </div>
                            {liveInfo?.delayArrivalMinutes !== undefined && liveInfo.delayArrivalMinutes !== 0 && (
                              <div className={`text-xs ${liveInfo.delayArrivalMinutes > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {liveInfo.delayArrivalMinutes > 0 ? '+' : ''}{liveInfo.delayArrivalMinutes}m → {minutesToTime((stop.arrivalMinutes ?? stop.departureMinutes ?? 0) + liveInfo.delayArrivalMinutes)}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`font-medium ${isPassed ? 'text-zinc-500 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'}`}>{stop.stationName}</span>
                              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                {stop.stationCode}
                              </span>
                              {isLive && (
                                <span className="inline-flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
                                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500"></span>
                                  {liveData?.currentLocation?.status === 'AT_STATION' ? 'At Station' : 'Departed'}
                                </span>
                              )}
                              {isPassed && (
                                <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                  ✓ Passed
                                </span>
                              )}
                              {liveInfo?.platform && (
                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                                  PF {liveInfo.platform}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              {stop.distanceKm !== undefined ? `${stop.distanceKm} km` : '0 km'} 
                              {stop.haltMinutes !== undefined && stop.haltMinutes > 0 ? ` • ${stop.haltMinutes}m halt` : ''}
                            </div>
                          </div>
                        </Link>

                        <Link href={`/station/${stop.stationCode}`}>
                          <svg className="h-5 w-5 flex-shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>

                    {/* Intermediate Stations Toggle - Between main stops */}
                    {intermediateStations.length > 0 && (
                      <div className="relative flex items-stretch gap-4">
                        {/* Timeline connector */}
                        <div className="flex flex-col items-center">
                          <div className={`flex-1 w-0.5 ${isPassed ? 'bg-green-400 dark:bg-green-600' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                          <button
                            onClick={() => toggleExpanded(index)}
                            className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              isExpanded 
                                ? 'border-blue-500 bg-blue-500 text-white' 
                                : 'border-zinc-300 bg-white text-zinc-500 hover:border-blue-400 hover:bg-blue-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-blue-500 dark:hover:bg-blue-900/30'
                            }`}
                          >
                            <svg className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <div className={`flex-1 w-0.5 ${isPassed ? 'bg-green-400 dark:bg-green-600' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                        </div>

                        {/* Label */}
                        <button
                          onClick={() => toggleExpanded(index)}
                          className="flex items-center gap-2 py-1 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                        >
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                            {intermediateStations.length} intermediate station{intermediateStations.length > 1 ? 's' : ''}
                          </span>
                          <span>{isExpanded ? 'Hide' : 'Show'}</span>
                        </button>
                      </div>
                    )}

                    {/* Intermediate Stations (Expanded) */}
                    {isExpanded && intermediateStations.length > 0 && (
                      <div className="relative">
                        {intermediateStations.map((intStop, intIdx) => {
                          const intStopDistance = intStop.distanceKm ?? 0;
                          const currentDistance = liveData?.currentLocation?.distanceFromOriginKm ?? 0;
                          const liveStatus = liveData?.currentLocation?.status;
                          // Only mark as passed if train has actually crossed this station
                          // AT_STATION: train is at a station, so intermediate is passed only if strictly less than current distance
                          // DEPARTED: train has left a station, passed if distance is less than or equal
                          let isIntPassed = false;
                          if (liveData?.currentLocation) {
                            if (liveStatus === 'AT_STATION') {
                              isIntPassed = intStopDistance < currentDistance;
                            } else {
                              isIntPassed = intStopDistance < currentDistance;
                            }
                          }
                          
                          return (
                            <div key={`int-${intStop.stationCode}-${intIdx}`} className="relative flex items-stretch gap-4">
                              {/* Timeline */}
                              <div className="flex flex-col items-center">
                                <div className={`flex-1 w-0.5 ${isIntPassed ? 'bg-green-400 dark:bg-green-600' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                                <div className={`h-2 w-2 flex-shrink-0 rounded-full ${isIntPassed ? 'bg-green-300 dark:bg-green-600' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                                <div className={`flex-1 w-0.5 ${isIntPassed ? 'bg-green-400 dark:bg-green-600' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                              </div>

                              {/* Station Info */}
                              <div className={`flex flex-1 items-center gap-4 py-1 ${isIntPassed ? 'opacity-50' : ''}`}>
                                <div className="w-16 flex-shrink-0 text-center">
                                  <div className="font-mono text-xs text-zinc-400">
                                    {minutesToTime(intStop.arrivalMinutes ?? intStop.departureMinutes ?? 0)}
                                  </div>
                                </div>
                                <div className="flex flex-1 items-center gap-2">
                                  <span className="text-sm text-zinc-500 dark:text-zinc-400">{intStop.stationName}</span>
                                  <span className="rounded bg-zinc-50 px-1 py-0.5 text-xs text-zinc-400 dark:bg-zinc-800/50">
                                    {intStop.stationCode}
                                  </span>
                                  {isIntPassed && (
                                    <span className="text-xs text-zinc-400">✓</span>
                                  )}
                                </div>
                                <span className="text-xs text-zinc-400">{intStop.distanceKm ?? 0} km</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
