const API_BASE = 'https://api.railradar.org/api/v1';

function getApiKey(): string {
  const key = process.env.RAILRADAR_API_KEY;
  if (!key) {
    throw new Error('RAILRADAR_API_KEY is not set');
  }
  return key;
}

export interface RailRadarResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    timestamp: string;
    traceId: string;
    executionTime: number;
  };
}

// Station Info Types
export interface StationInfo {
  code: string;
  name: string;
  station_id: number;
  address: string | null;
  zone: string | null;
  elevation_m: number | null;
  lat: number | null;
  lng: number | null;
  city: string | null;
  hindi_name: string | null;
  marathi_name: string | null;
  tamil_name: string | null;
  telugu_name: string | null;
  bengali_name: string | null;
  kannada_name: string | null;
  malayalam_name: string | null;
  gujarati_name: string | null;
}

// Station Live Types
export interface StationLiveTrain {
  train: {
    number: string;
    name: string;
    type: string;
    sourceStationCode: string;
    destinationStationCode: string;
  };
  platform?: string;
  journeyDate: string;
  schedule: {
    arrival?: string;
    departure?: string;
  };
  live: {
    expectedArrival?: string;
    expectedDeparture?: string;
    arrivalDelayDisplay?: string;
    departureDelayDisplay?: string;
  };
  status: {
    isCancelled: boolean;
    isDiverted: boolean;
    hasArrived: boolean;
    hasDeparted: boolean;
  };
  coachInfo?: {
    arrivalCoachPosition?: string;
    departureCoachPosition?: string;
  };
}

export interface StationLive {
  station: {
    code: string;
    name: string;
  };
  queryingForNextHours: number;
  totalTrains: number;
  trains: StationLiveTrain[];
}

// Train Types
export interface TrainScheduleStop {
  id: number;
  sequence: number;
  stationCode: string;
  stationName: string;
  isHalt: number;
  scheduledArrival: number;
  scheduledDeparture: number;
  haltDurationMinutes: number;
  day: number;
  distanceFromSourceKm: number;
  speedOnSectionKmph?: number;
}

export interface TrainLiveData {
  trainNumber: string;
  journeyDate: string;
  lastUpdatedAt: string;
  currentLocation: {
    latitude: number;
    longitude: number;
    stationCode: string;
    status: string;
    distanceFromOriginKm: number;
    distanceFromLastStationKm: number;
  };
  dataSource: string;
  route: Array<{
    stationCode: string;
    scheduledArrival?: number;
    scheduledDeparture?: number;
    actualArrival?: number;
    actualDeparture?: number;
    delayArrivalMinutes?: number;
    delayDepartureMinutes?: number;
    platform?: string;
    sequence: number;
  }>;
}

export interface TrainData {
  trainNumber: string;
  trainName: string;
  hindiName?: string;
  type: string;
  sourceStationCode: string;
  sourceStationName: string;
  destinationStationCode: string;
  destinationStationName: string;
  runningDays: {
    days: string[];
    allDays: boolean;
  };
  returnTrainNumber?: string;
  travelTimeMinutes: number;
  totalHalts: number;
  distanceKm: number;
  avgSpeedKmph: number;
  schedule: TrainScheduleStop[];
  metadata: {
    canRefreshLive: boolean;
    hasLiveData: boolean;
    lastLiveUpdate?: string;
  };
  liveData?: TrainLiveData;
}

// Trains Between Types
export interface TrainBetween {
  trainNumber: string;
  trainName: string;
  hindiName?: string;
  type: string;
  sourceStationCode: string;
  sourceStationName: string;
  destinationStationCode: string;
  destinationStationName: string;
  runningDays: {
    days: string[];
    allDays: boolean;
    isStartingToday?: boolean;
  };
  travelTimeMinutes: number;
  totalHalts: number;
  distanceKm: number;
  avgSpeedKmph: number;
  fromStationSchedule: {
    arrivalMinutes?: number;
    departureMinutes?: number;
    day: number;
  };
  toStationSchedule: {
    arrivalMinutes?: number;
    departureMinutes?: number;
    day: number;
    distanceFromSourceKm: number;
  };
}

export interface TrainsBetweenData {
  fromStationCode: string;
  toStationCode: string;
  totalTrains: number;
  trains: TrainBetween[];
}

async function fetchRailRadar<T>(endpoint: string): Promise<RailRadarResponse<T>> {
  const url = `${API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}apiKey=${getApiKey()}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
    next: { revalidate: 60 }, // Cache for 1 minute
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
  }

  return response.json();
}

// API Functions
export async function getStationInfo(stationCode: string): Promise<StationInfo> {
  const response = await fetchRailRadar<StationInfo>(`/stations/${stationCode.toUpperCase()}/info`);
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch station info');
  }
  return response.data;
}

export async function getStationLive(stationCode: string, hours: number = 8): Promise<StationLive> {
  const response = await fetchRailRadar<StationLive>(`/stations/${stationCode.toUpperCase()}/live?hours=${hours}`);
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch station live data');
  }
  return response.data;
}

// Raw API response structure for train endpoint
interface RawTrainApiResponse {
  train: {
    trainNumber: string;
    trainName: string;
    hindiName?: string;
    type: string;
    sourceStationCode: string;
    sourceStationName: string;
    destinationStationCode: string;
    destinationStationName: string;
    runningDays: {
      days: string[];
      allDays: boolean;
    };
    returnTrainNumber?: string;
    travelTimeMinutes: number;
    totalHalts: number;
    distanceKm: number;
    avgSpeedKmph: number;
  };
  route: TrainScheduleStop[];
  liveData?: TrainLiveData;
}

export async function getTrainData(trainNumber: string): Promise<TrainData> {
  const response = await fetchRailRadar<RawTrainApiResponse>(`/trains/${trainNumber}`);
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch train data');
  }
  
  const { train, route, liveData } = response.data;
  
  // Transform to expected TrainData structure
  return {
    ...train,
    schedule: route || [],
    metadata: {
      canRefreshLive: true,
      hasLiveData: !!liveData,
      lastLiveUpdate: liveData?.lastUpdatedAt,
    },
    liveData,
  };
}

export async function getTrainsBetween(fromCode: string, toCode: string): Promise<TrainsBetweenData> {
  const response = await fetchRailRadar<TrainsBetweenData>(
    `/trains/between?from=${fromCode.toUpperCase()}&to=${toCode.toUpperCase()}`
  );
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to fetch trains between stations');
  }
  return response.data;
}
