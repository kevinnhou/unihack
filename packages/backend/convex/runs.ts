import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const TEST_EMAIL = "test@pinfire.run";

export const createTestUser = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", TEST_EMAIL))
      .first();
    if (existing) {
      return existing._id;
    }
    return await ctx.db.insert("users", {
      name: "Test Runner",
      email: TEST_EMAIL,
      emailVerified: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getTestUserId = query({
  args: {},
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", TEST_EMAIL))
      .first();
    return user?._id ?? null;
  },
});

export const startRun = mutation({
  args: {
    userId: v.id("users"),
    mode: v.union(v.literal("ranked"), v.literal("social")),
  },
  returns: v.id("runs"),
  handler: async (ctx, { userId, mode }) =>
    await ctx.db.insert("runs", {
      userId,
      mode,
      status: "active",
      distance: 0,
      duration: 0,
      avgPace: 0,
      startedAt: Date.now(),
      telemetry: [],
    }),
});

export const updateTelemetry = mutation({
  args: {
    runId: v.id("runs"),
    lat: v.number(),
    lng: v.number(),
    speed: v.number(),
    distance: v.number(),
    duration: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { runId, lat, lng, speed, distance, duration }) => {
    const run = await ctx.db.get(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }
    if (run.status === "completed") {
      return null;
    }
    await ctx.db.patch(runId, {
      distance,
      duration,
      telemetry: [...run.telemetry, { timestamp: Date.now(), lat, lng, speed }],
    });
    return null;
  },
});

export const endRun = mutation({
  args: {
    runId: v.id("runs"),
    distance: v.number(),
    duration: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { runId, distance, duration }) => {
    const run = await ctx.db.get(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }
    const avgPace = distance > 0 ? duration / (distance / 1000) : 0;
    await ctx.db.patch(runId, {
      status: "completed",
      distance,
      duration,
      avgPace,
      completedAt: Date.now(),
    });
    return null;
  },
});

export const getUserRuns = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) =>
    await ctx.db
      .query("runs")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "completed")
      )
      .order("desc")
      .take(20),
});

export const getGhostRun = query({
  args: {
    userId: v.id("users"),
    mode: v.union(v.literal("ranked"), v.literal("social")),
  },
  handler: async (ctx, { userId, mode }) => {
    const runs = await ctx.db
      .query("runs")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "completed")
      )
      .collect();

    let best: (typeof runs)[0] | null = null;
    for (const run of runs) {
      if (run.mode !== mode) {
        continue;
      }
      if (best === null || run.avgPace < best.avgPace) {
        best = run;
      }
    }
    return best;
  },
});
