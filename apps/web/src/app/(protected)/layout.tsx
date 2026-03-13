import type { Route } from "next";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/convex";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAuthenticated();
  if (!authed) {
    redirect("/signin" as Route);
  }

  return <>{children}</>;
}
