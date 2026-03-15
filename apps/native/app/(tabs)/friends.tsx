import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import { Bell, Play, UserPlus } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { RunConfigModal } from "@/components/RunConfigModal";
import { RunningSpinner } from "@/components/running-spinner";
import { useAuthStore } from "@/stores/auth-store";
import { useLiveStore } from "@/stores/live-store";
import { useRunStore } from "@/stores/run-store";

function formatPace(secPerKm: number): string {
  if (secPerKm <= 0) {
    return "--:-- /km";
  }
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

type FriendItem = {
  friendId: Id<"users">;
  name: string;
  currentStreak: number;
  totalRuns: number;
  bestPace: number;
  totalDistance: number;
};

type IncomingRequest = {
  userId: Id<"users">;
  displayName: string;
  mutualFriendsCount: number;
  senderId: Id<"users"> | null;
  requested: boolean;
};

export default function FriendsTabScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [actioningId, setActioningId] = useState<Id<"users"> | null>(null);
  const [challengeUserId, setChallengeUserId] = useState<string | null>(null);
  const [challengeUserName, setChallengeUserName] = useState<string | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [showChallengeOptions, setShowChallengeOptions] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showDistancePicker, setShowDistancePicker] = useState(false);
  const [distanceKm, setDistanceKm] = useState("5.0");
  const [distanceMode, setDistanceMode] = useState<"live" | "ghost">("live");
  const startRunMutation = useMutation(api.runs.startRun);
  const runStore = useRunStore();
  const createRoomMutation = useMutation(api.live.createLiveRoom);
  const requestLiveInviteMutation = useMutation(
    // _generated types might not include live.requestLiveInvite yet
    // biome-ignore lint/suspicious/noExplicitAny: using any for generated api forward-compat
    (api as any).live.requestLiveInvite
  );
  const requestGhostChallengeMutation = useMutation(
    // biome-ignore lint/suspicious/noExplicitAny: forward-compat
    (api as any).live.requestGhostChallenge
  );

  const liveStore = useLiveStore();
  const insets = useSafeAreaInsets();

  const friends = useQuery(
    api.friends.getFriends,
    userId ? { userId: userId as Id<"users"> } : "skip"
  ) as FriendItem[] | undefined;

  const incomingRequests = useQuery(
    api.users.getIncomingRequests,
    userId ? { currentUserId: userId as Id<"users"> } : "skip"
  ) as IncomingRequest[] | undefined;

  const acceptFriendRequest = useMutation(api.friends.acceptFriendRequest);

  const filteredFriends = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      return friends ?? [];
    }
    return (friends ?? []).filter((friend) =>
      friend.name.toLowerCase().includes(q)
    );
  }, [friends, searchTerm]);

  if (!userId) {
    return <Redirect href="/(auth)/signin" />;
  }

  const handleAccept = async (senderId: Id<"users">) => {
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
  };

  const pendingCount = (incomingRequests ?? []).length;

  return (
    <SafeAreaView className="flex-1 bg-black">
      <FlatList
        contentContainerStyle={{ paddingBottom: 40 }}
        data={filteredFriends}
        keyExtractor={(item) => item.friendId}
        ListEmptyComponent={
          <View className="mt-12 items-center px-8">
            <Text className="text-center text-gray-500">
              {searchTerm.trim()
                ? "No friends match your search."
                : "No friends yet. Tap + to add someone."}
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View className="px-4 pt-4 pb-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View>
                <Text className="font-black text-2xl text-white">Friends</Text>
                <Text className="text-gray-400 text-sm">
                  {pendingCount > 0
                    ? `${pendingCount} friend request${pendingCount === 1 ? "" : "s"} pending`
                    : "All your current friends"}
                </Text>
              </View>
              <TouchableOpacity
                className="h-10 w-10 items-center justify-center rounded-full bg-orange-500"
                onPress={() => router.push("/friends/add")}
              >
                <UserPlus color="white" size={18} />
              </TouchableOpacity>
            </View>

            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              className="rounded-xl bg-neutral-900 px-4 py-3 text-white"
              onChangeText={setSearchTerm}
              placeholder="Search friends..."
              placeholderTextColor="#6b7280"
              value={searchTerm}
            />

            {(incomingRequests ?? []).length > 0 && (
              <View className="mt-4 rounded-2xl border border-orange-500/30 bg-neutral-900 p-4">
                <View className="mb-2 flex-row items-center gap-2">
                  <Bell color="#f97316" size={16} />
                  <Text className="font-semibold text-orange-400">
                    Friend Requests
                  </Text>
                </View>

                {(incomingRequests ?? []).map((request) => {
                  const senderId = request.senderId;
                  const isLoading = actioningId === senderId;

                  return (
                    <View
                      className="mb-2 flex-row items-center justify-between rounded-xl bg-neutral-800 px-3 py-2"
                      key={request.userId}
                    >
                      <View className="mr-3 flex-1">
                        <Text className="font-semibold text-white">
                          {request.displayName}
                        </Text>
                        <Text className="text-gray-400 text-xs">
                          {request.mutualFriendsCount} mutual friend
                          {request.mutualFriendsCount === 1 ? "" : "s"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        className="rounded-lg bg-orange-500 px-3 py-2"
                        disabled={isLoading || !senderId}
                        onPress={() => senderId && handleAccept(senderId)}
                      >
                        {isLoading ? (
                          <RunningSpinner color="white" size="small" />
                        ) : (
                          <Text className="font-semibold text-white text-xs">
                            Accept
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View className="mx-4 mb-3 rounded-2xl bg-neutral-900 p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="font-semibold text-lg text-white">
                  {item.name}
                </Text>
                <Text className="text-gray-400 text-sm">
                  {item.totalRuns} run{item.totalRuns === 1 ? "" : "s"} ·{" "}
                  {formatPace(item.bestPace)}
                </Text>
                {item.currentStreak > 0 && (
                  <Text className="text-orange-400 text-xs">
                    {item.currentStreak} day streak
                  </Text>
                )}
              </View>
              <TouchableOpacity
                className="rounded-full bg-orange-500 p-2.5"
                onPress={() => {
                  setChallengeUserId(item.friendId);
                  setChallengeUserName(item.name);
                  // Open distance picker directly so user can pick distance and then choose Live or Ghost
                  setShowDistancePicker(true);
                  setDistanceMode("live");
                }}
              >
                <Play color="white" fill="white" size={16} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />

      <RunConfigModal
        initialLiveInviteName={challengeUserName}
        initialLiveInviteUserId={challengeUserId}
        onClose={() => {
          setModalOpen(false);
          setChallengeUserId(null);
          setChallengeUserName(null);
        }}
        visible={modalOpen}
      />

      <Modal animationType="slide" transparent visible={showChallengeOptions}>
        <SafeAreaView
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
        >
          <View
            className="rounded-t-3xl bg-neutral-900 p-6"
            style={{ marginTop: insets.top + 40, maxHeight: "80%" }}
          >
            <Text className="mb-2 font-black text-2xl text-white">
              Race {challengeUserName}
            </Text>
            <Text className="mb-4 text-gray-400">Choose an option</Text>

            <TouchableOpacity
              className="mb-3 items-center rounded-2xl bg-neutral-800 py-3"
              onPress={() => {
                setDistanceMode("live");
                setShowDistancePicker(true);
              }}
            >
              <Text className="font-bold text-white">Race Live</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="mb-3 items-center rounded-2xl bg-neutral-800 py-3"
              disabled={starting || !userId}
              onPress={() => {
                setDistanceMode("ghost");
                setShowDistancePicker(true);
              }}
            >
              <Text className="font-semibold text-white">Race Ghost</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="items-center rounded-2xl border border-neutral-600 py-3"
              onPress={() => setShowChallengeOptions(false)}
            >
              <Text className="font-semibold text-gray-400">Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Distance picker used for both Live and Ghost flows */}
      <Modal animationType="slide" transparent visible={showDistancePicker}>
        <SafeAreaView
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
        >
          <View
            className="rounded-t-3xl bg-neutral-900 p-6"
            style={{ marginTop: insets.top + 40 }}
          >
            <Text className="mb-2 font-black text-2xl text-white">
              Set Distance
            </Text>
            <Text className="mb-4 text-gray-400">
              Choose a distance for this challenge
            </Text>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              {[1000, 3000, 5000, 10_000].map((m) => (
                <TouchableOpacity
                  className={`flex-1 items-center rounded-xl py-2 ${Math.round(Number.parseFloat(distanceKm) * 1000) === m ? "bg-orange-500" : "bg-neutral-800"}`}
                  key={m}
                  onPress={() => setDistanceKm((m / 1000).toFixed(1))}
                >
                  <Text
                    className={`font-semibold ${Math.round(Number.parseFloat(distanceKm) * 1000) === m ? "text-white" : "text-gray-300"}`}
                  >
                    {m >= 1000 ? `${m / 1000} km` : `${m} m`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              className="mb-4 rounded-xl bg-neutral-800 px-4 py-3 text-white"
              keyboardType="decimal-pad"
              onChangeText={setDistanceKm}
              value={distanceKm}
            />

            <View style={{ gap: 12 }}>
              <TouchableOpacity
                className="mb-3 items-center rounded-2xl bg-orange-500 py-3"
                onPress={async () => {
                  // Live flow
                  const km = Number.parseFloat(distanceKm);
                  const meters =
                    Number.isFinite(km) && km > 0
                      ? Math.round(km * 1000)
                      : 5000;
                  setShowDistancePicker(false);
                  setShowChallengeOptions(false);
                  if (!(userId && challengeUserId)) return;
                  setStarting(true);
                  try {
                    const { roomId, code } = await createRoomMutation({
                      userId: userId as Id<"users">,
                    });
                    await requestLiveInviteMutation({
                      roomId,
                      hostUserId: userId as Id<"users">,
                      targetUserId: challengeUserId as Id<"users">,
                      targetDistanceMeters: meters,
                    });
                    liveStore.setRoom(roomId, code, true, meters);
                    router.push("/live/lobby");
                  } finally {
                    setStarting(false);
                  }
                }}
              >
                <Text className="font-bold text-white">Race Live</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="mb-3 items-center rounded-2xl bg-neutral-800 py-3"
                disabled={starting || !userId}
                onPress={async () => {
                  // Ghost flow
                  const km = Number.parseFloat(distanceKm);
                  const meters =
                    Number.isFinite(km) && km > 0
                      ? Math.round(km * 1000)
                      : 5000;
                  setShowDistancePicker(false);
                  setShowChallengeOptions(false);
                  if (!userId) return;
                  setStarting(true);
                  try {
                    const runId = await startRunMutation({
                      userId: userId as Id<"users">,
                      mode: "ranked",
                    });
                    runStore.startRun(runId, "ranked", userId);
                    runStore.setTargetDistance(meters);
                    // notify target of ghost challenge
                    if (challengeUserId) {
                      await requestGhostChallengeMutation({
                        hostUserId: userId as Id<"users">,
                        targetUserId: challengeUserId as Id<"users">,
                        runId,
                        distance: meters,
                      });
                    }
                    router.replace("/run/active");
                  } finally {
                    setStarting(false);
                  }
                }}
              >
                <Text className="font-semibold text-white">Race Ghost</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              className="items-center rounded-2xl border border-neutral-600 py-3"
              onPress={() => setShowDistancePicker(false)}
            >
              <Text className="font-semibold text-gray-400">Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
