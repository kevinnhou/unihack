import {
  Accuracy,
  getBackgroundPermissionsAsync,
  getForegroundPermissionsAsync,
  hasStartedLocationUpdatesAsync,
  type LocationObject,
  requestBackgroundPermissionsAsync,
  requestForegroundPermissionsAsync,
  startLocationUpdatesAsync,
  stopLocationUpdatesAsync,
} from "expo-location";
import type { TaskManagerTaskBody } from "expo-task-manager";
import { defineTask } from "expo-task-manager";

export const BACKGROUND_LOCATION_TASK = "PINFIRE_BACKGROUND_LOCATION";

export type TelemetryPoint = {
  timestamp: number;
  lat: number;
  lng: number;
  speed: number;
};

type BackgroundLocationCallback = (point: TelemetryPoint) => void;

let _onLocationUpdate: BackgroundLocationCallback | null = null;

export function setLocationCallback(cb: BackgroundLocationCallback | null) {
  _onLocationUpdate = cb;
}

/** Define the background task — must be called at module level. */
defineTask(BACKGROUND_LOCATION_TASK, (({
  data,
  error,
}: TaskManagerTaskBody<{ locations: LocationObject[] }>) => {
  if (error) {
    console.warn("[Location] Background task error:", error);
    return;
  }
  if (!data?.locations?.length) {
    return;
  }

  const loc = data.locations.at(-1);
  if (!loc) {
    return;
  }

  const point: TelemetryPoint = {
    timestamp: loc.timestamp,
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    speed: Math.max(0, loc.coords.speed ?? 0),
  };

  _onLocationUpdate?.(point);
  // biome-ignore lint/suspicious/noExplicitAny: TaskManager callback typing mismatch at runtime
}) as any);

// ---------------------------------------------------------------------------
// Permission helpers
// ---------------------------------------------------------------------------

export async function requestLocationPermissions(): Promise<boolean> {
  const { status: fg } = await requestForegroundPermissionsAsync();
  if (fg !== "granted") {
    return false;
  }

  const { status: bg } = await requestBackgroundPermissionsAsync();
  return bg === "granted";
}

export async function hasLocationPermissions(): Promise<boolean> {
  const { status: fg } = await getForegroundPermissionsAsync();
  if (fg !== "granted") {
    return false;
  }
  const { status: bg } = await getBackgroundPermissionsAsync();
  return bg === "granted";
}

// ---------------------------------------------------------------------------
// Tracking lifecycle
// ---------------------------------------------------------------------------

export async function startTracking(
  onUpdate: BackgroundLocationCallback
): Promise<void> {
  setLocationCallback(onUpdate);

  await startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Accuracy.Balanced,
    timeInterval: 3000,
    distanceInterval: 5,
    foregroundService: {
      notificationTitle: "pinfire is tracking your run",
      notificationBody: "Your run is in progress.",
      notificationColor: "#FF4500",
    },
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
  });
}

export async function stopTracking(): Promise<void> {
  setLocationCallback(null);
  const isRunning = await hasStartedLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK
  );
  if (isRunning) {
    await stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}

// ---------------------------------------------------------------------------
// Distance calculation
// ---------------------------------------------------------------------------

/** Haversine formula: returns distance in meters between two lat/lng points. */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Compute total distance in meters from an array of telemetry points. */
export function totalDistance(points: TelemetryPoint[]): number {
  let dist = 0;
  for (let i = 1; i < points.length; i++) {
    dist += haversineDistance(
      points[i - 1].lat,
      points[i - 1].lng,
      points[i].lat,
      points[i].lng
    );
  }
  return dist;
}
