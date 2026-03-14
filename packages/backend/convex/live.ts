import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 4; i += 1) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

function isPendingInvite(participant: {
  status: "waiting" | "running" | "finished" | "abandoned";
  avgPace: number;
}): boolean {
  return participant.status === "abandoned" && participant.avgPace === -1;
}

export const createLiveRoom = mutation({
  args: { userId: v.id("users") },
  returns: v.object({ roomId: v.id("liveRooms"), code: v.string() }),
  handler: async (ctx, { userId }) => {
    let code = generateRoomCode();
    let existing = await ctx.db
      .query("liveRooms")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    while (existing && existing.status !== "finished") {
      code = generateRoomCode();
      // biome-ignore lint/suspicious/noAwaitInLoop: sequential uniqueness check
      existing = await ctx.db
        .query("liveRooms")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
    }

    const roomId = await ctx.db.insert("liveRooms", {
      code,
      createdBy: userId,
      status: "lobby",
      createdAt: Date.now(),
      maxParticipants: 8,
    });

    await ctx.db.insert("liveParticipants", {
      roomId,
      userId,
      status: "waiting",
      distance: 0,
      duration: 0,
      avgPace: 0,
      joinedAt: Date.now(),
    });

    return { roomId, code };
  },
});

export const joinLiveRoom = mutation({
  args: { userId: v.id("users"), code: v.string() },
  returns: v.union(
    v.object({ success: v.literal(true), roomId: v.id("liveRooms") }),
    v.object({ success: v.literal(false), reason: v.string() })
  ),
  handler: async (ctx, { userId, code }) => {
    const room = await ctx.db
      .query("liveRooms")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .first();

    if (!room) {
      return { success: false as const, reason: "Room not found" };
    }
    if (room.status !== "lobby") {
      return { success: false as const, reason: "Room already started" };
    }

    const participants = await ctx.db
      .query("liveParticipants")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    const existingParticipant = participants.find((p) => p.userId === userId);
    if (existingParticipant) {
      if (isPendingInvite(existingParticipant)) {
        await ctx.db.patch(existingParticipant._id, {
          status: "waiting",
          distance: 0,
          duration: 0,
          avgPace: 0,
          joinedAt: Date.now(),
        });
      }
      return { success: true as const, roomId: room._id };
    }

    const activeParticipantCount = participants.filter((p) => !isPendingInvite(p)).length;
    if (activeParticipantCount >= room.maxParticipants) {
      return { success: false as const, reason: "Room is full" };
    }

    await ctx.db.insert("liveParticipants", {
      roomId: room._id,
      userId,
      status: "waiting",
      distance: 0,
      duration: 0,
      avgPace: 0,
      joinedAt: Date.now(),
    });

    return { success: true as const, roomId: room._id };
  },
});

export const startLiveRoom = mutation({
  args: { roomId: v.id("liveRooms"), hostUserId: v.id("users") },
  returns: v.object({ startedAt: v.number() }),
  handler: async (ctx, { roomId, hostUserId }) => {
    const room = await ctx.db.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    if (room.createdBy !== hostUserId) {
      throw new Error("Only the host can start the race");
    }
    if (room.status !== "lobby") {
      throw new Error("Room is not in lobby state");
    }

    const startedAt = Date.now();
    await ctx.db.patch(roomId, { status: "running", startedAt });

    const participants = await ctx.db
      .query("liveParticipants")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();

    for (const p of participants) {
      if (p.status !== "waiting") {
        continue;
      }
      const runId = await ctx.db.insert("runs", {
        userId: p.userId,
        mode: "social",
        status: "active",
        distance: 0,
        duration: 0,
        avgPace: 0,
        startedAt,
        telemetry: [],
        liveRoomId: roomId,
      });
      // biome-ignore lint/suspicious/noAwaitInLoop: sequential per-participant setup
      await ctx.db.patch(p._id, { status: "running", runId });
    }

    return { startedAt };
  },
});

