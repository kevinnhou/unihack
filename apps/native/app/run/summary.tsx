import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { useRunStore } from "@/stores/run-store";

function formatPace(secPerKm: number): string {
  if (secPerKm <= 0 || !Number.isFinite(secPerKm)) {
    return "--:--";
  }
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.floor(secPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function Summary() {
  const router = useRouter();
  const store = useRunStore();
  const { distance, duration, avgPace, runId } = useLocalSearchParams<{
    distance: string;
    duration: string;
    avgPace: string;
    runId: string;
  }>();

  const uploadTelemetryMutation = useMutation(api.runs.uploadRunTelemetry);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const distanceMeters = Number(distance ?? "0");
  const durationSeconds = Number(duration ?? "0");
  const avgPaceVal = Number(avgPace ?? "0");

  const telemetryBuffer = store.telemetryBuffer;
  const canUpload = !uploaded && telemetryBuffer.length > 0 && !!runId;

  const handleUpload = async () => {
    if (!canUpload) {
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      await uploadTelemetryMutation({
        runId: runId as Id<"runs">,
        telemetry: telemetryBuffer,
      });
      setUploaded(true);
    } catch {
      setUploadError("Upload failed — please try again");
    } finally {
      setUploading(false);
    }
  };

  const handleDone = () => {
    store.reset();
    router.replace("/");
  };

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <Text className="mb-2 font-bold text-4xl text-foreground">
        Run Complete
      </Text>
      <Text className="mb-10 text-default-400">Great work!</Text>

      <View className="mb-4 rounded-xl border border-default-200 p-6">
        <Text className="mb-1 text-default-400 text-sm uppercase tracking-widest">
          Distance
        </Text>
        <Text className="font-bold text-3xl text-foreground">
          {(distanceMeters / 1000).toFixed(2)} km
        </Text>
      </View>

      <View className="mb-4 rounded-xl border border-default-200 p-6">
        <Text className="mb-1 text-default-400 text-sm uppercase tracking-widest">
          Time
        </Text>
        <Text className="font-bold text-3xl text-foreground">
          {formatTime(durationSeconds)}
        </Text>
      </View>

      <View className="mb-10 rounded-xl border border-default-200 p-6">
        <Text className="mb-1 text-default-400 text-sm uppercase tracking-widest">
          Avg Pace
        </Text>
        <Text className="font-bold text-3xl text-foreground">
          {formatPace(avgPaceVal)} /km
        </Text>
      </View>

      {uploadError && (
        <Text className="mb-3 text-center text-danger text-sm">
          {uploadError}
        </Text>
      )}

      {(canUpload || uploaded) && (
        <Button
          className="mb-3 w-full"
          isDisabled={uploading || uploaded}
          onPress={handleUpload}
          size="lg"
          variant="secondary"
        >
          <Text className="font-bold text-base">
            {uploaded
              ? "GPS Uploaded ✓"
              : uploading
                ? "Uploading..."
                : `Upload GPS Trace (${telemetryBuffer.length} pts)`}
          </Text>
        </Button>
      )}

      <Button
        className="w-full"
        onPress={handleDone}
        size="lg"
        variant="primary"
      >
        Done
      </Button>
    </View>
  );
}
