import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Reset streaks for users who haven't run in more than 24 hours.
 * Runs daily at 02:00 UTC.
 */
crons.daily(
  "reset-broken-streaks",
  { hourUTC: 2, minuteUTC: 0 },
  internal.streaks.resetBrokenStreaks
);

/**
 * Reset squad weekly distance counters every Monday at 00:05 UTC.
 */
crons.weekly(
  "reset-squad-weekly-distance",
  { dayOfWeek: "monday", hourUTC: 0, minuteUTC: 5 },
  internal.streaks.resetSquadWeeklyDistance
);

export default crons;
