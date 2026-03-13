import { api } from "@unihack/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Play } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Image, Text, TouchableOpacity, View } from "react-native";
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

function RunCard({ item }: { item: FeedItem }) {
  const { run, user } = item;
  const isRanked = run.type === "ranked";
  const date = new Date(run.startedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <View className="mx-4 mb-3 rounded-2xl bg-neutral-900 p-4">
      <View className="mb-3 flex-row items-center gap-3">
        {user.avatarUrl ? (
          <Image
            className="h-10 w-10 rounded-full"
            source={{ uri: user.avatarUrl }}
          />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-neutral-700">
            <Text className="font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="font-semibold text-white">{user.name}</Text>
          <Text className="text-gray-500 text-xs">{date}</Text>
        </View>
        <View
          className="rounded-lg px-2 py-1"
          style={{
            backgroundColor:
              run.type === "ranked"
                ? "#7c3aed20"
                : run.type === "live"
                  ? "#f59e0b20"
                  : "#3b82f620",
          }}
        >
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
        </View>
      </View>

      <View className="flex-row gap-4">
        <Metric label="Distance" value={formatDist(run.distance)} />
        <Metric label="Time" value={formatTime(run.durationSeconds)} />
        {/* biome-ignore lint: ternary already guarded with null */}
        {isRanked && run.eloDelta !== undefined ? (
          <Metric
            color={run.eloDelta > 0 ? "#4ade80" : "#f87171"}
            label="Elo"
            value={`${run.eloDelta > 0 ? "+" : ""}${run.eloDelta}`}
          />
        ) : null}
      </View>
    </View>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View>
      <Text className="text-gray-500 text-xs">{label}</Text>
      <Text
        className="font-bold text-base text-white"
        style={color !== undefined ? { color } : {}}
      >
        {value}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const [modalOpen, setModalOpen] = useState(false);
  const profile = useQuery(api.users.getMyProfile);
  const feed = useQuery(api.runs.getFeedRuns, { limit: 50 });

  return (
    <SafeAreaView className="flex-1 bg-black">
      <FlatList
        contentContainerStyle={{ paddingBottom: 100 }}
        data={feed ?? []}
        keyExtractor={(item) => item.run._id}
        ListEmptyComponent={
          <View className="mt-16 items-center">
            <Text className="text-gray-500">No runs yet. Be the first!</Text>
          </View>
        }
        ListHeaderComponent={
          <View className="px-4 pt-4 pb-6">
            <Text className="text-gray-400 text-sm">Welcome back,</Text>
            <Text className="font-black text-3xl text-white">
              {profile?.name ?? "Runner"}
            </Text>
            {profile ? (
              <View className="mt-3 flex-row gap-4">
                <Stat label="Elo" value={String(profile.totalElo)} />
                <Stat label="Wins" value={String(profile.winCount)} />
                <Stat label="Streak" value={`${profile.currentStreak}d`} />
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => <RunCard item={item as FeedItem} />}
      />

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="items-center rounded-xl bg-neutral-900 px-4 py-2">
      <Text className="text-gray-400 text-xs">{label}</Text>
      <Text className="font-bold text-lg text-white">{value}</Text>
    </View>
  );
}