export const pingLiveProgress = mutation({
  args: {
    roomId: v.id("liveRooms"),
    userId: v.id("users"),
    distance: v.number(),
    duration: v.number(),
    avgPace: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { roomId, userId, distance, duration, avgPace }) => {
    const participant = await ctx.db
      .query("liveParticipants")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", roomId).eq("userId", userId)
      )
      .first();
    if (!participant || participant.status !== "running") {
      return null;
    }
    await ctx.db.patch(participant._id, { distance, duration, avgPace });
    return null;
  },
});

export const finishLiveParticipant = mutation({
  args: {
    roomId: v.id("liveRooms"),
    userId: v.id("users"),
    distance: v.number(),
    duration: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { roomId, userId, distance, duration }) => {
    const participant = await ctx.db
      .query("liveParticipants")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", roomId).eq("userId", userId)
      )
      .first();
    if (!participant) {
      return null;
    }

    const avgPace = distance > 0 ? duration / (distance / 1000) : 0;
    const finishedAt = Date.now();
    await ctx.db.patch(participant._id, {
      status: "finished",
      distance,
      duration,
      avgPace,
      finishedAt,
    });

    if (participant.runId) {
      await ctx.db.patch(participant.runId, {
        status: "completed",
        distance,
        duration,
        avgPace,
        completedAt: finishedAt,
      });
    }

    const stillRunning = await ctx.db
      .query("liveParticipants")
      .withIndex("by_room_status", (q) =>
        q.eq("roomId", roomId).eq("status", "running")
      )
      .first();

    if (!stillRunning) {
      await ctx.db.patch(roomId, { status: "finished", finishedAt });
    }

    return null;
  },
});

export const getLiveRoom = query({
  args: { roomId: v.id("liveRooms") },
  handler: async (ctx, { roomId }) => {
    const room = await ctx.db.get(roomId);
    if (!room) {
      return null;
    }

    const participants = await ctx.db
      .query("liveParticipants")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();

    const enriched = await Promise.all(
      participants
        .filter((p) => !isPendingInvite(p))
        .map(async (p) => {
        const user = await ctx.db.get(p.userId);
        return {
          userId: p.userId,
          name: user?.name ?? "Unknown",
          runId: p.runId,
          status: p.status,
          distance: p.distance,
          duration: p.duration,
          avgPace: p.avgPace,
          finishedAt: p.finishedAt,
        };
        })
    );

    return {
      room: {
        _id: room._id,
        code: room.code,
        status: room.status,
        startedAt: room.startedAt,
        createdBy: room.createdBy,
        maxParticipants: room.maxParticipants,
      },
      participants: enriched,
    };
  },
});

export const requestLiveInvite = mutation({
  args: {
    roomId: v.id("liveRooms"),
    hostUserId: v.id("users"),
    targetUserId: v.id("users"),
    targetDistanceMeters: v.number(),
  },
  returns: v.union(
    v.object({ success: v.literal(true) }),
    v.object({ success: v.literal(false), reason: v.string() })
  ),
  handler: async (
    ctx,
    { roomId, hostUserId, targetUserId, targetDistanceMeters }
  ) => {
    const room = await ctx.db.get(roomId);
    if (!room) {
      return { success: false as const, reason: "Room not found" };
    }
    if (room.createdBy !== hostUserId) {
      return { success: false as const, reason: "Only host can invite" };
    }
    if (room.status === "finished") {
      return { success: false as const, reason: "Room is already finished" };
    }
    if (targetUserId === hostUserId) {
      return { success: false as const, reason: "Cannot invite yourself" };
    }

    const existing = await ctx.db
      .query("liveParticipants")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", roomId).eq("userId", targetUserId)
      )
      .first();

    if (existing) {
      if (
        existing.status === "running" ||
        existing.status === "finished" ||
        existing.status === "waiting"
      ) {
        return {
          success: false as const,
          reason: "User is already in this race",
        };
      }

      await ctx.db.patch(existing._id, {
        status: "abandoned",
        distance: Math.max(1000, targetDistanceMeters),
        duration: 0,
        avgPace: -1,
        joinedAt: Date.now(),
      });
      return { success: true as const };
    }

    await ctx.db.insert("liveParticipants", {
      roomId,
      userId: targetUserId,
      status: "abandoned",
      distance: Math.max(1000, targetDistanceMeters),
      duration: 0,
      avgPace: -1,
      joinedAt: Date.now(),
    });

    return { success: true as const };
  },
});

