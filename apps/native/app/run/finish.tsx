// import { api } from "@unihack/backend/convex/_generated/api";
// import type { Id } from "@unihack/backend/convex/_generated/dataModel";
// import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle, XCircle } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRunStore } from "@/stores/run-store";

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function paceLabel(distance: number, durationSeconds: number): string {
  if (distance === 0) {
    return "—";
  }
  const secPerKm = durationSeconds / (distance / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

function distLabel(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

function ResultIcon({ isRanked, won }: { isRanked: boolean; won: boolean }) {
  if (!isRanked) {
    return <CheckCircle color="#FF4500" size={80} />;
  }
  return won ? (
    <CheckCircle color="#22c55e" size={80} />
  ) : (
    <XCircle color="#ef4444" size={80} />
  );
}

function resultTitle(isRanked: boolean, won: boolean): string {
  if (!isRanked) {
    return "Run Complete";
  }
  return won ? "Victory!" : "Defeat";
}

// Mock run data
const mockRun = {
  _id: "run1",
  type: "ranked" as const,
  distance: 5000,
  durationSeconds: 1500,
  eloDelta: 20,
  win: true,
};

export default function FinishScreen() {
  const router = useRouter();
  const { runId } = useLocalSearchParams<{ runId: string }>();
  const eloAnim = useRef(new Animated.Value(0)).current;
  const { reset } = useRunStore();

  // const run = useQuery(
  //   api.runs.getRun,
  //   runId ? { runId: runId as Id<"runs"> } : "skip"
  // );

  const run = mockRun;

  const isRanked = run?.type === "ranked";
  const won = run?.win === true;
  const eloDelta = run?.eloDelta;

  useEffect(() => {
    if (!isRanked || eloDelta === undefined) {
      return;
    }
    Animated.spring(eloAnim, {
      toValue: 1,
      useNativeDriver: true,
      delay: 600,
    }).start();
  }, [isRanked, eloDelta, eloAnim]);

  const handleDone = () => {
    reset();
    router.replace("/");
  };

  const handleReview = () => {
    router.push({ pathname: "/run/review/[id]", params: { id: runId ?? "" } });
  };

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-black px-6">
      <ResultIcon isRanked={Boolean(isRanked)} won={won} />

      <Text className="mt-4 font-black text-4xl text-white">
        {resultTitle(Boolean(isRanked), won)}
      </Text>

      <View className="mt-8 w-full gap-4">
        <StatRow label="Distance" value={run ? distLabel(run.distance) : "—"} />
        <StatRow
          label="Time"
          value={run ? formatTime(run.durationSeconds) : "—"}
        />
        {run ? (
          <StatRow
            label="Avg Pace"
            value={paceLabel(run.distance, run.durationSeconds)}
          />
        ) : null}
      </View>

      {eloDelta !== undefined && isRanked ? (
        <Animated.View
          className="mt-8"
          style={{
            opacity: eloAnim,
            transform: [
              {
                scale: eloAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
            ],
          }}
        >
          <View
            className="items-center rounded-2xl px-8 py-4"
            style={{ backgroundColor: eloDelta > 0 ? "#14532d" : "#7f1d1d" }}
          >
            <Text className="text-gray-300 text-sm">Elo Change</Text>
            <Text
              className="mt-1 font-black text-4xl"
              style={{ color: eloDelta > 0 ? "#4ade80" : "#f87171" }}
            >
              {eloDelta > 0 ? "+" : ""}
              {eloDelta}
            </Text>
          </View>
        </Animated.View>
      ) : null}

      <View className="mt-10 w-full gap-3">
        {runId ? (
          <TouchableOpacity
            className="items-center rounded-2xl bg-neutral-800 py-4"
            onPress={handleReview}
          >
            <Text className="font-semibold text-base text-white">
              Review Race
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          className="items-center rounded-2xl bg-orange-500 py-4"
          onPress={handleDone}
        >
          <Text className="font-bold text-base text-white">Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl bg-neutral-900 px-5 py-4">
      <Text className="font-medium text-gray-400">{label}</Text>
      <Text className="font-bold text-lg text-white">{value}</Text>
    </View>
  );
}
