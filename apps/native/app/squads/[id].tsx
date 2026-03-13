import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Copy, Plus, Zap } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Clipboard,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Member = {
  userId: string;
  name: string;
  avatarUrl?: string;
  role: "admin" | "member";
  weeklyDistance: number;
  currentStreak: number;
};

export default function SquadDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showChallenge, setShowChallenge] = useState(false);

  const detail = useQuery(
    api.squads.getSquadDetail,
    id ? { squadId: id as Id<"squads"> } : "skip"
  );

  const leaderboard = useQuery(
    api.leaderboards.getSquadLeaderboard,
    id ? { squadId: id as Id<"squads"> } : "skip"
  );

  const copyCode = () => {
    if (detail?.squad.inviteCode) {
      Clipboard.setString(detail.squad.inviteCode);
    }
  };

  if (!detail) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color="#FF4500" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="flex-row items-center gap-3 px-4 pt-4 pb-3">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft color="white" size={24} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="font-black text-2xl text-white">
              {detail.squad.name}
            </Text>
            {detail.squad.description ? (
              <Text className="text-gray-400 text-sm">
                {detail.squad.description}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Invite code */}
        <TouchableOpacity
          className="mx-4 mb-4 flex-row items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3"
          onPress={copyCode}
        >
          <Text className="flex-1 text-gray-400 text-sm">
            Invite code:{" "}
            <Text className="font-bold text-orange-400 tracking-widest">
              {detail.squad.inviteCode}
            </Text>
          </Text>
          <Copy color="#6b7280" size={16} />
        </TouchableOpacity>

        {/* Streak */}
        {detail.squad.streakCounter > 0 && (
          <View className="mx-4 mb-4 flex-row items-center gap-2 rounded-2xl bg-orange-500/10 px-4 py-3">
            <Text className="text-2xl">🔥</Text>
            <Text className="font-bold text-orange-400">
              {detail.squad.streakCounter} week squad streak!
            </Text>
          </View>
        )}

        {/* Weekly leaderboard */}
        <Text className="mb-3 px-4 font-bold text-lg text-white">
          This Week
        </Text>
        {(leaderboard ?? []).map((entry) => (
          <View
            className="mx-4 mb-2 flex-row items-center gap-3 rounded-2xl bg-neutral-900 px-4 py-3"
            key={entry.userId}
          >
            <Text className="w-6 text-center font-bold text-gray-400">
              {entry.rank}
            </Text>
            <View className="h-9 w-9 items-center justify-center rounded-full bg-neutral-700">
              <Text className="font-bold text-sm text-white">
                {entry.name.charAt(0)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-sm text-white">
                {entry.name}
              </Text>
              {entry.currentStreak > 0 && (
                <Text className="text-orange-400 text-xs">
                  🔥 {entry.currentStreak}d streak
                </Text>
              )}
            </View>
            <Text className="font-bold text-white">
              {entry.weeklyDistance >= 1000
                ? `${(entry.weeklyDistance / 1000).toFixed(1)} km`
                : `${Math.round(entry.weeklyDistance)} m`}
            </Text>
          </View>
        ))}

        {/* Active Challenges */}
        <View className="mt-4 mb-3 flex-row items-center justify-between px-4">
          <Text className="font-bold text-lg text-white">Challenges</Text>
          <TouchableOpacity
            className="flex-row items-center gap-1 rounded-xl bg-orange-500 px-3 py-1.5"
            onPress={() => setShowChallenge(true)}
          >
            <Plus color="white" size={14} />
            <Text className="font-semibold text-white text-xs">New</Text>
          </TouchableOpacity>
        </View>

        {detail.challenges.length === 0 ? (
          <View className="mx-4 items-center rounded-2xl bg-neutral-900 p-6">
            <Zap color="#374151" size={36} />
            <Text className="mt-2 text-gray-500 text-sm">
              No active challenges
            </Text>
          </View>
        ) : (
          detail.challenges.map((c) => (
            <View
              className="mx-4 mb-2 rounded-2xl bg-neutral-900 px-4 py-3"
              key={c._id}
            >
              <Text className="font-bold text-white">{c.title}</Text>
              <Text className="mt-0.5 text-gray-400 text-xs capitalize">
                {c.type} · Target: {c.target}
                {c.type === "distance" ? " m" : ""}
              </Text>
            </View>
          ))
        )}

        {/* Members */}
        <Text className="mt-4 mb-3 px-4 font-bold text-lg text-white">
          Members ({detail.members.length})
        </Text>
        {detail.members.map((m: Member) => (
          <View
            className="mx-4 mb-2 flex-row items-center gap-3 rounded-2xl bg-neutral-900 px-4 py-3"
            key={m.userId}
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-neutral-700">
              <Text className="font-bold text-white">{m.name.charAt(0)}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-white">{m.name}</Text>
              <Text className="text-gray-400 text-xs capitalize">{m.role}</Text>
            </View>
            {m.currentStreak > 0 && (
              <Text className="text-orange-400 text-xs">
                🔥 {m.currentStreak}d
              </Text>
            )}
          </View>
        ))}
      </ScrollView>

      {id ? (
        <CreateChallengeModal
          onClose={() => setShowChallenge(false)}
          squadId={id as Id<"squads">}
          visible={showChallenge}
        />
      ) : null}
    </SafeAreaView>
  );
}

function CreateChallengeModal({
  squadId,
  visible,
  onClose,
}: {
  squadId: Id<"squads">;
  visible: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"distance" | "speed" | "streak">("distance");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);

  const createChallenge = useMutation(api.squads.createChallenge);

  const handleCreate = async () => {
    if (!(title && target)) {
      return;
    }
    setLoading(true);
    try {
      const now = Date.now();
      await createChallenge({
        squadId,
        title,
        type,
        target: Number(target),
        startDate: now,
        endDate: now + 7 * 24 * 60 * 60 * 1000,
      });
      setTitle("");
      setTarget("");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View className="flex-1 justify-end">
        <View className="rounded-t-3xl bg-neutral-900 p-6">
          <Text className="mb-4 font-bold text-white text-xl">
            New Challenge
          </Text>

          <TextInput
            className="mb-3 rounded-2xl bg-neutral-800 px-4 py-3 text-base text-white"
            onChangeText={setTitle}
            placeholder="Challenge title"
            placeholderTextColor="#4b5563"
            value={title}
          />

          <View className="mb-3 flex-row gap-2">
            {(["distance", "speed", "streak"] as const).map((t) => (
              <TouchableOpacity
                className="flex-1 items-center rounded-xl py-2"
                key={t}
                onPress={() => setType(t)}
                style={{
                  backgroundColor: type === t ? "#FF4500" : "#2a2a2a",
                }}
              >
                <Text
                  className="font-semibold text-xs capitalize"
                  style={{ color: type === t ? "white" : "#6b7280" }}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            className="mb-4 rounded-2xl bg-neutral-800 px-4 py-3 text-base text-white"
            keyboardType="numeric"
            onChangeText={setTarget}
            placeholder={
              type === "distance"
                ? "Target (meters)"
                : type === "speed"
                  ? "Target pace (sec/km)"
                  : "Target days"
            }
            placeholderTextColor="#4b5563"
            value={target}
          />

          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 items-center rounded-2xl bg-neutral-800 py-3"
              onPress={onClose}
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
  );
}
