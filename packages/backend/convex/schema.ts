import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    emailVerified: v.boolean(),
    image: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
    twoFactorEnabled: v.optional(v.union(v.null(), v.boolean())),
    isAnonymous: v.optional(v.union(v.null(), v.boolean())),
    username: v.optional(v.union(v.null(), v.string())),
    displayUsername: v.optional(v.union(v.null(), v.string())),
    phoneNumber: v.optional(v.union(v.null(), v.string())),
    phoneNumberVerified: v.optional(v.union(v.null(), v.boolean())),
    elo: v.number(),
    settings: v.optional(
      v.object({
        profileVisibility: v.union(
          v.literal("everyone"),
          v.literal("friends_only"),
          v.literal("nobody")
        ),
        showStats: v.boolean(),
        showRunHistory: v.boolean(),
      })
    ),
  })
    .index("by_email", ["email"])
    .index("by_elo", ["elo"]),

  passwords: defineTable({
    userId: v.id("users"),
    hash: v.string(),
    salt: v.string(),
  }).index("by_user", ["userId"]),

  runs: defineTable({
    userId: v.id("users"),
    mode: v.union(v.literal("ranked"), v.literal("social")),
    status: v.union(v.literal("active"), v.literal("completed")),
    distance: v.number(),
    duration: v.number(),
    avgPace: v.number(),
    startedAt: v.number(),
    eloGained: v.optional(v.number()),
    currentUserElo: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    liveRoomId: v.optional(v.id("liveRooms")),

    // Ghost data retained for historical verification of global matches
    opponentId: v.optional(v.id("users")),
    opponentAvgPace: v.optional(v.number()),

    telemetry: v.array(
      v.object({
        timestamp: v.number(),
        lat: v.number(),
        lng: v.number(),
        speed: v.number(),
      })
    ),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_avg_pace", ["status", "avgPace"])
    .index("by_distance", ["status", "distance"])
    .index("by_completed_at", ["status", "completedAt"]),

  squads: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    joinCode: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    isPrivate: v.boolean(),
    memberCount: v.number(),
  })
    .index("by_join_code", ["joinCode"])
    .index("by_created_by", ["createdBy"]),

  squadMemberships: defineTable({
    squadId: v.id("squads"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
    currentStreak: v.number(),
    lastRunAt: v.optional(v.number()),
  })
    .index("by_squad", ["squadId"])
    .index("by_user", ["userId"])
    .index("by_user_squad", ["userId", "squadId"]),

  liveRooms: defineTable({
    code: v.string(),
    createdBy: v.id("users"),
    status: v.union(
      v.literal("lobby"),
      v.literal("running"),
      v.literal("finished")
    ),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    createdAt: v.number(),
    maxParticipants: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_created_by", ["createdBy"]),

  friends: defineTable({
    userId: v.id("users"),
    friendId: v.id("users"),
    requested: v.boolean(),
    sender: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_friend", ["friendId"])
    .index("by_user_friend", ["userId", "friendId"]),

  liveParticipants: defineTable({
    roomId: v.id("liveRooms"),
    userId: v.id("users"),
    runId: v.optional(v.id("runs")),
    status: v.union(
      v.literal("waiting"),
      v.literal("running"),
      v.literal("finished"),
      v.literal("abandoned")
    ),
    distance: v.number(),
    duration: v.number(),
    avgPace: v.number(),
    finishedAt: v.optional(v.number()),
    joinedAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_user", ["roomId", "userId"])
    .index("by_room_status", ["roomId", "status"]),

  ghostChallenges: defineTable({
    hostUserId: v.id("users"),
    targetUserId: v.id("users"),
    runId: v.id("runs"),
    distance: v.number(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("dismissed")),
    createdAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_target", ["targetUserId"])
    .index("by_host", ["hostUserId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("ghostChallenge"), v.literal("liveInvite"), v.literal("generic")),
    data: v.object({
      title: v.string(),
      body: v.string(),
      payload: v.optional(
        v.object({
          challengeId: v.optional(v.id("ghostChallenges")),
          hostUserId: v.optional(v.id("users")),
          runId: v.optional(v.id("runs")),
          distance: v.optional(v.number()),
          roomId: v.optional(v.id("liveRooms")),
        })
      ),
    }),
    read: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
