import { Ionicons } from "@expo/vector-icons";
import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { useAuthStore } from "@/stores/auth-store";

function formatPace(secPerKm: number): string {
  if (secPerKm <= 0 || !Number.isFinite(secPerKm)) {
    return "--:--";
  }
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.floor(secPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Run = {
  _id: string;
  distance: number;
  startedAt: number;
  avgPace: number;
};

function RunCard({ run }: { run: Run }) {
  return (
    <View className="mb-3 rounded-xl border border-default-200 p-4">
      <View className="flex-row items-center justify-between">
        <Text className="font-semibold text-foreground text-lg">
          {formatDistance(run.distance)}
        </Text>
        <Text className="rounded-full bg-primary/10 px-2 py-1 text-primary text-sm">
          {formatPace(run.avgPace)} /km
        </Text>
      </View>
      <Text className="mt-1 text-default-400 text-sm">
        {formatDate(run.startedAt)}
      </Text>
    </View>
  );
}

type ProfileScreenProps = {
  userId: string;
};

function ProfileContent({ userId }: ProfileScreenProps) {
  const stats = useQuery(api.users.getUserStats, {
    userId: userId as Id<"users">,
  });
  const recentRuns = useQuery(api.users.getUserRuns, {
    userId: userId as Id<"users">,
  });

  if (!(stats && recentRuns)) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-default-400">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="mb-6 flex-row justify-around rounded-2xl border border-default-200 p-4">
        <View className="items-center">
          <Text className="font-bold text-2xl text-foreground">
            {stats.totalRuns}
          </Text>
          <Text className="text-default-400 text-xs">Runs</Text>
        </View>
        <View className="items-center">
          <Text className="font-bold text-2xl text-foreground">
            {(stats.totalDistanceMeters / 1000).toFixed(1)}
          </Text>
          <Text className="text-default-400 text-xs">km</Text>
        </View>
        <View className="items-center">
          <Text className="font-bold text-2xl text-foreground">
            {stats.currentStreak}
            {stats.currentStreak > 0 ? " 🔥" : ""}
          </Text>
          <Text className="text-default-400 text-xs">Streak</Text>
        </View>
      </View>

      <View className="mb-6 flex-row gap-4">
        <View className="flex-1 rounded-xl border border-default-200 p-3">
          <Text className="text-default-400 text-xs">Best Pace</Text>
          <Text className="font-bold text-foreground text-lg">
            {formatPace(stats.bestPaceSecPerKm)} /km
          </Text>
        </View>
        <View className="flex-1 rounded-xl border border-default-200 p-3">
          <Text className="text-default-400 text-xs">Longest Streak</Text>
          <Text className="font-bold text-foreground text-lg">
            {stats.longestStreak} days
          </Text>
        </View>
      </View>

      <Text className="mb-3 font-semibold text-foreground text-lg">
        Recent Runs
      </Text>
      {recentRuns.length === 0 ? (
        <Text className="text-default-400">No completed runs yet.</Text>
      ) : (
        <FlatList
          data={recentRuns}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <RunCard run={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { userId, userName, userEmail } = useAuthStore();

  if (!userId) {
    return <Redirect href="/auth/sign-in" />;
  }

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <View className="mb-6 flex-row items-center gap-3">
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.back()}
        >
          <Ionicons color="#a1a1aa" name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text className="font-bold text-2xl text-foreground">Profile</Text>
      </View>

      <View className="mb-6 flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/20">
          <Ionicons color="#f97316" name="person" size={24} />
        </View>
        <View>
          <Text className="font-semibold text-foreground text-lg">
            {userName ?? "Runner"}
          </Text>
          <Text className="text-default-400 text-sm">{userEmail}</Text>
        </View>
      </View>

      <ProfileContent userId={userId} />
    </View>
  );
}
