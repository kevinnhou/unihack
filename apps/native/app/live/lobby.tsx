/** biome-ignore-all lint/nursery/noLeakedRender: <explanation> */
import { Ionicons } from "@expo/vector-icons";
import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useAuthStore } from "@/stores/auth-store";
import { useLiveStore } from "@/stores/live-store";
import { useRunStore } from "@/stores/run-store";

export default function LiveLobbyScreen() {
  const router = useRouter();
  const liveStore = useLiveStore();
  const runStore = useRunStore();
  const { userId } = useAuthStore();
  const startRoomMutation = useMutation(api.live.startLiveRoom);

  const liveData = useQuery(
    api.live.getLiveRoom,
    liveStore.roomId ? { roomId: liveStore.roomId as Id<"liveRooms"> } : "skip"
  );

  // Navigate to active run when room starts
  useEffect(() => {
    const currentRoomId = liveStore.roomId;
    if (liveData?.room.status !== "running" || !userId || !currentRoomId) {
      return;
    }
    const myParticipant = liveData.participants.find(
      (p) => p.userId === userId
    );
    if (!myParticipant?.runId) {
      return;
    }
    runStore.startRun(myParticipant.runId, "social", userId);
    runStore.setLiveRoomId(currentRoomId);
    router.replace("/run/active");
  }, [
    liveData?.room.status,
    liveData?.participants,
    userId,
    runStore,
    liveStore.roomId,
    router,
  ]);

  if (!userId) {
    return <Redirect href="/auth/sign-in" />;
  }

  const handleStart = async () => {
    if (!liveStore.roomId) {
      return;
    }
    await startRoomMutation({
      roomId: liveStore.roomId as Id<"liveRooms">,
      hostUserId: userId as Id<"users">,
    });
  };

  const participants = liveData?.participants ?? [];
  const isHost = liveStore.isHost;
  const canStart = isHost && participants.length >= 2;

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <View className="mb-8 flex-row items-center gap-3">
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => {
            liveStore.reset();
            router.back();
          }}
        >
          <Ionicons color="#a1a1aa" name="arrow-back" size={24} />
        </TouchableOpacity>
        <Text className="font-bold text-2xl text-foreground">
          Live Race Lobby
        </Text>
      </View>

      {/* Room code display */}
      <View className="mb-8 items-center rounded-2xl border border-default-200 bg-default-50 py-6">
        <Text className="mb-2 text-default-400 text-sm">Room Code</Text>
        <Text className="font-bold text-6xl text-foreground tracking-widest">
          {liveStore.roomCode ?? "----"}
        </Text>
        <Text className="mt-2 text-default-400 text-xs">
          Share this with friends
        </Text>
      </View>

      {/* Participants list */}
      <Text className="mb-3 font-semibold text-foreground">
        Participants ({participants.length}/
        {liveData?.room.maxParticipants ?? 8})
      </Text>
      <View className="mb-8 rounded-2xl border border-default-200 p-4">
        {participants.length === 0 ? (
          <Text className="text-default-400 text-sm">
            Waiting for players...
          </Text>
        ) : (
          participants.map((p) => {
            const isMe = p.userId === userId;
            const isRoomHost = liveData?.room.createdBy === p.userId;
            return (
              <View
                className="flex-row items-center justify-between py-2"
                key={p.userId}
              >
                <View className="flex-row items-center gap-2">
                  <View
                    className={`h-2.5 w-2.5 rounded-full ${isMe ? "bg-primary" : "bg-success"}`}
                  />
                  <Text
                    className={`font-medium ${isMe ? "text-primary" : "text-foreground"}`}
                  >
                    {p.name}
                  </Text>
                </View>
                {isRoomHost && (
                  <Text className="text-default-400 text-xs">host</Text>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* Start / waiting */}
      {isHost ? (
        <TouchableOpacity
          accessibilityRole="button"
          className={`items-center rounded-xl py-4 ${canStart ? "bg-primary" : "bg-default-200"}`}
          disabled={!canStart}
          onPress={handleStart}
        >
          <Text
            className={`font-bold text-lg ${canStart ? "text-white" : "text-default-400"}`}
          >
            {canStart ? "Start Race" : "Need at least 2 players"}
          </Text>
        </TouchableOpacity>
      ) : (
        <View className="items-center py-4">
          <Text className="text-default-400">
            Waiting for host to start the race...
          </Text>
        </View>
      )}
    </View>
  );
}
