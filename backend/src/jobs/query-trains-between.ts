import 'dotenv/config';
import { getPrisma, disconnect } from '../lib/db.js';
import { log, logError } from '../lib/utils.js';

/**
 * Query trains between two stations using the local Schedule table.
 * This replaces the RailRadar /trains/between endpoint once schedules are populated.
 *
 * Usage: npx tsx src/jobs/query-trains-between.ts NDLS BCT
 */
async function main() {
  const [fromCode, toCode] = process.argv.slice(2);
  if (!fromCode || !toCode) {
    console.error('Usage: npx tsx src/jobs/query-trains-between.ts <FROM_CODE> <TO_CODE>');
    process.exit(1);
  }

  const prisma = getPrisma();

  // Find trains that stop at BOTH stations, with from.stopNumber < to.stopNumber
  const results = await prisma.$queryRaw<
    Array<{
      trainNumber: string;
      trainName: string;
      fromStop: number;
      toStop: number;
      fromDep: string | null;
      toArr: string | null;
      fromDay: number | null;
      toDay: number | null;
      distance: number | null;
    }>
  >`
    SELECT
      t."trainNumber",
      t."trainName",
      s1."stopNumber" as "fromStop",
      s2."stopNumber" as "toStop",
      s1."departureTime" as "fromDep",
      s2."arrivalTime" as "toArr",
      s1.day as "fromDay",
      s2.day as "toDay",
      CASE WHEN s2.distance IS NOT NULL AND s1.distance IS NOT NULL
        THEN s2.distance - s1.distance
        ELSE NULL
      END as distance
    FROM "Schedule" s1
    JOIN "Schedule" s2 ON s1."trainNumber" = s2."trainNumber"
    JOIN "Train" t ON t."trainNumber" = s1."trainNumber"
    WHERE s1."stationCode" = ${fromCode}
      AND s2."stationCode" = ${toCode}
      AND s1."stopNumber" < s2."stopNumber"
    ORDER BY s1."departureTime" ASC NULLS LAST
  `;

  log('TrainsBetween', `Found ${results.length} trains from ${fromCode} to ${toCode}`);

  for (const r of results) {
    console.log(
      `  ${r.trainNumber} ${r.trainName.padEnd(30)} dep=${r.fromDep || '??'} arr=${r.toArr || '??'} ` +
        `day ${r.fromDay || '?'}→${r.toDay || '?'} ${r.distance != null ? r.distance + 'km' : ''}`
    );
  }

  await disconnect();
}

main().catch((err) => {
  logError('TrainsBetween', 'Fatal error', err);
  process.exit(1);
});
