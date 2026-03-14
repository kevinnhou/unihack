import {
  Accuracy,
  getForegroundPermissionsAsync,
  type LocationObject,
  type LocationSubscription,
  requestForegroundPermissionsAsync,
  watchPositionAsync,
} from "expo-location";
import {
  BG_LOCATION_DISTANCE_INTERVAL_M,
  BG_LOCATION_TIME_INTERVAL_MS,
} from "@/constants";
import type { TelemetryPoint } from "@/types";

export type { TelemetryPoint };

type LocationCallback = (point: TelemetryPoint) => void;

let _onLocationUpdate: LocationCallback | null = null;
let _subscription: LocationSubscription | null = null;

export function setLocationCallback(cb: LocationCallback | null) {
  _onLocationUpdate = cb;
}

// ---------------------------------------------------------------------------
// Permission helpers
// ---------------------------------------------------------------------------

export async function requestLocationPermissions(): Promise<boolean> {
  const { status } = await requestForegroundPermissionsAsync();
  return status === "granted";
}

export async function hasLocationPermissions(): Promise<boolean> {
  const { status } = await getForegroundPermissionsAsync();
  return status === "granted";
}

// ---------------------------------------------------------------------------
// Tracking lifecycle
// ---------------------------------------------------------------------------

export async function startTracking(onUpdate: LocationCallback): Promise<void> {
  setLocationCallback(onUpdate);

  try {
    _subscription = await watchPositionAsync(
      {
        accuracy: Accuracy.Highest,
        timeInterval: BG_LOCATION_TIME_INTERVAL_MS,
        distanceInterval: BG_LOCATION_DISTANCE_INTERVAL_M,
      },
      (loc: LocationObject) => {
        const point: TelemetryPoint = {
          timestamp: loc.timestamp,
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          speed: Math.max(0, loc.coords.speed ?? 0),
        };
        _onLocationUpdate?.(point);
      }
    );
  } catch (error) {
    // Location APIs might not be available in web environment
    throw new Error(`[Location] Could not start location updates: ${error}`);
  }
}

export async function stopTracking(): Promise<void> {
  setLocationCallback(null);
  _subscription?.remove();
  _subscription = null;
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
