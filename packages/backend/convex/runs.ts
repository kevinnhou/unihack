import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const startRun = mutation({
  args: {
    userId: v.id("users"),
    mode: v.union(v.literal("ranked"), v.literal("social")),
    liveRoomId: v.optional(v.id("liveRooms")),
  },
  returns: v.id("runs"),

  handler: async (ctx, { userId, mode, liveRoomId }) => {
    const user = await ctx.db.get(userId);
    const currentUserElo = user?.elo ?? 1200;
    return await ctx.db.insert("runs", {
      userId,
      mode,
      status: "active",
      distance: 0,
      duration: 0,
      avgPace: 0,
      startedAt: Date.now(),
      telemetry: [],
      currentUserElo,
      ...(liveRoomId ? { liveRoomId } : {}),
    });
  },
});

/** Lightweight ping during active run — no GPS coordinates stored. */
export const updateTelemetry = mutation({
  args: {
    runId: v.id("runs"),
    distance: v.number(),
    duration: v.number(),
    avgPace: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { runId, distance, duration, avgPace }) => {
    const run = await ctx.db.get(runId);
    if (!run) {
      return null;
    }
    if (run.status === "completed") {
      return null;
    }
    await ctx.db.patch(runId, { distance, duration, avgPace });
    return null;
  },
});

