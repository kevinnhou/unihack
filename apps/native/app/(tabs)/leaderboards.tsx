import { api } from "@unihack/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Tab = "elo" | "distance" | "speed";
type Period = "daily" | "weekly" | "monthly";

function PaceLabel(secPerKm: number) {
  const m = Math.floor(secPerKm / 60);
  const s = secPerKm % 60;
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

function MedalColor(rank: number) {
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
  const [tab, setTab] = useState<Tab>("elo");
  const [period, setPeriod] = useState<Period>("weekly");

  const eloBoard = useQuery(
    api.leaderboards.getEloLeaderboard,
    tab === "elo" ? { limit: 50 } : "skip"
  );
  const distBoard = useQuery(
    api.leaderboards.getDistanceLeaderboard,
    tab === "distance" ? { period, limit: 50 } : "skip"
  );
  const speedBoard = useQuery(
    api.leaderboards.getSpeedLeaderboard,
    tab === "speed" ? { period, limit: 50 } : "skip"
  );

  const rows =
    tab === "elo"
      ? (eloBoard ?? []).map((e) => ({
          key: e.userId,
          rank: e.rank,
          name: e.name,
          primary: String(e.totalElo),
          primaryLabel: "Elo",
          secondary: `${e.winCount}W ${e.lossCount}L`,
        }))
      : tab === "distance"
        ? (distBoard ?? []).map((e) => ({
            key: e.userId,
            rank: e.rank,
            name: e.name,
            primary:
              e.totalDistance >= 1000
                ? `${(e.totalDistance / 1000).toFixed(1)} km`
                : `${Math.round(e.totalDistance)} m`,
            primaryLabel: "Distance",
            secondary: `${e.runCount} run${e.runCount !== 1 ? "s" : ""}`,
          }))
        : (speedBoard ?? []).map((e) => ({
            key: e.userId,
            rank: e.rank,
            name: e.name,
            primary: PaceLabel(e.bestPaceSecondsPerKm),
            primaryLabel: "Best Pace",
            secondary:
              e.distance >= 1000
                ? `${(e.distance / 1000).toFixed(1)} km run`
                : `${Math.round(e.distance)} m run`,
          }));

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
              style={{ backgroundColor: tab === t ? "#FF4500" : "transparent" }}
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

        {/* Period picker — only for distance / speed */}
        {tab !== "elo" && (
          <View className="mb-4 flex-row gap-2">
            {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
              <TouchableOpacity
                className="flex-1 items-center rounded-xl py-2"
                key={p}
                onPress={() => setPeriod(p)}
                style={{
                  backgroundColor: period === p ? "#1f1f1f" : "transparent",
                  borderWidth: 1,
                  borderColor: period === p ? "#FF4500" : "#2a2a2a",
                }}
              >
                <Text
                  className="font-semibold text-xs capitalize"
                  style={{ color: period === p ? "#FF4500" : "#6b7280" }}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
          <View className="mx-4 mb-2 flex-row items-center gap-3 rounded-2xl bg-neutral-900 px-4 py-3">
            <Text
              className="w-8 text-center font-black text-lg"
              style={{ color: MedalColor(item.rank) }}
            >
              {item.rank}
            </Text>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-neutral-700">
              <Text className="font-bold text-white">
                {item.name.charAt(0)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-sm text-white">
                {item.name}
              </Text>
              <Text className="text-gray-500 text-xs">{item.secondary}</Text>
            </View>
            <View className="items-end">
              <Text className="font-bold text-base text-orange-400">
                {item.primary}
              </Text>
              <Text className="text-gray-500 text-xs">{item.primaryLabel}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
