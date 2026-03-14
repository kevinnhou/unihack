import "@/global.css";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useAuthStore } from "@/stores/auth-store";
import { useThemeStore } from "@/stores/theme-store";

const CONVEX_URL =
  process.env.EXPO_PUBLIC_CONVEX_URL ??
  "https://giddy-guineapig-514.convex.cloud";

const convex = new ConvexReactClient(CONVEX_URL);

export const unstable_settings = {
  initialRouteName: "/index",
};

function ThemeSync() {
  const setTheme = useThemeStore((state) => state.setTheme);

  useEffect(() => {
    setTheme("dark");
  }, [setTheme]);

  return null;
}

export default function Layout() {
  const { isLoading, loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Blank splash while loading persisted session
  if (isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000000" }}>
        <ConvexProvider client={convex}>
          <HeroUINativeProvider>
            <StatusBar style="light" />
            <View className="flex-1 bg-black" />
          </HeroUINativeProvider>
        </ConvexProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000000" }}>
      <ConvexProvider client={convex}>
        <KeyboardProvider>
          <HeroUINativeProvider>
            <StatusBar style="light" />
            <ThemeSync />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#000000" },
              }}
            >
              <Stack.Screen
                name="friends/friends"
                options={{ presentation: "modal" }}
              />
            </Stack>
          </HeroUINativeProvider>
        </KeyboardProvider>
      </ConvexProvider>
    </GestureHandlerRootView>
  );
}
