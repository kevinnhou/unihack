// import { api } from "@unihack/backend/convex/_generated/api";
// import type { Id } from "@unihack/backend/convex/_generated/dataModel";
// import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { ChevronRight, Settings, Trophy } from "lucide-react-native";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// import { authClient } from "@/lib/auth-client";

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

// Mock data for profile
const mockProfile = {
  _id: "user1",
  name: "John Doe",
  email: "john@example.com",
  avatarUrl: null,
  totalElo: 1200,
  winCount: 15,
  lossCount: 5,
  currentStreak: 3,
};

// Mock data for runs
const mockRuns = [
  {
    _id: "run1",
    distance: 5000,
    durationSeconds: 1500,
    startedAt: Date.now() - 86400000, // 1 day ago
    type: "ranked" as const,
    eloDelta: 20,
  },
  {
    _id: "run2",
    distance: 3000,
    durationSeconds: 900,
    startedAt: Date.now() - 172800000, // 2 days ago
    type: "social" as const,
  },
  {
    _id: "run3",
    distance: 10000,
    durationSeconds: 2400,
    startedAt: Date.now() - 259200000, // 3 days ago
    type: "live" as const,
  },
];

export default function ProfileScreen() {
  const router = useRouter();

  const profile = mockProfile;
  const myRuns = mockRuns;

  // const handleSignOut = async () => {
  //   await authClient.signOut();
  //   router.replace("/(auth)/signin");
  // };

  // if (!profile) {
  //   return (
  //     <SafeAreaView className="flex-1 items-center justify-center bg-black">
  //       <Text className="text-gray-400">Loading profile…</Text>
  //     </SafeAreaView>
  //   );
  // }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="flex-row items-center gap-4 px-4 pt-6 pb-4">
          {profile.avatarUrl ? (
            <Image
              className="h-20 w-20 rounded-full"
              source={{ uri: profile.avatarUrl }}
            />
          ) : (
            <View className="h-20 w-20 items-center justify-center rounded-full bg-orange-500">
              <Text className="font-black text-3xl text-white">
                {profile.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="font-black text-2xl text-white">
              {profile.name}
            </Text>
            <Text className="text-gray-400 text-sm">{profile.email}</Text>
          </View>
          {/* <TouchableOpacity onPress={handleSignOut}>
            <LogOut color="#6b7280" size={22} />
          </TouchableOpacity> */}
        </View>

        {/* Settings placeholder */}
        <TouchableOpacity className="mx-4 mt-4 flex-row items-center gap-3 rounded-2xl bg-neutral-900 px-4 py-4">
          <Settings color="#6b7280" size={20} />
          <Text className="flex-1 text-gray-300">Settings</Text>
          <ChevronRight color="#4b5563" size={18} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
