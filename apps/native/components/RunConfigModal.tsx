import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/auth-store";
import { useLiveStore } from "@/stores/live-store";
import { useRunStore } from "@/stores/run-store";
import { GhostAlertModal } from "./ghost-alert-modal";

const PRESET_DISTANCES = [
  { m: 1000, label: "1 km" },
  { m: 3000, label: "3 km" },
  { m: 5000, label: "5 km" },
  { m: 10_000, label: "10 km" },
  { m: 21_097, label: "HM" },
  { m: 42_195, label: "FM" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  initialGhostUserId?: string | null;
  initialLiveInviteUserId?: string | null;
  initialLiveInviteName?: string | null;
};

function formatPace(secPerKm: number): string {
  if (secPerKm <= 0 || !Number.isFinite(secPerKm)) {
    return "--:--";
  }
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.floor(secPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")} /km`;
}

function formatDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: PASS
export function RunConfigModal({
  visible,
  onClose,
  initialGhostUserId,
  initialLiveInviteUserId,
  initialLiveInviteName,
}: Props) {
  const { userId } = useAuthStore();
  const liveStore = useLiveStore();
  const store = useRunStore();
  const router = useRouter();

  const [mode, setMode] = useState<"solo" | "ghost" | "live">("solo");
  const [tab, setTab] = useState<"create" | "join">("create");
  const [selectedGhostId, setSelectedGhostId] = useState<string | null>(null);
  const [selectedDistanceM, setSelectedDistanceM] = useState(5000);
  const [distanceKm, setDistanceKm] = useState("5.0");
  const [codeChars, setCodeChars] = useState(["", "", "", ""]);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  const [showGhostConfirm, setShowGhostConfirm] = useState(false);

  const insets = useSafeAreaInsets();

  const startRunMutation = useMutation(api.runs.startRun);
  const createRoomMutation = useMutation(api.live.createLiveRoom);
  const joinRoomMutation = useMutation(api.live.joinLiveRoom);
  const requestLiveInviteMutation = useMutation(
    // biome-ignore lint/suspicious/noExplicitAny: _generated/api not yet regenerated with live module
    (api as any).live.requestLiveInvite
  );
  const availableGhostsData = useQuery(
    api.runs.getAllAvailableGhosts,
    userId ? { currentUserId: userId as Id<"users"> } : "skip"
  );

  const availableGhosts = availableGhostsData?.ghosts ?? [];
    // Only consider ghosts that match the selected distance exactly
    const filteredGhosts = availableGhosts.filter(
      (g) => g.bestDistance === selectedDistanceM
    );
    const closestGhost = filteredGhosts.find((g) => !g.isSelf) ?? null;

  useEffect(() => {
    if (initialGhostUserId && availableGhosts.length > 0) {
      const match = availableGhosts.find(
        (g) => g.userId === initialGhostUserId
      );
      if (match) {
        setMode("ghost");
        setSelectedGhostId(match.userId);
        return;
      }
    }
      if (closestGhost) {
      setMode("ghost");
      setSelectedGhostId(closestGhost.userId);
    } else {
      setSelectedGhostId(null);
    }
  }, [initialGhostUserId, availableGhosts, closestGhost?.userId, closestGhost]);

  useEffect(() => {
    if (!(visible && initialLiveInviteUserId)) {
      return;
    }
    setMode("live");
    setTab("create");
  }, [visible, initialLiveInviteUserId]);

  const selectedGhost =
    availableGhosts.find((g) => g.userId === selectedGhostId) ?? null;

  const handleCreate = async () => {
    if (!userId || loading) {
      return;
    }

    const km = Number.parseFloat(distanceKm);
    const targetDistanceMeters =
      Number.isFinite(km) && km > 0 ? Math.round(km * 1000) : 5000;

    setLoading(true);
    setCreateError(null);
    try {
      const { roomId, code } = await createRoomMutation({
        userId: userId as Id<"users">,
      });

      const requestedOnCreate: string[] = [];

      if (initialLiveInviteUserId && initialLiveInviteUserId !== userId) {
        const inviteResult = await requestLiveInviteMutation({
          roomId,
          hostUserId: userId as Id<"users">,
          targetUserId: initialLiveInviteUserId as Id<"users">,
          targetDistanceMeters,
        });

        if (inviteResult.success) {
          requestedOnCreate.push(initialLiveInviteUserId);
        } else {
          setCreateError(inviteResult.reason);
        }
      }

      liveStore.setRoom(roomId, code, true, targetDistanceMeters);
      if (requestedOnCreate.length > 0) {
        liveStore.setRequestedFriendIds(requestedOnCreate);
      }
      onClose();
      router.push("/live/lobby");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!userId || loading) {
      return;
    }

    const code = codeChars.join("").toUpperCase();
    if (code.length < 4) {
      setJoinError("Enter full 4-character code");
      return;
    }

    setLoading(true);
    try {
      const result = await joinRoomMutation({
        userId: userId as Id<"users">,
        code,
      });

      if (result.success) {
        liveStore.setRoom(result.roomId, code, false);
        setJoinError(null);
        onClose();
        router.push("/live/lobby");
      } else {
        setJoinError(result.reason);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCharInput = (text: string, idx: number) => {
    const char = text.toUpperCase().slice(-1);
    const next = [...codeChars];
    next[idx] = char;
    setCodeChars(next);
    setJoinError(null);

    if (char && idx < 3) {
      inputRefs[idx + 1].current?.focus();
    }
  };

  const handleStart = async () => {
    if (!userId || loading) {
      return;
    }

    if (mode === "live") {
      return;
    }

    const runMode = mode === "ghost" && selectedGhost ? "ranked" : "social";
    setLoading(true);
    try {
      const runId = await startRunMutation({
        userId: userId as Id<"users">,
        mode: runMode,
      });

      store.startRun(runId, runMode, userId);
      if (selectedGhost) {
        store.setGhostRun({
          userId: selectedGhost.userId,
          name: selectedGhost.name,
          avgPace: selectedGhost.bestPace,
          totalDistance: selectedGhost.bestDistance,
        });
      }
      store.setTargetDistance(selectedDistanceM);
      setShowGhostConfirm(false);
      onClose();
      router.replace("/run/active");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-6 pb-4"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Text className="font-black text-2xl text-white">Start a Run</Text>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-base text-gray-400">Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Mode toggle */}
          <View className="mx-6 mb-6 flex-row gap-2 rounded-2xl bg-neutral-900 p-1">
            <TouchableOpacity
              className={`flex-1 items-center rounded-xl py-2 ${
                mode === "solo" ? "bg-orange-500" : "bg-transparent"
              }`}
              onPress={() => setMode("solo")}
            >
              <Text
                className={`font-semibold text-sm ${
                  mode === "solo" ? "text-white" : "text-gray-400"
                }`}
              >
                Solo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 items-center rounded-xl py-2 ${
                mode === "ghost" ? "bg-orange-500" : "bg-transparent"
              }`}
              onPress={() => setMode("ghost")}
            >
              <Text
                className={`font-semibold text-sm ${
                  mode === "ghost" ? "text-white" : "text-gray-400"
                }`}
              >
                Race a Ghost
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 items-center rounded-xl py-2 ${
                mode === "live" ? "bg-orange-500" : "bg-transparent"
              }`}
              onPress={() => setMode("live")}
            >
              <Text
                className={`font-semibold text-sm ${
                  mode === "live" ? "text-white" : "text-gray-400"
                }`}
              >
                Live Room
              </Text>
            </TouchableOpacity>
          </View>

          {/* Distance presets — ghost mode only */}
          {mode === "ghost" && (
            <View className="mx-6 mb-6">
              <Text className="mb-4 font-semibold text-gray-400 text-sm uppercase tracking-widest">
                Race Distance
              </Text>
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: 28,
                  fontWeight: "900",
                  textAlign: "center",
                  marginBottom: 16,
                }}
              >
                {formatDist(selectedDistanceM)}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {PRESET_DISTANCES.map((preset) => {
                  const isSelected = selectedDistanceM === preset.m;
                  return (
                    <TouchableOpacity
                      key={preset.m}
                      onPress={() => setSelectedDistanceM(preset.m)}
                      style={{
                        width: "31%",
                        alignItems: "center",
                        paddingVertical: 12,
                        borderRadius: 12,
                        backgroundColor: isSelected ? "#f97316" : "#262626",
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected ? "#ffffff" : "#9ca3af",
                          fontWeight: "600",
                          fontSize: 14,
                        }}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Ghost list */}
          {mode === "ghost" && (
            <View className="mx-6 mb-6">
              <Text className="mb-3 text-gray-500 text-sm">
                You will be racing against a ghost of similar elo.
              </Text>

              {availableGhostsData === undefined ? (
                <ActivityIndicator color="#FF4500" />
              ) : closestGhost === null ? (
                <Text className="text-gray-500 text-sm">
                    {filteredGhosts.length === 0
                    ? "No ghosts available yet. Complete a run first!"
                    : "No ghosts available within 100 ELO of your skill level."}
                </Text>
              ) : (
                // Display the single closest ghost (auto-selected). No manual selection.
                <View>
                  <View className="mb-2 flex-row items-center rounded-2xl px-4 py-3 bg-neutral-900">
                    <View className="flex-1">
                      <Text className="font-semibold text-white">
                        {closestGhost?.name}
                        {closestGhost?.isSelf ? " (You)" : ""}
                      </Text>
                      <Text className="text-gray-400 text-xs">
                        {formatPace(closestGhost?.bestPace ?? 0)} · {formatDist(closestGhost?.bestDistance ?? 0)}
                      </Text>
                    </View>
                    <Text className="font-bold text-orange-500">✓</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {mode === "live" && (
            <View className="mx-6 mb-6">
              <View className="mb-4 flex-row rounded-2xl bg-neutral-900 p-1">
                <TouchableOpacity
                  accessibilityRole="button"
                  className={`flex-1 items-center rounded-xl py-2 ${
                    tab === "create" ? "bg-orange-500" : "bg-transparent"
                  }`}
                  onPress={() => setTab("create")}
                >
                  <Text
                    className={`font-semibold ${
                      tab === "create" ? "text-white" : "text-gray-400"
                    }`}
                  >
                    Create Room
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  className={`flex-1 items-center rounded-xl py-2 ${
                    tab === "join" ? "bg-orange-500" : "bg-transparent"
                  }`}
                  onPress={() => setTab("join")}
                >
                  <Text
                    className={`font-semibold ${
                      tab === "join" ? "text-white" : "text-gray-400"
                    }`}
                  >
                    Join Room
                  </Text>
                </TouchableOpacity>
              </View>

              {tab === "create" ? (
                <View className="rounded-2xl bg-neutral-900 p-5">
                  <Text className="mb-1 font-semibold text-lg text-white">
                    Create a Room
                  </Text>
                  <Text className="mb-4 text-gray-400 text-sm">
                    Choose race distance, then share your room code with
                    friends.
                  </Text>
                  {!!initialLiveInviteUserId && (
                    <View className="mb-4 rounded-xl border border-orange-500/50 bg-orange-500/10 px-3 py-2">
                      <Text className="font-semibold text-orange-400 text-sm">
                        Challenging {initialLiveInviteName ?? "this runner"}
                      </Text>
                      <Text className="text-gray-300 text-xs">
                        They will be invited automatically once you create the
                        room.
                      </Text>
                    </View>
                  )}
                  <Text className="mb-2 font-semibold text-gray-400 text-xs uppercase tracking-widest">
                    Distance (km)
                  </Text>
                  <TextInput
                    className="mb-4 rounded-xl bg-neutral-800 px-4 py-3 text-base text-white"
                    keyboardType="decimal-pad"
                    onChangeText={setDistanceKm}
                    placeholder="5.0"
                    placeholderTextColor="#6b7280"
                    value={distanceKm}
                  />
                  {!!createError && (
                    <Text className="mb-3 text-red-400 text-sm">
                      {createError}
                    </Text>
                  )}
                  <TouchableOpacity
                    accessibilityRole="button"
                    className="items-center rounded-xl bg-orange-500 py-4"
                    disabled={loading}
                    onPress={handleCreate}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="font-bold text-base text-white">
                        Create Room
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="rounded-2xl bg-neutral-900 p-5">
                  <Text className="mb-1 font-semibold text-lg text-white">
                    Join a Room
                  </Text>
                  <Text className="mb-4 text-gray-400 text-sm">
                    Enter the 4-letter code to join.
                  </Text>
                  <View className="mb-4 flex-row justify-center gap-3">
                    {codeChars.map((char, idx) => (
                      <TextInput
                        autoCapitalize="characters"
                        className="h-14 w-14 rounded-xl bg-neutral-800 text-center font-bold text-2xl text-white"
                        // biome-ignore lint/suspicious/noArrayIndexKey: fixed 4-slot array
                        key={idx}
                        maxLength={1}
                        onChangeText={(t) => handleCharInput(t, idx)}
                        ref={inputRefs[idx]}
                        value={char}
                      />
                    ))}
                  </View>
                  {!!joinError && (
                    <Text className="mb-3 text-center text-red-400 text-sm">
                      {joinError}
                    </Text>
                  )}
                  <TouchableOpacity
                    accessibilityRole="button"
                    className="items-center rounded-xl border border-orange-500 py-4"
                    disabled={loading}
                    onPress={handleJoin}
                  >
                    {loading ? (
                      <ActivityIndicator color="#f97316" />
                    ) : (
                      <Text className="font-bold text-base text-orange-500">
                        Join Room
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Start button */}
        <View
          className="px-6 pb-8"
          style={{ display: mode === "live" ? "none" : "flex" }}
        >
          <TouchableOpacity
            className={`items-center rounded-2xl py-4 ${
              loading ? "bg-orange-500/50" : "bg-orange-500"
            }`}
            disabled={loading}
            onPress={handleStart}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="font-bold text-lg text-white">Start Run ▶</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <GhostAlertModal
        displayName={selectedGhost?.name ?? ""}
        distance={formatDist(selectedDistanceM)}
        elo={selectedGhost?.elo ?? 0}
        loading={loading}
        onCancel={() => setShowGhostConfirm(false)}
        onConfirm={async () => {
          await handleStart();
        }}
        // biome-ignore lint/nursery/noLeakedRender: !!selectedGhost is always boolean
        visible={showGhostConfirm && !!selectedGhost}
      />
    </Modal>
  );
}
