'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type Station = {
  code: string;
  name: string;
  nameHindi: string | null;
  latitude: number | null;
  longitude: number | null;
};

type Props = {
  label: string;
  placeholder?: string;
  onSelect?: (station: Station) => void;
};

export default function StationSearch({ label, placeholder = 'Search stations...', onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Station | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/stations/search?q=${encodeURIComponent(q)}&limit=10`);
      const json = await res.json();
      setResults(json.data ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (station: Station) => {
    setSelected(station);
    setQuery(`${station.code} - ${station.name}`);
    setOpen(false);
    onSelect?.(station);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setSelected(null);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 shadow-sm outline-none transition-all placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400"
        />
        {loading && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-500" />
          </div>
        )}
        {selected && !loading && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {results.map((station) => (
            <li key={station.code}>
              <button
                type="button"
                onClick={() => handleSelect(station)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-blue-50 dark:hover:bg-zinc-800"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {station.code.slice(0, 4)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {station.name}
                  </p>
                  <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                    Code: {station.code}
                    {station.nameHindi && ` • ${station.nameHindi}`}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query.length >= 2 && !loading && results.length === 0 && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-500 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          No stations found for &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
