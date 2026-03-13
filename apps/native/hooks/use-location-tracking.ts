import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import type { LocationSubscription } from "expo-location";
import {
  Accuracy,
  requestForegroundPermissionsAsync,
  watchPositionAsync,
} from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRunStore } from "@/stores/run-store";

/** Ignore movement below this speed (GPS noise floor). */
const MIN_MOVE_SPEED_MS = 0.3; // m/s ≈ 1 km/h
/** Rolling window for pace computation. */
const PACE_WINDOW_MS = 20_000;
/** Minimum distance moved in window before emitting a valid pace. */
const MIN_PACE_DISTANCE_M = 5;

function haversineMeters(
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

type PacePoint = { timestamp: number; distance: number };

function computePaceFromWindow(win: PacePoint[]): number {
  if (win.length < 2) {
    return 0;
  }
  const first = win[0];
  const last = win.at(-1) as PacePoint;
  const distDelta = last.distance - first.distance;
  const timeDeltaS = (last.timestamp - first.timestamp) / 1000;
  if (distDelta >= MIN_PACE_DISTANCE_M && timeDeltaS > 0) {
    return timeDeltaS / (distDelta / 1000); // sec/km
  }
  return 0;
}

function computeDistanceDelta(
  prev: { lat: number; lng: number } | null,
  lat: number,
  lng: number,
  speed: number
): number {
  if (prev === null) {
    return 0;
  }
  const rawDelta = haversineMeters(prev.lat, prev.lng, lat, lng);
  const effectiveSpeed = Math.max(speed, 0);
  return effectiveSpeed >= MIN_MOVE_SPEED_MS ? rawDelta : 0;
}

type UseLocationTrackingOptions = {
  runId: string | null;
  pingIntervalMs?: number;
  gpsIntervalMs?: number;
};

export function useLocationTracking({
  runId,
  pingIntervalMs = 5000,
  gpsIntervalMs = 2000,
}: UseLocationTrackingOptions) {
  const pingMutation = useMutation(api.runs.updateTelemetry);
  const subscriptionRef = useRef<LocationSubscription | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCoordRef = useRef<{ lat: number; lng: number } | null>(null);
  /** Lightweight ring-buffer for distance/time based pace computation. */
  const paceWindowRef = useRef<PacePoint[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const stopTracking = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current = null;
    }
    if (pingIntervalRef.current !== null) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    prevCoordRef.current = null;
    paceWindowRef.current = [];
  }, []);

  const startTracking = useCallback(async () => {
    stopTracking();

    const { status } = await requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setPermissionDenied(true);
      return;
    }
    setPermissionDenied(false);

    subscriptionRef.current = await watchPositionAsync(
      {
        accuracy: Accuracy.Highest,
        timeInterval: gpsIntervalMs,
        distanceInterval: 1,
      },
      (location) => {
        const { latitude, longitude, speed } = location.coords;
        const safeSpeed = Math.max(speed ?? 0, 0);
        const state = useRunStore.getState();

        const delta = computeDistanceDelta(
          prevCoordRef.current,
          latitude,
          longitude,
          safeSpeed
        );
        prevCoordRef.current = { lat: latitude, lng: longitude };

        const newDistance = state.distance + delta;
        const now = location.timestamp;

        paceWindowRef.current.push({ timestamp: now, distance: newDistance });
        paceWindowRef.current = paceWindowRef.current.filter(
          (p) => p.timestamp >= now - PACE_WINDOW_MS
        );

        const pace = computePaceFromWindow(paceWindowRef.current);
        const point = {
          timestamp: now,
          lat: latitude,
          lng: longitude,
          speed: safeSpeed,
        };
        state.addTelemetryPoint(point, newDistance, pace);
      }
    );

    if (runId) {
      pingIntervalRef.current = setInterval(() => {
        const state = useRunStore.getState();
        if (!state.isRunning) {
          return;
        }
        // Lightweight ping — no GPS coordinates sent to server
        pingMutation({
          runId: runId as Id<"runs">,
          distance: state.distance,
          duration: state.elapsedSeconds,
          avgPace: state.currentPace,
        }).catch(() => {
          // network blip — silent
        });
      }, pingIntervalMs);
    }
  }, [runId, gpsIntervalMs, pingIntervalMs, pingMutation, stopTracking]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: cleanup only on unmount
  useEffect(() => () => stopTracking(), []);

  return { startTracking, stopTracking, permissionDenied };
}
