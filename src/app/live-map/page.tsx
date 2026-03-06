"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import Link from "next/link";

interface LiveTrain {
  train_number: string;
  train_name: string;
  type: string;
  mins_since_dep: number;
  current_station: string;
  current_station_name: string;
  current_lat: number;
  current_lng: number;
  departure_minutes: number;
  current_day: number;
  next_station: string;
  next_station_name: string;
  next_lat: number;
  next_lng: number;
  next_arrival_minutes: number;
  curr_distance: number;
  next_distance: number;
}

interface ApiResponse {
  success: boolean;
  data: LiveTrain[];
  meta: {
    timestamp: string;
    totalTrains: number;
  };
}

interface ScheduleStop {
  stationCode: string;
  stationName: string;
  arrivalMinutes?: number;
  departureMinutes?: number;
  haltMinutes?: number;
  day: number;
  distanceKm?: number;
}

interface TrainScheduleData {
  train: {
    trainNumber: string;
    trainName: string;
  };
  schedule: ScheduleStop[];
  liveData?: {
    currentLocation?: {
      stationCode: string;
      distanceFromOriginKm: number;
      status: string;
    };
    route?: Array<{
      stationCode: string;
      delayArrivalMinutes?: number;
      delayDepartureMinutes?: number;
    }>;
  };
}

// Train type colors for visual distinction
const TRAIN_TYPE_COLORS: Record<string, string> = {
  RAJ: "#e11d48", // rose-600
  SHT: "#ea580c", // orange-600
  DUR: "#0284c7", // sky-600
  SUP: "#7c3aed", // violet-600
  EXP: "#059669", // emerald-600
  MAI: "#ca8a04", // yellow-600
  PAS: "#6b7280", // gray-500
  MEM: "#dc2626", // red-600
  DEFAULT: "#2563eb", // blue-600
};

function getTrainColor(type: string): string {
  return TRAIN_TYPE_COLORS[type?.toUpperCase()] || TRAIN_TYPE_COLORS.DEFAULT;
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export default function LiveMapPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    }>
      <LiveMapContent />
    </Suspense>
  );
}

