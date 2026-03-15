import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/auth-store";

type Tab = "elo" | "distance" | "speed";

function paceLabel(secPerKm: number) {
  const m = Math.floor(secPerKm / 60);
  const s = secPerKm % 60;
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

function medalColor(rank: number) {
  if (rank === 1) {
    return "#FFD700";
  }
  if (rank === 2) {
    return "#C0C0C0";
  }
  if (rank === 3) {
    return "#CD7F32";
  }
  return "#4b5563";
}

export default function LeaderboardsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("elo");
  const { userId } = useAuthStore();

  const sortBy =
    tab === "elo" ? "elo" : tab === "distance" ? "distance" : "pace";

  const entries = useQuery(
    api.users.getGlobalLeaderboard,
    userId ? { limit: 50, sortBy } : "skip"
  );

  const rows =
    entries?.map((e, i) => ({
      key: e.userId,
      rank: i + 1,
      name: e.name,
      image: e.image ?? null,
      isMe: e.userId === (userId as Id<"users">),
      primary:
        tab === "elo"
          ? String(Math.round(e.value))
          : tab === "distance"
            ? e.value >= 1000
              ? `${(e.value / 1000).toFixed(1)} km`
              : `${Math.round(e.value)} m`
            : paceLabel(Math.round(e.value)),
      primaryLabel:
        tab === "elo" ? "Elo" : tab === "distance" ? "Distance" : "Best Pace",
    })) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-4 pt-4 pb-2">
        <Text className="mb-4 font-black text-2xl text-white">Rankings</Text>

        {/* Tab switcher */}
        <View className="mb-4 flex-row rounded-2xl bg-neutral-900 p-1">
          {(["elo", "distance", "speed"] as Tab[]).map((t) => (
            <TouchableOpacity
              className="flex-1 items-center rounded-xl py-2"
              key={t}
              onPress={() => setTab(t)}
              style={{ backgroundColor: tab === t ? "#ff6900" : "transparent" }}
            >
              <Text
                className="font-semibold text-sm capitalize"
                style={{ color: tab === t ? "white" : "#6b7280" }}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        contentContainerStyle={{ paddingBottom: 40 }}
        data={rows}
        keyExtractor={(item) => item.key}
        ListEmptyComponent={
          <View className="mt-16 items-center">
            <Text className="text-gray-500">No data yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              if (item.isMe) {
                router.push("/(tabs)/profile");
              } else {
                router.push({
                  pathname: "/users/[id]",
                  params: { id: item.key },
                });
              }
            }}
          >
            <View
              className="mx-4 mb-2 flex-row items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                backgroundColor: item.isMe ? "#ff690015" : "#171717",
                borderWidth: item.isMe ? 1 : 0,
                borderColor: item.isMe ? "#ff6900" : "transparent",
              }}
            >
              <Text
                className="w-8 text-center font-black text-lg"
                style={{ color: medalColor(item.rank) }}
              >
                {item.rank}
              </Text>
              {item.image ? (
                <Image
                  className="h-10 w-10 rounded-full"
                  source={{ uri: item.image }}
                />
              ) : (
                <View className="h-10 w-10 items-center justify-center rounded-full bg-neutral-700">
                  <Text className="font-bold text-white">
                    {item.name.charAt(0)}
                  </Text>
                </View>
              )}
              <View className="flex-1">
                <Text className="font-semibold text-sm text-white">
                  {item.name}
                  {item.isMe ? " (You)" : ""}
                </Text>
              </View>
              <View className="items-end">
                <Text className="font-bold text-base text-orange-400">
                  {item.primary}
                </Text>
                <Text className="text-gray-500 text-xs">
                  {item.primaryLabel}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
