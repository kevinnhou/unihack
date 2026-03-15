// Location tracking (use-location-tracking.ts)
export const MIN_MOVE_SPEED_MS = 0.3; // m/s ≈ 1 km/h
export const PACE_WINDOW_MS = 20_000;
export const MIN_PACE_DISTANCE_M = 5;
export const DEFAULT_GPS_INTERVAL_MS = 2000;

// Ping intervals
export const DEFAULT_PING_INTERVAL_MS = 5000; // runs.updateTelemetry
export const DEFAULT_LIVE_PING_INTERVAL_MS = 3000; // live.pingLiveProgress

// Background location service (services/location.ts)
export const BACKGROUND_LOCATION_TASK = "agon_BACKGROUND_LOCATION";
export const BG_LOCATION_TIME_INTERVAL_MS = 3000;
export const BG_LOCATION_DISTANCE_INTERVAL_M = 5;
export const FOREGROUND_SERVICE_COLOR = "#ff6900";
