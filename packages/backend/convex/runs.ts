import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const startRun = mutation({
  args: {
    userId: v.id("users"),
    mode: v.union(v.literal("ranked"), v.literal("social")),
    liveRoomId: v.optional(v.id("liveRooms")),
  },
  returns: v.id("runs"),
  handler: async (ctx, { userId, mode, liveRoomId }) =>
    await ctx.db.insert("runs", {
      userId,
      mode,
      status: "active",
      distance: 0,
      duration: 0,
      avgPace: 0,
      startedAt: Date.now(),
      telemetry: [],
      ...(liveRoomId ? { liveRoomId } : {}),
    }),
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

    // Persist final metrics and opponent data
    await ctx.db.patch(args.runId, {
      distance: args.distance,
      duration: args.duration,
      avgPace,
      status: "completed",
      opponentId: args.opponentId,
      opponentAvgPace: args.opponentAvgPace,
    });

    // Elo logic: Strictly isolated to the global experience.
    if (run.mode === "ranked" && args.opponentId && args.opponentAvgPace) {
      const user = await ctx.db.get(run.userId);
      const opponent = await ctx.db.get(args.opponentId);

      if (user && opponent && avgPace > 0) {
        // A lower pace (sec/km) wins the race
        const isWin = avgPace < args.opponentAvgPace;
        const actualScore = isWin ? 1 : 0;

        const K = 32;
        const expectedScore = 1 / (1 + 10 ** ((opponent.elo - user.elo) / 400));
        const eloChange = K * (actualScore - expectedScore);

        // Apply increments/decrements
        await ctx.db.patch(user._id, {
          elo: Math.max(0, Math.round(user.elo + eloChange)),
        });

        // Symmetrically adjust the opponent's Elo
        await ctx.db.patch(opponent._id, {
          elo: Math.max(0, Math.round(opponent.elo - eloChange)),
        });
      }
    }

    return { success: true };
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

export const getRunById = query({
  args: { runId: v.id("runs") },
  handler: async (ctx, { runId }) => ctx.db.get(runId),
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
      results.push({
        userId: run.userId,
        name: user.name,
        bestPace: run.avgPace,
        bestDistance: run.distance,
        runId: run._id,
        isSelf: run.userId === currentUserId,
        elo: user.elo,
      });
    }
    // Sort: self first, then by pace ascending
    results.sort((a, b) => {
      if (a.isSelf && !b.isSelf) {
        return -1;
      }
      if (!a.isSelf && b.isSelf) {
        return 1;
      }
      return a.bestPace - b.bestPace;
    });
    return { ghosts: results, currentUserElo };
  },
});
