import { create } from "zustand";
import { haversineDistance, type TelemetryPoint } from "@/services/location";

export type RunMode = "ranked" | "social" | "live";

type RunState = {
  // Config
  mode: RunMode | null;
  targetDistance: number;
  opponentRunId: string | null;
  opponentUserId: string | null;
  opponentName: string | null;
  opponentTelemetry: TelemetryPoint[] | null;
  liveRoomId: string | null;

  // Active run
  runId: string | null;
  isRunning: boolean;
  startedAt: number | null;
  telemetry: TelemetryPoint[];
  distanceMeters: number;
  durationSeconds: number;

  // Actions
  configureRun: (cfg: {
    mode: RunMode;
    targetDistance: number;
    opponentRunId?: string;
    opponentUserId?: string;
    opponentName?: string;
    opponentTelemetry?: TelemetryPoint[];
    liveRoomId?: string;
  }) => void;
  setRunId: (id: string) => void;
  startRun: () => void;
  addPoint: (point: TelemetryPoint) => void;
  tick: () => void;
  finishRun: () => void;
  reset: () => void;
};

const INITIAL: Omit<
  RunState,
  | "configureRun"
  | "setRunId"
  | "startRun"
  | "addPoint"
  | "tick"
  | "finishRun"
  | "reset"
> = {
  mode: null,
  targetDistance: 5000,
  opponentRunId: null,
  opponentUserId: null,
  opponentName: null,
  opponentTelemetry: null,
  liveRoomId: null,
  runId: null,
  isRunning: false,
  startedAt: null,
  telemetry: [],
  distanceMeters: 0,
  durationSeconds: 0,
};

export const useRunStore = create<RunState>((set, get) => ({
  ...INITIAL,

  configureRun(cfg) {
    set({
      mode: cfg.mode,
      targetDistance: cfg.targetDistance,
      opponentRunId: cfg.opponentRunId ?? null,
      opponentUserId: cfg.opponentUserId ?? null,
      opponentName: cfg.opponentName ?? null,
      opponentTelemetry: cfg.opponentTelemetry ?? null,
      liveRoomId: cfg.liveRoomId ?? null,
    });
  },

  setRunId(id) {
    set({ runId: id });
  },

  startRun() {
    set({
      isRunning: true,
      startedAt: Date.now(),
      telemetry: [],
      distanceMeters: 0,
      durationSeconds: 0,
    });
  },

  addPoint(point) {
    const { telemetry } = get();
    const last = telemetry.at(-1);
    const added = last
      ? haversineDistance(last.lat, last.lng, point.lat, point.lng)
      : 0;

    set({
      telemetry: [...telemetry, point],
      distanceMeters: get().distanceMeters + added,
    });
  },

  tick() {
    const { startedAt, isRunning } = get();
    if (!(isRunning && startedAt)) {
      return;
    }
    set({ durationSeconds: Math.floor((Date.now() - startedAt) / 1000) });
  },

  finishRun() {
    set({ isRunning: false });
  },

  reset() {
    set(INITIAL);
  },
}));

// ---------------------------------------------------------------------------
// Ghost HUD helpers
// ---------------------------------------------------------------------------

/**
 * Given the ghost's telemetry array and the current elapsed duration,
 * interpolate the ghost's distance at that moment.
 */
export function interpolateGhostDistance(
  ghostTelemetry: TelemetryPoint[],
  ghostStartTimestamp: number,
  elapsedMs: number
): number {
  if (!ghostTelemetry.length) {
    return 0;
  }

  const targetTs = ghostStartTimestamp + elapsedMs;

  // Find bracketing points
  let prev = ghostTelemetry[0];
  // ghostTelemetry.length > 0 was verified above; cast is safe
  let next = (ghostTelemetry.at(-1) ?? ghostTelemetry.at(0)) as TelemetryPoint;

  for (let i = 0; i < ghostTelemetry.length - 1; i++) {
    if (
      ghostTelemetry[i].timestamp <= targetTs &&
      ghostTelemetry[i + 1].timestamp >= targetTs
    ) {
      prev = ghostTelemetry[i];
      next = ghostTelemetry[i + 1];
      break;
    }
  }

  const range = next.timestamp - prev.timestamp;
  if (range === 0) {
    // Compute cumulative distance up to prev
    return cumulativeDistance(ghostTelemetry, prev);
  }

  const t = (targetTs - prev.timestamp) / range;
  const dPrev = cumulativeDistance(ghostTelemetry, prev);
  const dNext = cumulativeDistance(ghostTelemetry, next);
  return dPrev + t * (dNext - dPrev);
}

function cumulativeDistance(
  points: TelemetryPoint[],
  upTo: TelemetryPoint
): number {
  let dist = 0;
  for (let i = 1; i < points.length; i++) {
    dist += haversineDistance(
      points[i - 1].lat,
      points[i - 1].lng,
      points[i].lat,
      points[i].lng
    );
    if (points[i] === upTo) {
      break;
    }
  }
  return dist;
}
