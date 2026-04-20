import * as cheerio from 'cheerio';
import type {
  DataProvider,
  TrainDetail,
  ScheduleStop,
  LiveTrainStatus,
  LiveRouteStop,
  TrainBetweenResult,
  StationDetail,
  StationBoardTrain,
} from '../types/index.js';
import { log, logError, sleep } from '../lib/utils.js';

const NTES_BASE = 'https://enquiry.indianrail.gov.in/ntesEnquiry';
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Headers that mimic a real browser session
function defaultHeaders(): Record<string, string> {
  return {
    'User-Agent': USER_AGENT,
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: `${NTES_BASE}/`,
    Origin: 'https://enquiry.indianrail.gov.in',
  };
}

async function fetchNTES(path: string, retries = 2): Promise<Response> {
  const url = `${NTES_BASE}${path}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: defaultHeaders(),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) return res;
      logError('NTES', `HTTP ${res.status} for ${path}, attempt ${attempt + 1}`);
    } catch (err) {
      logError('NTES', `Fetch failed for ${path}, attempt ${attempt + 1}`, err);
    }
    if (attempt < retries) await sleep(1000 * (attempt + 1));
  }
  throw new Error(`NTES request failed after ${retries + 1} attempts: ${path}`);
}

// ─── Schedule Scraping ──────────────────────────────────────────────
// NTES JSON endpoint: /train/{number}  returns schedule + metadata

export const ntesProvider: DataProvider = {
  name: 'NTES',

  async getTrainSchedule(trainNumber: string): Promise<TrainDetail | null> {
    try {
      const res = await fetchNTES(`/train/${encodeURIComponent(trainNumber)}`);
      const text = await res.text();

      // NTES sometimes returns HTML instead of JSON
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        log('NTES', `Non-JSON response for train ${trainNumber}, trying HTML parse`);
        return parseTrainScheduleHTML(text, trainNumber);
      }

      if (!data || (!data.trainName && !data.train_name)) {
        return null;
      }

      const schedule: ScheduleStop[] = (data.route || data.schedule || []).map(
        (stop: any, idx: number) => ({
          stationCode: stop.stationCode || stop.station_code || stop.stnCode || '',
          stationName: stop.stationName || stop.station_name || stop.stnName || '',
          arrivalTime: normalizeTime(stop.arrivalTime || stop.arrival_time || stop.arrTime),
          departureTime: normalizeTime(stop.departureTime || stop.departure_time || stop.depTime),
          day: stop.day || stop.dayCount || 1,
          distance: stop.distance || stop.distanceFromSource || undefined,
          stopNumber: stop.sequence || stop.stopNumber || idx + 1,
          isHalt: stop.isHalt !== undefined ? Boolean(stop.isHalt) : true,
        })
      );

      return {
        trainNumber,
        trainName: data.trainName || data.train_name || '',
        type: data.trainType || data.type || undefined,
        sourceStationCode: data.sourceStationCode || data.from_station_code || schedule[0]?.stationCode || '',
        sourceStationName: data.sourceStationName || data.from_station_name || schedule[0]?.stationName || '',
        destinationStationCode:
          data.destinationStationCode ||
          data.to_station_code ||
          schedule[schedule.length - 1]?.stationCode ||
          '',
        destinationStationName:
          data.destinationStationName ||
          data.to_station_name ||
          schedule[schedule.length - 1]?.stationName ||
          '',
        runningDays: data.runningDays?.days || data.running_days || undefined,
        schedule,
      };
    } catch (err) {
      logError('NTES', `Failed to get schedule for ${trainNumber}`, err);
      return null;
    }
  },

  async getTrainLiveStatus(
    trainNumber: string,
    journeyDate: string
  ): Promise<LiveTrainStatus | null> {
    try {
      // NTES live status endpoint
      const res = await fetchNTES(
        `/train/live/${encodeURIComponent(trainNumber)}?date=${encodeURIComponent(journeyDate)}`
      );
      const data: any = await res.json();

      if (!data || data.error) return null;

      const route: LiveRouteStop[] = (data.route || []).map((s: any) => ({
        stationCode: s.stationCode || s.station_code || '',
        scheduledArrival: normalizeTime(s.scheduledArrival || s.sch_arrival),
        scheduledDeparture: normalizeTime(s.scheduledDeparture || s.sch_departure),
        actualArrival: normalizeTime(s.actualArrival || s.act_arrival),
        actualDeparture: normalizeTime(s.actualDeparture || s.act_departure),
        delayMinutes: s.delayMinutes ?? s.delay ?? undefined,
        platform: s.platform || undefined,
      }));

      return {
        trainNumber,
        journeyDate,
        lastUpdated: data.lastUpdated || data.lastUpdatedAt || new Date().toISOString(),
        currentStation: data.currentStation || data.current_station || undefined,
        currentStationName: data.currentStationName || data.current_station_name || undefined,
        latitude: data.lat ?? data.latitude ?? undefined,
        longitude: data.lng ?? data.longitude ?? undefined,
        status: data.status || data.statusText || undefined,
        delayMinutes: data.delayMinutes ?? data.delay ?? undefined,
        route,
      };
    } catch (err) {
      logError('NTES', `Failed to get live status for ${trainNumber}`, err);
      return null;
    }
  },
};

// ─── Helpers ────────────────────────────────────────────────────────

function normalizeTime(val: unknown): string | undefined {
  if (val == null || val === '' || val === '--') return undefined;
  const str = String(val).trim();
  // "14:30" or "14:30:00" → "14:30"
  const match = str.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return undefined;
}

function parseTrainScheduleHTML(html: string, trainNumber: string): TrainDetail | null {
  try {
    const $ = cheerio.load(html);
    const trainName =
      $('h1, h2, .train-name, [class*="trainName"]')
        .first()
        .text()
        .trim() || '';

    const schedule: ScheduleStop[] = [];
    // Common table pattern on NTES pages
    $('table tbody tr, .route-table tr').each((idx, el) => {
      const cells = $(el).find('td');
      if (cells.length >= 4) {
        schedule.push({
          stationCode: $(cells[1]).text().trim(),
          stationName: $(cells[0]).text().trim(),
          arrivalTime: normalizeTime($(cells[2]).text().trim()),
          departureTime: normalizeTime($(cells[3]).text().trim()),
          day: parseInt($(cells[4]).text().trim()) || 1,
          distance: parseInt($(cells[5]).text().trim()) || undefined,
          stopNumber: idx + 1,
          isHalt: true,
        });
      }
    });

    if (schedule.length === 0) return null;

    return {
      trainNumber,
      trainName,
      sourceStationCode: schedule[0].stationCode,
      sourceStationName: schedule[0].stationName,
      destinationStationCode: schedule[schedule.length - 1].stationCode,
      destinationStationName: schedule[schedule.length - 1].stationName,
      schedule,
    };
  } catch {
    return null;
  }
}

export default ntesProvider;
