import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

const JOIN_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateJoinCode(length: number): string {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += JOIN_CODE_CHARS[Math.floor(Math.random() * JOIN_CODE_CHARS.length)];
  }
  return code;
}

export const createSquad = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.object({ squadId: v.id("squads"), joinCode: v.string() }),
  handler: async (ctx, { userId, name, description }) => {
    let joinCode = generateJoinCode(6);
    let existing = await ctx.db
      .query("squads")
      .withIndex("by_join_code", (q) => q.eq("joinCode", joinCode))
      .first();
    while (existing) {
      joinCode = generateJoinCode(6);
      // biome-ignore lint/suspicious/noAwaitInLoop: sequential uniqueness check
      existing = await ctx.db
        .query("squads")
        .withIndex("by_join_code", (q) => q.eq("joinCode", joinCode))
        .first();
    }

    const squadId = await ctx.db.insert("squads", {
      name,
      description,
      joinCode,
      createdBy: userId,
      createdAt: Date.now(),
      memberCount: 1,
    });

    await ctx.db.insert("squadMemberships", {
      squadId,
      userId,
      role: "admin",
      joinedAt: Date.now(),
      currentStreak: 0,
    });

    return { squadId, joinCode };
  },
});

export const joinSquad = mutation({
  args: { userId: v.id("users"), joinCode: v.string() },
  returns: v.union(
    v.object({ success: v.literal(true), squadId: v.id("squads") }),
    v.object({ success: v.literal(false), reason: v.string() })
  ),
  handler: async (ctx, { userId, joinCode }) => {
    const squad = await ctx.db
      .query("squads")
      .withIndex("by_join_code", (q) =>
        q.eq("joinCode", joinCode.toUpperCase())
      )
      .first();
    if (!squad) {
      return { success: false as const, reason: "Squad not found" };
    }

    const existing = await ctx.db
      .query("squadMemberships")
      .withIndex("by_user_squad", (q) =>
        q.eq("userId", userId).eq("squadId", squad._id)
      )
      .first();
    if (existing) {
      return { success: true as const, squadId: squad._id };
    }

    await ctx.db.insert("squadMemberships", {
      squadId: squad._id,
      userId,
      role: "member",
      joinedAt: Date.now(),
      currentStreak: 0,
    });
    await ctx.db.patch(squad._id, { memberCount: squad.memberCount + 1 });

    return { success: true as const, squadId: squad._id };
  },
});

export const leaveSquad = mutation({
  args: { userId: v.id("users"), squadId: v.id("squads") },
  returns: v.null(),
  handler: async (ctx, { userId, squadId }) => {
    const membership = await ctx.db
      .query("squadMemberships")
      .withIndex("by_user_squad", (q) =>
        q.eq("userId", userId).eq("squadId", squadId)
      )
      .first();
    if (!membership) {
      throw new Error("Not a member of this squad");
    }
    await ctx.db.delete(membership._id);
    const squad = await ctx.db.get(squadId);
    if (squad) {
      await ctx.db.patch(squadId, {
        memberCount: Math.max(0, squad.memberCount - 1),
      });
    }
    return null;
  },
});

export const getUserSquads = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      squadId: v.id("squads"),
      name: v.string(),
      joinCode: v.string(),
      memberCount: v.number(),
      role: v.union(v.literal("admin"), v.literal("member")),
      joinedAt: v.number(),
    })
  ),
  handler: async (ctx, { userId }) => {
    const memberships = await ctx.db
      .query("squadMemberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const results: {
      squadId: Id<"squads">;
      name: string;
      joinCode: string;
      memberCount: number;
      role: "admin" | "member";
      joinedAt: number;
    }[] = [];

    for (const m of memberships) {
      const squad = await ctx.db.get(m.squadId);
      if (!squad) {
        continue;
      }
      results.push({
        squadId: squad._id,
        name: squad.name,
        joinCode: squad.joinCode,
        memberCount: squad.memberCount,
        role: m.role,
        joinedAt: m.joinedAt,
      });
    }
    return results;
  },
});

