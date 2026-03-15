import MapView, { Marker, Polyline } from "react-native-maps";
import type { RunMapProps } from "./run-map";

export function RunMap({
  coords = [],
  routes,
  region,
  initialRegion,
  height = 280,
  interactive = false,
}: RunMapProps) {
  const hasRoutes = routes && routes.length > 0;
  const hasCoords = coords.length > 0;
  const hasData = hasRoutes || hasCoords;

  if (!(hasData || region || initialRegion)) {
    return null;
  }

  const mapProps = region ? { region } : { initialRegion };

  return (
    <MapView
      {...mapProps}
      pitchEnabled={false}
      scrollEnabled={interactive}
      style={{ width: "100%", height }}
      zoomEnabled={interactive}
    >
      {routes?.map((r, i) =>
        r.coords.length > 1 ? (
          <Polyline
            coordinates={r.coords}
            key={i}
            strokeColor={r.color}
            strokeWidth={4}
          />
        ) : null
      )}
      {!hasRoutes && coords.length > 1 && (
        <Polyline coordinates={coords} strokeColor="#ff6900" strokeWidth={4} />
      )}
      {!hasRoutes && coords.length > 0 && (
        <Marker coordinate={coords.at(-1) ?? coords[0]} />
      )}
    </MapView>
  );
}
