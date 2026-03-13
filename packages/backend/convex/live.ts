/** biome-ignore-all lint/suspicious/noExplicitAny: Convex ctx is typed as any */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

/** Resolve auth → app user, throwing if not found. */
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

/** Generate a random 6-character alphanumeric room code. */
function generateCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ---------------------------------------------------------------------------
// Room management
// ---------------------------------------------------------------------------

/** Create a new live race room and return the invite code. */
export const createRoom = mutation({
  args: { distance: v.number() },
  returns: v.object({
    roomId: v.id("liveRooms"),
    code: v.string(),
  }),
  async handler(ctx, { distance }) {
    const user = await requireUser(ctx);

    let code = generateCode();
    let existing = await ctx.db
      .query("liveRooms")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    while (existing) {
      code = generateCode();
      existing = await ctx.db
        .query("liveRooms")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
    }

    const roomId = await ctx.db.insert("liveRooms", {
      code,
      hostUserId: user._id,
      distance,
      status: "lobby",
      createdAt: Date.now(),
    });

    await ctx.db.insert("liveRoomMembers", {
      roomId,
      userId: user._id,
      joinedAt: Date.now(),
    });

    return { roomId, code };
  },
});

/** Join an existing live room by invite code. */
export const joinRoom = mutation({
  args: { code: v.string() },
  returns: v.union(
    v.object({ roomId: v.id("liveRooms"), distance: v.number() }),
    v.null()
  ),
  async handler(ctx, { code }) {
    const user = await requireUser(ctx);

    const room = await ctx.db
      .query("liveRooms")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .unique();
    if (!room || room.status !== "lobby") {
      return null;
    }

    const alreadyMember = await ctx.db
      .query("liveRoomMembers")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", room._id).eq("userId", user._id)
      )
      .unique();

    if (!alreadyMember) {
      await ctx.db.insert("liveRoomMembers", {
        roomId: room._id,
        userId: user._id,
        joinedAt: Date.now(),
      });
    }

    return { roomId: room._id, distance: room.distance };
  },
});

/**
 * Host starts the race: persists a synchronized startTime and flips status
 * to inProgress. All clients derive their timer from this value.
 */
export const startRoom = mutation({
  args: { roomId: v.id("liveRooms") },
  async handler(ctx, { roomId }) {
    const user = await requireUser(ctx);

    const room = await ctx.db.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    if (room.hostUserId !== user._id) {
      throw new Error("Only the host can start");
    }
    if (room.status !== "lobby") {
      throw new Error("Race already started");
    }

    await ctx.db.patch(roomId, {
      status: "inProgress",
      startTime: Date.now(),
    });
  },
});

/** Finish / close the room once all members are done. */
export const finishRoom = mutation({
  args: { roomId: v.id("liveRooms") },
  async handler(ctx, { roomId }) {
    const user = await requireUser(ctx);
    const room = await ctx.db.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    if (room.hostUserId !== user._id) {
      throw new Error("Only the host can finish");
    }
    await ctx.db.patch(roomId, { status: "finished" });
  },
});

// ---------------------------------------------------------------------------
// Progress pinging
// ---------------------------------------------------------------------------

/**
 * Lightweight upsert called every 3–5s by each runner during a live race.
 * Convex real-time subscriptions propagate the update to all room members.
 */
export const pingProgress = mutation({
  args: {
    roomId: v.id("liveRooms"),
    distance: v.number(),
    durationSeconds: v.number(),
  },
  async handler(ctx, args) {
    const user = await requireUser(ctx);

    const existing = await ctx.db
      .query("liveProgress")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", user._id)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        distance: args.distance,
        durationSeconds: args.durationSeconds,
        lastPingAt: Date.now(),
      });
    } else {
      await ctx.db.insert("liveProgress", {
        roomId: args.roomId,
        userId: user._id,
        distance: args.distance,
        durationSeconds: args.durationSeconds,
        lastPingAt: Date.now(),
      });
    }
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Subscribe to room state (status, startTime, distance). */
export const getRoom = query({
  args: { roomId: v.id("liveRooms") },
  returns: v.union(
    v.object({
      _id: v.id("liveRooms"),
      _creationTime: v.number(),
      code: v.string(),
      hostUserId: v.id("users"),
      distance: v.number(),
      status: v.union(
        v.literal("lobby"),
        v.literal("inProgress"),
        v.literal("finished")
      ),
      startTime: v.optional(v.number()),
      createdAt: v.number(),
    }),
    v.null()
  ),
  async handler(ctx, { roomId }) {
    return await ctx.db.get(roomId);
  },
});

/** Subscribe to all members' progress in a room for the live HUD. */
export const getRoomProgress = query({
  args: { roomId: v.id("liveRooms") },
  returns: v.array(
    v.object({
      userId: v.id("users"),
      name: v.string(),
      avatarUrl: v.optional(v.string()),
      distance: v.number(),
      durationSeconds: v.number(),
      lastPingAt: v.number(),
    })
  ),
  async handler(ctx, { roomId }) {
    const progresses = await ctx.db
      .query("liveProgress")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();

    const result: Array<{
      userId: any;
      name: string;
      avatarUrl: string | undefined;
      distance: number;
      durationSeconds: number;
      lastPingAt: number;
    }> = [];
    for (const p of progresses) {
      const user = await ctx.db.get(p.userId);
      if (!user) {
        continue;
      }
      result.push({
        userId: p.userId,
        name: user.name,
        avatarUrl: user.avatarUrl,
        distance: p.distance,
        durationSeconds: p.durationSeconds,
        lastPingAt: p.lastPingAt,
      });
    }
    return result;
  },
});

/** Get all members in a lobby room. */
export const getRoomMembers = query({
  args: { roomId: v.id("liveRooms") },
  returns: v.array(
    v.object({
      userId: v.id("users"),
      name: v.string(),
      avatarUrl: v.optional(v.string()),
      isHost: v.boolean(),
      joinedAt: v.number(),
    })
  ),
  async handler(ctx, { roomId }) {
    const room = await ctx.db.get(roomId);
    const members = await ctx.db
      .query("liveRoomMembers")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();

    const result: Array<{
      userId: any;
      name: string;
      avatarUrl: string | undefined;
      isHost: boolean;
      joinedAt: number;
    }> = [];
    for (const m of members) {
      const user = await ctx.db.get(m.userId);
      if (!user) {
        continue;
      }
      result.push({
        userId: m.userId,
        name: user.name,
        avatarUrl: user.avatarUrl,
        isHost: room?.hostUserId === m.userId,
        joinedAt: m.joinedAt,
      });
    }
    return result;
  },
});
