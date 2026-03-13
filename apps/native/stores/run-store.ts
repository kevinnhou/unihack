import { create } from "zustand";

export type TelemetryPoint = {
  timestamp: number;
  lat: number;
  lng: number;
  speed: number;
};

export type RunSummary = {
  distance: number;
  elapsedSeconds: number;
  avgPace: number;
};

export type GhostInfo = {
  userId: string;
  name: string;
  avgPace: number;
  totalDistance: number;
};

type RunState = {
  runId: string | null;
  mode: "ranked" | "social";
  isRunning: boolean;
  startTime: number | null;
  distance: number;
  currentPace: number;
  elapsedSeconds: number;
  telemetryBuffer: TelemetryPoint[];
  ghostRun: GhostInfo | null;
  liveRoomId: string | null;
  userId: string | null;
  startRun: (runId: string, mode: "ranked" | "social", userId?: string) => void;
  addTelemetryPoint: (
    point: TelemetryPoint,
    newDistance: number,
    pace: number
  ) => void;
  tickElapsed: () => void;
  endRun: () => RunSummary;
  setGhostRun: (ghost: GhostInfo | null) => void;
  setLiveRoomId: (id: string | null) => void;
  reset: () => void;
};

const initialState = {
  runId: null as string | null,
  mode: "social" as const,
  isRunning: false,
  startTime: null as number | null,
  distance: 0,
  currentPace: 0,
  elapsedSeconds: 0,
  telemetryBuffer: [] as TelemetryPoint[],
  ghostRun: null as GhostInfo | null,
  liveRoomId: null as string | null,
  userId: null as string | null,
};

export const useRunStore = create<RunState>((set, get) => ({
  ...initialState,

  startRun: (runId, mode, userId) => {
    set({
      runId,
      mode,
      isRunning: true,
      startTime: Date.now(),
      distance: 0,
      currentPace: 0,
      elapsedSeconds: 0,
      telemetryBuffer: [],
      ghostRun: null,
      liveRoomId: null,
      userId: userId ?? null,
    });
  },

  addTelemetryPoint: (point, newDistance, pace) => {
    set((state) => ({
      telemetryBuffer: [...state.telemetryBuffer, point],
      distance: newDistance,
      currentPace: pace,
    }));
  },

  tickElapsed: () => {
    const { startTime } = get();
    if (startTime === null) {
      return;
    }
    set({ elapsedSeconds: Math.floor((Date.now() - startTime) / 1000) });
  },

  endRun: () => {
    const { distance, elapsedSeconds } = get();
    const avgPace = distance > 0 ? elapsedSeconds / (distance / 1000) : 0;
    set({ isRunning: false });
    return { distance, elapsedSeconds, avgPace };
  },

  setGhostRun: (ghost) => {
    set({ ghostRun: ghost });
  },

  setLiveRoomId: (id) => {
    set({ liveRoomId: id });
  },

  reset: () => {
    set(initialState);
  },
}));