/** Upload full GPS telemetry after the run — called explicitly by the user. */
export const uploadRunTelemetry = mutation({
  args: {
    runId: v.id("runs"),
    telemetry: v.array(
      v.object({
        timestamp: v.number(),
        lat: v.number(),
        lng: v.number(),
        speed: v.number(),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, { runId, telemetry }) => {
    const run = await ctx.db.get(runId);
    if (!run) {
      return null;
    }
    await ctx.db.patch(runId, { telemetry });
    return null;
  },
});

export const endRun = mutation({
  args: {
    runId: v.id("runs"),
    distance: v.number(),
    duration: v.number(),
    opponentId: v.optional(v.id("users")),
    opponentAvgPace: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) {
      throw new Error("Run not found");
    }

    const avgPace =
      args.distance > 0 ? args.duration / (args.distance / 1000) : 0;
    const finishedAt = Date.now();

    // Persist final metrics and opponent data
    await ctx.db.patch(args.runId, {
      distance: args.distance,
      duration: args.duration,
      avgPace,
      status: "completed",
      completedAt: finishedAt,
      opponentId: args.opponentId,
      opponentAvgPace: args.opponentAvgPace,
    });

    // Elo logic: Strictly isolated to the global experience.
    let eloChange: number | null = null;
    let isWin: boolean | null = null;
    if (run.mode === "ranked" && args.opponentId && args.opponentAvgPace) {
      const user = await ctx.db.get(run.userId);
      const opponent = await ctx.db.get(args.opponentId);

      if (user && opponent && avgPace > 0) {
        // A lower pace (sec/km) wins the race
        isWin = avgPace < args.opponentAvgPace;
        const actualScore = isWin ? 1 : 0;

        const K = 32;
        const expectedScore = 1 / (1 + 10 ** ((opponent.elo - user.elo) / 400));
        eloChange = Math.round(K * (actualScore - expectedScore));

        const newElo = Math.max(0, Math.round(user.elo + eloChange));
        const eloGained = Math.round(eloChange);

        await ctx.db.patch(user._id, { elo: newElo });
        await ctx.db.patch(args.runId, { eloGained });

        await ctx.db.patch(opponent._id, {
          elo: Math.max(0, Math.round(opponent.elo - eloChange)),
        });
      }
    }

    return { success: true, eloChange, isWin };
  },
});

export const deleteRun = mutation({
  args: { runId: v.id("runs"), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { runId, userId }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.userId !== userId) {
      throw new Error("Not found");
    }
    if (run.mode === "ranked") {
      throw new Error("Cannot delete ranked run");
    }
    await ctx.db.delete(runId);
    return null;
  },
});

type GhostEntry = {
  userId: string;
  name: string;
  bestPace: number;
  bestDistance: number;
  runId: string;
  isSelf: boolean;
  elo: number;
};

/** Full run review data: run, type, opponent/participants, for solo/ghost/live. */
export const getRunReviewDetails = query({
  args: {
    runId: v.id("runs"),
    requestingUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, { runId, requestingUserId }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.status !== "completed") return null;

    // Access check
    if (requestingUserId && run.userId !== requestingUserId) {
      const asUser = await ctx.db
        .query("friends")
        .withIndex("by_user_friend", (q) =>
          q.eq("userId", requestingUserId).eq("friendId", run.userId)
        )
        .first();
      const asFriend = await ctx.db
        .query("friends")
        .withIndex("by_user_friend", (q) =>
          q.eq("userId", run.userId).eq("friendId", requestingUserId)
        )
        .first();
      const isFriend =
        (asUser && !asUser.requested) || (asFriend && !asFriend.requested);
      if (!isFriend) return null;
    }

    const runner = await ctx.db.get(run.userId);
    const runType: "solo" | "ghost" | "live" = run.opponentId
      ? "ghost"
      : run.liveRoomId
        ? "live"
        : "solo";

    const result: {
      run: typeof run;
      runType: "solo" | "ghost" | "live";
      runnerName: string;
      runnerImage: string | null;
      opponent?: { name: string; avgPace: number; distance: number };
      participants?: Array<{
        userId: string;
        name: string;
        runId: string;
        distance: number;
        duration: number;
        avgPace: number;
        telemetry: typeof run.telemetry;
        isCurrentUser: boolean;
      }>;
    } = {
      run,
      runType,
      runnerName: runner?.displayUsername ?? runner?.name ?? "Unknown",
      runnerImage: runner?.image ?? null,
    };

    if (runType === "ghost" && run.opponentId) {
      const opponent = await ctx.db.get(run.opponentId);
      result.opponent = {
        name: opponent?.name ?? "Ghost",
        avgPace: run.opponentAvgPace ?? 0,
        distance: run.distance,
      };
    }

    if (runType === "live" && run.liveRoomId) {
      const allRunsInRoom = await ctx.db
        .query("runs")
        .filter((q) => q.eq(q.field("liveRoomId"), run.liveRoomId))
        .filter((q) => q.eq(q.field("status"), "completed"))
        .collect();

      const participants = await Promise.all(
        allRunsInRoom.map(async (r) => {
          const user = await ctx.db.get(r.userId);
          return {
            userId: r.userId,
            name: user?.name ?? "Unknown",
            runId: r._id,
            distance: r.distance,
            duration: r.duration,
            avgPace: r.avgPace,
            telemetry: r.telemetry ?? [],
            isCurrentUser: r.userId === run.userId,
          };
        })
      );
      // Sort by avgPace (fastest first)
      participants.sort((a, b) => (a.avgPace || 9999) - (b.avgPace || 9999));
      result.participants = participants;
    }

    return result;
  },
});

export const getRunById = query({
  args: {
    runId: v.id("runs"),
    requestingUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, { runId, requestingUserId }) => {
    const run = await ctx.db.get(runId);
    if (!run) {
      return null;
    }
    if (!requestingUserId) {
      return run;
    }
    if (run.userId === requestingUserId) {
      return run;
    }
    // Allow friends to view each other's runs
    const asUser = await ctx.db
      .query("friends")
      .withIndex("by_user_friend", (q) =>
        q.eq("userId", requestingUserId).eq("friendId", run.userId)
      )
      .first();
    const asFriend = await ctx.db
      .query("friends")
      .withIndex("by_user_friend", (q) =>
        q.eq("userId", run.userId).eq("friendId", requestingUserId)
      )
      .first();
    const isFriend =
      (asUser && !asUser.requested) || (asFriend && !asFriend.requested);
    if (isFriend) {
      return run;
    }
    return null;
  },
});

