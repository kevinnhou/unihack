import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";

const ONE_DAY_MS = 86_400_000;

function dateKey(ts: number): string {
  const d = new Date(ts);
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${month}-${day}`;
}

function computeLongestStreak(sortedDates: string[]): number {
  if (sortedDates.length === 0) {
    return 0;
  }
  let longest = 1;
  let streak = 1;
  for (let i = 1; i < sortedDates.length; i += 1) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / ONE_DAY_MS);
    if (diffDays === 1) {
      streak += 1;
      if (streak > longest) {
        longest = streak;
      }
    } else {
      streak = 1;
    }
  }
  return longest;
}

const searchUserShape = v.object({
  userId: v.id("users"),
  displayName: v.string(),
  mutualFriendsCount: v.number(),
  senderId: v.union(v.id("users"), v.null()),
  requested: v.boolean(),
});

export const getIncomingRequests = query({
  args: { currentUserId: v.id("users") },
  returns: v.array(searchUserShape),
  handler: async (ctx, { currentUserId }) => {
    const incomingRequests = await ctx.db
      .query("friends")
      .withIndex("by_friend", (q) => q.eq("friendId", currentUserId))
      .collect();

    const requestsFromOthers = incomingRequests.filter(
      (f) => f.requested && f.sender !== currentUserId
    );

    const currentUserFriends = await ctx.db
      .query("friends")
      .withIndex("by_user", (q) => q.eq("userId", currentUserId))
      .collect();
    const currentUserFriendIds = new Set(
      currentUserFriends
        .filter((f) => !f.requested)
        .map((f) => f.friendId)
        .filter((id) => id !== currentUserId)
    );

    const results: {
      userId: Id<"users">;
      displayName: string;
      mutualFriendsCount: number;
      senderId: Id<"users"> | null;
      requested: boolean;
    }[] = [];

    for (const req of requestsFromOthers) {
      const user = await ctx.db.get(req.userId);
      if (!user || user._id === currentUserId) {
        continue;
      }

      const displayName = user.displayUsername ?? user.name ?? "Unknown";

      const targetUserFriends = await ctx.db
        .query("friends")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      const targetFriendIds = new Set(
        targetUserFriends
          .filter((f) => !f.requested)
          .map((f) => f.friendId)
          .filter((id) => id !== user._id)
      );

      let mutualCount = 0;
      for (const fid of currentUserFriendIds) {
        if (targetFriendIds.has(fid)) {
          mutualCount += 1;
        }
      }

      results.push({
        userId: user._id,
        displayName,
        mutualFriendsCount: mutualCount,
        senderId: req.sender,
        requested: true,
      });
    }

    return results.sort((a, b) => b.mutualFriendsCount - a.mutualFriendsCount);
  },
});

export const getSuggestedUsers = query({
  args: {
    currentUserId: v.id("users"),
    searchTerm: v.optional(v.string()),
  },
  returns: v.array(searchUserShape),
  handler: async (ctx, { currentUserId, searchTerm }) => {
    const incomingRequestUserIds = new Set(
      (
        await ctx.db
          .query("friends")
          .withIndex("by_friend", (q) => q.eq("friendId", currentUserId))
          .collect()
      )
        .filter((f) => f.requested && f.sender !== currentUserId)
        .map((f) => f.userId)
    );

    const allUsers = await ctx.db.query("users").collect();

    const currentUserFriends = await ctx.db
      .query("friends")
      .withIndex("by_user", (q) => q.eq("userId", currentUserId))
      .collect();
    const currentUserFriendIds = new Set(
      currentUserFriends
        .filter((f) => !f.requested)
        .map((f) => f.friendId)
        .filter((id) => id !== currentUserId)
    );

    const results: {
      userId: Id<"users">;
      displayName: string;
      mutualFriendsCount: number;
      senderId: Id<"users"> | null;
      requested: boolean;
    }[] = [];

    for (const user of allUsers) {
      if (user._id === currentUserId) {
        continue;
      }
      if (incomingRequestUserIds.has(user._id)) {
        continue;
      }

      const displayName = user.displayUsername ?? user.name ?? "Unknown";
      const searchable = `${displayName} ${user.name}`.toLowerCase();
      if (
        searchTerm &&
        searchTerm.trim().length > 0 &&
        !searchable.includes(searchTerm.trim().toLowerCase())
      ) {
        continue;
      }

      const hasExisting = await ctx.db
        .query("friends")
        .withIndex("by_user_friend", (q) =>
          q.eq("userId", currentUserId).eq("friendId", user._id)
        )
        .first();
      const hasReverse = await ctx.db
        .query("friends")
        .withIndex("by_user_friend", (q) =>
          q.eq("userId", user._id).eq("friendId", currentUserId)
        )
        .first();

      const isFriend =
        (hasExisting && !hasExisting.requested) ||
        (hasReverse && !hasReverse.requested);
      if (isFriend) {
        continue;
      }

      const isRequested =
        (hasExisting?.requested ?? false) || (hasReverse?.requested ?? false);
      const senderId = hasExisting?.sender ?? hasReverse?.sender ?? null;

      const targetUserFriends = await ctx.db
        .query("friends")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      const targetFriendIds = new Set(
        targetUserFriends
          .filter((f) => !f.requested)
          .map((f) => f.friendId)
          .filter((id) => id !== user._id)
      );

      let mutualCount = 0;
      for (const fid of currentUserFriendIds) {
        if (targetFriendIds.has(fid)) {
          mutualCount += 1;
        }
      }

      results.push({
        userId: user._id,
        displayName,
        mutualFriendsCount: mutualCount,
        senderId,
        requested: isRequested,
      });
    }

    return results.sort((a, b) => b.mutualFriendsCount - a.mutualFriendsCount);
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    return user?._id ?? null;
  },
});

// ------------------------------------------------------------------
// GLOBAL LEADERBOARD
// ------------------------------------------------------------------
export const getGlobalLeaderboard = query({
  args: {
    limit: v.number(),
    sortBy: v.union(v.literal("pace"), v.literal("distance"), v.literal("elo")),
  },
  returns: v.array(
    v.object({
      userId: v.id("users"),
      name: v.string(),
      value: v.number(),
      runId: v.optional(v.id("runs")),
    })
  ),
  handler: async (ctx, args) => {
    if (args.sortBy === "elo") {
      const users = await ctx.db
        .query("users")
        .withIndex("by_elo")
        .order("desc")
        .take(args.limit);
      return users.map((user) => ({
        userId: user._id,
        name: user.name,
        value: user.elo,
        runId: undefined,
      }));
    }

    // 1. Fetch completed runs sorted by the relevant index
    const allRuns = await ctx.db
      .query("runs")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // 2. Group by user to find their personal best
    const userBests = new Map<
      string,
      { userId: string; value: number; runId: string }
    >();

    for (const run of allRuns) {
      const existing = userBests.get(run.userId);
      const value = args.sortBy === "pace" ? run.avgPace : run.distance;

      if (args.sortBy === "pace" && value <= 0) {
        continue;
      }

      if (!existing) {
        userBests.set(run.userId, {
          userId: run.userId,
          value,
          runId: run._id,
        });
        continue;
      }

      const isBetter =
        args.sortBy === "pace"
          ? value < existing.value
          : value > existing.value;

      if (isBetter) {
        userBests.set(run.userId, {
          userId: run.userId,
          value,
          runId: run._id,
        });
      }
    }

    const sortedBests = Array.from(userBests.values()).sort((a, b) =>
      args.sortBy === "pace" ? a.value - b.value : b.value - a.value
    );

    const topEntries = sortedBests.slice(0, args.limit);
    const enrichedEntries = await Promise.all(
      topEntries.map(async (entry) => {
        const user = await ctx.db.get(entry.userId as Id<"users">);
        return {
          userId: entry.userId as Id<"users">,
          name: user?.name ?? "Unknown Runner",
          value: entry.value,
          runId: entry.runId as Id<"runs">,
        };
      })
    );

    return enrichedEntries;
  },
});

// ------------------------------------------------------------------
// USER PROFILE STATS & STREAKS
// ------------------------------------------------------------------
function computeCurrentStreak(dateSets: Set<string>): number {
  const today = new Date();
  const todayKey = dateKey(today.getTime());
  const yesterdayKey = dateKey(today.getTime() - ONE_DAY_MS);

  let current = 0;
  let checkTime: number;

  if (dateSets.has(todayKey)) {
    current = 1;
    checkTime = today.getTime() - ONE_DAY_MS;
  } else if (dateSets.has(yesterdayKey)) {
    current = 1;
    checkTime = today.getTime() - ONE_DAY_MS * 2;
  } else {
    return 0;
  }

  for (;;) {
    if (!dateSets.has(dateKey(checkTime))) {
      break;
    }
    current += 1;
    checkTime -= ONE_DAY_MS;
  }
  return current;
}

export const getUserStats = query({
  args: { userId: v.id("users") },
  returns: v.object({
    totalRuns: v.number(),
    totalDistanceMeters: v.number(),
    bestPaceSecPerKm: v.number(),
    currentStreak: v.number(),
    longestStreak: v.number(),
  }),
  handler: async (ctx, { userId }) => {
    const runs = await ctx.db
      .query("runs")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "completed")
      )
      .collect();

    if (runs.length === 0) {
      return {
        totalRuns: 0,
        totalDistanceMeters: 0,
        bestPaceSecPerKm: 0,
        currentStreak: 0,
        longestStreak: 0,
      };
    }

    let totalDistance = 0;
    let bestPace = Number.POSITIVE_INFINITY;
    const dateSets = new Set<string>();

    for (const run of runs) {
      totalDistance += run.distance;
      if (run.avgPace > 0 && run.avgPace < bestPace) {
        bestPace = run.avgPace;
      }
      const streakTimestamp = run.completedAt ?? run.startedAt;
      if (streakTimestamp) {
        dateSets.add(dateKey(streakTimestamp));
      }
    }

    const uniqueDates = [...dateSets].sort();

    return {
      totalRuns: runs.length,
      totalDistanceMeters: totalDistance,
      bestPaceSecPerKm: bestPace === Number.POSITIVE_INFINITY ? 0 : bestPace,
      currentStreak: computeCurrentStreak(dateSets),
      longestStreak: computeLongestStreak(uniqueDates),
    };
  },
});

// ------------------------------------------------------------------
// USER RUN HISTORY
// ------------------------------------------------------------------
export const getUserRuns = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const runs = await ctx.db
      .query("runs")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .order("desc")
      .take(20); // Get 20 most recent runs

    return runs.map((run) => ({
      _id: run._id,
      distance: run.distance,
      startedAt: run._creationTime, // Convex automatically assigns _creationTime
      avgPace: run.avgPace,
    }));
  },
});
