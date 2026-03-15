import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/auth-store";
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

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl bg-neutral-900 px-5 py-4">
      <Text className="font-medium text-gray-400">{label}</Text>
      <Text className="font-bold text-lg text-white">{value}</Text>
    </View>
  );
}

export default function FinishScreen() {
  const router = useRouter();
  const store = useRunStore();
  const { userId } = useAuthStore();
  const { distance, duration, runId, mode } = useLocalSearchParams<{
    distance: string;
    duration: string;
    avgPace: string;
    runId: string;
    mode: string;
  }>();

  const distanceM = Number(distance ?? "0");
  const durationSec = Number(duration ?? "0");
  const runIdStr = runId ?? "";
  const isRanked = mode === "ranked";
  const isSocial = mode === "social";

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const uploadTelemetryMutation = useMutation(api.runs.uploadRunTelemetry);
  const deleteRunMutation = useMutation(api.runs.deleteRun);

  useEffect(() => {
    Animated.spring(fadeAnim, {
      toValue: 1,
      useNativeDriver: true,
      delay: 300,
    }).start();
  }, [fadeAnim]);

  const telemetryBuffer = store.telemetryBuffer;
  const canUpload = telemetryBuffer.length > 0 && !!runIdStr;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (canUpload) {
        await uploadTelemetryMutation({
          runId: runIdStr as Id<"runs">,
          telemetry: telemetryBuffer,
        });
      }
    } finally {
      store.reset();
      router.replace("/(tabs)");
    }
  };

  const handleDontLog = async () => {
    setDeleting(true);
    try {
      if (runIdStr && userId) {
        await deleteRunMutation({
          runId: runIdStr as Id<"runs">,
          userId: userId as Id<"users">,
        });
      }
    } finally {
      store.reset();
      router.replace("/(tabs)");
    }
  };

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-black px-6">
      <Animated.View style={{ opacity: fadeAnim, alignItems: "center" }}>
        <CheckCircle color="#ff6900" size={80} />
        <Text className="mt-4 font-black text-4xl text-white">
          Run Complete
        </Text>
      </Animated.View>

      <View className="mt-8 w-full gap-4">
        <StatRow label="Distance" value={distLabel(distanceM)} />
        <StatRow label="Time" value={formatTime(durationSec)} />
        <StatRow label="Avg Pace" value={paceLabel(distanceM, durationSec)} />
      </View>

      <View
        style={{ marginTop: 40, width: "100%", gap: 12, paddingBottom: 24 }}
      >
        <TouchableOpacity
          className="items-center rounded-2xl bg-orange-500 py-4"
          disabled={saving}
          onPress={handleSave}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="font-bold text-base text-white">Save Run ▶</Text>
          )}
        </TouchableOpacity>

        {isSocial && (
          <TouchableOpacity
            className="items-center rounded-2xl py-4"
            disabled={deleting}
            onPress={handleDontLog}
          >
            {deleting ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <Text className="font-semibold text-base text-red-400">
                Don't Log
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
