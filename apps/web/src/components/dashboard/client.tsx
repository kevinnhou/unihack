/** biome-ignore-all lint/nursery/noLeakedRender: PASS */

"use client";

import { Button } from "@unihack/ui/components/button";
import { Loader2, LogOut } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
} | null;

export function Dashboard({ user }: { user: User }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      router.push("/sign-in" as Route);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign out failed");
      setIsSigningOut(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="space-y-1 text-center">
        <h1 className="font-semibold text-2xl tracking-tight">Dashboard</h1>
        {user?.name && (
          <p className="text-muted-foreground text-sm">
            Welcome back, {user.name}!
          </p>
        )}
        {user?.email && (
          <p className="text-muted-foreground text-xs">{user.email}</p>
        )}
      </div>

      <Button disabled={isSigningOut} onClick={handleSignOut} variant="outline">
        {isSigningOut ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Signing out…
          </>
        ) : (
          <>
            <LogOut className="mr-2 size-4" />
            Sign out
          </>
        )}
      </Button>
    </div>
  );
}
