import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  Footprints,
  Ghost,
  Radio,
  User,
} from "lucide-react-native";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { RunMap } from "@/components/run-map";

function formatDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

function formatPace(secPerKm: number): string {
  if (secPerKm <= 0) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

function formatRelativeTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString();
}

type RunType = "ghost" | "live" | "solo";

/** Full run from getFeedRuns - includes all schema fields for extension */
export type FeedRun = {
  run: {
    _id: Id<"runs">;
    userId: Id<"users">;
    mode: "ranked" | "social";
    status: "active" | "completed";
    distance: number;
    duration: number;
    avgPace: number;
    startedAt: number;
    eloGained?: number;
    currentUserElo?: number;
    completedAt?: number;
    liveRoomId?: Id<"liveRooms">;
    opponentId?: Id<"users">;
    opponentAvgPace?: number;
    telemetry: Array<{
      timestamp: number;
      lat: number;
      lng: number;
      speed: number;
    }>;
  };
  runnerName: string;
  runnerImage: string | null;
  opponentName: string | null;
  runType: RunType;
};

type RunActivityCardProps = {
  item: FeedRun;
  isOwnRun: boolean;
};

const RUN_TYPE_CONFIG: Record<
  RunType,
  { label: string; icon: typeof Ghost; color: string }
> = {
  ghost: { label: "Ghost", icon: Ghost, color: "#a78bfa" },
  live: { label: "Live", icon: Radio, color: "#22c55e" },
  solo: { label: "Solo", icon: User, color: "#60a5fa" },
};

export function RunActivityCard({ item, isOwnRun }: RunActivityCardProps) {
  const router = useRouter();
  const { run, runnerName, runnerImage, opponentName, runType } = item;
  const config = RUN_TYPE_CONFIG[runType];
  const Icon = config.icon;

  const telemetry = run.telemetry ?? [];
  const mapCoords = telemetry.map((p) => ({
    latitude: p.lat,
    longitude: p.lng,
  }));
  const initialRegion =
    mapCoords.length > 1
      ? (() => {
          const lats = mapCoords.map((c) => c.latitude);
          const lngs = mapCoords.map((c) => c.longitude);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);
          return {
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2,
            latitudeDelta: Math.max(maxLat - minLat, 0.002) * 1.3,
            longitudeDelta: Math.max(maxLng - minLng, 0.002) * 1.3,
          };
        })()
      : undefined;

  return (
    <TouchableOpacity
      className="mx-4 mb-4 overflow-hidden rounded-2xl bg-neutral-900"
      onPress={() =>
        router.push({
          pathname: "/run/review/[id]",
          params: { id: run._id },
        })
      }
    >
      {/* Header: avatar + name + timestamp */}
      <View className="flex-row items-center px-4 pt-4 pb-2">
        <View className="mr-3 h-10 w-10 overflow-hidden rounded-full bg-neutral-800">
          {runnerImage ? (
            <Image
              className="h-full w-full"
              resizeMode="cover"
              source={{ uri: runnerImage }}
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Footprints color="#6b7280" size={18} />
            </View>
          )}
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-white">
            {runnerName}
            {isOwnRun ? " (You)" : ""}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-1">
            <Footprints color="#6b7280" size={12} />
            <Text className="text-gray-400 text-xs">
              {formatRelativeTime(run.startedAt)}
            </Text>
          </View>
        </View>
        <ChevronRight color="#6b7280" size={18} />
      </View>

      {/* Run type badge + opponent */}
      <View className="flex-row flex-wrap items-center gap-2 px-4 pb-2">
        <View
          className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <Icon color={config.color} size={12} />
          <Text className="font-medium text-xs" style={{ color: config.color }}>
            {config.label}
          </Text>
        </View>
        {opponentName && (
          <Text className="text-gray-400 text-xs">vs {opponentName}</Text>
        )}
      </View>

      {/* Metrics row */}
      <View className="flex-row gap-2 px-4 pb-3">
        <View className="flex-1 rounded-xl bg-neutral-800/80 px-3 py-2">
          <Text className="text-gray-400 text-xs">Distance</Text>
          <Text className="font-bold text-white">
            {formatDist(run.distance)}
          </Text>
        </View>
        <View className="flex-1 rounded-xl bg-neutral-800/80 px-3 py-2">
          <Text className="text-gray-400 text-xs">Pace</Text>
          <Text className="font-bold text-white">
            {formatPace(run.avgPace)}
          </Text>
        </View>
        {run.eloGained != null && run.mode === "ranked" && (
          <View className="flex-1 rounded-xl bg-neutral-800/80 px-3 py-2">
            <Text className="text-gray-400 text-xs">Elo</Text>
            <Text
              className="font-bold"
              style={{
                color: run.eloGained >= 0 ? "#22c55e" : "#ef4444",
              }}
            >
              {run.eloGained >= 0 ? "+" : ""}
              {run.eloGained}
            </Text>
          </View>
        )}
      </View>

      {/* Map */}
      {initialRegion && mapCoords.length > 1 ? (
        <View className="h-40 overflow-hidden rounded-b-2xl">
          <RunMap
            coords={mapCoords}
            height={160}
            initialRegion={initialRegion}
          />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
