'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';

interface Station {
  code: string;
  name: string;
  nameHindi?: string;
  address?: string;
  zone?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
}

interface LiveTrain {
  trainNumber: string;
  trainName: string;
  trainType: string;
  sourceStationCode: string;
  destinationStationCode: string;
  platform?: string;
  journeyDate: string;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  expectedArrival?: string;
  expectedDeparture?: string;
  arrivalDelay?: string;
  departureDelay?: string;
  isCancelled: boolean;
  hasArrived: boolean;
  hasDeparted: boolean;
}

interface LiveData {
  totalTrains: number;
  queryingForNextHours: number;
  trains: LiveTrain[];
}

export default function StationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [station, setStation] = useState<Station | null>(null);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    if (!code) return;

    const fetchStation = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/stations/${encodeURIComponent(code)}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to fetch station');
          return;
        }

        setStation(data.station);
        setLiveData(data.live);
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchStation();
  }, [code]);

  // ✅ All hooks must be called before any early returns
  const TRAIN_TYPE_LABELS: Record<string, string> = {
    MEX: 'Mail/Express',
    SUF: 'Superfast',
    TOD: 'Tourist/Other',
    SUB: 'Suburban',
    VNDB: 'Vande Bharat',
    DRNT: 'Duronto',
  };

  const availableTypes = useMemo(() => {
    if (!liveData) return [];
    const types = Array.from(new Set(liveData.trains.map(t => t.trainType).filter(Boolean)));
    return types.sort();
  }, [liveData]);

  const filteredTrains = useMemo(() => {
    if (!liveData) return [];
    const q = query.trim().toLowerCase();
    
    // Helper to parse time string (HH:MM) to minutes since midnight
    const parseTime = (time?: string): number => {
      if (!time) return Infinity;
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };
    
    // Get current time in minutes since midnight
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Calculate time relative to current time (wraps around midnight)
    const getRelativeTime = (time?: string): number => {
      const minutes = parseTime(time);
      if (minutes === Infinity) return Infinity;
      // If time is before current time, treat it as next day (add 24 hours)
      return minutes >= currentMinutes ? minutes - currentMinutes : (1440 - currentMinutes) + minutes;
    };
    
    const filtered = liveData.trains.filter((t) => {
      const matchesQuery = !q || t.trainNumber.toLowerCase().includes(q) || t.trainName.toLowerCase().includes(q);
      const matchesType = selectedTypes.size === 0 || selectedTypes.has(t.trainType);
      return matchesQuery && matchesType;
    });
    
    // Sort: upcoming trains first (relative to current time), then departed trains
    return filtered.sort((a, b) => {
      // Departed trains go to the end
      if (a.hasDeparted !== b.hasDeparted) return a.hasDeparted ? 1 : -1;
      // Cancelled trains go after non-cancelled
      if (a.isCancelled !== b.isCancelled) return a.isCancelled ? 1 : -1;
      // Sort by time relative to current time
      const timeA = getRelativeTime(a.scheduledArrival || a.scheduledDeparture);
      const timeB = getRelativeTime(b.scheduledArrival || b.scheduledDeparture);
      return timeA - timeB;
    });
  }, [liveData, query, selectedTypes]);

  // Reset pagination when filters change
  useEffect(() => { setVisibleCount(20); }, [query, selectedTypes]);

  const arrivingTrains = filteredTrains.filter(t => !t.hasArrived && !t.hasDeparted && !t.isCancelled);
  const onTimeTrains = filteredTrains.filter(t => !t.isCancelled && (t.arrivalDelay === 'On Time' || !t.arrivalDelay));
  const lateTrains = filteredTrains.filter(t => !t.isCancelled && t.arrivalDelay && t.arrivalDelay !== 'On Time');
  const visibleTrains = filteredTrains.slice(0, visibleCount);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-zinc-600 dark:text-zinc-400">Loading station details...</p>
        </div>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/50">
          <div className="mb-4 text-4xl">🚫</div>
          <h1 className="mb-2 text-xl font-semibold text-red-800 dark:text-red-200">
            Station Not Found
          </h1>
          <p className="mb-6 text-red-600 dark:text-red-400">{error || 'The station you are looking for does not exist.'}</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>
        {/* Station Header */}
        <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-zinc-900/50">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/40">
              <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="inline-block rounded-lg bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  {station.code}
                </span>
                {station.zone && (
                  <span className="inline-block rounded-lg bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {station.zone} Zone
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-zinc-100">
                {station.name}
              </h1>
              {station.nameHindi && (
                <p className="mt-1 text-lg text-zinc-600 dark:text-zinc-400">{station.nameHindi}</p>
              )}
              {station.address && (
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">{station.address}</p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          {liveData && (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{arrivingTrains.length}</div>
                <div className="text-sm text-blue-600 dark:text-blue-500">Arriving (next {liveData.queryingForNextHours}h)</div>
              </div>
              <div className="rounded-xl bg-green-50 p-4 dark:bg-green-900/20">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">{onTimeTrains.length}</div>
                <div className="text-sm text-green-600 dark:text-green-500">On Time</div>
              </div>
              <div className="rounded-xl bg-orange-50 p-4 dark:bg-orange-900/20">
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">{lateTrains.length}</div>
                <div className="text-sm text-orange-600 dark:text-orange-500">Late</div>
              </div>
            </div>
          )}
        </div>

        {/* Live Trains */}
        {liveData && liveData.trains.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-sm dark:bg-green-900/40">🚂</span>
                Live Train Schedule
              </h2>
              <div className="flex items-center gap-3">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Showing {Math.min(visibleCount, filteredTrains.length)} of {filteredTrains.length}</div>
              </div>
            </div>

            <div className="space-y-3">
              {/* Search */}
              <div className="flex items-center gap-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by train name or number"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    Clear
                  </button>
                )}
              </div>
              {/* Train type filter chips */}
              {availableTypes.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Type:</span>
                  {availableTypes.map((type) => {
                    const isActive = selectedTypes.has(type);
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          setSelectedTypes(prev => {
                            const next = new Set(prev);
                            if (next.has(type)) next.delete(type);
                            else next.add(type);
                            return next;
                          });
                        }}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          isActive
                            ? 'border-blue-500 bg-blue-500 text-white dark:border-blue-400 dark:bg-blue-500'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600'
                        }`}
                      >
                        {TRAIN_TYPE_LABELS[type] ?? type}
                      </button>
                    );
                  })}
                  {selectedTypes.size > 0 && (
                    <button
                      onClick={() => setSelectedTypes(new Set())}
                      className="text-xs text-zinc-400 underline hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-3">
              {filteredTrains.length > 0 ? (
                <>
                {visibleTrains.map((train) => (
                  <Link
                    key={`${train.trainNumber}-${train.journeyDate}`}
                    href={`/train/${train.trainNumber}`}
                    className={`flex flex-col gap-3 rounded-xl border bg-white p-4 transition-all hover:shadow-md sm:flex-row sm:items-center dark:bg-zinc-900 ${train.isCancelled
                      ? 'border-red-300 dark:border-red-800'
                      : train.hasDeparted
                        ? 'border-zinc-200 opacity-60 dark:border-zinc-800'
                        : 'border-zinc-200 hover:border-blue-300 dark:border-zinc-800 dark:hover:border-blue-700'
                      }`}
                  >
                    {/* Train Info */}
                    <div className="flex items-center gap-3 sm:w-64">
                      <div className={`flex h-12 w-16 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${train.isCancelled
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                        }`}>
                        {train.trainNumber}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                          {train.trainName}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {train.sourceStationCode} → {train.destinationStationCode}
                        </p>
                        <span className="mt-0.5 inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          {TRAIN_TYPE_LABELS[train.trainType] ?? train.trainType}
                        </span>
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="flex flex-1 items-center gap-4 text-sm">
                      {/* Arrival */}
                      <div className="flex-1">
                        <div className="text-xs font-medium uppercase text-zinc-400">Arrival</div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {train.scheduledArrival || '--:--'}
                        </div>
                        {train.arrivalDelay && train.arrivalDelay !== 'On Time' ? (
                          <div className="text-xs text-orange-600 dark:text-orange-400">
                            +{train.arrivalDelay} late
                          </div>
                        ) : train.scheduledArrival ? (
                          <div className="text-xs text-green-600 dark:text-green-500">On Time</div>
                        ) : null}
                      </div>

                      {/* Departure */}
                      <div className="flex-1">
                        <div className="text-xs font-medium uppercase text-zinc-400">Dep</div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {train.scheduledDeparture || '--:--'}
                        </div>
                        {train.expectedDeparture && train.expectedDeparture !== train.scheduledDeparture && (
                          <div className={`text-xs ${train.departureDelay?.includes('On Time') ? 'text-green-600' : 'text-orange-600'}`}>
                            {train.expectedDeparture} ({train.departureDelay})
                          </div>
                        )}
                      </div>

                      {/* Platform */}
                      <div className="w-16 text-center">
                        <div className="text-xs font-medium uppercase text-zinc-400">PF</div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">
                          {train.platform || '-'}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="w-20 text-right">
                        {train.isCancelled ? (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-400">
                            Cancelled
                          </span>
                        ) : train.hasDeparted ? (
                          <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            Departed
                          </span>
                        ) : train.hasArrived ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                            Arrived
                          </span>
                        ) : (
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                            Expected
                          </span>
                        )}
                      </div>
                    </div>

                    <svg className="hidden h-5 w-5 flex-shrink-0 text-zinc-400 sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
                {visibleCount < filteredTrains.length && (
                  <button
                    onClick={() => setVisibleCount(v => v + 20)}
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                  >
                    Show more · {filteredTrains.length - visibleCount} remaining
                  </button>
                )}
                </>
              ) : (
                <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  No trains match your search.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 text-4xl">🚂</div>
            <p className="text-zinc-600 dark:text-zinc-400">
              No live train data available at this time.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
