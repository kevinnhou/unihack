/** biome-ignore-all lint/suspicious/noExplicitAny: Convex ctx is typed as any */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

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
    throw new Error("User profile not found");
  }
  return user;
}

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ---------------------------------------------------------------------------
// Squad CRUD
// ---------------------------------------------------------------------------

export const createSquad = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.object({ squadId: v.id("squads"), inviteCode: v.string() }),
  async handler(ctx, { name, description }) {
    const user = await requireUser(ctx);

    const inviteCode = generateInviteCode();

    const squadId = await ctx.db.insert("squads", {
      name,
      description,
      createdAt: Date.now(),
      createdBy: user._id,
      streakCounter: 0,
      inviteCode,
    });

    await ctx.db.insert("squadMembers", {
      squadId,
      userId: user._id,
      role: "admin",
      joinedAt: Date.now(),
      weeklyDistance: 0,
    });

    return { squadId, inviteCode };
  },
});

export const joinSquad = mutation({
  args: { inviteCode: v.string() },
  returns: v.union(v.id("squads"), v.null()),
  async handler(ctx, { inviteCode }) {
    const user = await requireUser(ctx);

    const squad = await ctx.db
      .query("squads")
      .withIndex("by_inviteCode", (q) =>
        q.eq("inviteCode", inviteCode.toUpperCase())
      )
      .unique();
    if (!squad) {
      return null;
    }

    const already = await ctx.db
      .query("squadMembers")
      .withIndex("by_squad_user", (q) =>
        q.eq("squadId", squad._id).eq("userId", user._id)
      )
      .unique();
    if (already) {
      return squad._id;
    }

    await ctx.db.insert("squadMembers", {
      squadId: squad._id,
      userId: user._id,
      role: "member",
      joinedAt: Date.now(),
      weeklyDistance: 0,
    });

    return squad._id;
  },
});

export const leaveSquad = mutation({
  args: { squadId: v.id("squads") },
  async handler(ctx, { squadId }) {
    const user = await requireUser(ctx);

    const membership = await ctx.db
      .query("squadMembers")
      .withIndex("by_squad_user", (q) =>
        q.eq("squadId", squadId).eq("userId", user._id)
      )
      .unique();
    if (!membership) {
      throw new Error("Not a member");
    }
    await ctx.db.delete(membership._id);
  },
});

// ---------------------------------------------------------------------------
// Challenges
// ---------------------------------------------------------------------------

export const createChallenge = mutation({
  args: {
    squadId: v.id("squads"),
    type: v.union(
      v.literal("distance"),
      v.literal("speed"),
      v.literal("streak")
    ),
    target: v.number(),
    title: v.string(),
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.id("challenges"),
  async handler(ctx, args) {
    const user = await requireUser(ctx);

    const membership = await ctx.db
      .query("squadMembers")
      .withIndex("by_squad_user", (q) =>
        q.eq("squadId", args.squadId).eq("userId", user._id)
      )
      .unique();
    if (!membership) {
      throw new Error("Not a member of this squad");
    }

    return await ctx.db.insert("challenges", {
      squadId: args.squadId,
      createdBy: user._id,
      type: args.type,
      target: args.target,
      title: args.title,
      startDate: args.startDate,
      endDate: args.endDate,
    });
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getMySquads = query({
  args: {},
  returns: v.array(
    v.object({
      squad: v.object({
        _id: v.id("squads"),
        name: v.string(),
        description: v.optional(v.string()),
        streakCounter: v.number(),
        inviteCode: v.string(),
        createdAt: v.number(),
        createdBy: v.id("users"),
      }),
      myRole: v.union(v.literal("admin"), v.literal("member")),
      memberCount: v.number(),
    })
  ),
  async handler(ctx) {
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

    const memberships = await ctx.db
      .query("squadMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const result: Array<{
      squad: {
        _id: any;
        name: string;
        description: string | undefined;
        streakCounter: number;
        inviteCode: string;
        createdAt: number;
        createdBy: any;
      };
      myRole: "admin" | "member";
      memberCount: number;
    }> = [];
    for (const m of memberships) {
      const squad = await ctx.db.get(m.squadId);
      if (!squad) {
        continue;
      }

      const allMembers = await ctx.db
        .query("squadMembers")
        .withIndex("by_squad", (q) => q.eq("squadId", m.squadId))
        .collect();

      result.push({
        squad: {
          _id: squad._id,
          name: squad.name,
          description: squad.description,
          streakCounter: squad.streakCounter,
          inviteCode: squad.inviteCode,
          createdAt: squad.createdAt,
          createdBy: squad.createdBy,
        },
        myRole: m.role,
        memberCount: allMembers.length,
      });
    }
    return result;
  },
});

export const getSquadDetail = query({
  args: { squadId: v.id("squads") },
  returns: v.union(
    v.object({
      squad: v.object({
        _id: v.id("squads"),
        name: v.string(),
        description: v.optional(v.string()),
        streakCounter: v.number(),
        inviteCode: v.string(),
        createdAt: v.number(),
        createdBy: v.id("users"),
      }),
      members: v.array(
        v.object({
          userId: v.id("users"),
          name: v.string(),
          avatarUrl: v.optional(v.string()),
          role: v.union(v.literal("admin"), v.literal("member")),
          weeklyDistance: v.number(),
          currentStreak: v.number(),
        })
      ),
      challenges: v.array(
        v.object({
          _id: v.id("challenges"),
          title: v.string(),
          type: v.union(
            v.literal("distance"),
            v.literal("speed"),
            v.literal("streak")
          ),
          target: v.number(),
          startDate: v.number(),
          endDate: v.number(),
        })
      ),
    }),
    v.null()
  ),
  async handler(ctx, { squadId }) {
    const squad = await ctx.db.get(squadId);
    if (!squad) {
      return null;
    }

    const memberships = await ctx.db
      .query("squadMembers")
      .withIndex("by_squad", (q) => q.eq("squadId", squadId))
      .collect();

    const members: Array<{
      userId: any;
      name: string;
      avatarUrl: string | undefined;
      role: "admin" | "member";
      weeklyDistance: number;
      currentStreak: number;
    }> = [];
    for (const m of memberships) {
      const user = await ctx.db.get(m.userId);
      if (!user) {
        continue;
      }
      members.push({
        userId: m.userId,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: m.role,
        weeklyDistance: m.weeklyDistance,
        currentStreak: user.currentStreak,
      });
    }

    const now = Date.now();
    const allChallenges = await ctx.db
      .query("challenges")
      .withIndex("by_squad", (q) => q.eq("squadId", squadId))
      .collect();

    const activeChallenges = allChallenges
      .filter((c) => c.endDate >= now)
      .map((c) => ({
        _id: c._id,
        title: c.title,
        type: c.type,
        target: c.target,
        startDate: c.startDate,
        endDate: c.endDate,
      }));

    return {
      squad: {
        _id: squad._id,
        name: squad.name,
        description: squad.description,
        streakCounter: squad.streakCounter,
        inviteCode: squad.inviteCode,
        createdAt: squad.createdAt,
        createdBy: squad.createdBy,
      },
      members,
      challenges: activeChallenges,
    };
  },
});
