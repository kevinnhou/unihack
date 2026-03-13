import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Copy, Play } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Clipboard,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/auth-store";
import { useRunStore } from "@/stores/run-store";

type SortBy = "streak" | "distance" | "pace";

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: "distance", label: "Distance" },
  { key: "streak", label: "Streak" },
  { key: "pace", label: "Pace" },
];

function formatPace(secPerKm: number): string {
  if (secPerKm <= 0 || !Number.isFinite(secPerKm)) {
    return "--:--";
  }
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.floor(secPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function SquadDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const squadId = Array.isArray(id) ? id[0] : id;

  const { userId } = useAuthStore();
  const [sortBy, setSortBy] = useState<SortBy>("distance");
  const [confirmRace, setConfirmRace] = useState<{
    userId: string;
    name: string;
  } | null>(null);

  // --- Real Backend Queries ---
  const squad = useQuery(
    api.squads.getSquad,
    squadId ? { squadId: squadId as Id<"squads"> } : "skip"
  );

  const leaderboard = useQuery(
    api.squads.getSquadLeaderboard,
    squadId ? { squadId: squadId as Id<"squads">, sortBy } : "skip"
  );

  const copyCode = () => {
    if (squad?.joinCode) {
      Clipboard.setString(squad.joinCode);
    }
  };

  const handleConfirmRace = () => {
    if (confirmRace) {
      // Configure run store for racing against the ghost
      useRunStore.getState().configureRun({
        mode: "social",
        targetDistance: 5000, // Default to 5k or adapt based on selected opponent
        opponentName: confirmRace.name,
        opponentUserId: confirmRace.userId,
      });

      setConfirmRace(null);
      router.push("/run/active");
    }
  };

  if (squad === undefined || leaderboard === undefined) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#FF4500" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="flex-row items-center gap-3 px-4 pt-4 pb-3">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft color="white" size={24} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="font-black text-2xl text-white">
              {squad?.name ?? "Squad Details"}
            </Text>
          </View>
        </View>

        {/* Invite code */}
        {squad?.joinCode && (
          <TouchableOpacity
            className="mx-4 mb-6 flex-row items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3"
            onPress={copyCode}
          >
            <Text className="flex-1 text-gray-400 text-sm">
              Invite code:{" "}
              <Text className="font-bold text-orange-400 tracking-widest">
                {squad.joinCode}
              </Text>
            </Text>
            <Copy color="#6b7280" size={16} />
          </TouchableOpacity>
        )}

        {/* Sorting Pills */}
        <View className="mb-4 flex-row gap-2 px-4">
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setSortBy(opt.key)}
              className={`flex-1 items-center rounded-xl border py-2 ${
                sortBy === opt.key
                  ? "border-orange-500 bg-orange-500/20"
                  : "border-neutral-800 bg-neutral-900"
              }`}
            >
              <Text
                className={`font-semibold text-sm ${
                  sortBy === opt.key ? "text-orange-500" : "text-gray-400"
                }`}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Leaderboard / Members List */}
        <Text className="mb-3 px-4 font-bold text-lg text-white">
          Leaderboard
        </Text>

        {leaderboard.length === 0 ? (
          <Text className="px-4 text-gray-500">No members yet.</Text>
        ) : (
          leaderboard.map((entry, index) => {
            const isMe = entry.userId === userId;

            // Format the dynamic value based on the selected sort tab
            const mainValue =
              sortBy === "streak"
                ? `${entry.streak} day${entry.streak !== 1 ? "s" : ""} 🔥`
                : sortBy === "distance"
                  ? entry.totalDistance >= 1000
                    ? `${(entry.totalDistance / 1000).toFixed(1)} km`
                    : `${Math.round(entry.totalDistance)} m`
                  : `${formatPace(entry.bestPace)} /km`;

            return (
              <View
                key={entry.userId}
                className={`mx-4 mb-2 flex-row items-center gap-3 rounded-2xl px-4 py-3 ${
                  isMe
                    ? "border border-orange-500/50 bg-orange-500/10"
                    : "bg-neutral-900"
                }`}
              >
                {/* Rank */}
                <Text className="w-6 text-center font-bold text-gray-400">
                  {index === 0
                    ? "🥇"
                    : index === 1
                      ? "🥈"
                      : index === 2
                        ? "🥉"
                        : index + 1}
                </Text>

                {/* Avatar Placeholder */}
                <View className="h-9 w-9 items-center justify-center rounded-full bg-neutral-700">
                  <Text className="font-bold text-sm text-white">
                    {entry.name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                {/* Name & Subtext */}
                <View className="flex-1">
                  <Text className="font-semibold text-sm text-white">
                    {entry.name} {isMe && "(You)"}
                  </Text>
                  {entry.streak > 0 && sortBy !== "streak" && (
                    <Text className="text-orange-400 text-xs">
                      🔥 {entry.streak}d streak
                    </Text>
                  )}
                </View>

                {/* Metric Value */}
                <Text className="font-bold text-white mr-2">{mainValue}</Text>

                {/* Race Action (Hidden for self) */}
                {!isMe && (
                  <TouchableOpacity
                    className="rounded-full bg-orange-500 p-2"
                    onPress={() =>
                      setConfirmRace({ userId: entry.userId, name: entry.name })
                    }
                  >
                    <Play color="white" size={14} fill="white" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Race Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={confirmRace !== null}
        onRequestClose={() => setConfirmRace(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/80 px-8">
          <View className="w-full rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
            <Text className="mb-4 font-bold text-white text-xl">
              Confirm Race
            </Text>
            <Text className="mb-6 text-gray-300">
              Do you want to race against{" "}
              <Text className="font-bold text-orange-400">
                {confirmRace?.name}
              </Text>
              's ghost?
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 items-center rounded-2xl bg-neutral-800 py-3"
                onPress={() => setConfirmRace(null)}
              >
                <Text className="font-medium text-gray-300">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-2xl bg-orange-500 py-3"
                onPress={handleConfirmRace}
              >
                <Text className="font-bold text-white">Race Ghost</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}