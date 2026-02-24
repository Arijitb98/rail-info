'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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

  const arrivingTrains = liveData?.trains.filter(t => !t.hasArrived && !t.hasDeparted) || [];
  const departedTrains = liveData?.trains.filter(t => t.hasDeparted) || [];

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
              <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{liveData.totalTrains}</div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Trains (next {liveData.queryingForNextHours}h)</div>
              </div>
              <div className="rounded-xl bg-green-50 p-4 dark:bg-green-900/20">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">{arrivingTrains.length}</div>
                <div className="text-sm text-green-600 dark:text-green-500">Arriving</div>
              </div>
              <div className="rounded-xl bg-orange-50 p-4 dark:bg-orange-900/20">
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">{departedTrains.length}</div>
                <div className="text-sm text-orange-600 dark:text-orange-500">Departed</div>
              </div>
            </div>
          )}
        </div>

        {/* Live Trains */}
        {liveData && liveData.trains.length > 0 ? (
          <div className="space-y-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-sm dark:bg-green-900/40">🚂</span>
              Live Train Schedule
            </h2>
            <div className="space-y-3">
              {liveData.trains.map((train) => (
                <Link
                  key={`${train.trainNumber}-${train.journeyDate}`}
                  href={`/train/${train.trainNumber}`}
                  className={`flex flex-col gap-3 rounded-xl border bg-white p-4 transition-all hover:shadow-md sm:flex-row sm:items-center dark:bg-zinc-900 ${
                    train.isCancelled
                      ? 'border-red-300 dark:border-red-800'
                      : train.hasDeparted
                      ? 'border-zinc-200 opacity-60 dark:border-zinc-800'
                      : 'border-zinc-200 hover:border-blue-300 dark:border-zinc-800 dark:hover:border-blue-700'
                  }`}
                >
                  {/* Train Info */}
                  <div className="flex items-center gap-3 sm:w-64">
                    <div className={`flex h-12 w-16 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                      train.isCancelled
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
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className="flex flex-1 items-center gap-4 text-sm">
                    {/* Arrival */}
                    <div className="flex-1">
                      <div className="text-xs font-medium uppercase text-zinc-400">Arr</div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {train.scheduledArrival || '--:--'}
                      </div>
                      {train.expectedArrival && train.expectedArrival !== train.scheduledArrival && (
                        <div className={`text-xs ${train.arrivalDelay?.includes('On Time') ? 'text-green-600' : 'text-orange-600'}`}>
                          {train.expectedArrival} ({train.arrivalDelay})
                        </div>
                      )}
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
