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

type RunState = {
  runId: string | null;
  mode: "ranked" | "social";
  isRunning: boolean;
  startTime: number | null;
  distance: number;
  currentPace: number;
  elapsedSeconds: number;
  telemetryBuffer: TelemetryPoint[];
  startRun: (runId: string, mode: "ranked" | "social") => void;
  addTelemetryPoint: (
    point: TelemetryPoint,
    newDistance: number,
    pace: number
  ) => void;
  tickElapsed: () => void;
  endRun: () => RunSummary;
  reset: () => void;
};

const initialState = {
  runId: null,
  mode: "social" as const,
  isRunning: false,
  startTime: null,
  distance: 0,
  currentPace: 0,
  elapsedSeconds: 0,
  telemetryBuffer: [],
};

export const useRunStore = create<RunState>((set, get) => ({
  ...initialState,

  startRun: (runId, mode) => {
    set({
      runId,
      mode,
      isRunning: true,
      startTime: Date.now(),
      distance: 0,
      currentPace: 0,
      elapsedSeconds: 0,
      telemetryBuffer: [],
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
    return { distance, elapsedSeconds, avgPace };
  },

  reset: () => {
    set(initialState);
  },
}));
