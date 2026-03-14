import MapView, { Marker, Polyline } from "react-native-maps";

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

export function RunMap({
  coords,
  region,
  initialRegion,
  height = 220,
}: RunMapProps) {
  if (coords.length === 0 && !region && !initialRegion) {
    return null;
  }

  const mapProps = region ? { region } : { initialRegion };

  return (
    <MapView
      {...mapProps}
      scrollEnabled={false}
      style={{ width: "100%", height }}
      zoomEnabled={false}
    >
      {coords.length > 1 && (
        <Polyline coordinates={coords} strokeColor="#FF4500" strokeWidth={3} />
      )}
      {coords.length > 0 && <Marker coordinate={coords.at(-1) ?? coords[0]} />}
    </MapView>
  );
}
