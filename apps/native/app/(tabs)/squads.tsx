// import { StyleSheet, Text, View } from "react-native";

// export default function Tab() {
//   return (
//     <View style={styles.container}>
//       <Text>Tab [SQUADS]</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
// });

// import { api } from "@unihack/backend/convex/_generated/api";
// import { useMutation, useQuery } from "convex/react";
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

type SquadItem = {
  squad: {
    _id: string;
    name: string;
    description?: string;
    inviteCode: string;
  };
  myRole: "admin" | "member";
  memberCount: number;
};

// Mock data for squads
const mockSquads: SquadItem[] = [
  {
    squad: {
      _id: "1",
      name: "Elite Runners",
      description: "Top tier running squad",
      inviteCode: "ELITE123",
    },
    myRole: "admin",
    memberCount: 12,
  },
  {
    squad: {
      _id: "2",
      name: "Morning Joggers",
      description: "Early birds unite",
      inviteCode: "MORNING456",
    },
    myRole: "member",
    memberCount: 8,
  },
];

export default function SquadsScreen() {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newName, setNewName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);

  // const squads = useQuery(api.squads.getMySquads);
  const squads = mockSquads;
  // const createSquad = useMutation(api.squads.createSquad);
  // const joinSquad = useMutation(api.squads.joinSquad);

  const handleCreate = async () => {
    if (!newName.trim()) {
      return;
    }
    setLoading(true);
    try {
      // await createSquad({ name: newName.trim() });
      // Simulate success
      setNewName("");
      setShowCreate(false);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      return;
    }
    setLoading(true);
    try {
      // const id = await joinSquad({ inviteCode: joinCode.trim() });
      // if (id) {
        setJoinCode("");
        setShowJoin(false);
      // } else {
      //   console.warn("Squad not found. Check the invite code.");
      // }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <FlatList
        contentContainerStyle={{ paddingBottom: 40 }}
        data={squads}
        keyExtractor={(item) => item.squad._id}
        ListEmptyComponent={
          <View className="mt-20 items-center px-8">
            <Shield color="#374151" size={56} />
            <Text className="mt-4 text-center text-base text-gray-400">
              No squads yet. Create one or join with an invite code.
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View className="flex-row items-center justify-between px-4 pt-4 pb-4">
            <Text className="font-black text-2xl text-white">Squads</Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="rounded-xl bg-neutral-800 px-3 py-2"
                onPress={() => setShowJoin(true)}
              >
                <Text className="text-gray-300 text-sm">Join</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center gap-1 rounded-xl bg-orange-500 px-3 py-2"
                onPress={() => setShowCreate(true)}
              >
                <Plus color="white" size={16} />
                <Text className="font-semibold text-sm text-white">Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <SquadCard
            item={item}
            onPress={() =>
              router.push({
                pathname: "/squads/[id]",
                params: { id: item.squad._id },
              })
            }
          />
        )}
      />

      {/* Create Modal */}
      <InputModal
        confirmLabel="Create"
        loading={loading}
        onCancel={() => setShowCreate(false)}
        onChangeText={setNewName}
        onConfirm={handleCreate}
        placeholder="Squad name"
        title="Create Squad"
        value={newName}
        visible={showCreate}
      />

      {/* Join Modal */}
      <InputModal
        autoCapitalize="characters"
        confirmLabel="Join"
        loading={loading}
        onCancel={() => setShowJoin(false)}
        onChangeText={setJoinCode}
        onConfirm={handleJoin}
        placeholder="Invite code (e.g. XKCD12)"
        title="Join Squad"
        value={joinCode}
        visible={showJoin}
      />
    </SafeAreaView>
  );
}

function SquadCard({
  item,
  onPress,
}: {
  item: SquadItem;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="mx-4 mb-3 flex-row items-center gap-3 rounded-2xl bg-neutral-900 p-4"
      onPress={onPress}
    >
      <View className="h-12 w-12 items-center justify-center rounded-full bg-orange-500/20">
        <Shield color="#FF4500" size={22} />
      </View>
      <View className="flex-1">
        <Text className="font-bold text-base text-white">
          {item.squad.name}
        </Text>
        <View className="mt-0.5 flex-row gap-3">
          <View className="flex-row items-center gap-1">
            <Users color="#6b7280" size={12} />
            <Text className="text-gray-400 text-xs">{item.memberCount}</Text>
          </View>
        </View>
      </View>
      <View
        className="rounded-lg px-2 py-1"
        style={{
          backgroundColor:
            item.myRole === "admin" ? "#f59e0b20" : "transparent",
        }}
      >
        <Text
          className="text-xs"
          style={{
            color: item.myRole === "admin" ? "#f59e0b" : "#4b5563",
          }}
        >
          {item.myRole}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function InputModal({
  visible,
  title,
  placeholder,
  value,
  onChangeText,
  onConfirm,
  onCancel,
  loading,
  confirmLabel,
  autoCapitalize,
}: {
  visible: boolean;
  title: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  confirmLabel: string;
  autoCapitalize?: "none" | "characters" | "words" | "sentences";
}) {
  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View className="flex-1 items-center justify-center bg-black/70 px-8">
        <View className="w-full rounded-3xl bg-neutral-900 p-6">
          <Text className="mb-4 font-bold text-white text-xl">{title}</Text>
          <TextInput
            autoCapitalize={autoCapitalize}
            className="mb-4 rounded-2xl bg-neutral-800 px-4 py-3 text-base text-white"
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#4b5563"
            value={value}
          />
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 items-center rounded-2xl bg-neutral-800 py-3"
              onPress={onCancel}
            >
              <Text className="font-medium text-gray-300">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 items-center rounded-2xl bg-orange-500 py-3"
              disabled={loading}
              onPress={onConfirm}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="font-bold text-white">{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
