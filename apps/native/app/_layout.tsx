import "@/global.css";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useUniwind } from "uniwind";
import { useAuthStore } from "@/stores/auth-store";
import { useThemeStore } from "@/stores/theme-store";

const CONVEX_URL = "https://giddy-guineapig-514.convex.cloud";process.env.EXPO_PUBLIC_CONVEX_URL ?? "";

const convex = new ConvexReactClient(CONVEX_URL);

export const unstable_settings = {
  initialRouteName: "/index",
};

function ThemeSync() {
  const { theme } = useUniwind();
  const setTheme = useThemeStore((state) => state.setTheme);

  useEffect(() => {
    setTheme(theme as "light" | "dark");
  }, [theme, setTheme]);

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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ConvexProvider client={convex}>
          <HeroUINativeProvider>
            <View className="flex-1 bg-background" />
          </HeroUINativeProvider>
        </ConvexProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConvexProvider client={convex}>
        <KeyboardProvider>
          <HeroUINativeProvider>
            <ThemeSync />
            <Stack screenOptions={{ headerShown: false }}>
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
