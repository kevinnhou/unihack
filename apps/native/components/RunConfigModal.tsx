import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { ChevronRight, Swords, Users, Zap } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { type RunMode, useRunStore } from "@/stores/run-store";

const DISTANCES = [
  { label: "1 km", value: 1000 },
  { label: "3 km", value: 3000 },
  { label: "5 km", value: 5000 },
  { label: "10 km", value: 10_000 },
  { label: "Half marathon", value: 21_097 },
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function RunConfigModal({ visible, onClose }: Props) {
  const router = useRouter();
  const sheetRef = useRef<BottomSheet>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedMode, setSelectedMode] = useState<RunMode | null>(null);
  const [selectedDistance, setSelectedDistance] = useState<number>(5000);
  const [loading, setLoading] = useState(false);

  const configureRun = useRunStore((s) => s.configureRun);

  const opponent = useQuery(
    api.runs.findRankedOpponent,
    selectedMode === "ranked" ? { distance: selectedDistance } : "skip"
  );

  // biome-ignore lint/suspicious/useAwait: PASS
  const handleStart = async () => {
    if (!selectedMode) {
      return;
    }
    setLoading(true);
    try {
      configureRun({
        mode: selectedMode,
        targetDistance: selectedDistance,
        opponentRunId: opponent?.runId as Id<"runs"> | undefined,
        opponentUserId: opponent?.opponentUserId as Id<"users"> | undefined,
        opponentName: opponent?.opponentName ?? undefined,
      });
      onClose();
      router.push("/run/active");
    } finally {
      setLoading(false);
    }
  };

  const renderBackdrop = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: PASS
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
      />
    ),
    []
  );

  if (!visible) {
    return null;
  }

  return (
    <BottomSheet
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: "#111" }}
      enablePanDownToClose
      handleIndicatorStyle={{ backgroundColor: "#444" }}
      onClose={onClose}
      ref={sheetRef}
      snapPoints={["60%"]}
    >
      <BottomSheetScrollView contentContainerStyle={{ padding: 24 }}>
        {step === 1 ? (
          <>
            <Text className="mb-6 font-bold text-2xl text-white">
              Choose Mode
            </Text>
            <ModeCard
              icon={<Swords color="#FF4500" size={24} />}
              onPress={() => setSelectedMode("ranked")}
              selected={selectedMode === "ranked"}
              subtitle="Race global players • Elo at stake"
              title="Ranked"
            />
            <ModeCard
              icon={<Users color="#3b82f6" size={24} />}
              onPress={() => setSelectedMode("social")}
              selected={selectedMode === "social"}
              subtitle="Race a friend's ghost • No Elo"
              title="Social"
            />
            <ModeCard
              icon={<Zap color="#f59e0b" size={24} />}
              onPress={() => setSelectedMode("live")}
              selected={selectedMode === "live"}
              subtitle="Real-time room with friends"
              title="Live"
            />
            <TouchableOpacity
              className="mt-6 flex-row items-center justify-center rounded-2xl bg-orange-500 py-4"
              disabled={!selectedMode}
              onPress={() => setStep(2)}
              style={{ opacity: selectedMode ? 1 : 0.4 }}
            >
              <Text className="mr-2 font-bold text-lg text-white">Next</Text>
              <ChevronRight color="white" size={20} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text className="mb-6 font-bold text-2xl text-white">
              Select Distance
            </Text>
            {DISTANCES.map((d) => (
              <Pressable
                className="mb-3 flex-row items-center justify-between rounded-2xl p-4"
                key={d.value}
                onPress={() => setSelectedDistance(d.value)}
                style={{
                  backgroundColor:
                    selectedDistance === d.value ? "#FF4500" : "#1f1f1f",
                }}
              >
                <Text
                  className="font-semibold text-lg text-white"
                  style={{
                    color: selectedDistance === d.value ? "white" : "#9ca3af",
                  }}
                >
                  {d.label}
                </Text>
              </Pressable>
            ))}
            <TouchableOpacity
              className="mt-6 items-center rounded-2xl bg-orange-500 py-4"
              disabled={loading}
              onPress={handleStart}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="font-bold text-lg text-white">
                  Start Run 🏃
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

function ModeCard({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="mb-3 flex-row items-center rounded-2xl p-4"
      onPress={onPress}
      style={{
        backgroundColor: selected ? "#1c1c1c" : "#1a1a1a",
        borderWidth: 2,
        borderColor: selected ? "#FF4500" : "#2a2a2a",
      }}
    >
      <View className="mr-4">{icon}</View>
      <View className="flex-1">
        <Text className="font-bold text-base text-white">{title}</Text>
        <Text className="text-gray-400 text-sm">{subtitle}</Text>
      </View>
      {/** biome-ignore lint/nursery/noLeakedRender: PASS */}
      {selected && (
        <View className="h-5 w-5 items-center justify-center rounded-full bg-orange-500">
          <Text className="font-bold text-white text-xs">✓</Text>
        </View>
      )}
    </Pressable>
  );
}
