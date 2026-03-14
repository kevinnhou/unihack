import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";
import { useAuthStore } from "@/stores/auth-store";

function formatPace(secPerKm: number): string {
  if (secPerKm <= 0 || !Number.isFinite(secPerKm)) {
    return "--:--";
  }
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.floor(secPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function LiveResultsScreen() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { userId } = useAuthStore();

  if (!userId) {
    return <Redirect href="/(auth)/signin" />;
  }

  if (!roomId) {
    return <Redirect href="/" />;
  }

  const liveData = useQuery(
    api.live.getLiveRoom,
    roomId ? { roomId: roomId as Id<"liveRooms"> } : "skip"
  );

  const sorted = liveData
    ? [...liveData.participants].sort((a, b) => b.distance - a.distance)
    : [];

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <View className="flex-1 bg-black px-6 pt-16">
      <View className="mb-8 flex-row items-center gap-3">
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.replace("/")}
        >
          <ArrowLeft color="#9ca3af" size={24} />
        </TouchableOpacity>
        <Text className="font-bold text-2xl text-white">Race Results</Text>
      </View>

      {liveData === undefined ? (
        <Text className="text-gray-400">Loading results...</Text>
      ) : sorted.length === 0 ? (
        <Text className="text-gray-400">No participants found.</Text>
      ) : (
        <>
          {sorted.map((p, i) => {
            const isMe = p.userId === userId;
            return (
              <View
                className={`mb-3 flex-row items-center justify-between rounded-xl border p-4 ${
                  isMe
                    ? "border-orange-500 bg-orange-500/10"
                    : "border-neutral-700 bg-neutral-900"
                }`}
                key={p.userId}
              >
                <View className="flex-row items-center gap-3">
                  <Text className="w-8 text-2xl">
                    {medals[i] ?? `#${i + 1}`}
                  </Text>
                  <View>
                    <Text
                      className={`font-semibold text-base ${isMe ? "text-orange-500" : "text-white"}`}
                    >
                      {p.name}
                    </Text>
                    <Text className="text-gray-400 text-xs">
                      {formatPace(p.avgPace)} /km
                    </Text>
                  </View>
                </View>
                <Text className="font-bold text-lg text-white">
                  {(p.distance / 1000).toFixed(2)} km
                </Text>
              </View>
            );
          })}

          <TouchableOpacity
            accessibilityRole="button"
            className="mt-6 items-center rounded-xl bg-orange-500 py-4"
            onPress={() => router.replace("/")}
          >
            <Text className="font-bold text-lg text-white">Done</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
