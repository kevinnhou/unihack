import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Plus, Shield, Users } from "lucide-react-native";
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
import { useAuthStore } from "@/stores/auth-store";

type SquadItem = {
  squadId: Id<"squads">;
  name: string;
  description?: string;
  memberCount: number;
  topStreak: number;
  isMember: boolean;
  isPrivate: boolean;
};

export default function SquadsScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrivate, setNewPrivate] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const allSquads = useQuery(
    api.squads.getAllSquads,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );
  const createSquadMutation = useMutation(api.squads.createSquad);
  const joinSquadByIdMutation = useMutation(api.squads.joinSquadById);
  const joinSquadByCodeMutation = useMutation(api.squads.joinSquad);

  const filteredSquads = (allSquads ?? []).filter((squad) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return true;
    }
    const name = squad.name.toLowerCase();
    const description = squad.description?.toLowerCase() ?? "";
    return name.includes(query) || description.includes(query);
  });

  const handleCreate = async () => {
    if (newName.trim().length < 2) {
      setCreateError("Squad name must be at least 2 characters");
      return;
    }
    setCreateError(null);
    setLoading(true);
    try {
      const result = await createSquadMutation({
        userId: userId as Id<"users">,
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        isPrivate: newPrivate,
      });
      setNewName("");
      setNewDescription("");
      setNewPrivate(false);
      setShowCreate(false);
      router.push({
        pathname: "/squads/[id]",
        params: { id: result.squadId },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCodeInput.trim()) {
      return;
    }
    setLoading(true);
    try {
      const res = await joinSquadByCodeMutation({
        userId: userId as Id<"users">,
        joinCode: joinCodeInput.trim(),
      });
      if (res.success) {
        router.push({ pathname: "/squads/[id]", params: { id: res.squadId } });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (squadId: Id<"squads">) => {
    await joinSquadByIdMutation({
      userId: userId as Id<"users">,
      squadId,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <FlatList
        contentContainerStyle={{ paddingBottom: 40 }}
        data={filteredSquads}
        keyExtractor={(item) => item.squadId}
        ListEmptyComponent={
          <View className="mt-20 items-center px-8">
            <Shield color="#374151" size={56} />
            <Text className="mt-4 text-center text-base text-gray-400">
              {searchTerm.trim()
                ? "No squads match your search."
                : "No squads yet. Create the first one!"}
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View className="px-4 pt-4 pb-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="font-black text-2xl text-white">Squads</Text>
              <TouchableOpacity
                className="flex-row items-center gap-1 rounded-xl bg-orange-500 px-3 py-2"
                onPress={() => setShowCreate(true)}
              >
                <Plus color="white" size={16} />
                <Text className="font-semibold text-sm text-white">Create</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              className="rounded-xl bg-neutral-900 px-4 py-3 text-white"
              onChangeText={setSearchTerm}
              placeholder="Search squads..."
              placeholderTextColor="#6b7280"
              value={searchTerm}
            />
            <View className="mt-3 flex-row gap-2">
              <TextInput
                autoCapitalize="characters"
                className="flex-1 rounded-xl bg-neutral-900 px-4 py-3 text-white"
                onChangeText={setJoinCodeInput}
                placeholder="Join code"
                placeholderTextColor="#6b7280"
                value={joinCodeInput}
              />
              <TouchableOpacity
                className="rounded-xl bg-orange-500 px-4 py-3"
                onPress={handleJoinByCode}
              >
                <Text className="font-bold text-white">Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <SquadCard
            item={item}
            onJoin={() => handleJoin(item.squadId)}
            onPress={() =>
              router.push({
                pathname: "/squads/[id]",
                params: { id: item.squadId },
              })
            }
          />
        )}
      />

      {/* Create Modal */}
      <Modal animationType="fade" transparent visible={showCreate}>
        <View className="flex-1 items-center justify-center bg-black/70 px-8">
          <View className="w-full rounded-3xl bg-neutral-900 p-6">
            <Text className="mb-4 font-bold text-white text-xl">
              Create Squad
            </Text>
            <TextInput
              className="mb-1 rounded-2xl bg-neutral-800 px-4 py-3 text-base text-white"
              onChangeText={(t) => {
                setNewName(t);
                setCreateError(null);
              }}
              placeholder="Squad name"
              placeholderTextColor="#4b5563"
              value={newName}
            />
            {createError ? (
              <Text className="mb-3 text-red-400 text-xs">{createError}</Text>
            ) : (
              <View className="mb-3" />
            )}
            <TextInput
              className="mb-4 rounded-2xl bg-neutral-800 px-4 py-3 text-base text-white"
              onChangeText={setNewDescription}
              placeholder="Description (optional)"
              placeholderTextColor="#4b5563"
              value={newDescription}
            />
            <TouchableOpacity
              className="mb-4 flex-row items-center gap-3"
              onPress={() => setNewPrivate((s) => !s)}
            >
              <View
                className={`h-5 w-5 items-center justify-center rounded ${
                  newPrivate ? "bg-orange-500" : "bg-neutral-800"
                }`}
              >
                {newPrivate ? (
                  <View className="h-3 w-3 rounded bg-white" />
                ) : null}
              </View>
              <Text className="text-gray-300">Private squad</Text>
            </TouchableOpacity>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 items-center rounded-2xl bg-neutral-800 py-3"
                onPress={() => {
                  setShowCreate(false);
                  setNewName("");
                  setCreateError(null);
                }}
              >
                <Text className="font-medium text-gray-300">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-2xl bg-orange-500 py-3"
                disabled={loading}
                onPress={handleCreate}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="font-bold text-white">Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SquadCard({
  item,
  onPress,
  onJoin,
}: {
  item: SquadItem;
  onPress: () => void;
  onJoin: () => void;
}) {
  return (
    <TouchableOpacity
      className="mx-4 mb-3 flex-row items-center gap-3 rounded-2xl bg-neutral-900 p-4"
      onPress={onPress}
    >
      <View className="h-12 w-12 items-center justify-center rounded-full bg-orange-500/20">
        <Shield color="#ff6900" size={22} />
      </View>
      <View className="flex-1">
        <Text className="font-bold text-base text-white">{item.name}</Text>
        <View className="mt-0.5 flex-row gap-3">
          <View className="flex-row items-center gap-1">
            <Users color="#6b7280" size={12} />
            <Text className="text-gray-400 text-xs">{item.memberCount}</Text>
          </View>
          {item.topStreak > 0 && (
            <View className="flex-row items-center gap-1">
              <Text className="text-orange-400 text-xs">
                🔥 {item.topStreak}d squad streak
              </Text>
            </View>
          )}
        </View>
      </View>
      {item.isMember ? (
        <View className="rounded-lg bg-orange-500/20 px-2 py-1">
          <Text className="text-orange-400 text-xs">Joined</Text>
        </View>
      ) : (
        <TouchableOpacity
          className="rounded-lg bg-neutral-700 px-3 py-1"
          onPress={(e) => {
            e.stopPropagation();
            onJoin();
          }}
        >
          <Text className="text-gray-300 text-xs">Join</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}
