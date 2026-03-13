import { api } from "@unihack/backend/convex/_generated/api";
import type { Id } from "@unihack/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { flushQueue, isOnline } from "@/services/offline-queue";

/**
 * Mount this hook once at the top level (tabs layout).
 * Polls connectivity every 10s and on foreground, flushing queued uploads.
 */
export function useNetworkQueue() {
  const finishRun = useMutation(api.runs.finishRun);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flush = useCallback(async () => {
    const connected = await isOnline();
    if (connected) {
      await flushQueue(async (item) => {
        await finishRun({
          runId: item.runId as Id<"runs">,
          durationSeconds: item.durationSeconds,
          distance: item.distance,
          telemetry: item.telemetry.length <= 800 ? item.telemetry : undefined,
        });
      });
    }
  }, [finishRun]);

  useEffect(() => {
    flush();
    intervalRef.current = setInterval(flush, 10_000);

    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        flush();
      }
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      sub.remove();
    };
  }, [flush]);
}