/** Feed of user + friends' completed runs, ordered by startedAt desc. Returns full run metrics. */
export const getFeedRuns = query({
  args: { currentUserId: v.id("users") },
  handler: async (ctx, { currentUserId }) => {
    const asUser = await ctx.db
      .query("friends")
      .withIndex("by_user", (q) => q.eq("userId", currentUserId))
      .collect();
    const asFriend = await ctx.db
      .query("friends")
      .withIndex("by_friend", (q) => q.eq("friendId", currentUserId))
      .collect();
    const friendIds = new Set<typeof currentUserId>([
      ...asUser.filter((f) => !f.requested).map((f) => f.friendId),
      ...asFriend.filter((f) => !f.requested).map((f) => f.userId),
    ]);
    const allowedUserIds = [currentUserId, ...friendIds];

    const allRuns = await ctx.db
      .query("runs")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const feedRuns = allRuns
      .filter((r) => allowedUserIds.includes(r.userId))
      .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))
      .slice(0, 50);

    const results: {
      run: (typeof feedRuns)[0];
      runnerName: string;
      runnerImage: string | null;
      opponentName: string | null;
      runType: "ghost" | "live" | "solo";
    }[] = [];

    for (const run of feedRuns) {
      const runner = await ctx.db.get(run.userId);
      const opponent = run.opponentId ? await ctx.db.get(run.opponentId) : null;
      const runType: "ghost" | "live" | "solo" = run.opponentId
        ? "ghost"
        : run.liveRoomId
          ? "live"
          : "solo";
      results.push({
        run,
        runnerName: runner?.name ?? "Unknown",
        runnerImage: runner?.image ?? null,
        opponentName: opponent?.name ?? null,
        runType,
      });
    }

    return results;
  },
});

/** All available ghosts including current user's own best run. */
export const getAllAvailableGhosts = query({
  args: { currentUserId: v.id("users") },
  handler: async (ctx, { currentUserId }) => {
    const currentUser = await ctx.db.get(currentUserId);
    const currentUserElo = currentUser?.elo ?? 1200;
    const completedRuns = await ctx.db
      .query("runs")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const bestByUser = new Map<string, (typeof completedRuns)[0]>();
    for (const run of completedRuns) {
      if (run.avgPace <= 0) {
        continue;
      }
      const runElo = run.currentUserElo ?? 1200;
      // Exempt own runs from the Elo delta filter
      if (
        run.userId !== currentUserId &&
        Math.abs(runElo - currentUserElo) > 100
      ) {
        continue;
      }
      const existing = bestByUser.get(run.userId);
      if (!existing || run.avgPace < existing.avgPace) {
        bestByUser.set(run.userId, run);
      }
    }

    const results: GhostEntry[] = [];
    for (const run of bestByUser.values()) {
      const user = await ctx.db.get(run.userId);
      if (!user) {
        continue;
      }
      const runElo = run.currentUserElo ?? user.elo;
      results.push({
        userId: run.userId,
        name: user.name,
        bestPace: run.avgPace,
        bestDistance: run.distance,
        runId: run._id,
        isSelf: run.userId === currentUserId,
        elo: runElo,
      });
    }
    // Sort: self first, then by elo delta (closest to currentUserElo), then by pace
    results.sort((a, b) => {
      if (a.isSelf && !b.isSelf) {
        return -1;
      }
      if (!a.isSelf && b.isSelf) {
        return 1;
      }
      const deltaA = Math.abs(a.elo - currentUserElo);
      const deltaB = Math.abs(b.elo - currentUserElo);
      if (deltaA !== deltaB) {
        return deltaA - deltaB;
      }
      return a.bestPace - b.bestPace;
    });
    return { ghosts: results, currentUserElo };
  },
});
