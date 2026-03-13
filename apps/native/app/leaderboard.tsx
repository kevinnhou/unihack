import { Ionicons } from "@expo/vector-icons";
import { api } from "@unihack/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
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

type SortBy = "pace" | "distance";

type LeaderboardEntry = {
  userId: string;
  name: string;
  value: number;
  runId: string;
};

function EntryRow({
  entry,
  index,
  sortBy,
  currentUserId,
}: {
  entry: LeaderboardEntry;
  index: number;
  sortBy: SortBy;
  currentUserId: string | null | undefined;
}) {
  const isMe = entry.userId === currentUserId;
  const medal =
    index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null;
  const displayValue =
    sortBy === "pace"
      ? `${formatPace(entry.value)} /km`
      : `${(entry.value / 1000).toFixed(2)} km`;

  return (
    <View
      className={`mb-2 flex-row items-center justify-between rounded-xl border p-4 ${
        isMe
          ? "border-primary bg-primary/10"
          : "border-default-200 bg-background"
      }`}
    >
      <View className="flex-row items-center gap-3">
        <Text className="w-8 font-bold text-default-400">
          {medal ?? `#${index + 1}`}
        </Text>
        <Text
          className={`font-semibold text-base ${isMe ? "text-primary" : "text-foreground"}`}
        >
          {entry.name}
        </Text>
      </View>
      <Text className="font-semibold text-default-600">{displayValue}</Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortBy>("pace");
  const { userId } = useAuthStore();
  const entries = useQuery(api.users.getGlobalLeaderboard, {
    limit: 50,
    sortBy,
  });

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <View className="mb-6 flex-row items-center gap-3">
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.back()}
        >
          <Ionicons color="#a1a1aa" name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text className="font-bold text-2xl text-foreground">Leaderboard</Text>
      </View>

      <View className="mb-6 flex-row gap-3">
        <TouchableOpacity
          accessibilityRole="button"
          className={`flex-1 items-center rounded-xl border py-3 ${
            sortBy === "pace"
              ? "border-primary bg-primary/10"
              : "border-default-200 bg-default-100"
          }`}
          onPress={() => setSortBy("pace")}
        >
          <Text
            className={`font-semibold ${sortBy === "pace" ? "text-primary" : "text-foreground"}`}
          >
            Best Pace
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          className={`flex-1 items-center rounded-xl border py-3 ${
            sortBy === "distance"
              ? "border-primary bg-primary/10"
              : "border-default-200 bg-default-100"
          }`}
          onPress={() => setSortBy("distance")}
        >
          <Text
            className={`font-semibold ${sortBy === "distance" ? "text-primary" : "text-foreground"}`}
          >
            Distance
          </Text>
        </TouchableOpacity>
      </View>

      {entries === undefined ? (
        <Text className="text-default-400">Loading...</Text>
      ) : entries.length === 0 ? (
        <Text className="text-default-400">
          No completed runs yet. Be the first!
        </Text>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.userId}
          renderItem={({ item, index }) => (
            <EntryRow
              currentUserId={userId}
              entry={item}
              index={index}
              sortBy={sortBy}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
