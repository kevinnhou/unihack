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
  // Keep all mutable values in refs so startPinging identity stays stable.
  const pingMutationRef = useRef(pingMutation);
  const roomIdRef = useRef(roomId);
  const userIdRef = useRef(userId);
  const pingIntervalMsRef = useRef(pingIntervalMs);
  pingMutationRef.current = pingMutation;
  roomIdRef.current = roomId;
  userIdRef.current = userId;
  pingIntervalMsRef.current = pingIntervalMs;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPinging = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPinging = useCallback(() => {
    const currentRoomId = roomIdRef.current;
    const currentUserId = userIdRef.current;
    if (!(currentRoomId && currentUserId)) {
      return;
    }

    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    intervalRef.current = setInterval(() => {
      const { distance, elapsedSeconds, currentPace, isRunning } =
        useRunStore.getState();
      if (!isRunning) {
        return;
      }
      pingMutationRef
        .current({
          roomId: currentRoomId as Id<"liveRooms">,
          userId: currentUserId as Id<"users">,
          distance,
          duration: elapsedSeconds,
          avgPace: currentPace,
        })
        .catch(() => {
          // network blip — silent
        });
    }, pingIntervalMsRef.current);
  }, []);

  useEffect(() => () => stopPinging(), [stopPinging]);

  return { startPinging, stopPinging };
}
