import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLivePing } from "@/hooks/use-live-ping";
import { useLocationTracking } from "@/hooks/use-location-tracking";
import { type GhostInfo, useRunStore } from "@/stores/run-store";

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m > 59) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}:${rm.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

function formatPace(secPerKm: number): string {
  if (secPerKm <= 0 || !Number.isFinite(secPerKm)) {
    return "--:--";
  }
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.floor(secPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")} /km`;
}

function ghostDistanceAtTime(ghost: GhostInfo, elapsedSeconds: number): number {
  if (ghost.avgPace <= 0) {
    return 0;
  }
  return Math.min((elapsedSeconds / ghost.avgPace) * 1000, ghost.totalDistance);
}

function ghostDeltaLabel(userDist: number, ghostDist: number): string {
  const diff = userDist - ghostDist;
  if (Math.abs(diff) < 10) {
    return "Even";
  }
  const distStr =
    Math.abs(diff) >= 1000
      ? `${(Math.abs(diff) / 1000).toFixed(1)} km`
      : `${Math.round(Math.abs(diff))} m`;
  return diff > 0 ? `+${distStr} ahead` : `-${distStr} behind`;
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

export default function ActiveRunScreen() {
  const router = useRouter();
  const store = useRunStore();
  const endRunMutation = useMutation(api.runs.endRun);
  const finishLiveParticipant = useMutation(api.live.finishLiveParticipant);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isEnding, setIsEnding] = useState(false);

  // Use the REAL tracking hook
  const runId = store.runId ?? "";
  const { startTracking, stopTracking } = useLocationTracking({ runId });

  // Optional Live Ping integration if this happens to be a social/live run
  const { startPinging, stopPinging } = useLivePing({
    roomId: store.liveRoomId,
    userId: store.userId,
  });

  // ---------------------------------------------------------------------------
  // Boot up Real GPS Tracking and Timers
  // ---------------------------------------------------------------------------
  useEffect(() => {
    startTracking();
    startPinging();

    tickRef.current = setInterval(() => {
      useRunStore.getState().tickElapsed();
    }, 1000);

    return () => {
      if (tickRef.current !== null) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [startTracking, startPinging]);

  // ---------------------------------------------------------------------------
  // Finish Logic
  // ---------------------------------------------------------------------------
  const handleFinish = useCallback(async () => {
    if (isEnding) {
      return;
    }
    setIsEnding(true);

    // Stop real tracking intervals
    stopTracking();
    stopPinging();
    if (tickRef.current) {
      clearInterval(tickRef.current);
    }

    const summary = store.endRun();
    const currentLiveRoomId = store.liveRoomId;
    const currentUserId = store.userId;

    // Handle Live Room Ending
    if (currentLiveRoomId && currentUserId) {
      await finishLiveParticipant({
        roomId: currentLiveRoomId as Id<"liveRooms">,
        userId: currentUserId as Id<"users">,
        distance: summary.distance,
        duration: summary.elapsedSeconds,
      });
      store.setLiveRoomId(null);
      store.reset();
      router.replace({
        pathname: "/live/results",
        params: { roomId: currentLiveRoomId },
      } as any);
      return;
    }

    // Handle Solo/Ghost Run Ending
    if (runId) {
      await endRunMutation({
        runId: runId as Id<"runs">,
        distance: summary.distance,
        duration: summary.elapsedSeconds,
        opponentId:
          store.mode === "ranked" && store.ghostRun
            ? (store.ghostRun.userId as Id<"users">)
            : undefined,
        opponentAvgPace:
          store.mode === "ranked" && store.ghostRun
            ? store.ghostRun.avgPace
            : undefined,
      });
    }

    router.replace({
      pathname: "/run/finish",
      params: {
        distance: String(summary.distance),
        duration: String(summary.elapsedSeconds),
        avgPace: String(summary.avgPace),
        runId,
      },
    });
  }, [
    isEnding,
    stopTracking,
    stopPinging,
    store,
    runId,
    endRunMutation,
    finishLiveParticipant,
    router,
  ]);

  // ---------------------------------------------------------------------------
  // Render Computations
  // ---------------------------------------------------------------------------
  const ghostDistM = store.ghostRun
    ? ghostDistanceAtTime(store.ghostRun, store.elapsedSeconds)
    : null;

  const targetDistance =
    store.targetDistance > 0
      ? store.targetDistance
      : (store.ghostRun?.totalDistance ?? Math.max(store.distance, 1000));

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Centered HUD */}
      <View className="flex-1 justify-center px-6">
        <View className="gap-8 rounded-3xl bg-neutral-900 px-6 py-8">
          {/* Stats row */}
          <View className="flex-row items-center justify-between">
            <Stat label="Distance" value={formatDistance(store.distance)} />
            <Stat label="Time" large value={formatTime(store.elapsedSeconds)} />
            <Stat label="Pace" value={formatPace(store.currentPace)} />
          </View>

          {/* Progress bars */}
          <View className="gap-5">
            {/* Your progress */}
            <View>
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="font-medium text-sm text-white">You</Text>
                <Text className="text-sm text-white">
                  {formatDistance(store.distance)} /{" "}
                  {formatDistance(targetDistance)}
                </Text>
              </View>
              <View className="h-4 overflow-hidden rounded-full bg-neutral-700">
                <View
                  className="h-full rounded-full bg-orange-500"
                  style={{
                    width: `${Math.min(100, (store.distance / targetDistance) * 100)}%`,
                  }}
                />
              </View>
            </View>

            {/* Opponent progress */}
            {store.ghostRun && ghostDistM !== null && (
              <View>
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="font-medium text-sm text-white">
                    {store.ghostRun.name}
                  </Text>
                  <Text className="text-sm text-white">
                    {formatDistance(ghostDistM)} /{" "}
                    {formatDistance(targetDistance)}
                  </Text>
                </View>
                <View className="h-4 overflow-hidden rounded-full bg-neutral-700">
                  <View
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: `${Math.min(100, (ghostDistM / targetDistance) * 100)}%`,
                    }}
                  />
                </View>
                <Text className="mt-3 text-center font-bold text-base text-orange-400">
                  {ghostDeltaLabel(store.distance, ghostDistM)}
                </Text>
              </View>
            )}
          </View>

          {/* Finish button */}
          <TouchableOpacity
            className="mt-4 items-center rounded-2xl bg-red-600 py-4"
            disabled={isEnding}
            onPress={handleFinish}
          >
            <Text className="font-bold text-lg text-white">
              {isEnding ? "Saving..." : "Finish Run"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
