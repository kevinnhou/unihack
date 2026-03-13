import { internalMutation } from "./_generated/server";

const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

/**
 * Reset the streak counter for any user whose lastRunDate is more than
 * 48 hours ago (they missed a day). Called nightly by the cron.
 */
export const resetBrokenStreaks = internalMutation({
  args: {},
  async handler(ctx) {
    const cutoff = Date.now() - FORTY_EIGHT_HOURS;
    const users = await ctx.db.query("users").collect();

    for (const user of users) {
      if (
        user.currentStreak > 0 &&
        user.lastRunDate &&
        user.lastRunDate < cutoff
      ) {
        await ctx.db.patch(user._id, { currentStreak: 0 });
      }
    }
  },
});

/**
 * Reset weeklyDistance for all squad members at the start of each week.
 * Also updates squad streakCounter if any member ran last week.
 */
export const resetSquadWeeklyDistance = internalMutation({
  args: {},
  async handler(ctx) {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const members = await ctx.db.query("squadMembers").collect();

    const activeSquads = new Set<string>();
    for (const member of members) {
      if (member.lastActivityDate && member.lastActivityDate >= weekAgo) {
        activeSquads.add(String(member.squadId));
      }
    }

    for (const member of members) {
      await ctx.db.patch(member._id, { weeklyDistance: 0 });
    }

    const squads = await ctx.db.query("squads").collect();
    for (const squad of squads) {
      if (activeSquads.has(String(squad._id))) {
        await ctx.db.patch(squad._id, {
          streakCounter: squad.streakCounter + 1,
        });
      } else {
        await ctx.db.patch(squad._id, { streakCounter: 0 });
      }
    }
  },
});
