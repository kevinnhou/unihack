import AsyncStorage from "@react-native-async-storage/async-storage";
import { getNetworkStateAsync } from "expo-network";
import type { TelemetryPoint } from "./location";

const QUEUE_KEY = "PINFIRE_TELEMETRY_QUEUE";

export type QueuedUpload = {
  id: string;
  runId: string;
  durationSeconds: number;
  distance: number;
  telemetry: TelemetryPoint[];
  enqueuedAt: number;
};

// ---------------------------------------------------------------------------
// Queue management
// ---------------------------------------------------------------------------

async function readQueue(): Promise<QueuedUpload[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedUpload[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedUpload[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Add a completed run upload to the offline queue. */
export async function enqueueUpload(
  item: Omit<QueuedUpload, "id" | "enqueuedAt">
): Promise<void> {
  const queue = await readQueue();
  queue.push({
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    enqueuedAt: Date.now(),
  });
  await writeQueue(queue);
}

/** Remove a processed item from the queue by id. */
export async function dequeueUpload(id: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((q) => q.id !== id));
}

/** Return all pending uploads. */
export function getPendingUploads(): Promise<QueuedUpload[]> {
  return readQueue();
}

// ---------------------------------------------------------------------------
// Network detection
// ---------------------------------------------------------------------------

export async function isOnline(): Promise<boolean> {
  const state = await getNetworkStateAsync();
  return state.isConnected === true && state.isInternetReachable !== false;
}

// ---------------------------------------------------------------------------
// Store-and-forward processor
// ---------------------------------------------------------------------------

/**
 * Process the offline queue by calling the provided upload function for each
 * queued item. Items are dequeued as they succeed. Stops on first failure.
 */
export async function flushQueue(
  upload: (item: QueuedUpload) => Promise<void>
): Promise<void> {
  const online = await isOnline();
  if (!online) {
    return;
  }

  const queue = await getPendingUploads();
  for (const item of queue) {
    try {
      await upload(item);
      await dequeueUpload(item.id);
    } catch (err) {
      console.warn("[OfflineQueue] Upload failed, will retry:", err);
      break;
    }
  }
}
