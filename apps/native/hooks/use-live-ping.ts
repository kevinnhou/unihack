import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useRef } from "react";
import { useRunStore } from "@/stores/run-store";

const DEFAULT_PING_INTERVAL_MS = 3000;

export function useLivePing({
  roomId,
  userId,
  pingIntervalMs = DEFAULT_PING_INTERVAL_MS,
}: {
  roomId: string | null;
  userId: string | null;
  pingIntervalMs?: number;
}) {
  const pingMutation = useMutation(api.live.pingLiveProgress);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPinging = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPinging = useCallback(() => {
    if (!(roomId && userId)) {
      return;
    }
    intervalRef.current = setInterval(() => {
      const { distance, elapsedSeconds, currentPace, isRunning } =
        useRunStore.getState();
      if (!isRunning) {
        return;
      }
      pingMutation({
        roomId: roomId as Id<"liveRooms">,
        userId: userId as Id<"users">,
        distance,
        duration: elapsedSeconds,
        avgPace: currentPace,
      }).catch(() => {
        // network blip — silent
      });
    }, pingIntervalMs);
  }, [roomId, userId, pingIntervalMs, pingMutation]);

  useEffect(() => () => stopPinging(), [stopPinging]);

  return { startPinging, stopPinging };
}