export const getLiveInvites = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      roomId: v.id("liveRooms"),
      roomCode: v.string(),
      hostUserId: v.id("users"),
      hostName: v.string(),
      createdAt: v.number(),
      targetDistanceMeters: v.number(),
      roomStatus: v.union(v.literal("lobby"), v.literal("running")),
    })
  ),
  handler: async (ctx, { userId }) => {
    const rooms = await ctx.db.query("liveRooms").collect();
    const results: {
      roomId: any;
      roomCode: string;
      hostUserId: any;
      hostName: string;
      createdAt: number;
      targetDistanceMeters: number;
      roomStatus: "lobby" | "running";
    }[] = [];

    for (const room of rooms) {
      if (!(room.status === "lobby" || room.status === "running")) {
        continue;
      }

      const participant = await ctx.db
        .query("liveParticipants")
        .withIndex("by_room_user", (q) =>
          q.eq("roomId", room._id).eq("userId", userId)
        )
        .first();

      if (!(participant && participant.status === "abandoned" && participant.avgPace === -1)) {
        continue;
      }

      const host = await ctx.db.get(room.createdBy);
      results.push({
        roomId: room._id,
        roomCode: room.code,
        hostUserId: room.createdBy,
        hostName: host?.name ?? "Friend",
        createdAt: participant.joinedAt,
        targetDistanceMeters: Math.max(1000, participant.distance),
        roomStatus: room.status,
      });
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const acceptLiveInvite = mutation({
  args: {
    roomId: v.id("liveRooms"),
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      roomId: v.id("liveRooms"),
      roomCode: v.string(),
      targetDistanceMeters: v.number(),
    }),
    v.object({ success: v.literal(false), reason: v.string() })
  ),
  handler: async (ctx, { roomId, userId }) => {
    const room = await ctx.db.get(roomId);
    if (!room) {
      return { success: false as const, reason: "Room not found" };
    }
    if (room.status === "finished") {
      return { success: false as const, reason: "Room has already finished" };
    }

    const participant = await ctx.db
      .query("liveParticipants")
      .withIndex("by_room_user", (q) => q.eq("roomId", roomId).eq("userId", userId))
      .first();

    if (!(participant && participant.status === "abandoned" && participant.avgPace === -1)) {
      return { success: false as const, reason: "Invite not found" };
    }

    const targetDistanceMeters = Math.max(1000, participant.distance);

    if (room.status === "running") {
      const runId = await ctx.db.insert("runs", {
        userId,
        mode: "social",
        status: "active",
        distance: 0,
        duration: 0,
        avgPace: 0,
        startedAt: Date.now(),
        telemetry: [],
        liveRoomId: roomId,
      });

      await ctx.db.patch(participant._id, {
        status: "running",
        runId,
        distance: 0,
        duration: 0,
        avgPace: 0,
        joinedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(participant._id, {
        status: "waiting",
        distance: 0,
        duration: 0,
        avgPace: 0,
        joinedAt: Date.now(),
      });
    }

    return {
      success: true as const,
      roomId,
      roomCode: room.code,
      targetDistanceMeters,
    };
  },
});

export const dismissLiveInvite = mutation({
  args: {
    roomId: v.id("liveRooms"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, { roomId, userId }) => {
    const participant = await ctx.db
      .query("liveParticipants")
      .withIndex("by_room_user", (q) => q.eq("roomId", roomId).eq("userId", userId))
      .first();

    if (participant && participant.status === "abandoned" && participant.avgPace === -1) {
      await ctx.db.delete(participant._id);
    }

    return null;
  },
});
