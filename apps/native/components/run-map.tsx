// Web/fallback stub — react-native-maps is not available on web.
type Coord = { latitude: number; longitude: number };

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type RunMapProps = {
  coords: Coord[];
  region?: Region;
  initialRegion?: Region;
  height?: number;
};

// biome-ignore lint/correctness/noUnusedVariables: shared interface for platform files
export function RunMap(_props: RunMapProps) {
  return null;
}
