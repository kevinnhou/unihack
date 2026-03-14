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
