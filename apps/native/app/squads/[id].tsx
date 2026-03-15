/** biome-ignore-all lint/nursery/noLeakedRender: <explanation> */
/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: <explanation> */
/** biome-ignore-all assist/source/useSortedAttributes: <explanation> */
import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Copy, Play } from "lucide-react-native";
import { useState } from "react";
import {
  Clipboard,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RunConfigModal } from "@/components/RunConfigModal";
import { useRunStore } from "@/stores/run-store";
import { useLiveStore } from "@/stores/live-store";
import { RunningSpinner } from "@/components/running-spinner";
import { useAuthStore } from "@/stores/auth-store";

type SortBy = "streak" | "distance" | "pace";

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: "distance", label: "Distance" },
  { key: "streak", label: "Streak" },
  { key: "pace", label: "Pace" },
];

function formatPace(secPerKm: number): string {
  if (secPerKm <= 0 || !Number.isFinite(secPerKm)) {
    return "--:--";
  }
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.floor(secPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function SquadDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const squadId = Array.isArray(id) ? id[0] : id;

  const { userId } = useAuthStore();
  const [sortBy, setSortBy] = useState<SortBy>("distance");
  const [modalOpen, setModalOpen] = useState(false);
  const [showSquadDistancePicker, setShowSquadDistancePicker] = useState(false);
  const [squadDistanceKm, setSquadDistanceKm] = useState("5.0");
  const [squadStarting, setSquadStarting] = useState(false);
  const runStore = useRunStore();
  const liveStore = useLiveStore();
  const [challengeUserId, setChallengeUserId] = useState<string | null>(null);
  const [challengeUserName, setChallengeUserName] = useState<string | null>(
    null
  );

  const squad = useQuery(
    api.squads.getSquad,
    squadId ? { squadId: squadId as Id<"squads"> } : "skip"
  );

  const userSquads = useQuery(
    api.squads.getUserSquads,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  const joinByCode = useMutation(api.squads.joinSquad);
  const startRunMutation = useMutation(api.runs.startRun);
  const createRoomMutation = useMutation(api.live.createLiveRoom);
  const requestLiveInviteMutation = useMutation(
    // biome-ignore lint/suspicious/noExplicitAny: generated api may not include live yet
    (api as any).live.requestLiveInvite
  );
  const requestGhostChallengeMutation = useMutation(
    // biome-ignore lint/suspicious/noExplicitAny
    (api as any).live.requestGhostChallenge
  );

  const leaderboard = useQuery(
    api.squads.getSquadLeaderboard,
    squadId ? { squadId: squadId as Id<"squads">, sortBy } : "skip"
  );

  const copyCode = () => {
    if (squad?.joinCode) {
      Clipboard.setString(squad.joinCode);
    }
  };

  const isMember = !!userSquads?.find((s) => s.squadId === squadId);

  const handleJoinByCode = async () => {
    if (!(squad?.joinCode && userId)) return;
    await joinByCode({
      userId: userId as Id<"users">,
      joinCode: squad.joinCode,
    });
  };

  if (squad === undefined || leaderboard === undefined) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <RunningSpinner color="#ff6900" size="large" />
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
              {squad?.name ?? "Squad Details"}
            </Text>
            {squad?.description ? (
              <Text className="mt-1 text-gray-400 text-sm">
                {squad.description}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Invite code */}
        {squad?.joinCode && (
          <TouchableOpacity
            className="mx-4 mb-6 flex-row items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3"
            onPress={copyCode}
          >
            <Text className="flex-1 text-gray-400 text-sm">
              Invite code:{" "}
              <Text className="font-bold text-orange-400 tracking-widest">
                {squad.joinCode}
              </Text>
            </Text>
            <Copy color="#6b7280" size={16} />
          </TouchableOpacity>
        )}

        {/* Join button (if not member) */}
        {!isMember && (
          <View className="px-4">
            <TouchableOpacity
              className="mb-4 rounded-2xl bg-orange-500 px-4 py-3"
              onPress={handleJoinByCode}
            >
              <Text className="text-center font-bold text-white">
                Join Squad
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Challenge squad button (members only) */}
        {isMember && (
          <View className="px-4">
            <TouchableOpacity
              className="mb-4 rounded-2xl bg-orange-500 px-4 py-3"
              onPress={() => setShowSquadDistancePicker(true)}
              disabled={!isMember}
            >
              <Text className="text-center font-bold text-white">Challenge Squad</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Sorting Pills */}
        <View className="mb-4 flex-row gap-2 px-4">
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setSortBy(opt.key)}
              className={`flex-1 items-center rounded-xl border py-2 ${
                sortBy === opt.key
                  ? "border-orange-500 bg-orange-500/20"
                  : "border-neutral-800 bg-neutral-900"
              }`}
            >
              <Text
                className={`font-semibold text-sm ${
                  sortBy === opt.key ? "text-orange-500" : "text-gray-400"
                }`}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Leaderboard */}
        <Text className="mb-3 px-4 font-bold text-lg text-white">
          Leaderboard
        </Text>

        {leaderboard.length === 0 ? (
          <Text className="px-4 text-gray-500">No members yet.</Text>
        ) : (
          leaderboard.map((entry, index) => {
            const isMe = entry.userId === userId;

            const mainValue =
              sortBy === "streak"
                ? `${entry.streak} day${entry.streak !== 1 ? "s" : ""} 🔥`
                : sortBy === "distance"
                  ? entry.totalDistance >= 1000
                    ? `${(entry.totalDistance / 1000).toFixed(1)} km`
                    : `${Math.round(entry.totalDistance)} m`
                  : `${formatPace(entry.bestPace)} /km`;

            return (
              <View
                key={entry.userId}
                className={`mx-4 mb-2 flex-row items-center gap-3 rounded-2xl px-4 py-3 ${
                  isMe
                    ? "border border-orange-500/50 bg-orange-500/10"
                    : "bg-neutral-900"
                }`}
              >
                <Text className="w-6 text-center font-bold text-gray-400">
                  {index === 0
                    ? "🥇"
                    : index === 1
                      ? "🥈"
                      : index === 2
                        ? "🥉"
                        : index + 1}
                </Text>

                <View className="h-9 w-9 items-center justify-center rounded-full bg-neutral-700">
                  <Text className="font-bold text-sm text-white">
                    {entry.name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View className="flex-1">
                  <Text className="font-semibold text-sm text-white">
                    {entry.name} {isMe && "(You)"}
                  </Text>
                  {entry.streak > 0 && sortBy !== "streak" && (
                    <Text className="text-orange-400 text-xs">
                      🔥 {entry.streak}d streak
                    </Text>
                  )}
                </View>

                <Text className="mr-2 font-bold text-white">{mainValue}</Text>

                {!isMe && (
                  <TouchableOpacity
                    className="rounded-full bg-orange-500 p-2"
                    onPress={() => {
                      setChallengeUserId(entry.userId);
                      setChallengeUserName(entry.name);
                      setModalOpen(true);
                    }}
                  >
                    <Play color="white" size={14} fill="white" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <RunConfigModal
        initialLiveInviteName={challengeUserName}
        initialLiveInviteUserId={challengeUserId}
        initialGhostUserId={challengeUserId}
        onClose={() => {
          setModalOpen(false);
          setChallengeUserId(null);
          setChallengeUserName(null);
        }}
        visible={modalOpen}
      />

      {/* Squad-wide challenge distance picker */}
      <Modal animationType="slide" visible={showSquadDistancePicker} transparent>
        <SafeAreaView className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View style={{ marginTop: 40 }} className="rounded-t-3xl bg-neutral-900 p-6">
            <Text className="mb-2 font-black text-2xl text-white">Challenge Squad</Text>
            <Text className="mb-4 text-gray-400">Choose a distance and challenge the whole squad</Text>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {[1000, 3000, 5000, 10000].map((m) => (
                <TouchableOpacity
                  key={m}
                  className={`flex-1 items-center rounded-xl py-2 ${Math.round(parseFloat(squadDistanceKm) * 1000) === m ? 'bg-orange-500' : 'bg-neutral-800'}`}
                  onPress={() => setSquadDistanceKm((m / 1000).toFixed(1))}
                >
                  <Text className={`font-semibold ${Math.round(parseFloat(squadDistanceKm) * 1000) === m ? 'text-white' : 'text-gray-300'}`}>
                    {m >= 1000 ? `${m / 1000} km` : `${m} m`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              keyboardType="decimal-pad"
              className="mb-4 rounded-xl bg-neutral-800 px-4 py-3 text-white"
              value={squadDistanceKm}
              onChangeText={setSquadDistanceKm}
            />

            <View style={{ gap: 12 }}>
              <TouchableOpacity
                className="mb-3 items-center rounded-2xl bg-orange-500 py-3"
                onPress={async () => {
                  // Live flow: create room and invite all members
                  const km = Number.parseFloat(squadDistanceKm);
                  const meters = Number.isFinite(km) && km > 0 ? Math.round(km * 1000) : 5000;
                  setShowSquadDistancePicker(false);
                  setSquadStarting(true);
                  try {
                    if (!userId) return;
                    const { roomId, code } = await createRoomMutation({ userId: userId as Id<'users'> });
                    const memberIds = leaderboard.map((e) => e.userId).filter((u) => u !== userId);
                    await Promise.all(memberIds.map((targetId) => requestLiveInviteMutation({ roomId, hostUserId: userId as Id<'users'>, targetUserId: targetId as Id<'users'>, targetDistanceMeters: meters })));
                    liveStore.setRoom(roomId, code, true, meters);
                    router.push('/live/lobby');
                  } finally {
                    setSquadStarting(false);
                  }
                }}
              >
                <Text className="font-bold text-white">Race Live (Invite All)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="mb-3 items-center rounded-2xl bg-neutral-800 py-3"
                disabled={squadStarting || !userId}
                onPress={async () => {
                  // Ghost flow: start a ranked run and notify all members
                  const km = Number.parseFloat(squadDistanceKm);
                  const meters = Number.isFinite(km) && km > 0 ? Math.round(km * 1000) : 5000;
                  setShowSquadDistancePicker(false);
                  setSquadStarting(true);
                  try {
                    if (!userId) return;
                    const runId = await startRunMutation({ userId: userId as Id<'users'>, mode: 'ranked' });
                    runStore.startRun(runId, 'ranked', userId);
                    runStore.setTargetDistance(meters);
                    const memberIds = leaderboard.map((e) => e.userId).filter((u) => u !== userId);
                    await Promise.all(memberIds.map((targetId) => requestGhostChallengeMutation({ hostUserId: userId as Id<'users'>, targetUserId: targetId as Id<'users'>, runId, distance: meters })));
                    router.replace('/run/active');
                  } finally {
                    setSquadStarting(false);
                  }
                }}
              >
                <Text className="font-semibold text-white">Race Ghost (Challenge All)</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity className="items-center rounded-2xl border border-neutral-600 py-3" onPress={() => setShowSquadDistancePicker(false)}>
              <Text className="font-semibold text-gray-400">Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
