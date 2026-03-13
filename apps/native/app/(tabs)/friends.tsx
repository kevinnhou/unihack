// import { api } from "@unihack/backend/convex/_generated/api";
// import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Play, UserPlus } from "lucide-react-native";
import { useState } from "react";
import {
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRunStore } from "@/stores/run-store";

// Mock data for friends
const mockFriends = [
  { id: "1", name: "Alice", wins: 5, losses: 2, currentStreak: 7 },
  { id: "2", name: "Bob", wins: 3, losses: 4, currentStreak: 3 },
  { id: "3", name: "Charlie", wins: 7, losses: 1, currentStreak: 12 },
  { id: "4", name: "Diana", wins: 2, losses: 6, currentStreak: 0 },
];

export default function FriendsScreen() {
  const router = useRouter();
  const [confirmFriend, setConfirmFriend] = useState<string | null>(null);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendUsername, setNewFriendUsername] = useState("");

  // Commented convex implementation
  // const friends = useQuery(api.friends.getFriends);

  const friends = mockFriends; // Using mock data

  const handleRace = (friendName: string) => {
    setConfirmFriend(friendName);
  };

  const handleConfirmRace = () => {
    if (confirmFriend) {
      // Configure run store for racing
      useRunStore.getState().configureRun({
        mode: "social",
        targetDistance: 5000, // 5km default
        opponentName: confirmFriend,
        opponentUserId: `mock-${confirmFriend.toLowerCase()}`,
      });

      setConfirmFriend(null);
      router.push("/run/active");
    }
  };

  const handleAddFriend = () => {
    if (newFriendUsername.trim()) {
      // Mock adding friend - in real app this would call an API
      console.log(`Adding friend: ${newFriendUsername}`);
      setNewFriendUsername("");
      setShowAddFriend(false);
    }
  };

  const renderFriend = ({ item }: { item: (typeof mockFriends)[0] }) => (
    <View className="mx-4 mb-3 rounded-2xl bg-neutral-900 p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="font-semibold text-lg text-white">{item.name}</Text>
          <Text className="text-gray-400 text-sm">
            {item.wins}W - {item.losses}L
          </Text>
          {item.currentStreak > 0 && (
            <Text className="text-orange-400 text-sm">
              🔥 {item.currentStreak}d streak
            </Text>
          )}
        </View>
        <TouchableOpacity
          className="rounded-full bg-orange-500 p-3"
          onPress={() => handleRace(item.name)}
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
        data={friends}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="px-4 pt-4 pb-6">
            <View className="flex-row items-center justify-between">
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
        onRequestClose={() => setConfirmFriend(null)}
        transparent
        visible={confirmFriend !== null}
      >
        <View className="flex-1 items-center justify-center bg-black/70 px-8">
          <View className="w-full rounded-3xl bg-neutral-900 p-6">
            <Text className="mb-4 font-bold text-white text-xl">
              Confirm Race
            </Text>
            <Text className="mb-6 text-gray-300">
              Do you want to race {confirmFriend}?
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 items-center rounded-2xl bg-neutral-800 py-3"
                onPress={() => setConfirmFriend(null)}
              >
                <Text className="font-medium text-gray-300">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-2xl bg-orange-500 py-3"
                onPress={handleConfirmRace}
              >
                <Text className="font-bold text-white">Race</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setShowAddFriend(false)}
        transparent
        visible={showAddFriend}
      >
        <View className="flex-1 items-center justify-center bg-black/70 px-8">
          <View className="w-full rounded-3xl bg-neutral-900 p-6">
            <Text className="mb-4 font-bold text-white text-xl">
              Add Friend
            </Text>
            <Text className="mb-4 text-gray-300">
              Enter the username of the friend you want to add:
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              className="mb-6 rounded-xl bg-neutral-800 px-4 py-3 text-white"
              onChangeText={setNewFriendUsername}
              placeholder="Username"
              placeholderTextColor="#6b7280"
              value={newFriendUsername}
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 items-center rounded-2xl bg-neutral-800 py-3"
                onPress={() => {
                  setShowAddFriend(false);
                  setNewFriendUsername("");
                }}
              >
                <Text className="font-medium text-gray-300">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-2xl bg-orange-500 py-3"
                onPress={handleAddFriend}
              >
                <Text className="font-bold text-white">Add Friend</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
