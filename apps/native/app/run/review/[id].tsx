import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Ghost, Radio, Trophy, User } from "lucide-react-native";
import type React from "react";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { type Coord, type Region, RunMap } from "@/components/run-map";
import { useAuthStore } from "@/stores/auth-store";

const LIVE_COLORS = ["#ff6900", "#22c55e", "#3b82f6", "#a855f7", "#f59e0b"];

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function paceLabel(avgPaceSecPerKm: number): string {
  if (avgPaceSecPerKm <= 0) return "—";
  const m = Math.floor(avgPaceSecPerKm / 60);
  const s = Math.round(avgPaceSecPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

function distLabel(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl bg-neutral-900 px-5 py-4">
      <Text className="font-medium text-gray-400">{label}</Text>
      {typeof value === "string" ? (
        <Text className="font-bold text-lg text-white">{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

/** Haversine distance in meters between two points */
function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

type TelemetryPoint = { timestamp: number; lat: number; lng: number };
function computeKilometerSplits(
  telemetry: TelemetryPoint[],
  totalDistanceM: number,
  totalDurationSec: number
): Array<{ km: number; pace: string; time: string }> {
  if (telemetry.length < 2) return [];
  const splits: Array<{ km: number; pace: string; timeSec: number }> = [];
  let cumDist = 0;
  let prev = telemetry[0];
  let prevCumDist = 0;
  let prevTimeSec = 0;
  const t0 = telemetry[0].timestamp;
  let targetKm = 1;

  for (let i = 1; i < telemetry.length; i++) {
    const curr = telemetry[i];
    const segDist = haversineMeters(prev, curr);
    prevCumDist = cumDist;
    cumDist += segDist;
    const currTimeSec = (curr.timestamp - t0) / 1000;

    while (
      cumDist >= targetKm * 1000 &&
      targetKm <= Math.ceil(totalDistanceM / 1000)
    ) {
      const kmTarget = targetKm * 1000;
      const frac = segDist > 0 ? (kmTarget - prevCumDist) / segDist : 1;
      const splitTimeSec = prevTimeSec + frac * (currTimeSec - prevTimeSec);
      const prevSplit = splits[splits.length - 1];
      const segmentTimeSec = prevSplit
        ? splitTimeSec - prevSplit.timeSec
        : splitTimeSec;
      const paceSecPerKm = segmentTimeSec; // pace for 1km
      splits.push({
        km: targetKm,
        pace: paceLabel(paceSecPerKm),
        timeSec: splitTimeSec,
      });
      targetKm++;
    }
    prev = curr;
    prevTimeSec = currTimeSec;
  }
  return splits.map((s) => ({
    km: s.km,
    pace: s.pace,
    time: formatTime(s.timeSec),
  }));
}

/** Simpler split calculation using proportional time */
function simpleSplits(
  totalDistanceM: number,
  totalDurationSec: number
): Array<{ km: number; pace: string; time: string }> {
  const kms = Math.floor(totalDistanceM / 1000);
  if (kms < 1) return [];
  const pacePerKm = totalDurationSec / (totalDistanceM / 1000);
  return Array.from({ length: kms }, (_, i) => {
    const km = i + 1;
    const time = (km / kms) * totalDurationSec;
    return {
      km,
      pace: paceLabel(pacePerKm),
      time: formatTime(time),
    };
  });
}

export default function ReviewRaceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuthStore();
  const [selectedParticipantIndex, setSelectedParticipantIndex] = useState(0);

  const details = useQuery(
    api.runs.getRunReviewDetails,
    id && userId
      ? { runId: id as Id<"runs">, requestingUserId: userId as Id<"users"> }
      : "skip"
  );

  if (details === undefined) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#ff6900" size="large" />
      </SafeAreaView>
    );
  }

  if (!details) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-row items-center gap-3 px-4 pt-4 pb-2">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft color="white" size={24} />
          </TouchableOpacity>
          <Text className="font-bold text-white text-xl">Run Review</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Run not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { run, runType, runnerName, runnerImage, opponent, participants } =
    details;
  const isOwnRun = run.userId === userId;
  const durationSec =
    run.avgPace > 0
      ? Math.round(run.avgPace * (run.distance / 1000))
      : run.duration;
  const telemetry = run.telemetry ?? [];

  const splits =
    telemetry.length >= 2
      ? computeKilometerSplits(telemetry, run.distance, durationSec)
      : simpleSplits(run.distance, durationSec);

  const mapCoords: Coord[] = telemetry.map((p) => ({
    latitude: p.lat,
    longitude: p.lng,
  }));

  const computeRegion = (coords: Coord[]): Region | undefined => {
    if (coords.length === 0) return;
    const lats = coords.map((c) => c.latitude);
    const lngs = coords.map((c) => c.longitude);
    return {
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      latitudeDelta:
        Math.max(Math.max(...lats) - Math.min(...lats), 0.002) * 1.5,
      longitudeDelta:
        Math.max(Math.max(...lngs) - Math.min(...lngs), 0.002) * 1.5,
    };
  };

  const initialRegion = computeRegion(mapCoords);

  const runTypeConfig = {
    solo: { label: "Solo", icon: User, color: "#60a5fa" },
    ghost: { label: "Ghost Race", icon: Ghost, color: "#a78bfa" },
    live: { label: "Live Race", icon: Radio, color: "#22c55e" },
  };
  const config = runTypeConfig[runType];
  const TypeIcon = config.icon;

  const routes =
    runType === "live" && participants
      ? participants.map((p, i) => ({
          coords: (p.telemetry ?? []).map((t) => ({
            latitude: t.lat,
            longitude: t.lng,
          })),
          color: LIVE_COLORS[i % LIVE_COLORS.length],
        }))
      : undefined;

  const allCoordsForRegion =
    runType === "live" && participants
      ? participants.flatMap((p) =>
          (p.telemetry ?? []).map((t) => ({
            latitude: t.lat,
            longitude: t.lng,
          }))
        )
      : mapCoords;
  const mapRegion = computeRegion(allCoordsForRegion);

  const displayedParticipant =
    runType === "live" && participants
      ? participants[selectedParticipantIndex]
      : null;

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView>
        <View className="flex-row items-center gap-3 px-4 pt-4 pb-2">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft color="white" size={24} />
          </TouchableOpacity>
          <View className="flex-1 flex-row items-center gap-3">
            <View className="h-10 w-10 overflow-hidden rounded-full bg-neutral-800">
              {runnerImage ? (
                <Image
                  className="h-full w-full"
                  resizeMode="cover"
                  source={{ uri: runnerImage }}
                />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <User color="#6b7280" size={20} />
                </View>
              )}
            </View>
            <Text className="font-bold text-white text-xl">
              {isOwnRun ? "Your Run" : `${runnerName}'s Run`}
            </Text>
          </View>
        </View>

        {/* Run type badge */}
        <View className="mb-3 px-4">
          <View
            className="flex-row items-center gap-2 self-start rounded-full px-3 py-1.5"
            style={{ backgroundColor: `${config.color}25` }}
          >
            <TypeIcon color={config.color} size={14} />
            <Text
              className="font-medium text-sm"
              style={{ color: config.color }}
            >
              {config.label}
            </Text>
          </View>
        </View>

        {/* Map */}
        {mapRegion ? (
          <View className="mx-4 overflow-hidden rounded-2xl">
            <RunMap
              coords={routes ? undefined : mapCoords}
              height={280}
              initialRegion={mapRegion}
              interactive
              routes={routes}
            />
            {runType === "live" && participants && participants.length > 1 && (
              <View className="absolute right-2 bottom-2 left-2 flex-row flex-wrap gap-2 rounded-lg bg-black/70 px-3 py-2">
                {participants.map((p, i) => (
                  <TouchableOpacity
                    className="flex-row items-center gap-2"
                    key={p.userId}
                    onPress={() => setSelectedParticipantIndex(i)}
                  >
                    <View
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: LIVE_COLORS[i % LIVE_COLORS.length],
                      }}
                    />
                    <Text
                      className={`text-xs ${
                        selectedParticipantIndex === i
                          ? "font-bold text-white"
                          : "text-gray-400"
                      }`}
                    >
                      {p.name}
                      {p.isCurrentUser ? " (You)" : ""}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View className="mx-4 h-56 items-center justify-center rounded-2xl bg-neutral-900">
            <Text className="text-gray-500">No GPS trace recorded</Text>
          </View>
        )}

        <View className="mt-4 gap-3 px-4 pb-10">
          {/* Main stats */}
          <Text className="mb-1 text-gray-400 text-xs uppercase tracking-widest">
            {runType === "live" && displayedParticipant
              ? `${displayedParticipant.name}${displayedParticipant.isCurrentUser ? " (You)" : ""}`
              : "Your Run"}
          </Text>
          <StatRow
            label="Date"
            value={new Date(run.startedAt).toLocaleDateString()}
          />
          <StatRow
            label="Distance"
            value={distLabel(
              runType === "live" && displayedParticipant
                ? displayedParticipant.distance
                : run.distance
            )}
          />
          <StatRow
            label="Time"
            value={formatTime(
              runType === "live" && displayedParticipant
                ? displayedParticipant.duration
                : durationSec
            )}
          />
          <StatRow
            label="Avg Pace"
            value={paceLabel(
              runType === "live" && displayedParticipant
                ? displayedParticipant.avgPace
                : run.avgPace
            )}
          />

          {/* Ghost: opponent + ELO */}
          {runType === "ghost" && opponent && (
            <>
              <Text className="mt-4 mb-1 text-gray-400 text-xs uppercase tracking-widest">
                Ghost opponent
              </Text>
              <View className="rounded-2xl bg-purple-950/40 p-4">
                <View className="mb-2 flex-row items-center gap-2">
                  <Ghost color="#a78bfa" size={18} />
                  <Text className="font-semibold text-white">
                    {opponent.name}
                  </Text>
                  <Text className="rounded bg-purple-500/30 px-2 py-0.5 text-purple-300 text-xs">
                    Ghost
                  </Text>
                </View>
                <StatRow
                  label="Ghost Pace"
                  value={paceLabel(opponent.avgPace)}
                />
                <StatRow
                  label="Distance"
                  value={distLabel(opponent.distance)}
                />
              </View>
              {run.eloGained != null && (
                <StatRow
                  label="ELO Change"
                  value={
                    <Text
                      className="font-bold text-lg"
                      style={{
                        color: run.eloGained >= 0 ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {run.eloGained >= 0 ? "+" : ""}
                      {run.eloGained}
                    </Text>
                  }
                />
              )}
            </>
          )}

          {/* Live: leaderboard */}
          {runType === "live" && participants && participants.length > 1 && (
            <>
              <Text className="mt-4 mb-1 text-gray-400 text-xs uppercase tracking-widest">
                Results
              </Text>
              <View className="gap-2">
                {participants.map((p, i) => (
                  <View
                    className="flex-row items-center justify-between rounded-2xl bg-neutral-900 px-4 py-3"
                    key={p.userId}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: LIVE_COLORS[i % LIVE_COLORS.length],
                        }}
                      />
                      <Text className="font-medium text-white">
                        {p.name}
                        {p.isCurrentUser ? " (You)" : ""}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-4">
                      <Text className="text-gray-400">
                        {paceLabel(p.avgPace)}
                      </Text>
                      <Text className="font-bold text-white">
                        {formatTime(p.duration)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Kilometer splits */}
          {splits.length > 0 && (
            <>
              <Text className="mt-4 text-gray-400 text-xs uppercase tracking-widest">
                Kilometer splits
              </Text>
              <View className="gap-2 rounded-2xl bg-neutral-900 px-5 py-3">
                {splits.map((s) => (
                  <View
                    className="flex-row items-center justify-between py-1"
                    key={s.km}
                  >
                    <View className="flex-row items-center gap-2">
                      <Trophy color="#f59e0b" size={16} />
                      <Text className="font-medium text-white">{s.km}</Text>
                    </View>
                    <View className="flex-row gap-4">
                      <Text className="text-gray-400">{s.pace}</Text>
                      <Text className="font-bold text-white">{s.time}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
