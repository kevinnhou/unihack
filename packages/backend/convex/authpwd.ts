import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${password}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const signUp = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      userId: v.id("users"),
      name: v.string(),
    }),
    v.object({ success: v.literal(false), reason: v.string() })
  ),
  handler: async (ctx, { name, email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();
    if (existing) {
      return { success: false as const, reason: "Email already in use" };
    }

    const userId = await ctx.db.insert("users", {
      name: name.trim(),
      email: normalizedEmail,
      emailVerified: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      elo: 1200,
    });

    const salt = randomSalt();
    const hash = await hashPassword(password, salt);
    await ctx.db.insert("passwords", { userId, hash, salt });

    return { success: true as const, userId, name: name.trim() };
  },
});

export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      userId: v.id("users"),
      name: v.string(),
      email: v.string(),
    }),
    v.object({ success: v.literal(false), reason: v.string() })
  ),
  handler: async (ctx, { email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();
    if (!user) {
      return { success: false as const, reason: "Invalid email or password" };
    }

    const pwRecord = await ctx.db
      .query("passwords")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!pwRecord) {
      return { success: false as const, reason: "Invalid email or password" };
    }

    const hash = await hashPassword(password, pwRecord.salt);
    if (hash !== pwRecord.hash) {
      return { success: false as const, reason: "Invalid email or password" };
    }

    return {
      success: true as const,
      userId: user._id,
      name: user.name,
      email: user.email,
    };
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({ _id: v.id("users"), name: v.string(), email: v.string() }),
    v.null()
  ),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return { _id: user._id, name: user.name, email: user.email };
  },
});
