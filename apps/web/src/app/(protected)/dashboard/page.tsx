import { api } from "@unihack/backend/convex/_generated/api";
import { fetchAuthQuery } from "@/lib/convex";
import { Dashboard } from "~/dashboard/client";

export default async function DashboardPage() {
  const user = await fetchAuthQuery(api.auth.getCurrentUser, {});

  return <Dashboard user={user} />;
}
