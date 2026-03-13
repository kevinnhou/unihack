import { api } from "@unihack/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import type { LocationSubscription } from "expo-location";
import {
  Accuracy,
  requestForegroundPermissionsAsync,
  watchPositionAsync,
} from "expo-location";
import { useEffect, useRef } from "react";
import { useRunStore } from "@/stores/run-store";

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

type UseLocationTrackingOptions = {
  runId: string;
  pingIntervalMs?: number;
  gpsIntervalMs?: number;
};

export function useLocationTracking({
  runId,
  pingIntervalMs = 5000,
  gpsIntervalMs = 3000,
}: UseLocationTrackingOptions) {
  const updateTelemetry = useMutation(api.runs.updateTelemetry);
  const subscriptionRef = useRef<LocationSubscription | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCoordRef = useRef<{ lat: number; lng: number } | null>(null);

  const requestPermission = async () => {
    const { status } = await requestForegroundPermissionsAsync();
    return status === "granted";
  };

  const startTracking = async () => {
    const granted = await requestPermission();
    if (!granted) {
      return;
    }

    subscriptionRef.current = await watchPositionAsync(
      {
        accuracy: Accuracy.BestForNavigation,
        timeInterval: gpsIntervalMs,
        distanceInterval: 5,
      },
      (location) => {
        const { latitude, longitude, speed } = location.coords;
        const prev = prevCoordRef.current;
        const currentDistance = useRunStore.getState().distance;

        let delta = 0;
        if (prev !== null) {
          delta = haversineMeters(prev.lat, prev.lng, latitude, longitude);
        }
        prevCoordRef.current = { lat: latitude, lng: longitude };

        const newDistance = currentDistance + delta;
        const point = {
          timestamp: location.timestamp,
          lat: latitude,
          lng: longitude,
          speed: Math.max(speed ?? 0, 0),
        };

        const buffer = useRunStore.getState().telemetryBuffer;
        const windowStart = Date.now() - 30_000;
        const recentPoints = buffer.filter((p) => p.timestamp >= windowStart);
        let pace = 0;
        if (recentPoints.length >= 2) {
          const totalSpeed =
            recentPoints.reduce((sum, p) => sum + p.speed, 0) /
            recentPoints.length;
          pace = totalSpeed > 0 ? 1000 / totalSpeed : 0;
        } else if (point.speed > 0) {
          pace = 1000 / point.speed;
        }

        useRunStore.getState().addTelemetryPoint(point, newDistance, pace);
      }
    );

    pingIntervalRef.current = setInterval(async () => {
      const state = useRunStore.getState();
      if (!state.isRunning) {
        return;
      }
      const latest = state.telemetryBuffer.at(-1);
      if (!latest) {
        return;
      }
      await updateTelemetry({
        runId: runId as Parameters<typeof updateTelemetry>[0]["runId"],
        lat: latest.lat,
        lng: latest.lng,
        speed: latest.speed,
        distance: state.distance,
        duration: state.elapsedSeconds,
      });
    }, pingIntervalMs);
  };

  const stopTracking = () => {
    try {
      subscriptionRef.current?.remove();
    } catch {
      // expo-location ~18 calls the removed LocationEventEmitter.removeSubscription
      // in React Native 0.81 — safe to ignore, subscription is GC'd on unmount
    }
    subscriptionRef.current = null;
    if (pingIntervalRef.current !== null) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    prevCoordRef.current = null;
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <do not have infinite render loop, only want to run on unmount>
  useEffect(
    () => () => {
      stopTracking();
    },
    []
  );

  return { requestPermission, startTracking, stopTracking };
}
