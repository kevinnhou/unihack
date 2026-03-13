import { Ionicons } from "@expo/vector-icons";
import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
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

  const liveData = useQuery(
    api.live.getLiveRoom,
    roomId ? { roomId: roomId as Id<"liveRooms"> } : "skip"
  );

  const sorted = liveData
    ? [...liveData.participants].sort((a, b) => b.distance - a.distance)
    : [];

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <View className="mb-8 flex-row items-center gap-3">
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.replace("/")}
        >
          <Ionicons color="#a1a1aa" name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text className="font-bold text-2xl text-foreground">Race Results</Text>
      </View>

      {liveData === undefined ? (
        <Text className="text-default-400">Loading results...</Text>
      ) : sorted.length === 0 ? (
        <Text className="text-default-400">No participants found.</Text>
      ) : (
        <>
          {sorted.map((p, i) => {
            const isMe = p.userId === userId;
            return (
              <View
                className={`mb-3 flex-row items-center justify-between rounded-xl border p-4 ${
                  isMe ? "border-primary bg-primary/10" : "border-default-200"
                }`}
                key={p.userId}
              >
                <View className="flex-row items-center gap-3">
                  <Text className="w-8 text-2xl">
                    {medals[i] ?? `#${i + 1}`}
                  </Text>
                  <View>
                    <Text
                      className={`font-semibold text-base ${isMe ? "text-primary" : "text-foreground"}`}
                    >
                      {p.name}
                    </Text>
                    <Text className="text-default-400 text-xs">
                      {formatPace(p.avgPace)} /km
                    </Text>
                  </View>
                </View>
                <Text className="font-bold text-foreground text-lg">
                  {(p.distance / 1000).toFixed(2)} km
                </Text>
              </View>
            );
          })}

          <TouchableOpacity
            accessibilityRole="button"
            className="mt-6 items-center rounded-xl bg-primary py-4"
            onPress={() => router.replace("/")}
          >
            <Text className="font-bold text-lg text-white">Done</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
