import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Camera, LogOut } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useConvexImageUpload } from "@/lib/uploadthing";
import { useAuthStore } from "@/stores/auth-store";

type Visibility = "everyone" | "friends_only" | "nobody";

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "friends_only", label: "Friends" },
  { value: "nobody", label: "Nobody" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { userId, userName, signOut } = useAuthStore();

  const typedUserId = userId as Id<"users"> | null;

  const settings = useQuery(
    api.users.getUserSettings,
    typedUserId ? { userId: typedUserId } : "skip"
  );
  const profile = useQuery(
    api.users.getUserProfile,
    typedUserId ? { userId: typedUserId } : "skip"
  );

  const updateSettings = useMutation(api.users.updateUserSettings);

  const [profileVisibility, setProfileVisibility] =
    useState<Visibility>("everyone");
  const [showStats, setShowStats] = useState(true);
  const [showRunHistory, setShowRunHistory] = useState(true);

  const { openImageLibrary, uploading } = useConvexImageUpload(typedUserId);

  useEffect(() => {
    if (settings) {
      setProfileVisibility(settings.profileVisibility);
      setShowStats(settings.showStats);
      setShowRunHistory(settings.showRunHistory);
    }
  }, [settings]);

  const saveSettings = (partial: {
    profileVisibility?: Visibility;
    showStats?: boolean;
    showRunHistory?: boolean;
  }) => {
    if (!typedUserId) {
      return;
    }
    const next = {
      profileVisibility: partial.profileVisibility ?? profileVisibility,
      showStats: partial.showStats ?? showStats,
      showRunHistory: partial.showRunHistory ?? showRunHistory,
    };
    updateSettings({ userId: typedUserId, settings: next });
  };

  const handleAvatarPress = () => {
    openImageLibrary();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const imageUrl = profile?.image ?? null;
  const initial = (userName ?? "?").charAt(0).toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-base text-orange-400">Back</Text>
        </TouchableOpacity>
        <Text className="ml-4 font-bold text-lg text-white">Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ACCOUNT */}
        <Text className="mt-4 mb-2 px-4 font-semibold text-gray-400 text-xs uppercase tracking-widest">
          Account
        </Text>
        <View className="mx-4 rounded-2xl bg-neutral-900 p-4">
          <View className="items-center">
            <TouchableOpacity
              className="relative"
              disabled={uploading}
              onPress={handleAvatarPress}
            >
              {imageUrl ? (
                <Image
                  className="h-20 w-20 rounded-full"
                  source={{ uri: imageUrl }}
                />
              ) : (
                <View className="h-20 w-20 items-center justify-center rounded-full bg-orange-500">
                  <Text className="font-black text-3xl text-white">
                    {initial}
                  </Text>
                </View>
              )}
              <View className="absolute right-0 bottom-0 h-7 w-7 items-center justify-center rounded-full bg-neutral-700">
                {uploading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Camera color="white" size={14} />
                )}
              </View>
            </TouchableOpacity>
            <Text className="mt-3 font-semibold text-base text-white">
              {userName ?? "Runner"}
            </Text>
          </View>
        </View>

        {/* PRIVACY */}
        <Text className="mt-6 mb-2 px-4 font-semibold text-gray-400 text-xs uppercase tracking-widest">
          Privacy
        </Text>
        <View className="mx-4 gap-3 rounded-2xl bg-neutral-900 p-4">
          <Text className="font-medium text-white">Profile Visibility</Text>
          <View className="flex-row rounded-xl bg-neutral-800 p-1">
            {VISIBILITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                className="flex-1 items-center rounded-lg py-2"
                key={opt.value}
                onPress={() => {
                  setProfileVisibility(opt.value);
                  saveSettings({ profileVisibility: opt.value });
                }}
                style={{
                  backgroundColor:
                    profileVisibility === opt.value ? "#FF4500" : "transparent",
                }}
              >
                <Text
                  className="font-semibold text-xs"
                  style={{
                    color:
                      profileVisibility === opt.value ? "white" : "#6b7280",
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="mt-2 flex-row items-center justify-between">
            <Text className="font-medium text-white">Show My Stats</Text>
            <Switch
              onValueChange={(val) => {
                setShowStats(val);
                saveSettings({ showStats: val });
              }}
              thumbColor="white"
              trackColor={{ false: "#374151", true: "#FF4500" }}
              value={showStats}
            />
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="font-medium text-white">Show Run History</Text>
            <Switch
              onValueChange={(val) => {
                setShowRunHistory(val);
                saveSettings({ showRunHistory: val });
              }}
              thumbColor="white"
              trackColor={{ false: "#374151", true: "#FF4500" }}
              value={showRunHistory}
            />
          </View>
        </View>

        {/* SIGN OUT */}
        <TouchableOpacity
          className="mx-4 mt-8 flex-row items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-4"
          onPress={handleSignOut}
        >
          <LogOut color="#ef4444" size={20} />
          <Text className="font-semibold text-red-400">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
