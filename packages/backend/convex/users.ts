/** biome-ignore-all lint/suspicious/noExplicitAny: Convex ctx is typed as any */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

/**
 * Get or create an application user profile for the authenticated session.
 * Must be called after sign-in to materialise game-specific fields.
 */
export const getOrCreateProfile = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  returns: v.id("users"),
  async handler(ctx, args) {
    const authUser = await authComponent.getAuthUser(ctx as any);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", authUser._id))
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("users", {
      authId: authUser._id,
      name: args.name,
      email: args.email,
      avatarUrl: args.avatarUrl,
      totalElo: 1000,
      winCount: 0,
      lossCount: 0,
      currentStreak: 0,
      lastRunDate: undefined,
    });
  },
});

/** Get the current user's full profile. */
export const getMyProfile = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      authId: v.string(),
      name: v.string(),
      email: v.string(),
      avatarUrl: v.optional(v.string()),
      totalElo: v.number(),
      winCount: v.number(),
      lossCount: v.number(),
      currentStreak: v.number(),
      lastRunDate: v.optional(v.number()),
    }),
    v.null()
  ),
  async handler(ctx) {
    const authUser = await authComponent.getAuthUser(ctx as any);
    if (!authUser) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", authUser._id))
      .unique();
  },
});

/** Get a user's public profile by their ID. */
export const getUserById = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      authId: v.string(),
      name: v.string(),
      email: v.string(),
      avatarUrl: v.optional(v.string()),
      totalElo: v.number(),
      winCount: v.number(),
      lossCount: v.number(),
      currentStreak: v.number(),
      lastRunDate: v.optional(v.number()),
    }),
    v.null()
  ),
  async handler(ctx, { userId }) {
    return await ctx.db.get(userId);
  },
});

/** Update the current user's display name or avatar. */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const authUser = await authComponent.getAuthUser(ctx as any);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", authUser._id))
      .unique();
    if (!user) {
      throw new Error("User profile not found");
    }

    const patch: { name?: string; avatarUrl?: string } = {};
    if (args.name !== undefined) {
      patch.name = args.name;
    }
    if (args.avatarUrl !== undefined) {
      patch.avatarUrl = args.avatarUrl;
    }

    await ctx.db.patch(user._id, patch);
  },
});
