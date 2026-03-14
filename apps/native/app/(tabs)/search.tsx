import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Redirect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
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

export default function SearchScreen() {
  const { userId } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [addingId, setAddingId] = useState<Id<"users"> | null>(null);

  const incomingRequests = useQuery(
    api.users.getIncomingRequests,
    userId ? { currentUserId: userId as Id<"users"> } : "skip"
  );
  const suggestedUsers = useQuery(
    api.users.getSuggestedUsers,
    userId
      ? {
          currentUserId: userId as Id<"users">,
          searchTerm: searchTerm || undefined,
        }
      : "skip"
  );

  const sendFriendRequest = useMutation(api.friends.sendFriendRequest);
  const acceptFriendRequest = useMutation(api.friends.acceptFriendRequest);

  if (!userId) {
    return <Redirect href="/(auth)/signin" />;
  }

  const handleAddFriend = useCallback(
    async (friendId: Id<"users">) => {
      setAddingId(friendId);
      try {
        await sendFriendRequest({
          userId: userId as Id<"users">,
          friendId,
        });
      } finally {
        setAddingId(null);
      }
    },
    [userId, sendFriendRequest]
  );

  const handleAcceptRequest = useCallback(
    async (senderId: Id<"users">) => {
      setAddingId(senderId);
      try {
        await acceptFriendRequest({
          userId: userId as Id<"users">,
          senderId,
        });
      } finally {
        setAddingId(null);
      }
    },
    [userId, acceptFriendRequest]
  );

  const renderUser = (item: SearchUser) => {
    const isAdding = addingId === item.userId;
    const isIncomingRequest = item.requested && item.senderId !== userId;
    return (
      <View
        className="mx-4 mb-3 flex-row items-center justify-between rounded-2xl bg-neutral-900 p-4"
        key={item.userId}
      >
        <View className="flex-1">
          <Text className="font-semibold text-lg text-white">
            {item.displayName}
          </Text>
          <Text className="text-gray-400 text-sm">
            {item.mutualFriendsCount} mutual friend
            {item.mutualFriendsCount !== 1 ? "s" : ""}
          </Text>
        </View>
        <TouchableOpacity
          className={
            item.requested && !isIncomingRequest
              ? "rounded-full border border-orange-500 px-4 py-2"
              : "rounded-full bg-orange-500 px-4 py-2"
          }
          disabled={isAdding || (item.requested && !isIncomingRequest)}
          onPress={() =>
            isIncomingRequest && item.senderId
              ? handleAcceptRequest(item.senderId)
              : handleAddFriend(item.userId)
          }
        >
          {isAdding ? (
            <ActivityIndicator color="white" size="small" />
          ) : isIncomingRequest ? (
            <Text className="text-sm text-white">Accept</Text>
          ) : item.requested ? (
            <Text className="text-orange-500 text-sm">Requested</Text>
          ) : (
            <Text className="text-sm text-white">Add</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const showAddedMe = !searchTerm.trim();
  const addedMe = incomingRequests ?? [];
  const suggestions = suggestedUsers ?? [];

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-4 pt-4 pb-4">
        <Text className="font-black text-3xl text-white">Search</Text>
        <Text className="mb-4 text-gray-400 text-sm">
          {showAddedMe
            ? "Find friends and see who added you"
            : "Search for users by name"}
        </Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-xl bg-neutral-900 px-4 py-3 text-white"
          onChangeText={setSearchTerm}
          placeholder="Search by name..."
          placeholderTextColor="#6b7280"
          value={searchTerm}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {showAddedMe && addedMe.length !== 0 && (
          <>
            <Text className="mb-1 px-4 text-gray-400 text-sm">Added Me</Text>
            {addedMe.map((item) => renderUser(item))}
          </>
        )}

        <Text className="mb-1 px-4 text-gray-400 text-sm">
          {showAddedMe ? "Suggestions" : "Search results"}
        </Text>
        {suggestions.length === 0 ? (
          <View className="px-4">
            <Text className="text-center text-gray-500">
              {searchTerm.trim()
                ? "No users match your search"
                : "No suggestions right now"}
            </Text>
          </View>
        ) : (
          suggestions.map((item) => renderUser(item))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
