import "@/global.css";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useUniwind } from "uniwind";

import { convexUrl } from "@/lib/convex";
import { useThemeStore } from "@/stores/theme-store";

const convex = new ConvexReactClient(convexUrl);

export const unstable_settings = {
  initialRouteName: "(tabs)",
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
  return (
    <ConvexProvider client={convex}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <HeroUINativeProvider>
            <ThemeSync />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen
                name="run/active"
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen name="run/finish" />
              <Stack.Screen name="run/review/[id]" />
              <Stack.Screen name="squads/[id]" />
              <Stack.Screen name="+not-found" />
            </Stack>
          </HeroUINativeProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </ConvexProvider>
  );
}
