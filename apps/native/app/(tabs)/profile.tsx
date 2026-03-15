import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import { Settings } from "lucide-react-native";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl bg-neutral-900 px-5 py-4">
      <Text className="font-medium text-gray-400">{label}</Text>
      <Text className="font-bold text-white">{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { userId, userName, userEmail } = useAuthStore();

  const typedUserId = userId as Id<"users"> | null;

  const stats = useQuery(
    api.users.getUserStats,
    typedUserId ? { userId: typedUserId } : "skip"
  );
  const friends = useQuery(
    api.friends.getFriends,
    typedUserId ? { userId: typedUserId } : "skip"
  );
  const profile = useQuery(
    api.users.getUserProfile,
    typedUserId ? { userId: typedUserId } : "skip"
  );

  if (!userId) {
    return <Redirect href="/(auth)/signin" />;
  }

  const imageUrl = profile?.image ?? null;
  const initial = (userName ?? "?").charAt(0).toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile header */}
        <View className="flex flex-col pt-6 pb-6">
          <View className="flex-row items-center gap-4 px-4">
            <TouchableOpacity onPress={() => router.push("/settings")}>
              {imageUrl ? (
                <Image
                  className="h-20 w-20 rounded-full"
                  source={{ uri: imageUrl }}
                />
              ) : (
                <View className="h-20 w-20 items-center justify-center rounded-full bg-orange-500">
                  <Text className="font-black text-3xl text-white">
                    {initial}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="font-black text-2xl text-white">
                {userName ?? "Runner"}
              </Text>
              <Text className="text-gray-400 text-sm">{userEmail ?? ""}</Text>
            </View>
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full bg-neutral-900"
              onPress={() => router.push("/settings")}
            >
              <Settings color="#9ca3af" size={20} />
            </TouchableOpacity>
          </View>

          <Pressable
            className="mt-2 flex flex-col"
            onPress={() => router.push("/friends/friends")}
          >
            <Text className="px-4 text-gray-400 text-md">Friends</Text>
            <Text className="px-4 text-lg text-white">
              {friends?.length ?? 0}
            </Text>
          </Pressable>
        </View>

        {/* Stats */}
        <Text className="mb-3 px-4 font-bold text-lg text-white">Stats</Text>
        <View className="mx-4 gap-3">
          <StatRow label="Total Runs" value={String(stats?.totalRuns ?? "—")} />
          <StatRow
            label="Total Distance"
            value={stats ? formatDist(stats.totalDistanceMeters) : "—"}
          />
          <StatRow
            label="Current Streak"
            value={
              stats
                ? `${stats.currentStreak} day${stats.currentStreak !== 1 ? "s" : ""}`
                : "—"
            }
          />
          <StatRow
            label="Best Pace"
            value={stats ? formatPace(stats.bestPaceSecPerKm) : "—"}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
