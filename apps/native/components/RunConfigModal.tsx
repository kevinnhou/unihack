import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuthStore } from "@/stores/auth-store";
import { useRunStore } from "@/stores/run-store";

type Props = {
  visible: boolean;
  onClose: () => void;
  initialGhostUserId?: string | null;
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

export function RunConfigModal({
  visible,
  onClose,
  initialGhostUserId,
}: Props) {
  const { userId } = useAuthStore();
  const store = useRunStore();
  const router = useRouter();

  const [mode, setMode] = useState<"solo" | "ghost">("solo");
  const [selectedGhostId, setSelectedGhostId] = useState<string | null>(null);
  const [distanceKm, setDistanceKm] = useState("5.0");
  const [loading, setLoading] = useState(false);

  const startRunMutation = useMutation(api.runs.startRun);
  const availableGhosts = useQuery(
    api.runs.getAllAvailableGhosts,
    userId ? { currentUserId: userId as Id<"users"> } : "skip"
  );

  useEffect(() => {
    if (!(initialGhostUserId && availableGhosts)) {
      return;
    }
    const match = availableGhosts.find((g) => g.userId === initialGhostUserId);
    if (match) {
      setMode("ghost");
      setSelectedGhostId(match.userId);
    }
  }, [initialGhostUserId, availableGhosts]);

  const selectedGhost =
    availableGhosts?.find((g) => g.userId === selectedGhostId) ?? null;

  const handleStart = async () => {
    if (!userId || loading) {
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
      const km = Number.parseFloat(distanceKm);
      store.setTargetDistance(Number.isFinite(km) && km > 0 ? km * 1000 : 0);
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
      presentationStyle="pageSheet"
      visible={visible}
    >
      <View className="flex-1 bg-black">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
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
          </View>

          {/* Target distance */}
          <View className="mx-6 mb-6">
            <Text className="mb-2 font-semibold text-gray-400 text-sm uppercase tracking-widest">
              Target Distance (km)
            </Text>
            <TextInput
              className="rounded-xl bg-neutral-900 px-4 py-3 text-base text-white"
              keyboardType="decimal-pad"
              onChangeText={setDistanceKm}
              placeholder="5.0"
              placeholderTextColor="#6b7280"
              value={distanceKm}
            />
          </View>

          {/* Ghost list */}
          {mode === "ghost" && (
            <View className="mx-6 mb-6">
              <Text className="mb-3 font-semibold text-gray-400 text-sm uppercase tracking-widest">
                Select Ghost
              </Text>
              {availableGhosts === undefined ? (
                <ActivityIndicator color="#FF4500" />
              ) : availableGhosts.length === 0 ? (
                <Text className="text-gray-500 text-sm">
                  No ghosts available yet. Complete a run first!
                </Text>
              ) : (
                availableGhosts.map((ghost) => {
                  const isSelected = ghost.userId === selectedGhostId;
                  return (
                    <TouchableOpacity
                      className={`mb-2 flex-row items-center rounded-2xl px-4 py-3 ${
                        isSelected
                          ? "border border-orange-500 bg-orange-500/10"
                          : "bg-neutral-900"
                      }`}
                      key={ghost.userId}
                      onPress={() =>
                        setSelectedGhostId(isSelected ? null : ghost.userId)
                      }
                    >
                      <View className="flex-1">
                        <Text className="font-semibold text-white">
                          {ghost.name}
                          {ghost.isSelf ? " (You)" : ""}
                        </Text>
                        <Text className="text-gray-400 text-xs">
                          {formatPace(ghost.bestPace)} ·{" "}
                          {formatDist(ghost.bestDistance)}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Text className="font-bold text-orange-500">✓</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>

        {/* Start button */}
        <View className="px-6 pb-8">
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
      </View>
    </Modal>
  );
}
