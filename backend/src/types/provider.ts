// ─── Provider Interface ─────────────────────────────────────────────
// Each data source (NTES, erail, RailRadar, etc.) implements this interface.
// The orchestrator calls providers in priority order with fallback.

export interface StationDetail {
  code: string;
  name: string;
  nameHindi?: string;
  latitude?: number;
  longitude?: number;
  zone?: string;
  address?: string;
  city?: string;
}

export interface ScheduleStop {
  stationCode: string;
  stationName: string;
  arrivalTime?: string;   // "HH:MM" format
  departureTime?: string; // "HH:MM" format
  day: number;            // day of journey (1-based)
  distance?: number;      // km from source
  stopNumber: number;     // sequence number
  isHalt: boolean;
}

export interface TrainDetail {
  trainNumber: string;
  trainName: string;
  type?: string;
  sourceStationCode: string;
  sourceStationName: string;
  destinationStationCode: string;
  destinationStationName: string;
  runningDays?: string[]; // e.g. ["Mon", "Wed", "Fri"]
  schedule: ScheduleStop[];
}

export interface LiveTrainStatus {
  trainNumber: string;
  journeyDate: string;
  lastUpdated: string;
  currentStation?: string;
  currentStationName?: string;
  latitude?: number;
  longitude?: number;
  status?: string; // e.g. "Departed from XYZ", "Arrived at XYZ"
  delayMinutes?: number;
  route: LiveRouteStop[];
}

export interface LiveRouteStop {
  stationCode: string;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  actualArrival?: string;
  actualDeparture?: string;
  delayMinutes?: number;
  platform?: string;
}

export interface TrainBetweenResult {
  trainNumber: string;
  trainName: string;
  type?: string;
  fromStation: {
    code: string;
    name: string;
    departure?: string;
    day: number;
  };
  toStation: {
    code: string;
    name: string;
    arrival?: string;
    day: number;
    distanceKm?: number;
  };
  runningDays?: string[];
  durationMinutes?: number;
}

export interface StationBoardTrain {
  trainNumber: string;
  trainName: string;
  type?: string;
  sourceStationCode: string;
  destinationStationCode: string;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  expectedArrival?: string;
  expectedDeparture?: string;
  platform?: string;
  delayMinutes?: number;
  isCancelled: boolean;
}

// ─── DataProvider interface ─────────────────────────────────────────
// Not all providers support all methods. Optional methods return undefined
// when unsupported, and the orchestrator falls back to the next provider.

export interface DataProvider {
  readonly name: string;

  /** Get full schedule for a train */
  getTrainSchedule?(trainNumber: string): Promise<TrainDetail | null>;

  /** Get live running status of a train */
  getTrainLiveStatus?(trainNumber: string, journeyDate: string): Promise<LiveTrainStatus | null>;

  /** Get trains between two stations */
  getTrainsBetween?(fromCode: string, toCode: string): Promise<TrainBetweenResult[]>;

  /** Get station details */
  getStationDetail?(stationCode: string): Promise<StationDetail | null>;

  /** Get live station board */
  getStationBoard?(stationCode: string): Promise<StationBoardTrain[]>;

  /** Get all train numbers (for bulk seeding) */
  getAllTrains?(): Promise<Array<{ trainNumber: string; trainName: string }>>;

  /** Get all station codes (for bulk seeding) */
  getAllStations?(): Promise<Array<{ code: string; name: string }>>;
}
