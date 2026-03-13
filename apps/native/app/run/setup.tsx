/** biome-ignore-all lint/nursery/noLeakedRender: <explanation> */
import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Redirect, useRouter } from "expo-router";
import { Button } from "heroui-native";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAuthStore } from "@/stores/auth-store";
import type { GhostInfo } from "@/stores/run-store";
import { useRunStore } from "@/stores/run-store";

function formatPace(secPerKm: number): string {
  if (secPerKm <= 0 || !Number.isFinite(secPerKm)) {
    return "--:--";
  }
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.floor(secPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(2)} km`;
}

export default function RunSetup() {
  const router = useRouter();
  const store = useRunStore();
  const { userId } = useAuthStore();
  const [mode, setMode] = useState<"solo" | "ghost">("solo");
  const [selectedGhost, setSelectedGhost] = useState<GhostInfo | null>(null);
  const startRunMutation = useMutation(api.runs.startRun);
  const availableGhosts = useQuery(
    api.runs.getAllAvailableGhosts,
    userId ? { currentUserId: userId as Id<"users"> } : "skip"
  );

  if (!userId) {
    return <Redirect href="/auth/sign-in" />;
  }

  const canStart = mode === "solo" || selectedGhost !== null;

  const handleStart = async () => {
    if (!canStart) {
      return;
    }

    // DYNAMICALLY determine the mode. If they picked a ghost, it must be ranked!
    const runMode = mode === "ghost" && selectedGhost ? "ranked" : "social";

    const runId = await startRunMutation({
      userId: userId as Id<"users">,
      mode: runMode,
    });

    store.startRun(runId, runMode, userId);

    if (runMode === "ranked" && selectedGhost) {
      store.setGhostRun(selectedGhost);
    }
    router.replace("/run/active");
  };

  const soloButtonClass =
    mode === "solo"
      ? "flex-1 rounded-xl border border-primary bg-primary/10 items-center py-3"
      : "flex-1 rounded-xl border border-default-200 bg-default-100 items-center py-3";

  const soloTextClass =
    mode === "solo"
      ? "font-semibold text-base text-primary"
      : "font-semibold text-base text-foreground";

  const ghostButtonClass =
    mode === "ghost"
      ? "flex-1 rounded-xl border border-primary bg-primary/10 items-center py-3"
      : "flex-1 rounded-xl border border-default-200 bg-default-100 items-center py-3";

  const ghostTextClass =
    mode === "ghost"
      ? "font-semibold text-base text-primary"
      : "font-semibold text-base text-foreground";

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <Text className="mb-8 font-bold text-3xl text-foreground">
        Choose Your Run
      </Text>

      <View className="mb-8 flex-row gap-4">
        <TouchableOpacity
          accessibilityRole="button"
          className={soloButtonClass}
          onPress={() => setMode("solo")}
        >
          <Text className={soloTextClass}>Solo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          className={ghostButtonClass}
          onPress={() => setMode("ghost")}
        >
          <Text className={ghostTextClass}>Race a Ghost</Text>
        </TouchableOpacity>
      </View>

      {mode === "ghost" && (
        <ScrollView className="mb-8" showsVerticalScrollIndicator={false}>
          {availableGhosts === undefined ? (
            <Text className="text-default-400">Loading ghosts...</Text>
          ) : availableGhosts.length === 0 ? (
            <Text className="text-default-400">
              No completed runs yet. Finish a solo run first!
            </Text>
          ) : (
            availableGhosts.map((ghost) => {
              const isSelected = selectedGhost?.userId === ghost.userId;
              const rowClass = isSelected
                ? "mb-3 rounded-xl border border-primary bg-primary/10 p-4"
                : "mb-3 rounded-xl border border-default-200 p-4";
              return (
                <TouchableOpacity
                  accessibilityRole="button"
                  className={rowClass}
                  key={ghost.userId}
                  onPress={() =>
                    setSelectedGhost({
                      userId: ghost.userId,
                      name: ghost.name,
                      avgPace: ghost.bestPace,
                      totalDistance: ghost.bestDistance,
                    })
                  }
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Text className="font-semibold text-foreground">
                        {ghost.name}
                      </Text>
                      {ghost.isSelf && (
                        <Text className="rounded-full bg-primary/20 px-2 py-0.5 text-primary text-xs">
                          You
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <Text className="text-lg text-primary">✓</Text>
                    )}
                  </View>

                  <View className="mt-2 flex-row gap-6">
                    <View>
                      <Text className="text-default-400 text-xs">
                        Best Pace
                      </Text>
                      <Text className="font-semibold text-foreground text-sm">
                        {formatPace(ghost.bestPace)} /km
                      </Text>
                    </View>
                    <View>
                      <Text className="text-default-400 text-xs">Distance</Text>
                      <Text className="font-semibold text-foreground text-sm">
                        {formatDistance(ghost.bestDistance)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      <Button
        className="mt-auto w-full"
        isDisabled={!canStart}
        onPress={handleStart}
        size="lg"
        variant="primary"
      >
        Start Run
      </Button>
    </View>
  );
}
