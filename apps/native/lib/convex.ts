import Constants from "expo-constants";

export const convexUrl =
  (Constants.expoConfig?.extra?.convexUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_CONVEX_URL ??
  "";
