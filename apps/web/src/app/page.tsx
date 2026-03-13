import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/convex";

export default async function Home() {
  const authed = await isAuthenticated();
  redirect(authed ? "/dashboard" : "/signin");
}
