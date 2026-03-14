import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import { ArrowLeft, UserPlus } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/auth-store";

type SearchUser = {
  userId: Id<"users">;
  displayName: string;
  mutualFriendsCount: number;
  senderId: Id<"users"> | null;
  requested: boolean;
};

export default function AddFriendsScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [actioningId, setActioningId] = useState<Id<"users"> | null>(null);

  const sendFriendRequest = useMutation(api.friends.sendFriendRequest);
  const acceptFriendRequest = useMutation(api.friends.acceptFriendRequest);

  const users = useQuery(
    api.users.getSuggestedUsers,
    userId
      ? {
          currentUserId: userId as Id<"users">,
          searchTerm: searchTerm.trim() || undefined,
        }
      : "skip"
  ) as SearchUser[] | undefined;

  if (!userId) {
    return <Redirect href="/(auth)/signin" />;
  }

  const shownUsers = useMemo(() => users ?? [], [users]);

  const handleRequest = useCallback(
    async (friendId: Id<"users">) => {
      if (!userId) {
        return;
      }
      setActioningId(friendId);
      try {
        await sendFriendRequest({
          userId: userId as Id<"users">,
          friendId,
        });
      } finally {
        setActioningId(null);
      }
    },
    [userId, sendFriendRequest]
  );

  const handleAccept = useCallback(
    async (senderId: Id<"users">) => {
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
    },
    [userId, acceptFriendRequest]
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-4 pt-4 pb-4">
        <View className="mb-3 flex-row items-center justify-between">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full bg-neutral-900"
            onPress={() => router.back()}
          >
            <ArrowLeft color="#d1d5db" size={18} />
          </TouchableOpacity>
          <Text className="font-black text-2xl text-white">Add Friends</Text>
          <View className="h-10 w-10" />
        </View>

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-xl bg-neutral-900 px-4 py-3 text-white"
          onChangeText={setSearchTerm}
          placeholder="Search runners by name..."
          placeholderTextColor="#6b7280"
          value={searchTerm}
        />
      </View>

      <FlatList
        contentContainerStyle={{ paddingBottom: 40 }}
        data={shownUsers}
        keyExtractor={(item) => item.userId}
        ListEmptyComponent={
          <View className="mt-16 items-center px-8">
            <Text className="text-center text-gray-500">
              {searchTerm.trim()
                ? "No runners match your search."
                : "Start typing to find runners."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isAdding = actioningId === item.userId;
          const isIncomingRequest = item.requested && item.senderId !== userId;
          const isAlreadyRequestedByMe =
            item.requested && item.senderId === userId;

          return (
            <View className="mx-4 mb-3 flex-row items-center justify-between rounded-2xl bg-neutral-900 p-4">
              <View className="mr-3 flex-1">
                <Text className="font-semibold text-white text-lg">{item.displayName}</Text>
                <Text className="text-gray-400 text-xs">
                  {item.mutualFriendsCount} mutual friend
                  {item.mutualFriendsCount === 1 ? "" : "s"}
                </Text>
              </View>

              <TouchableOpacity
                className={`rounded-lg px-3 py-2 ${
                  isAlreadyRequestedByMe ? "border border-orange-500" : "bg-orange-500"
                }`}
                disabled={isAdding || isAlreadyRequestedByMe}
                onPress={() =>
                  isIncomingRequest && item.senderId
                    ? handleAccept(item.senderId)
                    : handleRequest(item.userId)
                }
              >
                {isAdding ? (
                  <ActivityIndicator color="white" size="small" />
                ) : isIncomingRequest ? (
                  <Text className="font-semibold text-white text-xs">Accept</Text>
                ) : isAlreadyRequestedByMe ? (
                  <Text className="font-semibold text-orange-500 text-xs">Requested</Text>
                ) : (
                  <View className="flex-row items-center gap-1">
                    <UserPlus color="white" size={13} />
                    <Text className="font-semibold text-white text-xs">Request</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
