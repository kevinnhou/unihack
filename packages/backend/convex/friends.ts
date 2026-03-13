import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

const ONE_DAY_MS = 86_400_000;

function dateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

function computeCurrentStreak(dates: Set<string>): number {
  const today = new Date();
  const todayKey = dateKey(today.getTime());
  const yesterdayKey = dateKey(today.getTime() - ONE_DAY_MS);

  if (!(dates.has(todayKey) || dates.has(yesterdayKey))) {
    return 0;
  }

  let current = 1;
  let checkTime = dates.has(todayKey)
    ? today.getTime() - ONE_DAY_MS
    : today.getTime() - ONE_DAY_MS * 2;

  for (;;) {
    if (!dates.has(dateKey(checkTime))) {
      break;
    }
    current += 1;
    checkTime -= ONE_DAY_MS;
  }
  return current;
}

export const addFriend = mutation({
  args: {
    userId: v.id("users"),
    friendEmail: v.string(),
  },
  returns: v.union(
    v.object({ success: v.literal(true), friendId: v.id("users") }),
    v.object({ success: v.literal(false), reason: v.string() })
  ),
  handler: async (ctx, { userId, friendEmail }) => {
    const normalizedEmail = friendEmail.trim().toLowerCase();

    const friend = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!friend) {
      return { success: false as const, reason: "User not found" };
    }
    if (friend._id === userId) {
      return { success: false as const, reason: "Cannot add yourself" };
    }

    const existing = await ctx.db
      .query("friends")
      .withIndex("by_user_friend", (q) =>
        q.eq("userId", userId).eq("friendId", friend._id)
      )
      .first();
    if (existing) {
      return { success: true as const, friendId: friend._id };
    }

    await ctx.db.insert("friends", {
      userId,
      friendId: friend._id,
      createdAt: Date.now(),
    });

    return { success: true as const, friendId: friend._id };
  },
});

export const removeFriend = mutation({
  args: {
    userId: v.id("users"),
    friendId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, { userId, friendId }) => {
    const record = await ctx.db
      .query("friends")
      .withIndex("by_user_friend", (q) =>
        q.eq("userId", userId).eq("friendId", friendId)
      )
      .first();
    if (record) {
      await ctx.db.delete(record._id);
    }
    return null;
  },
});

export const getFriends = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      friendId: v.id("users"),
      name: v.string(),
      currentStreak: v.number(),
      totalRuns: v.number(),
      bestPace: v.number(),
      totalDistance: v.number(),
    })
  ),
  handler: async (ctx, { userId }) => {
    const friendships = await ctx.db
      .query("friends")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const results: {
      friendId: Id<"users">;
      name: string;
      currentStreak: number;
      totalRuns: number;
      bestPace: number;
      totalDistance: number;
    }[] = [];

    for (const friendship of friendships) {
      const friend = await ctx.db.get(friendship.friendId);
      if (!friend) {
        continue;
      }

      const runs = await ctx.db
        .query("runs")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", friendship.friendId).eq("status", "completed")
        )
        .collect();

      let totalDistance = 0;
      let bestPace = 0;
      const dateSets = new Set<string>();

      for (const run of runs) {
        totalDistance += run.distance;
        if (run.avgPace > 0 && (bestPace === 0 || run.avgPace < bestPace)) {
          bestPace = run.avgPace;
        }
        if (run.completedAt) {
          dateSets.add(dateKey(run.completedAt));
        }
      }

      results.push({
        friendId: friendship.friendId,
        name: friend.name,
        currentStreak: computeCurrentStreak(dateSets),
        totalRuns: runs.length,
        bestPace,
        totalDistance,
      });
    }

    return results;
  },
});
