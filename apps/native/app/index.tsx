import { api } from "@unihack/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Redirect } from "expo-router";

export default function Index() {
  const profile = useQuery(api.users.getMyProfile);

  if (profile === undefined) {
    return null;
  }
  if (profile === null) {
    return <Redirect href="/(auth)/signin" />;
  }
  return <Redirect href="/(tabs)" />;
}
