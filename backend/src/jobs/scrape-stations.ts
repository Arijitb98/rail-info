import 'dotenv/config';
import PQueue from 'p-queue';
import { getPrisma, disconnect } from '../lib/db.js';
import { ProviderChain } from '../orchestrator.js';
import { railradarProvider } from '../providers/railradar.js';
import { log, logError, sleep } from '../lib/utils.js';

const CONCURRENCY = 5;
const DELAY_BETWEEN_MS = 200;

/**
 * Scrape detailed station metadata (lat/lng, hindi name, zone, etc.)
 * for all stations in the database.
 *
 * Usage: npx tsx src/jobs/scrape-stations.ts [--limit 100]
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
  const chain = new ProviderChain([railradarProvider]);
  const queue = new PQueue({ concurrency: CONCURRENCY });

  // Only fetch stations missing lat/lng
  const stations = await prisma.station.findMany({
    where: { latitude: null },
    select: { code: true },
    ...(limit ? { take: limit } : {}),
  });

  log('ScrapeStations', `Found ${stations.length} stations missing coordinates`);

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  const tasks = stations.map((station: { code: string }) =>
    queue.add(async () => {
      try {
        const detail = await chain.getStationDetail(station.code);
        if (!detail) {
          failed++;
          return;
        }

        await prisma.station.update({
          where: { code: station.code },
          data: {
            name: detail.name || undefined,
            nameHindi: detail.nameHindi || undefined,
            latitude: detail.latitude ?? undefined,
            longitude: detail.longitude ?? undefined,
          },
        });

        succeeded++;
        log('ScrapeStations', `✓ ${station.code} — ${detail.name} (${detail.latitude}, ${detail.longitude})`);
      } catch (err) {
        failed++;
        logError('ScrapeStations', `✗ ${station.code}`, err);
      } finally {
        processed++;
        if (processed % 100 === 0) {
          log('ScrapeStations', `Progress: ${processed}/${stations.length} (ok=${succeeded}, fail=${failed})`);
        }
      }

      await sleep(DELAY_BETWEEN_MS);
    })
  );

  await Promise.all(tasks);

  log('ScrapeStations', `Done: ${succeeded} succeeded, ${failed} failed out of ${stations.length}`);
}

// Allow running as standalone CLI script
const isMainModule = process.argv[1]?.includes('scrape-stations');
if (isMainModule) {
  _run().then(() => disconnect()).catch((err) => {
    logError('ScrapeStations', 'Fatal error', err);
    process.exit(1);
  });
}
