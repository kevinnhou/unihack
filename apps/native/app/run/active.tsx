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
  // Granular selectors — avoids re-rendering (and re-running effects) on every
  // GPS tick or timer tick when reading the whole store at once.
  const runId = useRunStore((s) => s.runId) ?? "";
  const liveRoomId = useRunStore((s) => s.liveRoomId);
  const userId = useRunStore((s) => s.userId);
  const distance = useRunStore((s) => s.distance);
  const elapsedSeconds = useRunStore((s) => s.elapsedSeconds);
  const currentPace = useRunStore((s) => s.currentPace);
  const ghostRun = useRunStore((s) => s.ghostRun);
  const targetDistanceStore = useRunStore((s) => s.targetDistance);
  const mode = useRunStore((s) => s.mode);
  const endRunStore = useRunStore((s) => s.endRun);
  const setLiveRoomId = useRunStore((s) => s.setLiveRoomId);
  const resetStore = useRunStore((s) => s.reset);
  const endRunMutation = useMutation(api.runs.endRun);
  const finishLiveParticipant = useMutation(api.live.finishLiveParticipant);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isEnding, setIsEnding] = useState(false);

  const { startTracking, stopTracking } = useLocationTracking({ runId });

  // Optional Live Ping integration if this happens to be a social/live run
  const { startPinging, stopPinging } = useLivePing({
    roomId: liveRoomId,
    userId,
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
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: PASS
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

    const summary = endRunStore();
    const currentLiveRoomId = liveRoomId;
    const currentUserId = userId;

    // Handle Live Room Ending
    if (currentLiveRoomId && currentUserId) {
      await finishLiveParticipant({
        roomId: currentLiveRoomId as Id<"liveRooms">,
        userId: currentUserId as Id<"users">,
        distance: summary.distance,
        duration: summary.elapsedSeconds,
      });
      setLiveRoomId(null);
      resetStore();
      router.replace({
        pathname: "/live/results",
        params: { roomId: currentLiveRoomId },
        // biome-ignore lint/suspicious/noExplicitAny: PASS
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
          mode === "ranked" && ghostRun
            ? (ghostRun.userId as Id<"users">)
            : undefined,
        opponentAvgPace:
          mode === "ranked" && ghostRun ? ghostRun.avgPace : undefined,
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
    endRunStore,
    liveRoomId,
    userId,
    runId,
    endRunMutation,
    finishLiveParticipant,
    setLiveRoomId,
    resetStore,
    mode,
    ghostRun,
    router,
  ]);

  // ---------------------------------------------------------------------------
  // Render Computations
  // ---------------------------------------------------------------------------
  const ghostDistM = ghostRun
    ? ghostDistanceAtTime(ghostRun, elapsedSeconds)
    : null;

  const targetDistance =
    targetDistanceStore > 0
      ? targetDistanceStore
      : (ghostRun?.totalDistance ?? Math.max(distance, 1000));

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Centered HUD */}
      <View className="flex-1 justify-center px-6">
        <View className="gap-8 rounded-3xl bg-neutral-900 px-6 py-8">
          {/* Stats row */}
          <View className="flex-row items-center justify-between">
            <Stat label="Distance" value={formatDistance(distance)} />
            <Stat label="Time" large value={formatTime(elapsedSeconds)} />
            <Stat label="Pace" value={formatPace(currentPace)} />
          </View>

          {/* Progress bars */}
          <View className="gap-5">
            {/* Your progress */}
            <View>
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="font-medium text-sm text-white">You</Text>
                <Text className="text-sm text-white">
                  {formatDistance(distance)} / {formatDistance(targetDistance)}
                </Text>
              </View>
              <View className="h-4 overflow-hidden rounded-full bg-neutral-700">
                <View
                  className="h-full rounded-full bg-orange-500"
                  style={{
                    width: `${Math.min(100, (distance / targetDistance) * 100)}%`,
                  }}
                />
              </View>
            </View>

            {/* Opponent progress */}
            {/** biome-ignore lint/nursery/noLeakedRender: PASS */}
            {ghostRun && ghostDistM !== null && (
              <View>
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="font-medium text-sm text-white">
                    {ghostRun.name}
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
                  {ghostDeltaLabel(distance, ghostDistM)}
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
