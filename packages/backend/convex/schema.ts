import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  /**
   * Application user profiles — keyed by the better-auth user ID.
   * better-auth manages its own user/session tables internally;
   * we store game-specific fields here and join on authId.
   */
  users: defineTable({
    authId: v.string(),
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    totalElo: v.number(),
    winCount: v.number(),
    lossCount: v.number(),
    currentStreak: v.number(),
    lastRunDate: v.optional(v.number()),
  })
    .index("by_authId", ["authId"])
    .index("by_totalElo", ["totalElo"]),

  squads: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    createdBy: v.id("users"),
    streakCounter: v.number(),
    inviteCode: v.string(),
  })
    .index("by_inviteCode", ["inviteCode"])
    .index("by_createdBy", ["createdBy"]),

  squadMembers: defineTable({
    squadId: v.id("squads"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
    weeklyDistance: v.number(),
    lastActivityDate: v.optional(v.number()),
  })
    .index("by_squad", ["squadId"])
    .index("by_user", ["userId"])
    .index("by_squad_user", ["squadId", "userId"]),

  /**
   * Central ledger for all run records.
   * telemetryStorageId: Convex file storage ID for payloads > 1MB.
   * telemetry: embedded array for payloads that fit within the 1MB doc limit.
   */
  runs: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("ranked"), v.literal("social"), v.literal("live")),
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
    telemetry: v.optional(
      v.array(
        v.object({
          timestamp: v.number(),
          lat: v.number(),
          lng: v.number(),
          speed: v.number(),
        })
      )
    ),
    telemetryStorageId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_startedAt", ["userId", "startedAt"])
    .index("by_type_startedAt", ["type", "startedAt"])
    .index("by_user_type", ["userId", "type"]),

  /**
   * Live race rooms. Participants join before the race starts.
   * startTime is set by the host; all clients use it as the universal reference.
   */
  liveRooms: defineTable({
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
  }).index("by_code", ["code"]),

  liveRoomMembers: defineTable({
    roomId: v.id("liveRooms"),
    userId: v.id("users"),
    joinedAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_user", ["roomId", "userId"]),

  /**
   * Lightweight real-time progress pings during a live race.
   * Updated by each client every 3–5 seconds.
   */
  liveProgress: defineTable({
    roomId: v.id("liveRooms"),
    userId: v.id("users"),
    distance: v.number(),
    durationSeconds: v.number(),
    lastPingAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_user", ["roomId", "userId"]),

  challenges: defineTable({
    squadId: v.id("squads"),
    createdBy: v.id("users"),
    type: v.union(
      v.literal("distance"),
      v.literal("speed"),
      v.literal("streak")
    ),
    target: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    title: v.string(),
  })
    .index("by_squad", ["squadId"])
    .index("by_squad_date", ["squadId", "startDate"]),
});
