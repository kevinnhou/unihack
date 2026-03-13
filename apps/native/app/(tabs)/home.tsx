// import { StyleSheet, Text, View } from "react-native";

// export default function Tab() {
//   return (
//     <View style={styles.container}>
//       <Text>Tab [HOME]</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
// });

// import { api } from "@unihack/backend/convex/_generated/api";
// import { useQuery } from "convex/react";
import { Play } from "lucide-react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ChevronRight, Settings, Trophy } from "lucide-react-native";
import { FlatList, ScrollView, Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import RunConfigModal from "@/components/RunConfigModal";

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

// Mock data for profile
const mockProfile = {
  _id: "user1",
  name: "John Doe",
  email: "john@example.com",
  avatarUrl: null,
  totalElo: 1200,
  winCount: 15,
  lossCount: 5,
  currentStreak: 3,
};

// Mock data for runs
const mockRuns = [
  {
    _id: "run1",
    distance: 5000,
    durationSeconds: 1500,
    startedAt: Date.now() - 86400000, // 1 day ago
    type: "ranked" as const,
    eloDelta: 20,
  },
  {
    _id: "run2",
    distance: 3000,
    durationSeconds: 900,
    startedAt: Date.now() - 172800000, // 2 days ago
    type: "social" as const,
  },
  {
    _id: "run3",
    distance: 10000,
    durationSeconds: 2400,
    startedAt: Date.now() - 259200000, // 3 days ago
    type: "live" as const,
  },
];

type FeedItem = {
  run: {
    _id: string;
    type: "ranked" | "social" | "live";
    distance: number;
    durationSeconds: number;
    eloDelta?: number;
    win?: boolean;
    startedAt: number;
  };
  user: {
    _id: string;
    name: string;
    avatarUrl?: string;
  };
};

export default function HomeScreen() {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  const profile = mockProfile;
  const myRuns = mockRuns;

  const winRate =
      profile.winCount + profile.lossCount > 0
        ? Math.round(
            (profile.winCount / (profile.winCount + profile.lossCount)) * 100
          )
        : 0;

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
      <View className="px-4 pt-4 pb-6">
          <Text className="text-gray-400 text-sm">Welcome back,</Text>
          <Text className="font-black text-3xl text-white">{profile.name}</Text>
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
        {myRuns.map((run) => (
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
}
