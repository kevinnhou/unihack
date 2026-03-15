import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Lock, Play, UserPlus } from "lucide-react-native";
import { useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RunConfigModal } from "@/components/RunConfigModal";
import { useAuthStore } from "@/stores/auth-store";

function formatDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function formatPace(secPerKm: number): string {
  if (secPerKm <= 0) {
    return "—";
  }
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl bg-neutral-900 px-5 py-4">
      <Text className="font-medium text-gray-400">{label}</Text>
      <Text className="font-bold text-white">{value}</Text>
    </View>
  );
}

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuthStore();

  const typedUserId = userId as Id<"users"> | null;
  const targetId = id as Id<"users">;

  const [modalOpen, setModalOpen] = useState(false);

  const profile = useQuery(
    api.users.getUserPublicProfile,
    typedUserId && targetId
      ? { targetUserId: targetId, viewerId: typedUserId }
      : "skip"
  );

  const stats = useQuery(
    api.users.getUserStats,
    profile && !profile.isPrivate && profile.showStats
      ? { userId: targetId }
      : "skip"
  );

  const friendStatus = useQuery(
    api.friends.getFriendStatus,
    typedUserId && targetId ? { userId: typedUserId, targetId } : "skip"
  );

  const sendFriendRequest = useMutation(api.friends.sendFriendRequest);
  const acceptFriendRequest = useMutation(api.friends.acceptFriendRequest);

  const isSelf = typedUserId === targetId;

  const handleAddFriend = async () => {
    if (!typedUserId) {
      return;
    }
    await sendFriendRequest({ userId: typedUserId, friendId: targetId });
  };

  const handleAcceptFriend = async () => {
    if (!typedUserId) {
      return;
    }
    await acceptFriendRequest({ userId: typedUserId, senderId: targetId });
  };

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-base text-orange-400">Back</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const imageUrl = !profile.isPrivate && profile.image ? profile.image : null;
  const initial = profile.name.charAt(0).toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-base text-orange-400">Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Avatar + name */}
        <View className="items-center px-4 pt-6 pb-4">
          {imageUrl ? (
            <Image
              className="h-24 w-24 rounded-full"
              source={{ uri: imageUrl }}
            />
          ) : (
            <View className="h-24 w-24 items-center justify-center rounded-full bg-orange-500">
              <Text className="font-black text-4xl text-white">{initial}</Text>
            </View>
          )}
          <Text className="mt-4 font-black text-2xl text-white">
            {profile.name}
          </Text>
          {!profile.isPrivate && (
            <Text className="mt-1 text-base text-orange-400">
              ⚡ {Math.round(profile.elo)} Elo
            </Text>
          )}
        </View>

        {/* Actions: only shown when viewing someone else */}
        {!(isSelf || profile.isPrivate) && (
          <View className="mx-4 mb-4 flex-row gap-3">
            {friendStatus === "none" && (
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3"
                onPress={handleAddFriend}
              >
                <UserPlus color="white" size={18} />
                <Text className="font-semibold text-white">Add Friend</Text>
              </TouchableOpacity>
            )}
            {friendStatus === "request_sent" && (
              <View className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-3">
                <Text className="font-semibold text-gray-400">
                  Request Sent
                </Text>
              </View>
            )}
            {friendStatus === "request_received" && (
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3"
                onPress={handleAcceptFriend}
              >
                <UserPlus color="white" size={18} />
                <Text className="font-semibold text-white">Accept Request</Text>
              </TouchableOpacity>
            )}
            {friendStatus === "friend" && (
              <View className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-3">
                <Text className="font-semibold text-gray-400">✓ Friends</Text>
              </View>
            )}
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-3"
              onPress={() => setModalOpen(true)}
            >
              <Play color="#ff6900" fill="#ff6900" size={16} />
              <Text className="font-semibold text-orange-400">Challenge</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Private message */}
        {profile.isPrivate && (
          <View className="mx-4 mt-4 flex-row items-center justify-center gap-3 rounded-2xl bg-neutral-900 py-6">
            <Lock color="#6b7280" size={20} />
            <Text className="text-gray-500">This profile is private</Text>
          </View>
        )}

        {/* Stats */}
        {!profile.isPrivate && profile.showStats && stats && (
          <View className="mx-4 gap-3">
            <Text className="mb-1 font-bold text-lg text-white">Stats</Text>
            <StatRow label="Total Runs" value={String(stats.totalRuns)} />
            <StatRow
              label="Total Distance"
              value={formatDist(stats.totalDistanceMeters)}
            />
            <StatRow
              label="Current Streak"
              value={`${stats.currentStreak} day${stats.currentStreak !== 1 ? "s" : ""}`}
            />
            <StatRow
              label="Best Pace"
              value={formatPace(stats.bestPaceSecPerKm)}
            />
          </View>
        )}
      </ScrollView>

      {!(isSelf || profile.isPrivate) && (
        <RunConfigModal
          initialLiveInviteName={profile.name}
          initialLiveInviteUserId={targetId}
          onClose={() => setModalOpen(false)}
          visible={modalOpen}
        />
      )}
    </SafeAreaView>
  );
}
