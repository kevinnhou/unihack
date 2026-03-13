// import { api } from "@unihack/backend/convex/_generated/api";
// import type { Id } from "@unihack/backend/convex/_generated/dataModel";
// import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react-native";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

function ResultBanner({ won, eloDelta }: { won: boolean; eloDelta?: number }) {
  return (
    <View
      className="mx-4 mb-3 flex-row items-center gap-3 rounded-2xl px-5 py-3"
      style={{ backgroundColor: won ? "#14532d" : "#7f1d1d" }}
    >
      {won ? (
        <CheckCircle color="#4ade80" size={28} />
      ) : (
        <XCircle color="#f87171" size={28} />
      )}
      <View>
        <Text
          className="font-black text-xl"
          style={{ color: won ? "#4ade80" : "#f87171" }}
        >
          {won ? "Victory" : "Defeat"}
        </Text>
        {eloDelta !== undefined ? (
          <Text className="text-gray-300 text-sm">
            Elo {eloDelta > 0 ? "+" : ""}
            {eloDelta}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

type RunRecord = {
  _id: string;
  type: "ranked" | "social" | "live";
  distance: number;
  durationSeconds: number;
  eloDelta?: number;
  win?: boolean;
  telemetry?: Array<{
    lat: number;
    lng: number;
    timestamp: number;
    speed: number;
  }>;
  opponentRunId?: string;
};

// Mock data for run
const mockRun: RunRecord = {
  _id: "run1",
  type: "ranked",
  distance: 5000,
  durationSeconds: 1500,
  eloDelta: 20,
  win: true,
  telemetry: [
    { lat: 37.7749, lng: -122.4194, timestamp: Date.now(), speed: 3.5 },
    { lat: 37.775, lng: -122.4195, timestamp: Date.now() + 1000, speed: 3.6 },
  ],
  opponentRunId: "opponentRun1",
};

// Mock data for opponent run
const mockOpponentRun: RunRecord = {
  _id: "opponentRun1",
  type: "ranked",
  distance: 4800,
  durationSeconds: 1600,
  eloDelta: -20,
  win: false,
  telemetry: [
    { lat: 37.7749, lng: -122.4194, timestamp: Date.now(), speed: 3.0 },
    { lat: 37.775, lng: -122.4195, timestamp: Date.now() + 1000, speed: 3.1 },
  ],
};

function RouteMap({
  myCoords,
  opponentCoords,
  initialRegion,
}: {
  myCoords: { latitude: number; longitude: number }[];
  opponentCoords: { latitude: number; longitude: number }[];
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}) {
  // const polylines: AppleMaps.MapProps["polylines"] = [];

  // if (myCoords.length > 1) {
  //   polylines.push({ coordinates: myCoords, color: "#FF4500", width: 4 });
  // }
  // if (opponentCoords.length > 1) {
  //   polylines.push({ coordinates: opponentCoords, color: "#3b82f6", width: 4 });
  // }

  return (
    <View className="mx-4 overflow-hidden rounded-2xl">
      {/* <AppleMaps.View
        cameraPosition={{
          coordinates: {
            latitude: initialRegion.latitude,
            longitude: initialRegion.longitude,
          },
          zoom: 14,
        }}
        polylines={polylines}
        properties={{
          mapType: AppleMaps.MapType.STANDARD,
          emphasis: AppleMapsMapStyleEmphasis.MUTED,
        }}
        style={{ height: 280 }}
        uiSettings={{
          compassEnabled: false,
        }}
      /> */}
    </View>
  );
}

export default function ReviewRaceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // const run = useQuery(
  //   api.runs.getRun,
  //   id ? { runId: id as Id<"runs"> } : "skip"
  // ) as RunRecord | null | undefined;

  // const opponentRun = useQuery(
  //   api.runs.getRun,
  //   run?.opponentRunId ? { runId: run.opponentRunId } : "skip"
  // ) as RunRecord | null | undefined;

  const run = mockRun;
  const opponentRun = mockOpponentRun;

  // if (!run) {
  //   return (
  //     <SafeAreaView className="flex-1 items-center justify-center bg-black">
  //       <Text className="text-gray-400">Loading…</Text>
  //     </SafeAreaView>
  //   );
  // }

  const isRanked = run.type === "ranked";
  const won = run.win === true;

  const myCoords =
    run.telemetry?.map((p) => ({
      latitude: p.lat,
      longitude: p.lng,
    })) ?? [];

  const opponentCoords =
    opponentRun?.telemetry?.map((p) => ({
      latitude: p.lat,
      longitude: p.lng,
    })) ?? [];

  const firstCoord = myCoords[0];
  const initialRegion = firstCoord
    ? {
        latitude: firstCoord.latitude,
        longitude: firstCoord.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : null;

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView>
        <View className="flex-row items-center gap-3 px-4 pt-4 pb-2">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft color="white" size={24} />
          </TouchableOpacity>
          <Text className="font-bold text-white text-xl">Race Review</Text>
        </View>

        {isRanked ? <ResultBanner eloDelta={run.eloDelta} won={won} /> : null}

        {initialRegion ? (
          <RouteMap
            initialRegion={initialRegion}
            myCoords={myCoords}
            opponentCoords={opponentCoords}
          />
        ) : null}

        <View className="mt-4 gap-3 px-4 pb-10">
          <Text className="mb-1 text-gray-400 text-xs uppercase tracking-widest">
            Your Run
          </Text>
          <StatRow label="Distance" value={distLabel(run.distance)} />
          <StatRow label="Time" value={formatTime(run.durationSeconds)} />
          <StatRow
            label="Avg Pace"
            value={paceLabel(run.distance, run.durationSeconds)}
          />

          {opponentRun ? (
            <>
              <Text className="mt-4 mb-1 text-gray-400 text-xs uppercase tracking-widest">
                Opponent
              </Text>
              <StatRow
                label="Distance"
                value={distLabel(opponentRun.distance)}
              />
              <StatRow
                label="Time"
                value={formatTime(opponentRun.durationSeconds)}
              />
            </>
          ) : null}
        </View>
      </ScrollView>
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
