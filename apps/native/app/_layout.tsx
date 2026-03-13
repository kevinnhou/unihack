import "@/global.css";
import { Slot } from "expo-router";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useUniwind } from "uniwind";

import { useThemeStore } from "@/stores/theme-store";

const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL ?? "";

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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConvexProvider client={convex}>
        <KeyboardProvider>
          <HeroUINativeProvider>
            <ThemeSync />
            <Slot />
          </HeroUINativeProvider>
        </KeyboardProvider>
      </ConvexProvider>
    </GestureHandlerRootView>
  );
  )
}
