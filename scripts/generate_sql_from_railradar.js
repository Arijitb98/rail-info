#!/usr/bin/env node
const fs = require('fs/promises');

const API_BASE = 'https://api.railradar.in/api/v1';
const apiKey = process.env.RAILRADAR_API_KEY;

if (!apiKey) {
  console.error('Set RAILRADAR_API_KEY in environment before running.');
  process.exit(1);
}

function escapeSqlString(s) {
  if (s === null || s === undefined) return 'NULL';
  if (typeof s !== 'string') s = String(s);
  return "'" + s.replace(/'/g, "''") + "'";
}

function chunkArray(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

async function fetchKV(path) {
  const res = await fetch(`${API_BASE}${path}?apiKey=${apiKey}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} while fetching ${path}`);
  const json = await res.json();
  if (!json.success) throw new Error('API returned success=false');
  return json.data;
}

async function main() {
  console.log('Fetching stations...');
  const stations = await fetchKV('/stations/all-kvs');
  console.log(`Fetched ${stations.length} stations`);

  console.log('Fetching trains...');
  const trains = await fetchKV('/trains/all-kvs');
  console.log(`Fetched ${trains.length} trains`);

  const outDir = 'out';
  await fs.mkdir(outDir, { recursive: true });

  // Stations
  const stationChunks = chunkArray(stations, 500);
  let stationSql = '-- Generated Stations INSERTs\n\n';
  for (const chunk of stationChunks) {
    const values = chunk
      .map(([code, name]) => `(${escapeSqlString(code)}, ${escapeSqlString(name)}, NULL, NULL)`)
      .join(',\n');
    stationSql += `INSERT INTO "Station" ("code","name","nameHindi","latitude","longitude") VALUES\n${values}\nON CONFLICT ("code") DO NOTHING;\n\n`;
  }
  await fs.writeFile(`${outDir}/stations.sql`, stationSql);
  console.log('Wrote out/stations.sql');

  // Trains
  const trainChunks = chunkArray(trains, 1000);
  let trainSql = '-- Generated Trains INSERTs\n\n';
  for (const chunk of trainChunks) {
    const values = chunk
      .map(([trainNumber, trainName]) => `(${escapeSqlString(trainNumber)}, ${escapeSqlString(trainName)}, NULL, NULL)`)
      .join(',\n');
    trainSql += `INSERT INTO "Train" ("trainNumber","trainName","sourceStationCode","destinationStationCode") VALUES\n${values}\nON CONFLICT ("trainNumber") DO NOTHING;\n\n`;
  }
  await fs.writeFile(`${outDir}/trains.sql`, trainSql);
  console.log('Wrote out/trains.sql');
  console.log('Done. Paste the generated SQL into Supabase SQL editor (Stations first, then Trains).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
