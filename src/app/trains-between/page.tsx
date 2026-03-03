'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import StationSearch from '@/components/StationSearch';
import SiteHeader from '@/components/SiteHeader';

interface Station {
  code: string;
  name: string;
}

interface StationSchedule {
  arrival: string | null;
  departure: string | null;
  day: number;
  distanceKm?: number;
}

interface TrainBetween {
  trainNumber: string;
  trainName: string;
  type: string;
  sourceStationCode: string;
  sourceStationName: string;
  destinationStationCode: string;
  destinationStationName: string;
  runningDays: string[];
  runsAllDays: boolean;
  travelTimeDisplay: string;
  fromStation: StationSchedule;
  toStation: StationSchedule;
}

interface TrainsBetweenData {
  fromStationCode: string;
  toStationCode: string;
  totalTrains: number;
  trains: TrainBetween[];
}

type SortOption = 'default' | 'shortest-duration' | 'earliest-departure' | 'latest-departure';

function parseTimeToMinutes(time: string | null): number | null {
  if (!time) return null;
  const [hoursStr, minutesStr] = time.split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function getStationAbsoluteMinutes(station: StationSchedule, mode: 'departure' | 'arrival'): number | null {
  const preferredTime = mode === 'departure' ? station.departure : station.arrival;
  const fallbackTime = mode === 'departure' ? station.arrival : station.departure;
  const minutes = parseTimeToMinutes(preferredTime ?? fallbackTime);
  if (minutes === null) return null;
  const dayOffset = (station.day - 1) * 24 * 60;
  return dayOffset + minutes;
}

function getTravelDurationMinutes(fromStation: StationSchedule, toStation: StationSchedule): number | null {
  const start = getStationAbsoluteMinutes(fromStation, 'departure');
  const end = getStationAbsoluteMinutes(toStation, 'arrival');
  if (start === null || end === null || end < start) return null;
  return end - start;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function TrainsBetweenContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const fromCode = searchParams.get('from');
  const toCode = searchParams.get('to');

  const [data, setData] = useState<TrainsBetweenData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // For new search
  const [fromStation, setFromStation] = useState<Station | null>(null);
  const [toStation, setToStation] = useState<Station | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('default');

  useEffect(() => {
    if (!fromCode || !toCode) return;

    const fetchTrains = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/trains-between?from=${encodeURIComponent(fromCode)}&to=${encodeURIComponent(toCode)}`);
        const result = await res.json();

        if (!res.ok) {
          setError(result.error || 'Failed to fetch trains');
          return;
        }

        setData(result);
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchTrains();
  }, [fromCode, toCode]);

  const handleSearch = () => {
    if (fromStation && toStation) {
      router.push(`/trains-between?from=${fromStation.code}&to=${toStation.code}`);
    }
  };

  const handleSwap = () => {
    if (fromCode && toCode) {
      router.push(`/trains-between?from=${toCode}&to=${fromCode}`);
    }
  };

  const trainsWithMetrics = useMemo(() => {
    if (!data) return [];
    return data.trains.map((train) => {
      const legDurationMinutes = getTravelDurationMinutes(train.fromStation, train.toStation);
      const departureAbsMinutes = getStationAbsoluteMinutes(train.fromStation, 'departure');
      const arrivalAbsMinutes = getStationAbsoluteMinutes(train.toStation, 'arrival');
      const displayDuration = legDurationMinutes !== null ? formatDuration(legDurationMinutes) : train.travelTimeDisplay;
      const fromDayRaw = train.fromStation.day ?? 1;
      const toDayRaw = train.toStation.day ?? fromDayRaw;
      const relativeFromDay = 1;
      const relativeToDay = Math.max(1, relativeFromDay + Math.max(0, toDayRaw - fromDayRaw));
      return {
        train,
        legDurationMinutes,
        departureAbsMinutes,
        arrivalAbsMinutes,
        displayDuration,
        relativeFromDay,
        relativeToDay,
      };
    });
  }, [data]);

  const sortedTrains = useMemo(() => {
    if (sortOption === 'default') return trainsWithMetrics;
    const list = [...trainsWithMetrics];

    switch (sortOption) {
      case 'shortest-duration':
        list.sort((a, b) => (a.legDurationMinutes ?? Infinity) - (b.legDurationMinutes ?? Infinity));
        break;
      case 'earliest-departure':
        list.sort((a, b) => (a.departureAbsMinutes ?? Infinity) - (b.departureAbsMinutes ?? Infinity));
        break;
      case 'latest-departure':
        list.sort((a, b) => (b.departureAbsMinutes ?? -Infinity) - (a.departureAbsMinutes ?? -Infinity));
        break;
      default:
        break;
    }

    return list;
  }, [sortOption, trainsWithMetrics]);

  // Show search form if no params
  if (!fromCode || !toCode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-orange-100 dark:from-blue-900/40 dark:to-orange-900/40">
                <svg className="h-8 w-8 text-zinc-700 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Find Trains Between Stations
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Search for all trains running between any two stations
              </p>
            </div>

            <div className="space-y-4">
              <StationSearch
                label="From Station"
                placeholder="Origin station..."
                onSelect={(station) => setFromStation(station)}
              />
              <StationSearch
                label="To Station"
                placeholder="Destination station..."
                onSelect={(station) => setToStation(station)}
              />
              <button
                onClick={handleSearch}
                disabled={!fromStation || !toStation}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Search Trains
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-zinc-600 dark:text-zinc-400">Searching for trains...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/50">
            <div className="mb-4 text-4xl">🚫</div>
            <h1 className="mb-2 text-xl font-semibold text-red-800 dark:text-red-200">
              Search Failed
            </h1>
            <p className="mb-6 text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => router.push('/trains-between')}
              className="rounded-xl bg-red-600 px-6 py-2 font-medium text-white transition-colors hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Route Header */}
        <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            {/* From Station */}
            <Link
              href={`/station/${data.fromStationCode}`}
              className="flex-1 rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-center transition-all hover:border-blue-400 dark:border-blue-900 dark:bg-blue-950/30"
            >
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">From</div>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{data.fromStationCode}</div>
            </Link>

            {/* Swap Button */}
            <button
              onClick={handleSwap}
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-zinc-200 bg-white transition-all hover:border-zinc-400 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800"
            >
              <svg className="h-5 w-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>

            {/* To Station */}
            <Link
              href={`/station/${data.toStationCode}`}
              className="flex-1 rounded-xl border-2 border-orange-200 bg-orange-50 p-4 text-center transition-all hover:border-orange-400 dark:border-orange-900 dark:bg-orange-950/30"
            >
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-orange-600 dark:text-orange-400">To</div>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{data.toStationCode}</div>
            </Link>
          </div>

          <div className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Found <span className="font-semibold text-zinc-900 dark:text-zinc-100">{data.totalTrains}</span> train(s) on this route
          </div>
        </div>

        {/* Results */}
        {data.totalTrains === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 text-4xl">🔍</div>
            <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              No Direct Trains Found
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              There are no direct trains between these stations.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Trains List */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="text-2xl">🚄</span>
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Available Trains</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{data.fromStationCode} → {data.toStationCode}</p>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-3">
                <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400" htmlFor="trains-sort-select">
                  Sort
                </label>
                <select
                  id="trains-sort-select"
                  value={sortOption}
                  onChange={(event) => setSortOption(event.target.value as SortOption)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-blue-500 dark:focus:ring-blue-500/30"
                >
                  <option value="default">Default</option>
                  <option value="shortest-duration">Shortest travel time</option>
                  <option value="earliest-departure">Earliest departure</option>
                  <option value="latest-departure">Latest departure</option>
                </select>
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                  {data.totalTrains} train{data.totalTrains !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              {sortedTrains.map(({ train, displayDuration, relativeFromDay, relativeToDay }) => (
                <Link
                  key={train.trainNumber}
                  href={`/train/${train.trainNumber}`}
                  className="block rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-green-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-green-700"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {/* Train Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/40">
                        <span className="text-xs font-bold text-green-700 dark:text-green-400">
                          #{train.trainNumber}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                            {train.trainName}
                          </span>
                          <span className="flex-shrink-0 rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {train.type}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          {train.sourceStationCode} → {train.destinationStationCode}
                        </div>
                      </div>
                    </div>

                    {/* Schedule Info */}
                    <div className="flex items-center gap-6 sm:gap-8">
                      <div className="text-center">
                        <div className="text-xs font-medium uppercase text-zinc-400">Departs</div>
                        <div className="font-mono text-lg font-bold text-zinc-900 dark:text-zinc-100">
                          {train.fromStation.departure || '--:--'}
                        </div>
                        {relativeFromDay > 1 && (
                          <div className="text-xs text-zinc-500">Day {relativeFromDay}</div>
                        )}
                      </div>

                      <div className="flex flex-col items-center">
                        <div className="text-xs font-medium text-zinc-400">{displayDuration}</div>
                        <div className="my-1 h-0.5 w-12 bg-gradient-to-r from-green-400 to-orange-400"></div>
                        <svg className="h-3 w-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>

                      <div className="text-center">
                        <div className="text-xs font-medium uppercase text-zinc-400">Arrives</div>
                        <div className="font-mono text-lg font-bold text-zinc-900 dark:text-zinc-100">
                          {train.toStation.arrival || '--:--'}
                        </div>
                        {relativeToDay > 1 && (
                          <div className="text-xs text-orange-600">Day {relativeToDay}</div>
                        )}
                      </div>

                      <svg className="hidden h-5 w-5 flex-shrink-0 text-zinc-400 sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {/* Running Days */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Runs on:</span>
                    {train.runsAllDays ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                        Daily
                      </span>
                    ) : (
                      train.runningDays.map((day) => (
                        <span key={day} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          {day.slice(0, 3)}
                        </span>
                      ))
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* New Search Button */}
        <div className="mt-8 text-center">
          <Link
            href="/trains-between"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-zinc-300 px-6 py-3 font-medium text-zinc-700 transition-all hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            New Search
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function TrainsBetweenPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    }>
      <TrainsBetweenContent />
    </Suspense>
  );
}
