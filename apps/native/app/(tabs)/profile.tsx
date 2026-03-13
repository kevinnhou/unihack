import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { ChevronRight, LogOut, Settings, Trophy } from "lucide-react-native";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth-client";

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useQuery(api.users.getMyProfile);
  const myRuns = useQuery(
    api.runs.getUserRuns,
    profile ? { userId: profile._id as Id<"users">, limit: 20 } : "skip"
  );

  const handleSignOut = async () => {
    await authClient.signOut();
    router.replace("/(auth)/signin");
  };

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <Text className="text-gray-400">Loading profile…</Text>
      </SafeAreaView>
    );
  }

  const winRate =
    profile.winCount + profile.lossCount > 0
      ? Math.round(
          (profile.winCount / (profile.winCount + profile.lossCount)) * 100
        )
      : 0;

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="flex-row items-center gap-4 px-4 pt-6 pb-4">
          {profile.avatarUrl ? (
            <Image
              className="h-20 w-20 rounded-full"
              source={{ uri: profile.avatarUrl }}
            />
          ) : (
            <View className="h-20 w-20 items-center justify-center rounded-full bg-orange-500">
              <Text className="font-black text-3xl text-white">
                {profile.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="font-black text-2xl text-white">
              {profile.name}
            </Text>
            <Text className="text-gray-400 text-sm">{profile.email}</Text>
          </View>
          <TouchableOpacity onPress={handleSignOut}>
            <LogOut color="#6b7280" size={22} />
          </TouchableOpacity>
        </View>

        {/* Elo card */}
        <View
          className="mx-4 mb-4 rounded-2xl bg-linear-to-r from-orange-600 to-red-600 p-5"
          style={{ backgroundColor: "#FF4500" }}
        >
          <View className="mb-1 flex-row items-center gap-2">
            <Trophy color="white" size={20} />
            <Text className="font-semibold text-sm text-white">Elo Rating</Text>
          </View>
          <Text className="font-black text-5xl text-white">
            {profile.totalElo}
          </Text>
          <Text className="mt-1 text-orange-200 text-sm">
            {profile.currentStreak > 0
              ? `🔥 ${profile.currentStreak} day streak`
              : "No active streak"}
          </Text>
        </View>

        {/* Stats row */}
        <View className="mx-4 mb-4 flex-row gap-3">
          <StatCard
            color="#4ade80"
            label="Wins"
            value={String(profile.winCount)}
          />
          <StatCard
            color="#f87171"
            label="Losses"
            value={String(profile.lossCount)}
          />
          <StatCard color="#60a5fa" label="Win Rate" value={`${winRate}%`} />
        </View>

        {/* Run history */}
        <Text className="mb-3 px-4 font-bold text-lg text-white">
          Run History
        </Text>
        {(myRuns ?? []).map((run) => (
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
                {formatTime(run.durationSeconds)}
              </Text>
            </View>
            <View className="mr-3 items-end">
              <Text
                className="font-semibold text-xs capitalize"
                style={{
                  color:
                    run.type === "ranked"
                      ? "#a78bfa"
                      : run.type === "live"
                        ? "#f59e0b"
                        : "#60a5fa",
                }}
              >
                {run.type}
              </Text>
              {run.type === "ranked" && run.eloDelta !== undefined && (
                <Text
                  className="font-bold text-sm"
                  style={{ color: run.eloDelta > 0 ? "#4ade80" : "#f87171" }}
                >
                  {run.eloDelta > 0 ? "+" : ""}
                  {run.eloDelta}
                </Text>
              )}
            </View>
            <ChevronRight color="#4b5563" size={18} />
          </TouchableOpacity>
        ))}

        {/* Settings placeholder */}
        <TouchableOpacity className="mx-4 mt-4 flex-row items-center gap-3 rounded-2xl bg-neutral-900 px-4 py-4">
          <Settings color="#6b7280" size={20} />
          <Text className="flex-1 text-gray-300">Settings</Text>
          <ChevronRight color="#4b5563" size={18} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
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
