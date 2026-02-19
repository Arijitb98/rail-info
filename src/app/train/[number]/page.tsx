'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Station {
  code: string;
  name: string;
}

interface Train {
  trainNumber: string;
  trainName: string;
  sourceStationCode: string | null;
  destinationStationCode: string | null;
}

export default function TrainDetailPage() {
  const params = useParams();
  const router = useRouter();
  const trainNumber = params.number as string;

  const [train, setTrain] = useState<Train | null>(null);
  const [sourceStation, setSourceStation] = useState<Station | null>(null);
  const [destStation, setDestStation] = useState<Station | null>(null);
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
        setSourceStation(data.sourceStation);
        setDestStation(data.destStation);
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
              <div className="mb-1 inline-block rounded-lg bg-orange-100 px-3 py-1 text-sm font-bold text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                #{train.trainNumber}
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-zinc-100">
                {train.trainName}
              </h1>
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
            <div className="flex-1">
              <Link
                href={sourceStation ? `/station/${sourceStation.code}` : '#'}
                className={`group block rounded-xl border-2 p-4 transition-all ${
                  sourceStation
                    ? 'border-green-200 bg-green-50 hover:border-green-400 hover:shadow-md dark:border-green-900 dark:bg-green-950/30 dark:hover:border-green-700'
                    : 'cursor-default border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50'
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-200 text-lg dark:bg-green-900">🚀</span>
                  <span className="text-xs font-medium uppercase tracking-wider text-green-700 dark:text-green-400">Origin</span>
                </div>
                {sourceStation ? (
                  <>
                    <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {sourceStation.code}
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {sourceStation.name}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-lg font-bold text-zinc-500 dark:text-zinc-500">
                      {train.sourceStationCode || 'N/A'}
                    </div>
                    <div className="text-sm text-zinc-400 dark:text-zinc-500">
                      Station data unavailable
                    </div>
                  </>
                )}
              </Link>
            </div>

            {/* Arrow */}
            <div className="mx-4 flex flex-col items-center">
              <div className="h-0.5 w-8 bg-gradient-to-r from-green-400 to-orange-400 sm:w-16" />
              <svg className="my-1 h-6 w-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <div className="h-0.5 w-8 bg-gradient-to-r from-green-400 to-orange-400 sm:w-16" />
            </div>

            {/* Destination Station */}
            <div className="flex-1">
              <Link
                href={destStation ? `/station/${destStation.code}` : '#'}
                className={`group block rounded-xl border-2 p-4 transition-all ${
                  destStation
                    ? 'border-orange-200 bg-orange-50 hover:border-orange-400 hover:shadow-md dark:border-orange-900 dark:bg-orange-950/30 dark:hover:border-orange-700'
                    : 'cursor-default border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50'
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-200 text-lg dark:bg-orange-900">🏁</span>
                  <span className="text-xs font-medium uppercase tracking-wider text-orange-700 dark:text-orange-400">Destination</span>
                </div>
                {destStation ? (
                  <>
                    <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {destStation.code}
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {destStation.name}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-lg font-bold text-zinc-500 dark:text-zinc-500">
                      {train.destinationStationCode || 'N/A'}
                    </div>
                    <div className="text-sm text-zinc-400 dark:text-zinc-500">
                      Station data unavailable
                    </div>
                  </>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Train Details */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Train Details
            </h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-zinc-500 dark:text-zinc-400">Train Number</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">{train.trainNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500 dark:text-zinc-400">Train Name</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">{train.trainName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500 dark:text-zinc-400">Source Code</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">{train.sourceStationCode || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500 dark:text-zinc-400">Destination Code</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">{train.destinationStationCode || 'N/A'}</dd>
              </div>
            </dl>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
              <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                disabled
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-3 font-medium text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Live Status (Coming Soon)
              </button>
              <button
                disabled
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-3 font-medium text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Full Schedule (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
