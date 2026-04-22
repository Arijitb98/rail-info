import 'dotenv/config';
import cron from 'node-cron';
import { getPrisma, disconnect } from './lib/db.js';
import { log, logError } from './lib/utils.js';
import { run as runScheduleScrape } from './jobs/scrape-schedules.js';
import { run as runStationScrape } from './jobs/scrape-stations.js';

log('Backend', 'Rail-Info backend service starting...');

// Verify DB connectivity on startup
async function healthCheck(): Promise<void> {
  const prisma = getPrisma();
  const result = await prisma.$queryRaw<[{ ok: number }]>`SELECT 1 as ok`;
  if (result[0]?.ok !== 1) throw new Error('DB health check failed');

  const [trainCount, stationCount, scheduleCount] = await Promise.all([
    prisma.train.count(),
    prisma.station.count(),
    prisma.schedule.count(),
  ]);

  log('Backend', `DB connected — ${trainCount} trains, ${stationCount} stations, ${scheduleCount} schedule rows`);
}

async function main(): Promise<void> {
  await healthCheck();

  // Warn if RAILRADAR_API_KEY is missing — all RailRadar calls will fail
  if (!process.env.RAILRADAR_API_KEY) {
    logError('Backend', 'RAILRADAR_API_KEY is not set — RailRadar provider will be unavailable, falling back to NTES only');
  }

  // ─── Cron Jobs ──────────────────────────────────────────────────
  // Schedule scraping: every 6 hours by default
  const scheduleInterval = process.env.SCHEDULE_SCRAPE_INTERVAL || '360';
  const scheduleCron = `0 */${Math.max(1, Math.floor(parseInt(scheduleInterval) / 60))} * * *`;

  cron.schedule(scheduleCron, async () => {
    log('Cron', 'Starting schedule scrape job...');
    try {
      await runScheduleScrape();
    } catch (err) {
      logError('Cron', 'Schedule scrape job failed', err);
    }
  });

  log('Backend', `Schedule scrape cron: ${scheduleCron}`);

  // Station metadata scraping: once daily at 3 AM
  cron.schedule('0 3 * * *', async () => {
    log('Cron', 'Starting station scrape job...');
    try {
      await runStationScrape();
    } catch (err) {
      logError('Cron', 'Station scrape job failed', err);
    }
  });

  log('Backend', 'Station scrape cron: 0 3 * * * (daily 3 AM)');

  log('Backend', 'Service running. Press Ctrl+C to stop.');
}

// Graceful shutdown
async function shutdown(): Promise<void> {
  log('Backend', 'Shutting down...');
  await disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((err) => {
  logError('Backend', 'Failed to start', err);
  process.exit(1);
});
