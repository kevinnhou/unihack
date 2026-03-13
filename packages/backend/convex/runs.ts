/** biome-ignore-all lint/suspicious/noExplicitAny: Convex ctx is typed as any */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

const ELO_DELTA = 30;
const ELO_RANGE = 100;

const telemetryPoint = v.object({
  timestamp: v.number(),
  lat: v.number(),
  lng: v.number(),
  speed: v.number(),
});

/** Helper: resolve auth user → app user profile. */
async function requireUser(ctx: any) {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) {
    throw new Error("Not authenticated");
  }
  const user = await ctx.db
    .query("users")
    .withIndex("by_authId", (q: any) => q.eq("authId", authUser._id))
    .unique();
  if (!user) {
    throw new Error("User profile not found. Call getOrCreateProfile first.");
  }
  return user;
}

// ---------------------------------------------------------------------------
// Matchmaking
// ---------------------------------------------------------------------------

/**
 * Find a historical run from global players near the requesting user's Elo
 * for use as a Ranked ghost opponent.
 */
export const findRankedOpponent = query({
  args: { distance: v.number() },
  returns: v.union(
    v.object({
      runId: v.id("runs"),
      opponentUserId: v.id("users"),
      opponentName: v.string(),
      durationSeconds: v.number(),
    }),
    v.null()
  ),
  async handler(ctx, { distance }) {
    const authUser = await authComponent.getAuthUser(ctx as any);
    if (!authUser) {
      return null;
    }

    const myUser = await ctx.db
      .query("users")
      .withIndex("by_authId", (q: any) => q.eq("authId", authUser._id))
      .unique();
    if (!myUser) {
      return null;
    }

    const minElo = myUser.totalElo - ELO_RANGE;
    const maxElo = myUser.totalElo + ELO_RANGE;

    const candidates = await ctx.db
      .query("runs")
      .withIndex("by_type_startedAt", (q: any) => q.eq("type", "ranked"))
      .order("desc")
      .take(200);

    const distanceTolerance = distance * 0.05;
    const filtered: Array<{ run: any; opponent: any }> = [];
    for (const run of candidates) {
      if (
        run.userId === myUser._id ||
        Math.abs(run.distance - distance) > distanceTolerance ||
        run.finishedAt === undefined
      ) {
        continue;
      }

      const opponent = await ctx.db.get(run.userId);
      if (!opponent) {
        continue;
      }
      if (opponent.totalElo < minElo || opponent.totalElo > maxElo) {
        continue;
      }

      filtered.push({ run, opponent });
    }

    if (filtered.length === 0) {
      return null;
    }

    const picked = filtered[Math.floor(Math.random() * filtered.length)];
    return {
      runId: picked.run._id,
      opponentUserId: picked.opponent._id,
      opponentName: picked.opponent.name,
      durationSeconds: picked.run.durationSeconds,
    };
  },
});

/**
 * Find a historical run from a specific friend for Social mode.
 */
export const findSocialOpponent = query({
  args: { friendUserId: v.id("users"), distance: v.number() },
  returns: v.union(
    v.object({
      runId: v.id("runs"),
      opponentName: v.string(),
      durationSeconds: v.number(),
    }),
    v.null()
  ),
  async handler(ctx, { friendUserId, distance }) {
    const distanceTolerance = distance * 0.05;

    const friendRuns = await ctx.db
      .query("runs")
      .withIndex("by_user_startedAt", (q: any) => q.eq("userId", friendUserId))
      .order("desc")
      .take(50);

    const match = friendRuns.find(
      (r: any) =>
        Math.abs(r.distance - distance) <= distanceTolerance &&
        r.finishedAt !== undefined
    );
    if (!match) {
      return null;
    }

    const friend = await ctx.db.get(friendUserId);
    if (!friend) {
      return null;
    }

    return {
      runId: match._id,
      opponentName: friend.name,
      durationSeconds: match.durationSeconds,
    };
  },
});

// ---------------------------------------------------------------------------
// Run Lifecycle
// ---------------------------------------------------------------------------

