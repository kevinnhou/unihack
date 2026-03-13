import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
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
  const { distance, duration, avgPace, runId } = useLocalSearchParams<{
    distance: string;
    duration: string;
    avgPace: string;
    runId: string;
  }>();

  const distanceM = Number(distance ?? "0");
  const durationSec = Number(duration ?? "0");
  const runIdStr = runId ?? "";

  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const uploadTelemetryMutation = useMutation(api.runs.uploadRunTelemetry);

  useEffect(() => {
    Animated.spring(fadeAnim, {
      toValue: 1,
      useNativeDriver: true,
      delay: 300,
    }).start();
  }, [fadeAnim]);

  const telemetryBuffer = store.telemetryBuffer;
  const canUpload = !uploaded && telemetryBuffer.length > 0 && !!runIdStr;

  const handleUpload = async () => {
    if (!canUpload) {
      return;
    }
    setUploading(true);
    try {
      await uploadTelemetryMutation({
        runId: runIdStr as Id<"runs">,
        telemetry: telemetryBuffer,
      });
      setUploaded(true);
    } finally {
      setUploading(false);
    }
  };

  const handleDone = () => {
    store.reset();
    router.replace("/(tabs)");
  };

  const handleReview = () => {
    router.push({ pathname: "/run/review/[id]", params: { id: runIdStr } });
  };

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-black px-6">
      <Animated.View style={{ opacity: fadeAnim, alignItems: "center" }}>
        <CheckCircle color="#FF4500" size={80} />
        <Text className="mt-4 font-black text-4xl text-white">
          Run Complete
        </Text>
      </Animated.View>

      <View className="mt-8 w-full gap-4">
        <StatRow label="Distance" value={distLabel(distanceM)} />
        <StatRow label="Time" value={formatTime(durationSec)} />
        <StatRow label="Avg Pace" value={paceLabel(distanceM, durationSec)} />
      </View>

      <View className="mt-10 w-full gap-3">
        {canUpload || uploading ? (
          <TouchableOpacity
            className="items-center rounded-2xl bg-neutral-800 py-4"
            disabled={uploading}
            onPress={handleUpload}
          >
            <Text className="font-semibold text-base text-white">
              {uploading
                ? "Uploading…"
                : `Upload GPS Trace (${telemetryBuffer.length} pts)`}
            </Text>
          </TouchableOpacity>
        ) : null}
        {uploaded ? (
          <View className="items-center rounded-2xl bg-neutral-800 py-4">
            <Text className="font-semibold text-base text-green-400">
              GPS Trace Uploaded ✓
            </Text>
          </View>
        ) : null}
        {runIdStr ? (
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
