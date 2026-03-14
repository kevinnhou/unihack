import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import { Bell, Play, UserPlus } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RunConfigModal } from "@/components/RunConfigModal";
import { useAuthStore } from "@/stores/auth-store";

function formatPace(secPerKm: number): string {
  if (secPerKm <= 0) {
    return "--:-- /km";
  }
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

type FriendItem = {
  friendId: Id<"users">;
  name: string;
  currentStreak: number;
  totalRuns: number;
  bestPace: number;
  totalDistance: number;
};

type IncomingRequest = {
  userId: Id<"users">;
  displayName: string;
  mutualFriendsCount: number;
  senderId: Id<"users"> | null;
  requested: boolean;
};

export default function FriendsTabScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [actioningId, setActioningId] = useState<Id<"users"> | null>(null);
  const [challengeUserId, setChallengeUserId] = useState<string | null>(null);
  const [challengeUserName, setChallengeUserName] = useState<string | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);

  const friends = useQuery(
    api.friends.getFriends,
    userId ? { userId: userId as Id<"users"> } : "skip"
  ) as FriendItem[] | undefined;

  const incomingRequests = useQuery(
    api.users.getIncomingRequests,
    userId ? { currentUserId: userId as Id<"users"> } : "skip"
  ) as IncomingRequest[] | undefined;

  const acceptFriendRequest = useMutation(api.friends.acceptFriendRequest);

  const filteredFriends = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      return friends ?? [];
    }
    return (friends ?? []).filter((friend) =>
      friend.name.toLowerCase().includes(q)
    );
  }, [friends, searchTerm]);

  if (!userId) {
    return <Redirect href="/(auth)/signin" />;
  }

  const handleAccept = async (senderId: Id<"users">) => {
    if (!userId) {
      return;
    }

    setActioningId(senderId);
    try {
      await acceptFriendRequest({
        userId: userId as Id<"users">,
        senderId,
      });
    } finally {
      setActioningId(null);
    }
  };

  const pendingCount = (incomingRequests ?? []).length;

  return (
    <SafeAreaView className="flex-1 bg-black">
      <FlatList
        contentContainerStyle={{ paddingBottom: 40 }}
        data={filteredFriends}
        keyExtractor={(item) => item.friendId}
        ListEmptyComponent={
          <View className="mt-12 items-center px-8">
            <Text className="text-center text-gray-500">
              {searchTerm.trim()
                ? "No friends match your search."
                : "No friends yet. Tap + to add someone."}
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View className="px-4 pt-4 pb-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View>
                <Text className="font-black text-2xl text-white">Friends</Text>
                <Text className="text-gray-400 text-sm">
                  {pendingCount > 0
                    ? `${pendingCount} friend request${pendingCount === 1 ? "" : "s"} pending`
                    : "All your current friends"}
                </Text>
              </View>
              <TouchableOpacity
                className="h-10 w-10 items-center justify-center rounded-full bg-orange-500"
                onPress={() => router.push("/friends/add")}
              >
                <UserPlus color="white" size={18} />
              </TouchableOpacity>
            </View>

            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              className="rounded-xl bg-neutral-900 px-4 py-3 text-white"
              onChangeText={setSearchTerm}
              placeholder="Search friends..."
              placeholderTextColor="#6b7280"
              value={searchTerm}
            />

            {(incomingRequests ?? []).length > 0 && (
              <View className="mt-4 rounded-2xl border border-orange-500/30 bg-neutral-900 p-4">
                <View className="mb-2 flex-row items-center gap-2">
                  <Bell color="#f97316" size={16} />
                  <Text className="font-semibold text-orange-400">
                    Friend Requests
                  </Text>
                </View>

                {(incomingRequests ?? []).map((request) => {
                  const senderId = request.senderId;
                  const isLoading = actioningId === senderId;

                  return (
                    <View
                      className="mb-2 flex-row items-center justify-between rounded-xl bg-neutral-800 px-3 py-2"
                      key={request.userId}
                    >
                      <View className="mr-3 flex-1">
                        <Text className="font-semibold text-white">
                          {request.displayName}
                        </Text>
                        <Text className="text-gray-400 text-xs">
                          {request.mutualFriendsCount} mutual friend
                          {request.mutualFriendsCount === 1 ? "" : "s"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        className="rounded-lg bg-orange-500 px-3 py-2"
                        disabled={isLoading || !senderId}
                        onPress={() => senderId && handleAccept(senderId)}
                      >
                        {isLoading ? (
                          <ActivityIndicator color="white" size="small" />
                        ) : (
                          <Text className="font-semibold text-white text-xs">
                            Accept
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View className="mx-4 mb-3 rounded-2xl bg-neutral-900 p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="font-semibold text-lg text-white">
                  {item.name}
                </Text>
                <Text className="text-gray-400 text-sm">
                  {item.totalRuns} run{item.totalRuns === 1 ? "" : "s"} ·{" "}
                  {formatPace(item.bestPace)}
                </Text>
                {item.currentStreak > 0 && (
                  <Text className="text-orange-400 text-xs">
                    {item.currentStreak} day streak
                  </Text>
                )}
              </View>
              <TouchableOpacity
                className="rounded-full bg-orange-500 p-2.5"
                onPress={() => {
                  setChallengeUserId(item.friendId);
                  setChallengeUserName(item.name);
                  setModalOpen(true);
                }}
              >
                <Play color="white" fill="white" size={16} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />

      <RunConfigModal
        initialLiveInviteName={challengeUserName}
        initialLiveInviteUserId={challengeUserId}
        onClose={() => {
          setModalOpen(false);
          setChallengeUserId(null);
          setChallengeUserName(null);
        }}
        visible={modalOpen}
      />
    </SafeAreaView>
  );
}