/** Create a new run record at the moment the user starts. */
export const startRun = mutation({
  args: {
    type: v.union(v.literal("ranked"), v.literal("social"), v.literal("live")),
    distance: v.number(),
    opponentRunId: v.optional(v.id("runs")),
    opponentUserId: v.optional(v.id("users")),
    squadId: v.optional(v.id("squads")),
    liveRoomId: v.optional(v.id("liveRooms")),
  },
  returns: v.id("runs"),
  async handler(ctx, args) {
    const user = await requireUser(ctx);

    return await ctx.db.insert("runs", {
      userId: user._id,
      type: args.type,
      opponentRunId: args.opponentRunId,
      opponentUserId: args.opponentUserId,
      squadId: args.squadId,
      liveRoomId: args.liveRoomId,
      distance: args.distance,
      durationSeconds: 0,
      startedAt: Date.now(),
    });
  },
});

/**
 * Upload the final batched telemetry and complete the run.
 * If the telemetry array exceeds 800 points the client should upload a file
 * via generateTelemetryUploadUrl and pass the storageId instead.
 */
export const finishRun = mutation({
  args: {
    runId: v.id("runs"),
    durationSeconds: v.number(),
    distance: v.number(),
    telemetry: v.optional(v.array(telemetryPoint)),
    telemetryStorageId: v.optional(v.string()),
  },
  async handler(ctx, args) {
    const user = await requireUser(ctx);

    const run = await ctx.db.get(args.runId);
    if (!run || run.userId !== user._id) {
      throw new Error("Run not found or not owned by user");
    }

    await ctx.db.patch(args.runId, {
      durationSeconds: args.durationSeconds,
      distance: args.distance,
      finishedAt: Date.now(),
      telemetry: args.telemetry,
      telemetryStorageId: args.telemetryStorageId,
    });

    // Update streak and last run date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();
    const yesterday = todayTs - 86_400_000;

    let newStreak = user.currentStreak;
    if (!user.lastRunDate || user.lastRunDate < yesterday) {
      newStreak =
        user.lastRunDate && user.lastRunDate >= yesterday
          ? user.currentStreak + 1
          : 1;
    }

    await ctx.db.patch(user._id, {
      lastRunDate: Date.now(),
      currentStreak: newStreak,
    });

    // Resolve Elo only for ranked runs
    if (run.type === "ranked" && run.opponentRunId) {
      await resolveElo({
        ctx,
        user,
        myRunId: args.runId,
        opponentRunId: run.opponentRunId,
        myDuration: args.durationSeconds,
        distance: run.distance,
      });
    }
  },
});

type EloArgs = {
  ctx: any;
  user: any;
  myRunId: any;
  opponentRunId: any;
  myDuration: number;
  distance: number;
};

/** Internal helper to apply Elo after a ranked run completes. */
async function resolveElo({
  ctx,
  user,
  myRunId,
  opponentRunId,
  myDuration,
  distance,
}: EloArgs) {
  const opponentRun = await ctx.db.get(opponentRunId);
  if (!opponentRun) {
    return;
  }

  const myPace = myDuration / distance;
  const opponentPace = opponentRun.durationSeconds / opponentRun.distance;
  const won = myPace < opponentPace;

  const eloDelta = won ? ELO_DELTA : -ELO_DELTA;

  await ctx.db.patch(myRunId, { eloDelta, win: won });
  await ctx.db.patch(user._id, {
    totalElo: Math.max(0, user.totalElo + eloDelta),
    winCount: won ? user.winCount + 1 : user.winCount,
    lossCount: won ? user.lossCount : user.lossCount + 1,
  });
}

// ---------------------------------------------------------------------------
// Telemetry upload URL
// ---------------------------------------------------------------------------

