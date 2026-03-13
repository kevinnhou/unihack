import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AppState,
  type AppStateStatus,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  requestLocationPermissions,
  startTracking,
  stopTracking,
  type TelemetryPoint,
} from "@/services/location";
import { enqueueUpload, flushQueue, isOnline } from "@/services/offline-queue";
import { interpolateGhostDistance, useRunStore } from "@/stores/run-store";

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

function formatPace(distM: number, durationSec: number) {
  if (distM < 10) {
    return "--:--";
  }
  const secPerKm = durationSec / (distM / 1000);
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")} /km`;
}

function ghostDeltaLabel(userDist: number, ghostDist: number): string {
  const diff = userDist - ghostDist;
  if (Math.abs(diff) < 10) {
    return "Even";
  }
  const ahead = diff > 0;
  const distStr =
    Math.abs(diff) >= 1000
      ? `${(Math.abs(diff) / 1000).toFixed(1)} km`
      : `${Math.round(Math.abs(diff))} m`;
  return `${ahead ? "+" : "-"}${distStr} ${ahead ? "ahead" : "behind"}`;
}

export default function ActiveRunScreen() {
  const router = useRouter();
  const mapRef = null;
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const [mapVisible, setMapVisible] = useState(true);
  const [offline] = useState(false);

  const {
    mode,
    runId,
    isRunning,
    telemetry,
    distanceMeters,
    durationSeconds,
    opponentTelemetry,
    opponentName,
    setRunId,
    startRun: storeStartRun,
    addPoint,
    tick,
    finishRun: storeFinishRun,
    targetDistance,
    opponentRunId,
    opponentUserId,
  } = useRunStore();

  const startRunMutation = useMutation(api.runs.startRun);
  const finishRunMutation = useMutation(api.runs.finishRun);

  // ---------------------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const hasPerms = await requestLocationPermissions();
      if (!hasPerms || cancelled) {
        return;
      }

      const args: any = {
        type: mode ?? "ranked",
        distance: targetDistance,
      };

      if (opponentRunId) {
        args.opponentRunId = opponentRunId;
      }
      if (opponentUserId) {
        args.opponentUserId = opponentUserId;
      }

      const id = await startRunMutation(args);
      if (cancelled) {
        return;
      }

      setRunId(id);
      storeStartRun();

      await startTracking((point: TelemetryPoint) => {
        if (!cancelled) {
          addPoint(point);
        }
      });
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [
    mode,
    targetDistance,
    opponentRunId,
    opponentUserId,
    startRunMutation,
    setRunId,
    storeStartRun,
    addPoint,
  ]);

  // ---------------------------------------------------------------------------
  // Timer tick
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isRunning) {
      return;
    }
    tickRef.current = setInterval(tick, 1000);
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
      }
    };
  }, [isRunning, tick]);

  // ---------------------------------------------------------------------------
  // Background: pause map rendering but keep GPS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (
          appStateRef.current === "active" &&
          (nextState === "background" || nextState === "inactive")
        ) {
          setMapVisible(false);
        } else if (nextState === "active") {
          setMapVisible(true);
        }
        appStateRef.current = nextState;
      }
    );
    return () => sub.remove();
  }, []);

  // ---------------------------------------------------------------------------
  // Finish
  // ---------------------------------------------------------------------------
  const handleFinish = useCallback(async () => {
    storeFinishRun();
    await stopTracking();

    const online = await isOnline();

    if (online && runId) {
      try {
        await finishRunMutation({
          runId: runId as Id<"runs">,
          durationSeconds,
          distance: distanceMeters,
          telemetry: telemetry.length <= 800 ? telemetry : undefined,
        });
      } catch {
        await enqueueUpload({
          runId,
          durationSeconds,
          distance: distanceMeters,
          telemetry,
        });
      }
    } else if (runId) {
      await enqueueUpload({
        runId,
        durationSeconds,
        distance: distanceMeters,
        telemetry,
      });
    }

    if (online) {
      flushQueue(async (item) => {
        await finishRunMutation({
          runId: item.runId as Id<"runs">,
          durationSeconds: item.durationSeconds,
          distance: item.distance,
          telemetry: item.telemetry.length <= 800 ? item.telemetry : undefined,
        });
      });
    }

    router.replace({
      pathname: "/run/finish",
      params: { runId: runId ?? "" },
    });
  }, [
    storeFinishRun,
    runId,
    durationSeconds,
    distanceMeters,
    telemetry,
    finishRunMutation,
    router,
  ]);

  // ---------------------------------------------------------------------------
  // Ghost distance
  // ---------------------------------------------------------------------------
  const ghostDistM =
    opponentTelemetry && opponentTelemetry.length > 0
      ? interpolateGhostDistance(
          opponentTelemetry,
          opponentTelemetry[0].timestamp,
          durationSeconds * 1000
        )
      : null;

  const coords = telemetry.map((p) => ({
    latitude: p.lat,
    longitude: p.lng,
  }));

  const currentLocation = coords.at(-1);

  return (
    <SafeAreaView className="flex-1 bg-black">
      {offline ? (
        <View className="bg-yellow-600 px-4 py-2">
          <Text className="text-center font-semibold text-sm text-white">
            Offline – Syncing…
          </Text>
        </View>
      ) : null}

      {/* <MapSection
        coords={coords}
        location={currentLocation}
        mapRef={mapRef}
        visible={mapVisible}
      /> */}

      {/* HUD */}
      <View className="gap-2 bg-black px-6 py-4">
        {/* Stats row */}
        <View className="flex-row items-center justify-between">
          <Stat label="Distance" value={formatDistance(distanceMeters)} />
          <Stat label="Time" large value={formatTime(durationSeconds)} />
          <Stat
            label="Pace"
            value={formatPace(distanceMeters, durationSeconds)}
          />
        </View>

        {/* Ghost HUD */}
        {opponentName !== null && ghostDistM !== null && (
          <View className="mt-1 rounded-2xl bg-neutral-900 px-4 py-3">
            <Text className="text-center font-bold text-orange-400 text-sm">
              vs {opponentName}
            </Text>
            <Text className="mt-0.5 text-center font-semibold text-base text-white">
              {ghostDeltaLabel(distanceMeters, ghostDistM)}
            </Text>
            <View className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-700">
              <View
                className="h-full rounded-full bg-orange-500"
                style={{
                  width: `${Math.min(
                    100,
                    (distanceMeters / targetDistance) * 100
                  )}%`,
                }}
              />
            </View>
          </View>
        )}

        {/* Finish button */}
        <TouchableOpacity
          className="mt-3 items-center rounded-2xl bg-red-600 py-4"
          onPress={handleFinish}
        >
          <Text className="font-bold text-lg text-white">Finish Run</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function MapSection({
  visible,
  location,
  coords,
  mapRef,
}: {
  visible: boolean;
  location: { latitude: number; longitude: number } | undefined;
  coords: { latitude: number; longitude: number }[];
  mapRef: RefObject<null>;
}) {
  if (!(visible && location)) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-900">
        <Text className="text-gray-500 text-sm">
          {visible ? "Waiting for GPS…" : "Map paused"}
        </Text>
      </View>
    );
  }

  // return (
  //   <AppleMaps.View
  //     cameraPosition={{
  //       coordinates: {
  //         latitude: location.latitude,
  //         longitude: location.longitude,
  //       },
  //       zoom: 15,
  //     }}
  //     polylines={
  //       coords.length > 1
  //         ? [{ coordinates: coords, color: "#FF4500", width: 4 }]
  //         : []
  //     }
  //     properties={{
  //       isMyLocationEnabled: true,
  //       mapType: AppleMaps.MapType.STANDARD,
  //       emphasis: AppleMapsMapStyleEmphasis.MUTED,
  //     }}
  //     ref={mapRef}
  //     style={{ flex: 1 }}
  //   />
  // );
}

function Stat({
  label,
  value,
  large,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <View className="items-center">
      <Text className="mb-0.5 text-gray-400 text-xs uppercase tracking-widest">
        {label}
      </Text>
      <Text
        className={`font-bold text-white ${large ? "text-4xl" : "text-xl"}`}
      >
        {value}
      </Text>
    </View>
  );
}