function LiveMapContent() {
  const searchParams = useSearchParams();
  const trainParam = searchParams.get("train") || "";

  const [trains, setTrains] = useState<LiveTrain[]>([]);
  const [filteredTrains, setFilteredTrains] = useState<LiveTrain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedTrain, setSelectedTrain] = useState<LiveTrain | null>(null);
  const [searchQuery, setSearchQuery] = useState(trainParam);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const initialFocusDone = useRef(false);

  // Schedule panel state
  const [scheduleData, setScheduleData] = useState<TrainScheduleData | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);

  const fetchLiveTrains = useCallback(async () => {
    try {
      const response = await fetch("/api/trains/live-map");
      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error("Failed to fetch live train data");
      }

      setTrains(data.data);
      setLastUpdated(new Date(data.meta.timestamp));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch schedule for selected train
  const fetchTrainSchedule = useCallback(async (trainNumber: string) => {
    setScheduleLoading(true);
    try {
      const response = await fetch(`/api/trains/${encodeURIComponent(trainNumber)}?dataProvider=railradar`);
      const data = await response.json();
      
      if (response.ok) {
        setScheduleData({
          train: data.train,
          schedule: data.schedule || [],
          liveData: data.liveData,
        });
        setShowSchedulePanel(true);
      } else {
        setScheduleData(null);
      }
    } catch (err) {
      console.error("Failed to fetch train schedule:", err);
      setScheduleData(null);
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  // Fetch schedule when a train is selected
  useEffect(() => {
    if (selectedTrain) {
      fetchTrainSchedule(selectedTrain.train_number);
    } else {
      setShowSchedulePanel(false);
    }
  }, [selectedTrain, fetchTrainSchedule]);

  // Filter trains based on search and type
  useEffect(() => {
    let result = trains;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (train) =>
          train.train_number.includes(query) ||
          train.train_name.toLowerCase().includes(query) ||
          train.current_station_name.toLowerCase().includes(query),
      );
    }

    if (typeFilter) {
      result = result.filter((train) => train.type === typeFilter);
    }

    setFilteredTrains(result);
  }, [trains, searchQuery, typeFilter]);

  // Auto-focus on the train specified in URL param
  useEffect(() => {
    if (!trainParam || initialFocusDone.current || !mapRef.current || filteredTrains.length === 0) return;

    const targetTrain = filteredTrains.find(
      (t) => t.train_number === trainParam
    );

    if (targetTrain && targetTrain.current_lat && targetTrain.current_lng) {
      mapRef.current.setView([targetTrain.current_lat, targetTrain.current_lng], 10);
      setSelectedTrain(targetTrain);
      initialFocusDone.current = true;

      // Open the marker popup
      const markerId = `${targetTrain.train_number}-${targetTrain.current_station}-${targetTrain.current_lat}-${targetTrain.current_lng}`;
      const marker = markersRef.current.get(markerId);
      if (marker) {
        marker.openPopup();
      }
    }
  }, [trainParam, filteredTrains]);

  // Get unique train types for filter
  const trainTypes = Array.from(new Set(trains.map((t) => t.type))).sort();

  // Initialize map
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    // Dynamically import Leaflet for client-side only
    const initMap = async () => {
      const L = (await import("leaflet")).default;

      if (mapRef.current) return; // Already initialized

      // Ensure the container has dimensions before initializing
      const container = mapContainerRef.current;
      if (!container || container.clientHeight === 0) {
        // Retry after a short delay if container isn't ready
        setTimeout(initMap, 100);
        return;
      }

      // Center on India
      const map = L.map(container, {
        center: [22.5, 82.5],
        zoom: 5,
        minZoom: 4,
        maxZoom: 18,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      mapRef.current = map;

      // Invalidate size after a short delay to ensure proper rendering
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [loading]); // Re-run when loading changes to catch when container becomes visible

  // Update markers when filtered trains change
  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;

    const updateMarkers = async () => {
      const L = (await import("leaflet")).default;

      // Clear existing markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();

      // Add new markers
      filteredTrains.forEach((train) => {
        if (!train.current_lat || !train.current_lng) return;

        // Composite id ensures uniqueness when multiple instances share the same train number
        const markerId = `${train.train_number}-${train.current_station}-${train.current_lat}-${train.current_lng}`;

        const color = getTrainColor(train.type);

        // Create custom train icon
        const icon = L.divIcon({
          className: "custom-train-marker",
          html: `
            <div style="
              width: 24px;
              height: 24px;
              background-color: ${color};
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
            ">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2l2-2h4l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zm-5.5 15c-.83 0-1.5-.67-1.5-1.5S5.67 14 6.5 14s1.5.67 1.5 1.5S7.33 17 6.5 17zm4-7H5V7h5.5v3zm2 0V7H17v3h-4.5zm5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
              </svg>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([train.current_lat, train.current_lng], {
          icon,
        }).addTo(mapRef.current!);

        // Popup content
        const popupContent = `
          <div style="min-width: 200px; font-family: system-ui, sans-serif;">
            <div style="font-weight: 600; font-size: 14px; color: #1f2937;">
              ${train.train_number} - ${train.train_name}
            </div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
              <span style="
                display: inline-block;
                padding: 2px 6px;
                background-color: ${color}20;
                color: ${color};
                border-radius: 4px;
                font-weight: 500;
              ">${train.type}</span>
            </div>
            <div style="margin-top: 8px; font-size: 12px; color: #374151;">
              <div><strong>Current:</strong> ${train.current_station_name} (${train.current_station})</div>
              <div><strong>Next:</strong> ${train.next_station_name} (${train.next_station})</div>
              <div style="margin-top: 4px;"><strong>Running for:</strong> ${formatMinutes(train.mins_since_dep)}</div>
            </div>
            <a href="/train/${train.train_number}" 
              style="
              display: inline-block;
              margin-top: 8px;
              padding: 4px 8px;
              background-color: #2563eb;
              color: white;
              border-radius: 4px;
              text-decoration: none;
              font-size: 12px;
              ">View Details</a>
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on("click", () => {
          setSelectedTrain(train);
        });

        markersRef.current.set(markerId, marker);
      });
    };

    updateMarkers();
  }, [filteredTrains]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchLiveTrains();
    
    // Auto-refresh disabled — keep manual refresh only
    // Refresh every 30 seconds
    // const interval = setInterval(fetchLiveTrains, 30000);
    
    // cleanup when auto-refresh enabled again
    // return () => clearInterval(interval);
  }, [fetchLiveTrains]);

  // Pan to selected train
  const panToTrain = (train: LiveTrain) => {
    if (mapRef.current && train.current_lat && train.current_lng) {
      mapRef.current.setView([train.current_lat, train.current_lng], 10);
      const markerId = `${train.train_number}-${train.current_station}-${train.current_lat}-${train.current_lng}`;
      const marker = markersRef.current.get(markerId);
      if (marker) {
        marker.openPopup();
      }
    }
    setSelectedTrain(train);
  };

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <SiteHeader />

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  Live Train Map
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Real-time positions of trains across India
                  {lastUpdated && (
                    <span className="ml-2">
                      • Updated {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  {filteredTrains.length.toLocaleString()} trains running
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <svg
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search by train number, name, or station..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">All Train Types</option>
                {trainTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <button
                onClick={fetchLiveTrains}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <svg
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Map and Sidebar */}
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Map Container */}
          <div className="relative flex-1 overflow-hidden">
            {loading && trains.length === 0 ? (
              <div className="flex h-full min-h-[400px] items-center justify-center bg-zinc-100 dark:bg-zinc-900">
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                    Loading live train data...
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex h-full min-h-[400px] items-center justify-center bg-zinc-100 dark:bg-zinc-900">
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <svg
                      className="h-8 w-8 text-red-600 dark:text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                  <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                    {error}
                  </p>
                  <button
                    onClick={fetchLiveTrains}
                    className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : (
              <div
                ref={mapContainerRef}
                className="h-full min-h-[500px] w-full lg:min-h-0"
                style={{ height: "calc(100vh - 180px)" }}
              />
            )}
          </div>

          {/* Sidebar - Train List */}
          <div className="flex w-full flex-shrink-0 flex-col border-t border-zinc-200 bg-white lg:w-80 lg:border-l lg:border-t-0 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Running Trains ({filteredTrains.length})
                </h2>
                <div className="space-y-2">
                  {filteredTrains.slice(0, 100).map((train) =>
                    (() => {
                      const listId = `${train.train_number}-${train.current_station}-${train.current_lat}-${train.current_lng}`;
                      return (
                        <button
                          key={listId}
                          onClick={() => panToTrain(train)}
                          className={`w-full rounded-xl border p-3 text-left transition-colors ${
                            selectedTrain?.train_number === train.train_number
                              ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20"
                              : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2 w-2 flex-shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: getTrainColor(train.type),
                                  }}
                                />
                                <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                  {train.train_number}
                                </span>
                                <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                                  {train.type}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-xs text-zinc-600 dark:text-zinc-400">
                                {train.train_name}
                              </p>
                              <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-500">
                                At: {train.current_station_name}
                              </p>
                            </div>
                            <Link
                              href={`/train/${train.train_number}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-shrink-0 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                            </Link>
                          </div>
                        </button>
                      );
                    })(),
                  )}
                  {filteredTrains.length > 100 && (
                    <p className="py-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
                      Showing first 100 of {filteredTrains.length} trains
                    </p>
                  )}
                  {filteredTrains.length === 0 && !loading && (
                    <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      No trains found matching your search
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Panel - Shows when train is selected */}
          {showSchedulePanel && selectedTrain && (
            <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 lg:relative lg:z-auto lg:w-96 lg:max-h-[calc(100vh-180px)] lg:shadow-none">
              {/* Panel Header */}
              <div className="flex-shrink-0 border-b border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {selectedTrain.train_number} Schedule
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {selectedTrain.train_name}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowSchedulePanel(false);
                      setSelectedTrain(null);
                      setScheduleData(null);
                    }}
                    className="flex-shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Schedule Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4">
                {scheduleLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                  </div>
                ) : scheduleData && scheduleData.schedule.length > 0 ? (
                  <div className="space-y-0">
                    {scheduleData.schedule.map((stop, index) => {
                      const isFirst = index === 0;
                      const isLast = index === scheduleData.schedule.length - 1;
                      
                      // Determine if station is passed/current based on live data
                      const currentDistance = scheduleData.liveData?.currentLocation?.distanceFromOriginKm ?? 0;
                      const currentStationCode = scheduleData.liveData?.currentLocation?.stationCode;
                      const stopDistance = stop.distanceKm ?? 0;
                      
                      const isCurrent = stop.stationCode === currentStationCode;
                      const isPassed = stopDistance < currentDistance && !isCurrent;
                      
                      // Get delay info from live route
                      const liveInfo = scheduleData.liveData?.route?.find(r => r.stationCode === stop.stationCode);
                      const delayMinutes = liveInfo?.delayArrivalMinutes ?? liveInfo?.delayDepartureMinutes ?? 0;
                      const scheduledMinutes = stop.arrivalMinutes ?? stop.departureMinutes ?? 0;
                      const expectedMinutes = scheduledMinutes + delayMinutes;
                      
                      return (
                        <div key={`${stop.stationCode}-${index}`} className="relative flex items-stretch gap-3">
                          {/* Timeline */}
                          <div className="flex flex-col items-center">
                            <div className={`h-3 w-0.5 ${isFirst ? 'bg-transparent' : isPassed || isCurrent ? 'bg-green-400 dark:bg-green-600' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                            <div className={`h-3 w-3 flex-shrink-0 rounded-full border-2 ${
                              isCurrent ? 'border-green-500 bg-green-500 animate-pulse ring-2 ring-green-300 dark:ring-green-700' :
                              isPassed ? 'border-green-500 bg-green-500' :
                              isFirst ? 'border-green-500 bg-green-500' :
                              isLast ? 'border-orange-500 bg-orange-500' :
                              'border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800'
                            }`} />
                            <div className={`flex-1 w-0.5 ${isLast ? 'bg-transparent' : isPassed ? 'bg-green-400 dark:bg-green-600' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                          </div>

                          {/* Stop Info */}
                          <div className={`flex-1 py-1.5 ${isPassed ? 'opacity-50' : ''}`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-xs font-medium truncate ${isPassed ? 'text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                  {stop.stationName}
                                </span>
                                <span className="rounded bg-zinc-100 px-1 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 flex-shrink-0">
                                  {stop.stationCode}
                                </span>
                                {isCurrent && (
                                  <span className="rounded bg-green-100 px-1 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300 flex-shrink-0">
                                    Now
                                  </span>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="font-mono text-xs text-zinc-900 dark:text-zinc-100">
                                  {minutesToTime(scheduledMinutes)}
                                </div>
                                {delayMinutes !== 0 && (
                                  <div className={`font-mono text-[10px] ${delayMinutes > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                    {delayMinutes > 0 ? '+' : ''}{delayMinutes}m → {minutesToTime(expectedMinutes)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                              {stop.distanceKm !== undefined ? `${stop.distanceKm} km` : ''}
                              {stop.haltMinutes ? ` • ${stop.haltMinutes}m halt` : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    Schedule not available for this train
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Custom styles for Leaflet */}
      <style jsx global>{`
        .leaflet-container {
          font-family: inherit;
        }
        .custom-train-marker {
          background: transparent;
          border: none;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow:
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .leaflet-popup-content {
          margin: 12px;
        }
      `}</style>
    </div>
  );
}
