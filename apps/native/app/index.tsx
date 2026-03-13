import { api } from "@unihack/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Redirect } from "expo-router";

export default function Index() {
  const profile = useQuery(api.users.getMyProfile);

  // Since we require authentication, always redirect to auth first
  // The auth screens will handle checking if user is already logged in
  return <Redirect href="/(auth)/signin" />;
}
