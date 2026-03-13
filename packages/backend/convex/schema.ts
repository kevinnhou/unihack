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
  }).index("by_email", ["email"]),

  runs: defineTable({
    userId: v.id("users"),
    mode: v.union(v.literal("ranked"), v.literal("social")),
    status: v.union(v.literal("active"), v.literal("completed")),
    distance: v.number(),
    duration: v.number(),
    avgPace: v.number(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
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
    .index("by_user_status", ["userId", "status"]),
});
