/** biome-ignore-all lint/suspicious/noExplicitAny: Convex ctx is typed as any */
import { v } from "convex/values";
import { query } from "./_generated/server";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;

type Period = "daily" | "weekly" | "monthly";

function periodStart(period: Period): number {
  const now = Date.now();
  if (period === "daily") {
    return now - DAY_MS;
  }
  if (period === "weekly") {
    return now - WEEK_MS;
  }
  return now - MONTH_MS;
}

// ---------------------------------------------------------------------------
// Global Ranked Leaderboard (total Elo)
// ---------------------------------------------------------------------------

export const getEloLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      rank: v.number(),
      userId: v.id("users"),
      name: v.string(),
      avatarUrl: v.optional(v.string()),
      totalElo: v.number(),
      winCount: v.number(),
      lossCount: v.number(),
    })
  ),
  async handler(ctx, { limit = 50 }) {
    const users = await ctx.db
      .query("users")
      .withIndex("by_totalElo")
      .order("desc")
      .take(limit);

    return users.map(
      (
        u: {
          _id: any;
          name: string;
          avatarUrl?: string;
          totalElo: number;
          winCount: number;
          lossCount: number;
        },
        i: number
      ) => ({
        rank: i + 1,
        userId: u._id,
        name: u.name,
        avatarUrl: u.avatarUrl,
        totalElo: u.totalElo,
        winCount: u.winCount,
        lossCount: u.lossCount,
      })
    );
  },
});

// ---------------------------------------------------------------------------
// Distance Leaderboard (most km in period)
// ---------------------------------------------------------------------------

export const getDistanceLeaderboard = query({
  args: {
    period: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly")
    ),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      rank: v.number(),
      userId: v.id("users"),
      name: v.string(),
      avatarUrl: v.optional(v.string()),
      totalDistance: v.number(),
      runCount: v.number(),
    })
  ),
  async handler(ctx, { period, limit = 50 }) {
    const since = periodStart(period);

    const runs: any[] = await ctx.db
      .query("runs")
      .withIndex("by_type_startedAt", (q: any) => q.eq("type", "ranked"))
      .order("desc")
      .filter((q: any) =>
        q.and(
          q.gte(q.field("startedAt"), since),
          q.neq(q.field("finishedAt"), undefined)
        )
      )
      .take(2000);

    const userMap = new Map<
      string,
      { totalDistance: number; runCount: number; userId: any }
    >();
    for (const run of runs) {
      const key = String(run.userId);
      const existing = userMap.get(key) ?? {
        totalDistance: 0,
        runCount: 0,
        userId: run.userId,
      };
      userMap.set(key, {
        ...existing,
        totalDistance: existing.totalDistance + run.distance,
        runCount: existing.runCount + 1,
      });
    }

    const sorted = Array.from(userMap.values())
      .sort((a, b) => b.totalDistance - a.totalDistance)
      .slice(0, limit);

    const result: Array<{
      rank: number;
      userId: any;
      name: string;
      avatarUrl: string | undefined;
      totalDistance: number;
      runCount: number;
    }> = [];
    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      const user = await ctx.db.get(entry.userId);
      if (!user) {
        continue;
      }
      result.push({
        rank: i + 1,
        userId: entry.userId,
        name: (user as any).name,
        avatarUrl: (user as any).avatarUrl,
        totalDistance: entry.totalDistance,
        runCount: entry.runCount,
      });
    }
    return result;
  },
});

// ---------------------------------------------------------------------------
// Speed Leaderboard (best avg pace in period)
// ---------------------------------------------------------------------------

export const getSpeedLeaderboard = query({
  args: {
    period: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly")
    ),
    targetDistance: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      rank: v.number(),
      userId: v.id("users"),
      name: v.string(),
      avatarUrl: v.optional(v.string()),
      bestPaceSecondsPerKm: v.number(),
      distance: v.number(),
      durationSeconds: v.number(),
    })
  ),
  async handler(ctx, { period, targetDistance, limit = 50 }) {
    const since = periodStart(period);
    const distanceTolerance =
      targetDistance !== undefined ? targetDistance * 0.05 : null;

    const runs: any[] = await ctx.db
      .query("runs")
      .withIndex("by_type_startedAt", (q: any) => q.eq("type", "ranked"))
      .order("desc")
      .filter((q: any) =>
        q.and(
          q.gte(q.field("startedAt"), since),
          q.neq(q.field("finishedAt"), undefined)
        )
      )
      .take(2000);

    const bestMap = new Map<
      string,
      { pace: number; distance: number; durationSeconds: number; userId: any }
    >();

    for (const run of runs) {
      if (run.distance === 0) {
        continue;
      }
      if (
        distanceTolerance !== null &&
        targetDistance !== undefined &&
        Math.abs(run.distance - targetDistance) > distanceTolerance
      ) {
        continue;
      }

      const pace = run.durationSeconds / (run.distance / 1000);
      const key = String(run.userId);
      const existing = bestMap.get(key);
      if (!existing || pace < existing.pace) {
        bestMap.set(key, {
          pace,
          distance: run.distance,
          durationSeconds: run.durationSeconds,
          userId: run.userId,
        });
      }
    }

    const sorted = Array.from(bestMap.values())
      .sort((a, b) => a.pace - b.pace)
      .slice(0, limit);

    const result: Array<{
      rank: number;
      userId: any;
      name: string;
      avatarUrl: string | undefined;
      bestPaceSecondsPerKm: number;
      distance: number;
      durationSeconds: number;
    }> = [];
    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      const user = await ctx.db.get(entry.userId);
      if (!user) {
        continue;
      }
      result.push({
        rank: i + 1,
        userId: entry.userId,
        name: (user as any).name,
        avatarUrl: (user as any).avatarUrl,
        bestPaceSecondsPerKm: Math.round(entry.pace),
        distance: entry.distance,
        durationSeconds: entry.durationSeconds,
      });
    }
    return result;
  },
});

// ---------------------------------------------------------------------------
// Squad leaderboard (weekly distance, participation)
// ---------------------------------------------------------------------------

export const getSquadLeaderboard = query({
  args: { squadId: v.id("squads"), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      rank: v.number(),
      userId: v.id("users"),
      name: v.string(),
      avatarUrl: v.optional(v.string()),
      weeklyDistance: v.number(),
      currentStreak: v.number(),
    })
  ),
  async handler(ctx, { squadId, limit = 50 }) {
    const members = await ctx.db
      .query("squadMembers")
      .withIndex("by_squad", (q) => q.eq("squadId", squadId))
      .collect();

    const entries: Array<{
      userId: any;
      name: string;
      avatarUrl: string | undefined;
      weeklyDistance: number;
      currentStreak: number;
    }> = [];
    for (const m of members) {
      const user = await ctx.db.get(m.userId);
      if (!user) {
        continue;
      }
      entries.push({
        userId: m.userId,
        name: (user as any).name,
        avatarUrl: (user as any).avatarUrl,
        weeklyDistance: m.weeklyDistance,
        currentStreak: (user as any).currentStreak,
      });
    }

    return entries
      .sort((a, b) => b.weeklyDistance - a.weeklyDistance)
      .slice(0, limit)
      .map((e, i) => ({ rank: i + 1, ...e }));
  },
});
