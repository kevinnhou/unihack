import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";

const convexSiteUrl =
  (Constants.expoConfig?.extra?.convexSiteUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_CONVEX_SITE_URL ??
  "";

export const authClient = createAuthClient({
  baseURL: convexSiteUrl,
  plugins: [convexClient()],
});

export type Session = typeof authClient.$Infer.Session;
