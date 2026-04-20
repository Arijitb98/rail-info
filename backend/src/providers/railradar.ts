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

const API_BASE = 'https://api.railradar.org/api/v1';

function getApiKey(): string {
  const key = process.env.RAILRADAR_API_KEY;
  if (!key) throw new Error('RAILRADAR_API_KEY is not set');
  return key;
}

async function fetchRR<T>(endpoint: string): Promise<T> {
  const url = `${API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}apiKey=${getApiKey()}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`RailRadar ${res.status} for ${endpoint}`);
  }
  const json: any = await res.json();
  if (json.success === false) {
    throw new Error(json.error?.message || 'RailRadar returned failure');
  }
  return json.data;
}

export const railradarProvider: DataProvider = {
  name: 'RailRadar',

  async getTrainSchedule(trainNumber: string): Promise<TrainDetail | null> {
    try {
      const data: any = await fetchRR(`/trains/${encodeURIComponent(trainNumber)}?dataType=static`);
      if (!data || !data.train) return null;

      const train = data.train;
      const schedule: ScheduleStop[] = (data.route || []).map((stop: any, idx: number) => ({
        stationCode: stop.stationCode || '',
        stationName: stop.stationName || '',
        arrivalTime: minutesToHHMM(stop.scheduledArrival),
        departureTime: minutesToHHMM(stop.scheduledDeparture),
        day: stop.day || 1,
        distance: stop.distanceFromSourceKm || undefined,
        stopNumber: stop.sequence || idx + 1,
        isHalt: stop.isHalt === 1 || stop.isHalt === true,
      }));

      return {
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        type: train.type,
        sourceStationCode: train.sourceStationCode,
        sourceStationName: train.sourceStationName,
        destinationStationCode: train.destinationStationCode,
        destinationStationName: train.destinationStationName,
        runningDays: train.runningDays?.days,
        schedule,
      };
    } catch (err) {
      logError('RailRadar', `getTrainSchedule failed for ${trainNumber}`, err);
      return null;
    }
  },

  async getTrainLiveStatus(
    trainNumber: string,
    journeyDate: string
  ): Promise<LiveTrainStatus | null> {
    try {
      const data: any = await fetchRR(
        `/trains/${encodeURIComponent(trainNumber)}?journeyDate=${encodeURIComponent(journeyDate)}&dataType=full`
      );
      if (!data?.liveData) return null;

      const live = data.liveData;
      const route: LiveRouteStop[] = (live.route || []).map((s: any) => ({
        stationCode: s.stationCode,
        scheduledArrival: minutesToHHMM(s.scheduledArrival),
        scheduledDeparture: minutesToHHMM(s.scheduledDeparture),
        actualArrival: minutesToHHMM(s.actualArrival),
        actualDeparture: minutesToHHMM(s.actualDeparture),
        delayMinutes: s.delayArrivalMinutes ?? s.delayDepartureMinutes ?? undefined,
        platform: s.platform,
      }));

      return {
        trainNumber,
        journeyDate,
        lastUpdated: live.lastUpdatedAt || new Date().toISOString(),
        currentStation: live.currentLocation?.stationCode,
        latitude: live.currentLocation?.latitude,
        longitude: live.currentLocation?.longitude,
        status: live.currentLocation?.status,
        route,
      };
    } catch (err) {
      logError('RailRadar', `getTrainLiveStatus failed for ${trainNumber}`, err);
      return null;
    }
  },

  async getTrainsBetween(fromCode: string, toCode: string): Promise<TrainBetweenResult[]> {
    try {
      const data: any = await fetchRR(
        `/trains/between?from=${encodeURIComponent(fromCode)}&to=${encodeURIComponent(toCode)}`
      );
      return (data.trains || []).map((t: any) => ({
        trainNumber: t.trainNumber,
        trainName: t.trainName,
        type: t.type,
        fromStation: {
          code: fromCode,
          name: t.sourceStationName || fromCode,
          departure: minutesToHHMM(t.fromStationSchedule?.departureMinutes),
          day: t.fromStationSchedule?.day || 1,
        },
        toStation: {
          code: toCode,
          name: t.destinationStationName || toCode,
          arrival: minutesToHHMM(t.toStationSchedule?.arrivalMinutes),
          day: t.toStationSchedule?.day || 1,
          distanceKm: t.toStationSchedule?.distanceFromSourceKm,
        },
        runningDays: t.runningDays?.days,
        durationMinutes: t.travelTimeMinutes,
      }));
    } catch (err) {
      logError('RailRadar', `getTrainsBetween failed for ${fromCode}-${toCode}`, err);
      return [];
    }
  },

  async getStationDetail(stationCode: string): Promise<StationDetail | null> {
    try {
      const data: any = await fetchRR(`/stations/${encodeURIComponent(stationCode)}/info`);
      if (!data) return null;
      return {
        code: data.code,
        name: data.name,
        nameHindi: data.hindi_name || undefined,
        latitude: data.lat ?? undefined,
        longitude: data.lng ?? undefined,
        zone: data.zone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
      };
    } catch (err) {
      logError('RailRadar', `getStationDetail failed for ${stationCode}`, err);
      return null;
    }
  },

  async getAllTrains(): Promise<Array<{ trainNumber: string; trainName: string }>> {
    const data: any = await fetchRR('/trains/all-kvs');
    // data is typically { "12345": "Train Name", ... }
    return Object.entries(data).map(([k, v]) => ({
      trainNumber: k,
      trainName: v as string,
    }));
  },

  async getAllStations(): Promise<Array<{ code: string; name: string }>> {
    const data: any = await fetchRR('/stations/all-kvs');
    return Object.entries(data).map(([k, v]) => ({
      code: k,
      name: v as string,
    }));
  },
};

function minutesToHHMM(val: unknown): string | undefined {
  if (val == null || typeof val !== 'number' || val < 0) return undefined;
  const h = Math.floor(val / 60) % 24;
  const m = val % 60;
  return `${String(h).padStart(2, '0')}:${String(Math.round(m)).padStart(2, '0')}`;
}

export default railradarProvider;