/** Generate a Convex file storage upload URL for large telemetry payloads. */
export const generateTelemetryUploadUrl = mutation({
  args: {},
  returns: v.string(),
  async handler(ctx) {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Get a completed run's full record including telemetry (for review screen). */
export const getRun = query({
  args: { runId: v.id("runs") },
  returns: v.union(
    v.object({
      _id: v.id("runs"),
      _creationTime: v.number(),
      userId: v.id("users"),
      type: v.union(
        v.literal("ranked"),
        v.literal("social"),
        v.literal("live")
      ),
      opponentRunId: v.optional(v.id("runs")),
      opponentUserId: v.optional(v.id("users")),
      squadId: v.optional(v.id("squads")),
      liveRoomId: v.optional(v.id("liveRooms")),
      distance: v.number(),
      durationSeconds: v.number(),
      eloDelta: v.optional(v.number()),
      win: v.optional(v.boolean()),
      startedAt: v.number(),
      finishedAt: v.optional(v.number()),
      telemetry: v.optional(v.array(telemetryPoint)),
      telemetryStorageId: v.optional(v.string()),
    }),
    v.null()
  ),
  async handler(ctx, { runId }) {
    return await ctx.db.get(runId);
  },
});

/** Get the telemetry of a ghost run for HUD interpolation. */
export const getRunTelemetry = query({
  args: { runId: v.id("runs") },
  returns: v.union(v.array(telemetryPoint), v.null()),
  async handler(ctx, { runId }) {
    const run = await ctx.db.get(runId);
    if (!run?.telemetry) {
      return null;
    }
    return run.telemetry;
  },
});

/** Paginated run history for a user (for profile and feed). */
export const getUserRuns = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("runs"),
      _creationTime: v.number(),
      userId: v.id("users"),
      type: v.union(
        v.literal("ranked"),
        v.literal("social"),
        v.literal("live")
      ),
      opponentRunId: v.optional(v.id("runs")),
      opponentUserId: v.optional(v.id("users")),
      squadId: v.optional(v.id("squads")),
      liveRoomId: v.optional(v.id("liveRooms")),
      distance: v.number(),
      durationSeconds: v.number(),
      eloDelta: v.optional(v.number()),
      win: v.optional(v.boolean()),
      startedAt: v.number(),
      finishedAt: v.optional(v.number()),
      telemetry: v.optional(v.array(telemetryPoint)),
      telemetryStorageId: v.optional(v.string()),
    })
  ),
  async handler(ctx, { userId, limit = 20 }) {
    return await ctx.db
      .query("runs")
      .withIndex("by_user_startedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

/** Get a dashboard activity feed: recent ranked runs across all users. */
export const getFeedRuns = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      run: v.object({
        _id: v.id("runs"),
        _creationTime: v.number(),
        userId: v.id("users"),
        type: v.union(
          v.literal("ranked"),
          v.literal("social"),
          v.literal("live")
        ),
        opponentRunId: v.optional(v.id("runs")),
        opponentUserId: v.optional(v.id("users")),
        squadId: v.optional(v.id("squads")),
        liveRoomId: v.optional(v.id("liveRooms")),
        distance: v.number(),
        durationSeconds: v.number(),
        eloDelta: v.optional(v.number()),
        win: v.optional(v.boolean()),
        startedAt: v.number(),
        finishedAt: v.optional(v.number()),
        telemetry: v.optional(v.array(telemetryPoint)),
        telemetryStorageId: v.optional(v.string()),
      }),
      user: v.object({
        _id: v.id("users"),
        name: v.string(),
        avatarUrl: v.optional(v.string()),
      }),
    })
  ),
  async handler(ctx, { limit = 50 }) {
    const recentRuns = await ctx.db
      .query("runs")
      .withIndex("by_type_startedAt", (q) => q.eq("type", "ranked"))
      .order("desc")
      .take(limit);

    const results: Array<{
      run: any;
      user: { _id: any; name: string; avatarUrl: string | undefined };
    }> = [];
    for (const run of recentRuns) {
      const user = await ctx.db.get(run.userId);
      if (!user) {
        continue;
      }
      results.push({
        run,
        user: {
          _id: user._id,
          name: user.name,
          avatarUrl: user.avatarUrl,
        },
      });
    }
    return results;
  },
});
