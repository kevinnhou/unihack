import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_LIVE_PING_INTERVAL_MS,
  DEFAULT_PING_INTERVAL_MS,
  MIN_MOVE_SPEED_MS,
  MIN_PACE_DISTANCE_M,
  PACE_WINDOW_MS,
} from "@/constants";
import { useLivePing } from "@/hooks/use-live-ping";
import {
  requestLocationPermissions,
  startTracking as serviceStartTracking,
  stopTracking as serviceStopTracking,
} from "@/services/location";
import { useRunStore } from "@/stores/run-store";
import type { TelemetryPoint } from "@/types";

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
  roomId?: string | null;
  userId?: string | null;
};

export function useLocationTracking({
  runId,
  pingIntervalMs = DEFAULT_PING_INTERVAL_MS,
  roomId = null,
  userId = null,
}: UseLocationTrackingOptions) {
  const pingMutation = useMutation(api.runs.updateTelemetry);
  const pingMutationRef = useRef(pingMutation);
  const runIdRef = useRef(runId);
  const pingIntervalMsRef = useRef(pingIntervalMs);
  pingMutationRef.current = pingMutation;
  runIdRef.current = runId;
  pingIntervalMsRef.current = pingIntervalMs;

  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCoordRef = useRef<{ lat: number; lng: number } | null>(null);
  const paceWindowRef = useRef<PacePoint[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const { startPinging, stopPinging } = useLivePing({
    roomId,
    userId,
    pingIntervalMs: DEFAULT_LIVE_PING_INTERVAL_MS,
  });

  const stopTracking = useCallback(() => {
    serviceStopTracking();
    if (pingIntervalRef.current !== null) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    stopPinging();
    prevCoordRef.current = null;
    paceWindowRef.current = [];
  }, [stopPinging]);

  const startTracking = useCallback(async () => {
    stopTracking();

    const granted = await requestLocationPermissions();
    if (!granted) {
      setPermissionDenied(true);
      return;
    }
    setPermissionDenied(false);

    const locationHandler = (point: TelemetryPoint) => {
      const safeSpeed = Math.max(point.speed, 0);
      const state = useRunStore.getState();

      const delta = computeDistanceDelta(
        prevCoordRef.current,
        point.lat,
        point.lng,
        safeSpeed
      );
      prevCoordRef.current = { lat: point.lat, lng: point.lng };

      const newDistance = state.distance + delta;
      const now = point.timestamp;

      paceWindowRef.current.push({ timestamp: now, distance: newDistance });
      paceWindowRef.current = paceWindowRef.current.filter(
        (p) => p.timestamp >= now - PACE_WINDOW_MS
      );

      const pace = computePaceFromWindow(paceWindowRef.current);
      state.addTelemetryPoint(point, newDistance, pace);
    };

    await serviceStartTracking(locationHandler);
    startPinging();

    const currentRunId = runIdRef.current;
    if (currentRunId) {
      pingIntervalRef.current = setInterval(() => {
        const state = useRunStore.getState();
        if (!state.isRunning) {
          return;
        }
        pingMutationRef
          .current({
            runId: currentRunId as Id<"runs">,
            distance: state.distance,
            duration: state.elapsedSeconds,
            avgPace: state.currentPace,
          })
          .catch(() => {
            // network blip — silent
          });
      }, pingIntervalMsRef.current);
    }
  }, [stopTracking, startPinging]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: cleanup only on unmount
  useEffect(() => () => stopTracking(), []);

  return { startTracking, stopTracking, permissionDenied };
}
