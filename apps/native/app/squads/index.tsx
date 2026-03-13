import { Ionicons } from "@expo/vector-icons";
import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuthStore } from "@/stores/auth-store";

export default function SquadsScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const allSquads = useQuery(
    api.squads.getAllSquads,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );
  const createSquadMutation = useMutation(api.squads.createSquad);
  const joinSquadByIdMutation = useMutation(api.squads.joinSquadById);

  const [newSquadName, setNewSquadName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  if (!userId) {
    return <Redirect href="/auth/sign-in" />;
  }

  const handleCreate = async () => {
    if (!newSquadName.trim()) {
      return;
    }
    const result = await createSquadMutation({
      userId: userId as Id<"users">,
      name: newSquadName.trim(),
    });
    setNewSquadName("");
    setShowCreate(false);
    router.push(
      `/squads/${result.squadId}` as Parameters<typeof router.push>[0]
    );
  };

  const handleJoin = async (squadId: string) => {
    setJoiningId(squadId);
    try {
      await joinSquadByIdMutation({
        userId: userId as Id<"users">,
        squadId: squadId as Id<"squads">,
      });
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <View className="mb-6 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => router.back()}
          >
            <Ionicons color="#a1a1aa" name="arrow-back" size={24} />
          </TouchableOpacity>
          <Text className="font-bold text-2xl text-foreground">Squads</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          className="rounded-xl bg-primary px-4 py-2"
          onPress={() => setShowCreate(!showCreate)}
        >
          <Text className="font-semibold text-white">+ New</Text>
        </TouchableOpacity>
      </View>

      {showCreate && (
        <View className="mb-4 rounded-2xl border border-default-200 p-4">
          <Text className="mb-2 font-semibold text-foreground">
            Create Squad
          </Text>
          <TextInput
            className="mb-3 rounded-xl border border-default-200 bg-default-50 p-3 text-foreground"
            onChangeText={setNewSquadName}
            placeholder="Squad name"
            value={newSquadName}
          />
          <TouchableOpacity
            accessibilityRole="button"
            className="items-center rounded-xl bg-primary py-3"
            onPress={handleCreate}
          >
            <Text className="font-semibold text-white">Create</Text>
          </TouchableOpacity>
        </View>
      )}

      {allSquads === undefined ? (
        <Text className="text-default-400">Loading squads...</Text>
      ) : allSquads.length === 0 ? (
        <Text className="text-default-400">
          No squads yet. Create the first one!
        </Text>
      ) : (
        <FlatList
          data={allSquads}
          keyExtractor={(item) => item.squadId}
          renderItem={({ item }) => (
            <View className="mb-3 rounded-xl border border-default-200 p-4">
              <View className="flex-row items-center justify-between">
                <TouchableOpacity
                  accessibilityRole="button"
                  className="flex-1"
                  onPress={() =>
                    router.push(
                      `/squads/${item.squadId}` as Parameters<
                        typeof router.push
                      >[0]
                    )
                  }
                >
                  <Text className="font-semibold text-foreground text-lg">
                    {item.name}
                  </Text>
                  <Text className="mt-0.5 text-default-400 text-sm">
                    {item.memberCount}{" "}
                    {item.memberCount === 1 ? "member" : "members"}
                  </Text>
                </TouchableOpacity>

                {item.isMember ? (
                  <Text className="rounded-full bg-success/10 px-3 py-1 text-sm text-success">
                    Joined
                  </Text>
                ) : (
                  <TouchableOpacity
                    accessibilityRole="button"
                    className="rounded-full bg-primary px-4 py-1.5"
                    disabled={joiningId === item.squadId}
                    onPress={() => handleJoin(item.squadId)}
                  >
                    <Text className="font-semibold text-sm text-white">
                      {joiningId === item.squadId ? "..." : "Join"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
