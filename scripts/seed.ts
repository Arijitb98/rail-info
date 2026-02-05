import { PrismaClient } from '../src/generated/prisma/client';
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import fetch from 'node-fetch';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Check your .env file.');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const RAILRADAR_API_BASE_URL = 'https://api.railradar.in/api/v1';
const RAILRADAR_API_KEY = process.env.RAILRADAR_API_KEY;

type RailRadarError = {
  code?: string;
  message?: string;
  statusCode?: number;
  retryable?: boolean;
};

type RailRadarResponse<T> = {
  success: boolean;
  data?: T;
  error?: RailRadarError;
  meta?: unknown;
};

function withApiKey(url: string): string {
  if (!RAILRADAR_API_KEY) return url;
  const u = new URL(url);
  if (!u.searchParams.has('apiKey')) u.searchParams.set('apiKey', RAILRADAR_API_KEY);
  return u.toString();
}

function unwrapResponse<T>(resp: RailRadarResponse<T>, url: string): T {
  if (!resp || resp.success !== true) {
    const msg = resp?.error?.message ?? 'Unknown API error';
    const code = resp?.error?.code ? ` (${resp.error.code})` : '';
    throw new Error(`RailRadar API error${code} for ${url}: ${msg}`);
  }
  if (typeof resp.data === 'undefined') {
    throw new Error(`RailRadar API response missing data for ${url}`);
  }
  return resp.data;
}

function normalizeKvs(data: unknown): Array<{ key: string; value: string }> {
  if (!data) return [];

  if (Array.isArray(data)) {
    // Tuple list: [[key, value], ...]
    if (data.every((row) => Array.isArray(row))) {
      const pairs: Array<{ key: string; value: string }> = [];
      for (const row of data as unknown[]) {
        if (!Array.isArray(row) || row.length < 2) continue;
        const [key, value] = row as [unknown, unknown];
        if (typeof key === 'string' && typeof value === 'string') pairs.push({ key, value });
      }
      return pairs;
    }
  }

  // Record mapping: { key: value }
  if (typeof data === 'object') {
    const pairs: Array<{ key: string; value: string }> = [];
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (typeof value === 'string') pairs.push({ key, value });
    }
    return pairs;
  }

  return [];
}

async function fetchJson<T>(url: string): Promise<T> {
  const finalUrl = withApiKey(url);
  const res = await fetch(finalUrl, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'rail-info-seed/1.0 (+https://localhost)',
      ...(RAILRADAR_API_KEY ? { 'X-API-Key': RAILRADAR_API_KEY } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} for ${finalUrl}\n${text.slice(0, 500)}`);
  }

  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Non-JSON response for ${finalUrl}: ${text.slice(0, 200)}`);
  }
}

async function seedStations() {
  const url = `${RAILRADAR_API_BASE_URL}/stations/all-kvs`;
  const resp = await fetchJson<RailRadarResponse<unknown>>(url);
  const data = unwrapResponse(resp as RailRadarResponse<unknown>, url);
  const pairs = normalizeKvs(data);

  if (pairs.length === 0) {
    throw new Error(`Stations KV response parsed to 0 entries from ${url}`);
  }

  const stationRows = pairs.map(({ key, value }) => ({ code: key, name: value }));

  await prisma.station.createMany({
    data: stationRows,
    skipDuplicates: true,
  });

  console.log(`Seeded ${stationRows.length} stations (createMany, skipDuplicates).`);
}

async function seedTrains() {
  if (!RAILRADAR_API_KEY) {
    console.log('Skipping trains seed: RAILRADAR_API_KEY is not set.');
    return;
  }

  const url = `${RAILRADAR_API_BASE_URL}/trains/all-kvs`;
  const resp = await fetchJson<RailRadarResponse<unknown>>(url);
  const data = unwrapResponse(resp as RailRadarResponse<unknown>, url);
  const pairs = normalizeKvs(data);

  if (pairs.length === 0) {
    throw new Error(`Trains KV response parsed to 0 entries from ${url}`);
  }

  const trainRows = pairs.map(({ key, value }) => ({
    trainNumber: key,
    trainName: value,
    sourceStationCode: null,
    destinationStationCode: null,
  }));

  await prisma.train.createMany({
    data: trainRows,
    skipDuplicates: true,
  });

  console.log(`Seeded ${trainRows.length} trains (createMany, skipDuplicates).`);
}

async function main() {
  await seedStations();
  await seedTrains();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
