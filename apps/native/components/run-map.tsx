// Web/fallback stub — react-native-maps is not available on web.
export type Coord = { latitude: number; longitude: number };

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type RunMapRoute = { coords: Coord[]; color: string };

export type RunMapProps = {
  coords?: Coord[];
  routes?: RunMapRoute[];
  region?: Region;
  initialRegion?: Region;
  height?: number;
  interactive?: boolean;
};

// biome-ignore lint/correctness/noUnusedVariables: shared interface for platform files
export function RunMap(_props: RunMapProps) {
  return null;
}
