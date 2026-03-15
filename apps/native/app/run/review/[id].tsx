import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RunMap } from "@/components/run-map";
import { useAuthStore } from "@/stores/auth-store";

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function paceLabel(avgPaceSecPerKm: number): string {
  if (avgPaceSecPerKm <= 0) {
    return "—";
  }
  const m = Math.floor(avgPaceSecPerKm / 60);
  const s = Math.round(avgPaceSecPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

function distLabel(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl bg-neutral-900 px-5 py-4">
      <Text className="font-medium text-gray-400">{label}</Text>
      <Text className="font-bold text-lg text-white">{value}</Text>
    </View>
  );
}

export default function ReviewRaceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuthStore();

  const fullRun = useQuery(
    api.runs.getRunById,
    id && userId
      ? { runId: id as Id<"runs">, requestingUserId: userId as Id<"users"> }
      : "skip"
  );

  if (fullRun === undefined) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#FF4500" size="large" />
      </SafeAreaView>
    );
  }

  if (!fullRun) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-row items-center gap-3 px-4 pt-4 pb-2">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft color="white" size={24} />
          </TouchableOpacity>
          <Text className="font-bold text-white text-xl">Race Review</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400">Run not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const durationSec =
    fullRun.avgPace > 0
      ? Math.round(fullRun.avgPace * (fullRun.distance / 1000))
      : 0;

  const telemetry = fullRun.telemetry ?? [];
  const mapCoords = telemetry.map((p) => ({
    latitude: p.lat,
    longitude: p.lng,
  }));

  const initialRegion =
    mapCoords.length > 0
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
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView>
        <View className="flex-row items-center gap-3 px-4 pt-4 pb-2">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft color="white" size={24} />
          </TouchableOpacity>
          <Text className="font-bold text-white text-xl">Race Review</Text>
        </View>

        {/* GPS trace map */}
        {initialRegion ? (
          <RunMap coords={mapCoords} initialRegion={initialRegion} />
        ) : (
          <View className="mx-4 h-55 items-center justify-center rounded-2xl bg-neutral-900">
            <Text className="text-gray-500">No GPS trace recorded</Text>
          </View>
        )}

        <View className="mt-4 gap-3 px-4 pb-10">
          <Text className="mb-1 text-gray-400 text-xs uppercase tracking-widest">
            Your Run
          </Text>
          <StatRow
            label="Date"
            value={new Date(fullRun.startedAt).toLocaleDateString()}
          />
          <StatRow label="Distance" value={distLabel(fullRun.distance)} />
          <StatRow
            label="Time"
            value={durationSec > 0 ? formatTime(durationSec) : "—"}
          />
          <StatRow label="Avg Pace" value={paceLabel(fullRun.avgPace)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