export const getSquad = query({
  args: { squadId: v.id("squads") },
  handler: async (ctx, { squadId }) => ctx.db.get(squadId),
});

/** Join a squad directly by ID — no join code needed for squads. */
export const joinSquadById = mutation({
  args: { userId: v.id("users"), squadId: v.id("squads") },
  returns: v.union(
    v.object({ success: v.literal(true), squadId: v.id("squads") }),
    v.object({ success: v.literal(false), reason: v.string() })
  ),
  handler: async (ctx, { userId, squadId }) => {
    const squad = await ctx.db.get(squadId);
    if (!squad) {
      return { success: false as const, reason: "Squad not found" };
    }
    const existing = await ctx.db
      .query("squadMemberships")
      .withIndex("by_user_squad", (q) =>
        q.eq("userId", userId).eq("squadId", squadId)
      )
      .first();
    if (existing) {
      return { success: true as const, squadId: squad._id };
    }
    await ctx.db.insert("squadMemberships", {
      squadId: squad._id,
      userId,
      role: "member",
      joinedAt: Date.now(),
      currentStreak: 0,
    });
    await ctx.db.patch(squadId, { memberCount: squad.memberCount + 1 });
    return { success: true as const, squadId: squad._id };
  },
});

/** Browse all squads — for join-without-code flow. */
export const getAllSquads = query({
  args: { userId: v.optional(v.id("users")) },
  returns: v.array(
    v.object({
      squadId: v.id("squads"),
      name: v.string(),
      description: v.optional(v.string()),
      memberCount: v.number(),
      isMember: v.boolean(),
    })
  ),
  handler: async (ctx, { userId }) => {
    const squads = await ctx.db.query("squads").collect();

    const results: {
      squadId: Id<"squads">;
      name: string;
      description: string | undefined;
      memberCount: number;
      isMember: boolean;
    }[] = [];

    for (const squad of squads) {
      let isMember = false;
      if (userId) {
        const membership = await ctx.db
          .query("squadMemberships")
          .withIndex("by_user_squad", (q) =>
            q.eq("userId", userId).eq("squadId", squad._id)
          )
          .first();
        isMember = membership !== null;
      }
      results.push({
        squadId: squad._id,
        name: squad.name,
        description: squad.description,
        memberCount: squad.memberCount,
        isMember,
      });
    }
    return results;
  },
});

export const getSquadLeaderboard = query({
  args: {
    squadId: v.id("squads"),
    sortBy: v.union(
      v.literal("streak"),
      v.literal("distance"),
      v.literal("pace")
    ),
  },
  returns: v.array(
    v.object({
      userId: v.id("users"),
      name: v.string(),
      streak: v.number(),
      totalDistance: v.number(),
      bestPace: v.number(),
    })
  ),
  handler: async (ctx, { squadId, sortBy }) => {
    const memberships = await ctx.db
      .query("squadMemberships")
      .withIndex("by_squad", (q) => q.eq("squadId", squadId))
      .collect();

    const rows: {
      userId: Id<"users">;
      name: string;
      streak: number;
      totalDistance: number;
      bestPace: number;
    }[] = [];

    for (const m of memberships) {
      const user = await ctx.db.get(m.userId);
      if (!user) {
        continue;
      }
      const runs = await ctx.db
        .query("runs")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", m.userId).eq("status", "completed")
        )
        .collect();

      let totalDistance = 0;
      let bestPace = 0;
      for (const run of runs) {
        totalDistance += run.distance;
        if (run.avgPace > 0 && (bestPace === 0 || run.avgPace < bestPace)) {
          bestPace = run.avgPace;
        }
      }

      rows.push({
        userId: m.userId,
        name: user.name,
        streak: m.currentStreak,
        totalDistance,
        bestPace,
      });
    }

    rows.sort((a, b) => {
      if (sortBy === "streak") {
        return b.streak - a.streak;
      }
      if (sortBy === "distance") {
        return b.totalDistance - a.totalDistance;
      }
      if (a.bestPace === 0) {
        return 1;
      }
      if (b.bestPace === 0) {
        return -1;
      }
      return a.bestPace - b.bestPace;
    });

    return rows;
  },
});
