import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import { Bell, ChartArea, Flame, Play, X } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RunActivityCard } from "@/components/RunActivityCard";
import { RunConfigModal } from "@/components/RunConfigModal";
import { useRunStore } from "@/stores/run-store";
import { useAuthStore } from "@/stores/auth-store";
import { useLiveStore } from "@/stores/live-store";

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

const CARD_GAP = 12;
const CARD_PADDING = 20;

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: PASS
export default function HomeScreen() {
  const router = useRouter();
  const { userId, userName } = useAuthStore();
  const liveStore = useLiveStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pendingInviteRoomId, setPendingInviteRoomId] = useState<string | null>(
    null
  );
  const [pendingFriendSenderId, setPendingFriendSenderId] = useState<
    string | null
  >(null);

  const stats = useQuery(
    api.users.getUserStats,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );
  const feedRuns = useQuery(
    api.runs.getFeedRuns,
    userId ? { currentUserId: userId as Id<"users"> } : "skip"
  );
  const liveInvites = useQuery(
    // biome-ignore lint/suspicious/noExplicitAny: _generated/api not yet regenerated with live module
    (api as any).live.getLiveInvites,
    userId ? { userId: userId as Id<"users"> } : "skip"
  ) as
    | Array<{
        roomId: string;
        roomCode: string;
        hostName: string;
        targetDistanceMeters: number;
        createdAt: number;
      }>
    | undefined;
  const incomingFriendRequests = useQuery(
    api.users.getIncomingRequests,
    userId ? { currentUserId: userId as Id<"users"> } : "skip"
  ) as
    | Array<{
        userId: string;
        displayName: string;
        mutualFriendsCount: number;
        senderId: string | null;
        requested: boolean;
      }>
    | undefined;
  const acceptLiveInviteMutation = useMutation(
    // biome-ignore lint/suspicious/noExplicitAny: _generated/api not yet regenerated with live module
    (api as any).live.acceptLiveInvite
  );
  const dismissLiveInviteMutation = useMutation(
    // biome-ignore lint/suspicious/noExplicitAny: _generated/api not yet regenerated with live module
    (api as any).live.dismissLiveInvite
  );
  const acceptFriendRequestMutation = useMutation(
    api.friends.acceptFriendRequest
  );

  const startRunMutation = useMutation(api.runs.startRun);
  const runStore = useRunStore();

  const getGhostChallengesQuery = useQuery(
    // biome-ignore lint/suspicious/noExplicitAny: _generated/api not yet regenerated with live module
    (api as any).live.getGhostChallenges,
    userId ? { userId: userId as Id<"users"> } : "skip"
  ) as any[] | undefined;

  const acceptGhostChallengeMutation = useMutation(
    // biome-ignore lint/suspicious/noExplicitAny
    (api as any).live.acceptGhostChallenge
  );

  const dismissGhostChallengeMutation = useMutation(
    // biome-ignore lint/suspicious/noExplicitAny
    (api as any).live.dismissGhostChallenge
  );

  if (!userId) {
    return <Redirect href="/(auth)/signin" />;
  }

  const notificationCount =
    (liveInvites?.length ?? 0) +
    (incomingFriendRequests?.length ?? 0) +
    (getGhostChallengesQuery?.length ?? 0);

  const handleAcceptInvite = async (roomId: string) => {
    if (!(userId && roomId)) {
      return;
    }

    setPendingInviteRoomId(roomId);
    try {
      const result = await acceptLiveInviteMutation({
        roomId: roomId as Id<"liveRooms">,
        userId: userId as Id<"users">,
      });

      if (result.success) {
        liveStore.setRoom(
          result.roomId,
          result.roomCode,
          false,
          result.targetDistanceMeters
        );
        setNotificationsOpen(false);
        router.push("/live/lobby");
      }
    } finally {
      setPendingInviteRoomId(null);
    }
  };

  const handleDismissInvite = async (roomId: string) => {
    if (!(userId && roomId)) {
      return;
    }
    await dismissLiveInviteMutation({
      roomId: roomId as Id<"liveRooms">,
      userId: userId as Id<"users">,
    });
  };

  const handleAcceptFriendRequest = async (senderId: string) => {
    if (!userId) {
      return;
    }

    setPendingFriendSenderId(senderId);
    try {
      await acceptFriendRequestMutation({
        userId: userId as Id<"users">,
        senderId: senderId as Id<"users">,
      });
    } finally {
      setPendingFriendSenderId(null);
    }
  };
  const eloChange = feedRuns
    ? (() => {
        // Calculate the elo change over this week's runs
        // Get timestamps for the start and end of this week (Monday 00:00:00 to now)
        const now = new Date();
        const dayOfWeek = now.getDay() || 7; // Sunday is 0, convert to 7
        const monday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - (dayOfWeek - 1)
        );
        monday.setHours(0, 0, 0, 0);
        const weekStartTs = monday.getTime();

        // Only consider completed runs by this user, in this week, and that actually have an elo change
        const runsThisWeek = feedRuns.filter(
          (item) =>
            item.run.userId === userId &&
            item.run.completedAt &&
            item.run.completedAt >= weekStartTs &&
            typeof item.run.eloGained === "number"
        );

        if (runsThisWeek.length === 0) return null;

        // Sum all eloGained values for the week
        const totalEloChange = runsThisWeek.reduce(
          (acc, item) => acc + (item.run.eloGained ?? 0),
          0
        );
        const sign = totalEloChange > 0 ? "+" : "";
        return `${sign}${totalEloChange}`;
      })()
    : null;

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="flex-row items-start justify-between px-4 pt-4 pb-6">
          <View>
            <Text className="text-gray-400 text-sm">Welcome back,</Text>
            <Text className="font-black text-3xl text-white">
              {userName ?? "Runner"}
            </Text>
          </View>

          <TouchableOpacity
            className="relative mt-1 h-10 w-10 items-center justify-center rounded-full bg-neutral-900"
            onPress={() => setNotificationsOpen(true)}
          >
            <Bell color="#f3f4f6" size={18} />
            {notificationCount > 0 && (
              <View className="-top-1 -right-1 absolute min-w-5 rounded-full bg-orange-500 px-1">
                <Text className="text-center font-bold text-[10px] text-white">
                  {notificationCount > 9 ? "9+" : String(notificationCount)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Stats carousel */}
        {(() => {
          const { width: screenWidth } = Dimensions.get("window");
          const cardWidth = screenWidth - CARD_PADDING * 2;
          return (
            <ScrollView
              className="mb-4"
              contentContainerStyle={{ paddingHorizontal: CARD_PADDING }}
              decelerationRate="fast"
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToAlignment="start"
              snapToInterval={cardWidth + CARD_GAP}
            >
              {/* Streak card */}
              <View
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: "#ff6900",
                  width: cardWidth,
                  marginRight: CARD_GAP,
                }}
              >
                <View className="mb-1 flex-row items-center gap-1.5">
                  <Flame color="white" size={16} />
                  <Text className="text-sm text-white">Streak</Text>
                </View>
                <Text className="font-black text-5xl text-white">
                  {stats?.currentStreak ?? "—"}
                </Text>
                <Text className="mt-1 text-orange-300 text-sm">
                  {stats?.currentStreak
                    ? `🔥 ${stats.currentStreak} day streak`
                    : "No active streak"}
                </Text>
              </View>

              {/* Stats Card */}
              <View
                className="flex flex-col gap-2 rounded-2xl bg-neutral-900 p-4"
                style={{ width: cardWidth, marginRight: CARD_GAP }}
              >
                <View className="mb-1 flex-row items-center gap-1.5">
                  <ChartArea color="white" size={16} />
                  <Text className="font-semibold text-sm text-white">
                    This Week
                  </Text>
                </View>
                <View className="flex flex-row gap-2">
                  <View className="flex-1">
                    <Text className="text-gray-400 text-xs">Distance</Text>
                    <Text className="font-bold text-lg text-white">
                      {stats ? formatDist(stats.totalDistanceMeters) : "—"}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-400 text-xs">Pace</Text>
                    <Text className="font-bold text-lg text-white">
                      {stats ? formatPace(stats.bestPaceSecPerKm) : "—"}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-400 text-xs">Runs</Text>
                    <Text className="font-bold text-lg text-white">
                      {stats ? stats.totalRuns : "—"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Elo Card */}
              <View
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: "#007AFF",
                  width: cardWidth,
                }}
              >
                <View className="mb-1 flex-row items-center gap-1.5">
                  <Flame color="white" size={16} />
                  <Text className="text-sm text-white">Elo</Text>
                </View>
                <Text className="font-black text-5xl text-white">
                  {stats?.currentElo ?? "—"}
                </Text>
                <Text className="mt-1 text-blue-200 text-sm">
                  {eloChange ? (
                    <Text className="text-blue-300 text-sm">
                      {eloChange} this week
                    </Text>
                  ) : (
                    "No elo change this week"
                  )}
                </Text>
              </View>
            </ScrollView>
          );
        })()}

        {/* Run history feed */}
        {feedRuns?.map((item) => (
          <RunActivityCard
            isOwnRun={item.run.userId === userId}
            item={item}
            key={item.run._id}
          />
        ))}
        {feedRuns?.length === 0 && (
          <Text className="px-4 text-gray-500 text-sm">
            No runs yet. Start your first run or add friends to see their runs!
          </Text>
        )}
      </ScrollView>

      {/* FAB Start Run */}
      <TouchableOpacity
        className="absolute right-6 bottom-8 h-16 w-16 items-center justify-center rounded-full bg-orange-500 shadow-lg"
        onPress={() => setModalOpen(true)}
        style={{ elevation: 8 }}
      >
        <Play color="white" fill="white" size={28} />
      </TouchableOpacity>

      <RunConfigModal onClose={() => setModalOpen(false)} visible={modalOpen} />

      <Modal
        animationType="slide"
        onRequestClose={() => setNotificationsOpen(false)}
        transparent
        visible={notificationsOpen}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="max-h-[80%] rounded-t-3xl bg-neutral-950 px-5 pt-5 pb-8">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="font-bold text-white text-xl">
                Notifications
              </Text>
              <TouchableOpacity
                className="h-8 w-8 items-center justify-center rounded-full bg-neutral-800"
                onPress={() => setNotificationsOpen(false)}
              >
                <X color="#d1d5db" size={16} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {(liveInvites ?? []).length === 0 &&
              (incomingFriendRequests ?? []).length === 0 &&
              (getGhostChallengesQuery ?? []).length === 0 ? (
                <Text className="mt-8 text-center text-gray-400">
                  No notifications right now.
                </Text>
              ) : (
                <>
                  {(incomingFriendRequests ?? []).map((request) => {
                    const senderId = request.senderId;
                    const isLoading = pendingFriendSenderId === senderId;

                    return (
                      <View
                        className="mb-3 rounded-2xl bg-neutral-900 p-4"
                        key={`friend-${request.userId}`}
                      >
                        <Text className="font-semibold text-white">
                          {request.displayName} sent you a friend request
                        </Text>
                        <Text className="mt-1 text-gray-400 text-xs">
                          {request.mutualFriendsCount} mutual friend
                          {request.mutualFriendsCount === 1 ? "" : "s"}
                        </Text>
                        <View className="mt-3 flex-row gap-2">
                          <TouchableOpacity
                            className="flex-1 items-center rounded-xl bg-orange-500 py-2.5"
                            disabled={isLoading || !senderId}
                            onPress={() => {
                              if (senderId) {
                                handleAcceptFriendRequest(senderId);
                              }
                            }}
                          >
                            {isLoading ? (
                              <ActivityIndicator color="white" size="small" />
                            ) : (
                              <Text className="font-semibold text-sm text-white">
                                Accept
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}

                  {(liveInvites ?? []).map((invite) => {
                    const isLoading = pendingInviteRoomId === invite.roomId;

                    return (
                      <View
                        className="mb-3 rounded-2xl bg-neutral-900 p-4"
                        key={invite.roomId}
                      >
                        <Text className="font-semibold text-white">
                          {invite.hostName} invited you to a live race
                        </Text>
                        <Text className="mt-1 text-gray-400 text-xs">
                          Code {invite.roomCode} ·{" "}
                          {(invite.targetDistanceMeters / 1000).toFixed(1)} km
                        </Text>
                        <View className="mt-3 flex-row gap-2">
                          <TouchableOpacity
                            className="flex-1 items-center rounded-xl bg-orange-500 py-2.5"
                            disabled={isLoading}
                            onPress={() => handleAcceptInvite(invite.roomId)}
                          >
                            {isLoading ? (
                              <ActivityIndicator color="white" size="small" />
                            ) : (
                              <Text className="font-semibold text-sm text-white">
                                Join Race
                              </Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            className="items-center rounded-xl border border-neutral-700 px-4 py-2.5"
                            disabled={isLoading}
                            onPress={() => handleDismissInvite(invite.roomId)}
                          >
                            <Text className="font-semibold text-gray-300 text-sm">
                              Dismiss
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}

                  {(getGhostChallengesQuery ?? []).map((c) => {
                    return (
                      <View className="mb-3 rounded-2xl bg-neutral-900 p-4" key={`ghost-${c._id}`}>
                        <Text className="font-semibold text-white">{c.hostName} sent you a ghost challenge</Text>
                        <Text className="mt-1 text-gray-400 text-xs">{Math.round(c.distance) >= 1000 ? `${(c.distance/1000).toFixed(1)} km` : `${c.distance} m`}</Text>
                        <View className="mt-3 flex-row gap-2">
                          <TouchableOpacity
                            className="flex-1 items-center rounded-xl bg-orange-500 py-2.5"
                            onPress={async () => {
                              if (!userId) return;
                              const res: any = await acceptGhostChallengeMutation({ challengeId: c._id, userId: userId as Id<'users'> });
                              if (res?.success && res.runId) {
                                const runId = await startRunMutation({ userId: userId as Id<'users'>, mode: 'ranked' });
                                runStore.startRun(runId, 'ranked', userId);
                                runStore.setTargetDistance(c.distance);
                                runStore.setGhostRun({ userId: c.hostUserId, name: c.hostName, avgPace: c.hostRunAvgPace, totalDistance: c.hostRunDistance });
                                setNotificationsOpen(false);
                                router.replace('/run/active');
                              }
                            }}
                          >
                            <Text className="font-semibold text-sm text-white">Start Race</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            className="items-center rounded-xl border border-neutral-700 px-4 py-2.5"
                            onPress={async () => { await dismissGhostChallengeMutation({ challengeId: c._id, userId: userId as Id<'users'> }); }}
                          >
                            <Text className="font-semibold text-gray-300 text-sm">Dismiss</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
