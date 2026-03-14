import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RunMap } from "@/components/run-map";
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

const barColors = ["#3b82f6", "#22c55e", "#a855f7", "#eab308"];

function progressPercent(
  distanceMeters: number,
  targetDistanceMeters: number
): number {
  const safeTarget = Math.max(1, targetDistanceMeters);
  return Math.min(100, (distanceMeters / safeTarget) * 100);
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
      <Text
        className="mb-0.5 text-xs uppercase tracking-widest"
        style={{ color: "#9ca3af" }}
      >
        {label}
      </Text>
      <Text
        className="font-bold"
        style={{
          color: "#ffffff",
          fontSize: large ? 36 : 22,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export default function ActiveRunScreen() {
  const router = useRouter();
  const runId = useRunStore((s) => s.runId) ?? "";
  const liveRoomId = useRunStore((s) => s.liveRoomId);
  const userId = useRunStore((s) => s.userId);
  const distance = useRunStore((s) => s.distance);
  const elapsedSeconds = useRunStore((s) => s.elapsedSeconds);
  const currentPace = useRunStore((s) => s.currentPace);
  const ghostRun = useRunStore((s) => s.ghostRun);
  const targetDistanceStore = useRunStore((s) => s.targetDistance);
  const isRunning = useRunStore((s) => s.isRunning);
  const mode = useRunStore((s) => s.mode);
  const endRunStore = useRunStore((s) => s.endRun);
  const setLiveRoomId = useRunStore((s) => s.setLiveRoomId);
  const resetStore = useRunStore((s) => s.reset);
  const telemetryBuffer = useRunStore((s) => s.telemetryBuffer);
  const endRunMutation = useMutation(api.runs.endRun);
  const finishLiveParticipant = useMutation(api.live.finishLiveParticipant);
  const liveRoom = useQuery(
    api.live.getLiveRoom,
    liveRoomId ? { roomId: liveRoomId as Id<"liveRooms"> } : "skip"
  );

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isEnding, setIsEnding] = useState(false);

  const { startTracking, stopTracking, permissionDenied } = useLocationTracking(
    {
      runId,
    }
  );

  // Optional Live Ping integration if this happens to be a social/live run
  const { startPinging, stopPinging } = useLivePing({
    roomId: liveRoomId,
    userId,
  });

  // ---------------------------------------------------------------------------
  // Boot up Real GPS Tracking and Timers
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isRunning) {
      return;
    }

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
  }, [startTracking, startPinging, isRunning]);

  // ---------------------------------------------------------------------------
  // Finish Logic
  // ---------------------------------------------------------------------------
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: PASS
  const handleFinish = useCallback(async () => {
    if (isEnding) {
      return;
    }
    setIsEnding(true);

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
        mode: String(mode),
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
  const liveParticipants = liveRoom?.participants ?? [];

  const ghostDistM = ghostRun
    ? ghostDistanceAtTime(ghostRun, elapsedSeconds)
    : null;

  const targetDistance =
    targetDistanceStore > 0
      ? targetDistanceStore
      : (ghostRun?.totalDistance ?? Math.max(distance, 1000));

  const lastPoint = telemetryBuffer.at(-1);
  const mapCoords = telemetryBuffer.map((p) => ({
    latitude: p.lat,
    longitude: p.lng,
  }));
  const mapRegion = lastPoint
    ? {
        latitude: lastPoint.lat,
        longitude: lastPoint.lng,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      }
    : undefined;

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-black px-6">
      {/* Live map */}
      <RunMap coords={mapCoords} region={mapRegion} />

      {/* Centered HUD */}
      <View className="flex-1 justify-center px-6">
        <View className="rounded-3xl bg-neutral-900 px-6 py-8">
          {/* Stats row */}
          <View
            className="flex-row items-center justify-between"
            style={{ marginBottom: 32 }}
          >
            <Stat label="Distance" value={formatDistance(distance)} />
            <Stat label="Time" large value={formatTime(elapsedSeconds)} />
            <Stat label="Pace" value={formatPace(currentPace)} />
          </View>

          {/** biome-ignore lint/nursery/noLeakedRender: permissionDenied is boolean */}
          {permissionDenied && (
            <View className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3">
              <Text className="font-semibold text-red-300 text-sm">
                Location permission is required for live distance tracking.
              </Text>
              <TouchableOpacity
                className="mt-2 self-start rounded-lg bg-red-500 px-3 py-2"
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Linking.openSettings().catch(() => {
                      // ignore settings open failures
                    });
                  }
                }}
              >
                <Text
                  className="font-semibold text-white text-xs"
                  style={{ color: "#ffffff" }}
                >
                  Open Settings
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Progress bars */}
          <View style={{ gap: 20, marginBottom: 32 }}>
            {/** biome-ignore lint/nursery/noLeakedRender: liveRoomId is a valid ID string or null, never empty string */}
            {liveRoomId && liveParticipants.length > 0 ? (
              liveParticipants.map((participant, index) => {
                const isMe = participant.userId === userId;
                const participantLabel = isMe ? "You" : participant.name;
                const barColor = isMe
                  ? "#f97316"
                  : barColors[index % barColors.length];

                return (
                  <View key={participant.userId}>
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text
                        className="font-medium text-sm text-white"
                        style={{ color: "#ffffff" }}
                      >
                        {participantLabel}
                      </Text>
                      <Text
                        className="text-sm text-white"
                        style={{ color: "#ffffff" }}
                      >
                        {formatDistance(participant.distance)} /{" "}
                        {formatDistance(targetDistance)}
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 8,
                        width: "100%",
                        overflow: "hidden",
                        borderRadius: 999,
                        backgroundColor: "#404040",
                      }}
                    >
                      <View
                        style={{
                          height: "100%",
                          borderRadius: 999,
                          backgroundColor: barColor,
                          width: `${progressPercent(participant.distance, targetDistance)}%`,
                        }}
                      />
                    </View>
                  </View>
                );
              })
            ) : (
              <>
                {/* Your progress */}
                <View>
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text
                      className="font-medium text-sm text-white"
                      style={{ color: "#ffffff" }}
                    >
                      You
                    </Text>
                    <Text
                      className="text-sm text-white"
                      style={{ color: "#ffffff" }}
                    >
                      {formatDistance(distance)} /{" "}
                      {formatDistance(targetDistance)}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 8,
                      width: "100%",
                      overflow: "hidden",
                      borderRadius: 999,
                      backgroundColor: "#404040",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        borderRadius: 999,
                        backgroundColor: "#f97316",
                        width: `${progressPercent(distance, targetDistance)}%`,
                      }}
                    />
                  </View>
                </View>

                {/* Opponent progress */}
                {/** biome-ignore lint/nursery/noLeakedRender: PASS */}
                {ghostRun && ghostDistM !== null && (
                  <View>
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text
                        className="font-medium text-sm text-white"
                        style={{ color: "#ffffff" }}
                      >
                        {ghostRun.name}
                      </Text>
                      <Text
                        className="text-sm text-white"
                        style={{ color: "#ffffff" }}
                      >
                        {formatDistance(ghostDistM)} /{" "}
                        {formatDistance(targetDistance)}
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 8,
                        width: "100%",
                        overflow: "hidden",
                        borderRadius: 999,
                        backgroundColor: "#404040",
                      }}
                    >
                      <View
                        style={{
                          height: "100%",
                          borderRadius: 999,
                          backgroundColor: "#3b82f6",
                          width: `${progressPercent(ghostDistM, targetDistance)}%`,
                        }}
                      />
                    </View>
                    <View
                      style={{
                        marginTop: 12,
                        alignSelf: "center",
                        backgroundColor: "rgba(249,115,22,0.2)",
                        borderRadius: 999,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fb923c",
                          textAlign: "center",
                          fontWeight: "bold",
                          fontSize: 16,
                        }}
                      >
                        {ghostDeltaLabel(distance, ghostDistM)}
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Finish button */}
          <TouchableOpacity
            className="mt-4 items-center rounded-2xl bg-red-600 py-4"
            disabled={isEnding}
            onPress={handleFinish}
          >
            <Text
              className="font-bold text-lg text-white"
              style={{ color: "#ffffff" }}
            >
              {isEnding ? "Saving..." : "Finish Run"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
