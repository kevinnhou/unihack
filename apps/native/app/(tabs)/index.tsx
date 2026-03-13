import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import { ChevronRight, Play, Trophy } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RunConfigModal } from "@/components/RunConfigModal";
import { useAuthStore } from "@/stores/auth-store";

function formatDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function formatPace(secPerKm: number): string {
  if (secPerKm <= 0) {
    return "—";
  }
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View className="flex-1 items-center rounded-2xl bg-neutral-900 p-4">
      <Text className="font-black text-2xl" style={{ color }}>
        {value}
      </Text>
      <Text className="mt-1 text-gray-400 text-xs">{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { userId, userName } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);

  const stats = useQuery(
    api.users.getUserStats,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );
  const runs = useQuery(
    api.users.getUserRuns,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  if (!userId) {
    return <Redirect href="/(auth)/signin" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="px-4 pt-4 pb-6">
          <Text className="text-gray-400 text-sm">Welcome back,</Text>
          <Text className="font-black text-3xl text-white">
            {userName ?? "Runner"}
          </Text>
        </View>

        {/* Streak card */}
        <View
          className="mx-4 mb-4 rounded-2xl p-5"
          style={{ backgroundColor: "#FF4500" }}
        >
          <View className="mb-1 flex-row items-center gap-2">
            <Trophy color="white" size={20} />
            <Text className="font-semibold text-sm text-white">Streak</Text>
          </View>
          <Text className="font-black text-5xl text-white">
            {stats?.currentStreak ?? "—"}
          </Text>
          <Text className="mt-1 text-orange-200 text-sm">
            {stats?.currentStreak
              ? `🔥 ${stats.currentStreak} day streak`
              : "No active streak"}
          </Text>
        </View>

        {/* Stats row */}
        <View className="mx-4 mb-4 flex-row gap-3">
          <StatCard
            color="#4ade80"
            label="Runs"
            value={String(stats?.totalRuns ?? "—")}
          />
          <StatCard
            color="#60a5fa"
            label="Distance"
            value={stats ? formatDist(stats.totalDistanceMeters) : "—"}
          />
          <StatCard
            color="#f59e0b"
            label="Best Pace"
            value={stats ? formatPace(stats.bestPaceSecPerKm) : "—"}
          />
        </View>

        {/* Run history */}
        <Text className="mb-3 px-4 font-bold text-lg text-white">
          Run History
        </Text>
        {runs?.map((run) => (
          <TouchableOpacity
            className="mx-4 mb-2 flex-row items-center rounded-2xl bg-neutral-900 px-4 py-3"
            key={run._id}
            onPress={() =>
              router.push({
                pathname: "/run/review/[id]",
                params: { id: run._id },
              })
            }
          >
            <View className="flex-1">
              <Text className="font-semibold text-white">
                {formatDist(run.distance)}
              </Text>
              <Text className="text-gray-400 text-xs">
                {new Date(run.startedAt).toLocaleDateString()} ·{" "}
                {formatPace(run.avgPace)}
              </Text>
            </View>
            <ChevronRight color="#4b5563" size={18} />
          </TouchableOpacity>
        ))}
        {runs?.length === 0 && (
          <Text className="px-4 text-gray-500 text-sm">
            No runs yet. Start your first run!
          </Text>
        )}
      </ScrollView>

      {/* FAB Start Run */}
      <TouchableOpacity
        className="absolute right-6 bottom-8 h-16 w-16 items-center justify-center rounded-full bg-orange-500 shadow-lg"
        onPress={() => setModalOpen(true)}
        style={{ elevation: 8 }}
      >
        <Play color="white" fill="white" size={28} />
      </TouchableOpacity>

      <RunConfigModal onClose={() => setModalOpen(false)} visible={modalOpen} />
    </SafeAreaView>
  );
}
