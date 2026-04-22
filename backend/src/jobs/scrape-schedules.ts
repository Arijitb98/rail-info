import 'dotenv/config';
import PQueue from 'p-queue';
import { getPrisma, disconnect } from '../lib/db.js';
import { ProviderChain } from '../orchestrator.js';
import { ntesProvider } from '../providers/ntes.js';
import { railradarProvider } from '../providers/railradar.js';
import { log, logError, sleep } from '../lib/utils.js';

const CONCURRENCY = 3;           // parallel requests to providers
const DELAY_BETWEEN_MS = 500;    // politeness delay per request
const BATCH_SIZE = 50;           // DB upsert batch size

/**
 * Scrape full schedules for all trains in the database and populate
 * the Schedule table + update Train source/destination fields.
 *
 * Usage: npx tsx src/jobs/scrape-schedules.ts [--limit 100]
 */
export async function run(options?: { limit?: number }) {
  const limit = options?.limit;
  return _run(limit);
}

async function _run(limitOverride?: number) {
  const limit = limitOverride ?? (() => {
    const args = process.argv.slice(2);
    const limitIdx = args.indexOf('--limit');
    return limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : undefined;
  })();

  const prisma = getPrisma();
  const chain = new ProviderChain([ntesProvider, railradarProvider]);
  const queue = new PQueue({ concurrency: CONCURRENCY });

  // Get all train numbers from DB (skip special/relief trains 00xxx-09xxx)
  const trains = await prisma.train.findMany({
    select: { trainNumber: true },
    where: { trainNumber: { gte: '10000' } },
    orderBy: { trainNumber: 'asc' },
    ...(limit ? { take: limit } : {}),
  });

  log('ScrapeSchedules', `Found ${trains.length} trains to process`);

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  const tasks = trains.map((train: { trainNumber: string }) =>
    queue.add(async () => {
      try {
        const detail = await chain.getTrainSchedule(train.trainNumber);
        if (!detail || detail.schedule.length === 0) {
          failed++;
          return;
        }

        // Upsert train source/destination
        await prisma.train.update({
          where: { trainNumber: train.trainNumber },
          data: {
            sourceStationCode: detail.sourceStationCode || undefined,
            destinationStationCode: detail.destinationStationCode || undefined,
          },
        });

        // Delete existing schedule rows and insert new ones
        await prisma.schedule.deleteMany({
          where: { trainNumber: train.trainNumber },
        });

        // Batch insert schedule stops
        const stops = detail.schedule.map((stop: { stationCode: string; arrivalTime?: string; departureTime?: string; day: number; distance?: number; stopNumber: number }) => ({
          trainNumber: train.trainNumber,
          stationCode: stop.stationCode,
          arrivalTime: stop.arrivalTime || null,
          departureTime: stop.departureTime || null,
          day: stop.day,
          distance: stop.distance ?? null,
          stopNumber: stop.stopNumber,
        }));

        for (let i = 0; i < stops.length; i += BATCH_SIZE) {
          const batch = stops.slice(i, i + BATCH_SIZE);
          await prisma.schedule.createMany({ data: batch });
        }

        succeeded++;
        log('ScrapeSchedules', `✓ ${train.trainNumber} — ${detail.schedule.length} stops`);
      } catch (err) {
        failed++;
        logError('ScrapeSchedules', `✗ ${train.trainNumber}`, err);
      } finally {
        processed++;
        if (processed % 100 === 0) {
          log('ScrapeSchedules', `Progress: ${processed}/${trains.length} (ok=${succeeded}, fail=${failed})`);
        }
      }

      await sleep(DELAY_BETWEEN_MS);
    })
  );

  await Promise.all(tasks);

  log('ScrapeSchedules', `Done: ${succeeded} succeeded, ${failed} failed out of ${trains.length}`);
}

// Allow running as standalone CLI script
const isMainModule = process.argv[1]?.includes('scrape-schedules');
if (isMainModule) {
  _run().then(() => disconnect()).catch((err) => {
    logError('ScrapeSchedules', 'Fatal error', err);
    process.exit(1);
  });
}
