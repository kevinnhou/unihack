import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({

    userName: v.string(),
    email: v.string(),
    password: v.string(),

    elo: v.number(),
    streak: v.number(),

    allTimeWins: v.number(),
    allTimeLosses: v.number(),

    dailyDistance: v.number(),
    weeklyDistance: v.number(),
    monthlyDistance: v.number(),

    dailySpeed: v.number(),
    weeklySpeed: v.number(),
    monthlySpeed: v.number(),

  }),

  liveRaces: defineTable({
    raceId: v.string(),

    userAId: v.id("users"),
    userBId: v.id("users"),

    userADistance: v.number(),
    userBDistance: v.number(),

    raceDistance: v.number(),
  }),

  finishedRaces: defineTable({
    userId: v.id("users"),
    raceId: v.string(),

    time: v.number(),
    distance: v.number(),
    pace: v.number(),
  }),

  friends: defineTable({
    aFriendId: v.id("users"),
    bFriendId: v.id("users"),

    h2hAWins: v.number(),
    h2hBWins: v.number(),
  }),

  groups: defineTable({
    dateCreated: v.number(),

    weeklyDistanceGoal: v.number(),
    monthlyDistanceGoal: v.number(),
  }),

  groupLinking: defineTable({
    userId: v.id("users"),
    groupId: v.id("groups"),
  }),
});
