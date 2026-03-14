import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import { ChevronLeft, Play, UserPlus } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
    return "—";
  }
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

export default function FriendsScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [raceGhostId, setRaceGhostId] = useState<string | null>(null);

  const friends = useQuery(
    api.friends.getFriends,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );
  const addFriendMutation = useMutation(api.friends.addFriend);

  if (!userId) {
    return <Redirect href="/(auth)/signin" />;
  }

  const handleAddFriend = async () => {
    if (!newFriendEmail.trim()) {
      return;
    }
    setAddLoading(true);
    setAddError(null);
    try {
      const result = await addFriendMutation({
        userId: userId as Id<"users">,
        friendEmail: newFriendEmail.trim(),
      });
      if (!result.success) {
        setAddError(result.reason);
        return;
      }
      setNewFriendEmail("");
      setShowAddFriend(false);
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setAddLoading(false);
    }
  };

  type Friend = NonNullable<typeof friends>[number];

  const renderFriend = ({ item }: { item: Friend }) => (
    <View className="mx-4 mb-3 rounded-2xl bg-neutral-900 p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="font-semibold text-lg text-white">{item.name}</Text>
          <Text className="text-gray-400 text-sm">
            {item.totalRuns} run{item.totalRuns !== 1 ? "s" : ""} ·{" "}
            {formatPace(item.bestPace)}
          </Text>
          {item.currentStreak > 0 && (
            <Text className="text-orange-400 text-sm">
              🔥 {item.currentStreak}d streak
            </Text>
          )}
        </View>
        <TouchableOpacity
          className="rounded-full bg-orange-500 p-3"
          onPress={() => {
            setRaceGhostId(item.friendId);
            setModalOpen(true);
          }}
        >
          <Play color="white" size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black">
      <FlatList
        contentContainerStyle={{ paddingBottom: 40 }}
        data={friends ?? []}
        keyExtractor={(item) => item.friendId}
        ListEmptyComponent={
          <View className="mt-16 items-center px-8">
            <Text className="text-center text-gray-500">
              No friends yet. Add someone by email!
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View className="px-4 pt-4 pb-6">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                className="pr-2 text-orange-500"
                onPress={() => router.back()}
              >
                <Text className="flex flex-row font-medium text-orange-500">
                  <ChevronLeft
                    color="currentColor"
                    size={18}
                    style={{ marginRight: 0 }}
                  />{" "}
                  Profile
                </Text>
              </TouchableOpacity>
              <Text className="font-black text-3xl text-white">Friends</Text>
              <TouchableOpacity
                className="rounded-full bg-orange-500 p-2"
                onPress={() => setShowAddFriend(true)}
              >
                <UserPlus color="white" size={20} />
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={renderFriend}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        animationType="fade"
        onRequestClose={() => {
          setShowAddFriend(false);
          setAddError(null);
        }}
        transparent
        visible={showAddFriend}
      >
        <View className="flex-1 items-center justify-center bg-black/70 px-8">
          <View className="w-full rounded-3xl bg-neutral-900 p-6">
            <Text className="mb-4 font-bold text-white text-xl">
              Add Friend
            </Text>
            <Text className="mb-4 text-gray-300">
              Enter the email address of the friend you want to add:
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              className="mb-3 rounded-xl bg-neutral-800 px-4 py-3 text-white"
              keyboardType="email-address"
              onChangeText={setNewFriendEmail}
              placeholder="friend@example.com"
              placeholderTextColor="#6b7280"
              value={newFriendEmail}
            />
            {addError ? (
              <Text className="mb-3 text-red-400 text-sm">{addError}</Text>
            ) : null}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 items-center rounded-2xl bg-neutral-800 py-3"
                onPress={() => {
                  setShowAddFriend(false);
                  setNewFriendEmail("");
                  setAddError(null);
                }}
              >
                <View className="flex flex-row items-center text-orange-500">
                  <ChevronLeft
                    color="currentColor"
                    size={18}
                    style={{ marginRight: 8 }}
                  />
                  <Text className="font-medium text-gray-300">Profile</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-2xl bg-orange-500 py-3"
                disabled={addLoading}
                onPress={handleAddFriend}
              >
                {addLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="font-bold text-white">Add Friend</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <RunConfigModal
        initialGhostUserId={raceGhostId}
        onClose={() => {
          setModalOpen(false);
          setRaceGhostId(null);
        }}
        visible={modalOpen}
      />
    </SafeAreaView>
  );
}
