/** biome-ignore-all lint/nursery/noLeakedRender: <explanation> */
import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAuthStore } from "@/stores/auth-store";
import { useLiveStore } from "@/stores/live-store";
import { useRunStore } from "@/stores/run-store";

export default function LiveLobbyScreen() {
  const router = useRouter();
  const liveStore = useLiveStore();
  const runStore = useRunStore();
  const { userId } = useAuthStore();
  const startRoomMutation = useMutation(api.live.startLiveRoom);
  const requestLiveInviteMutation = useMutation((api as any).live.requestLiveInvite);

  const liveData = useQuery(
    api.live.getLiveRoom,
    liveStore.roomId ? { roomId: liveStore.roomId as Id<"liveRooms"> } : "skip"
  );
  const friends = useQuery(
    api.friends.getFriends,
    userId ? { userId: userId as Id<"users"> } : "skip"
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
    runStore.setTargetDistance(liveStore.targetDistanceMeters);
    router.replace("/run/active");
  }, [
    liveData?.room.status,
    liveData?.participants,
    userId,
    runStore,
    liveStore.roomId,
    liveStore.targetDistanceMeters,
    router,
  ]);

  if (!userId) {
    return <Redirect href="/(auth)/signin" />;
  }

  if (!liveStore.roomId) {
    return <Redirect href="/live" />;
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
  const joinedIds = new Set(participants.map((p) => p.userId));
  const requestedFriendIds = liveStore.requestedFriendIds;

  const handleRequestFriend = async (friendId: string, friendName: string) => {
    if (!(liveStore.roomId && userId)) {
      return;
    }

    liveStore.markFriendRequested(friendId);

    try {
      const result = await requestLiveInviteMutation({
        roomId: liveStore.roomId as Id<"liveRooms">,
        hostUserId: userId as Id<"users">,
        targetUserId: friendId as Id<"users">,
        targetDistanceMeters: liveStore.targetDistanceMeters,
      });

      if (!result.success) {
        liveStore.setRequestedFriendIds((prev) =>
          prev.filter((id) => id !== friendId)
        );
      }
    } catch {
      liveStore.setRequestedFriendIds((prev) =>
        prev.filter((id) => id !== friendId)
      );
    }
  };

  return (
    <ScrollView className="flex-1 bg-black px-6 pt-16" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="mb-8 flex-row items-center gap-3">
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => {
            liveStore.reset();
            router.back();
          }}
        >
          <ArrowLeft color="#9ca3af" size={24} />
        </TouchableOpacity>
        <Text className="font-bold text-2xl text-white">
          Live Race Lobby
        </Text>
      </View>

      {/* Room code display */}
      <View className="mb-8 items-center rounded-2xl bg-neutral-900 py-6">
        <Text className="mb-2 text-gray-400 text-sm">Room Code</Text>
        <Text className="font-bold text-6xl text-white tracking-widest">
          {liveStore.roomCode ?? "----"}
        </Text>
        <Text className="mt-2 text-gray-400 text-xs">
          Share this with friends
        </Text>
        <Text className="mt-1 text-orange-400 text-xs">
          Distance: {(liveStore.targetDistanceMeters / 1000).toFixed(1)} km
        </Text>
      </View>

      {/* Participants list */}
      <Text className="mb-3 font-semibold text-white">
        Participants ({participants.length}/
        {liveData?.room.maxParticipants ?? 8})
      </Text>
      <View className="mb-6 rounded-2xl bg-neutral-900 p-4">
        {participants.length === 0 ? (
          <Text className="text-gray-400 text-sm">
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
                    className={`h-2.5 w-2.5 rounded-full ${isMe ? "bg-orange-500" : "bg-green-500"}`}
                  />
                  <Text
                    className={`font-medium ${isMe ? "text-orange-500" : "text-white"}`}
                  >
                    {p.name}
                  </Text>
                </View>
                {isRoomHost && (
                  <Text className="text-gray-400 text-xs">host</Text>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* Friends invite list */}
      {isHost && (
        <>
          <Text className="mb-3 font-semibold text-white">Invite Friends</Text>
          <View className="mb-8 rounded-2xl bg-neutral-900 p-4">
            {(friends ?? []).length === 0 ? (
              <Text className="text-gray-400 text-sm">No friends to invite yet.</Text>
            ) : (
              (friends ?? []).map((friend) => {
                const alreadyJoined = joinedIds.has(friend.friendId);
                const requested = requestedFriendIds.includes(friend.friendId);

                return (
                  <View
                    className="flex-row items-center justify-between py-2"
                    key={friend.friendId}
                  >
                    <View>
                      <Text className="font-medium text-white">{friend.name}</Text>
                      <Text className="text-gray-400 text-xs">
                        🔥 {friend.currentStreak} day streak
                      </Text>
                    </View>
                    {alreadyJoined ? (
                      <Text className="font-semibold text-green-400 text-xs">Joined</Text>
                    ) : (
                      <TouchableOpacity
                        accessibilityRole="button"
                        className={`rounded-lg px-3 py-1.5 ${
                          requested ? "bg-neutral-700" : "bg-orange-500"
                        }`}
                        disabled={requested}
                        onPress={() => handleRequestFriend(friend.friendId, friend.name)}
                      >
                        <Text className={`font-semibold text-xs ${requested ? "text-gray-300" : "text-white"}`}>
                          {requested ? "Requested" : "Request"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </>
      )}

      {/* Start / waiting */}
      {isHost ? (
        <TouchableOpacity
          accessibilityRole="button"
          className={`items-center rounded-xl py-4 ${canStart ? "bg-orange-500" : "bg-neutral-700"}`}
          disabled={!canStart}
          onPress={handleStart}
        >
          <Text
            className={`font-bold text-lg ${canStart ? "text-white" : "text-gray-400"}`}
          >
            {canStart ? "Start Race" : "Need at least 2 players"}
          </Text>
        </TouchableOpacity>
      ) : (
        <View className="items-center py-4">
          <Text className="text-gray-400">
            Waiting for host to start the race...
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
