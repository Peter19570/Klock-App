/**
 * offlineQueueService.ts
 *
 * Standalone helpers for reading and managing the offline clock-in queue.
 * The queue itself is written by useAutoClockIn when navigator.onLine === false.
 * These helpers are used by the UI (e.g. UserDashboard) to display a
 * "pending sync" badge and let users manually retry.
 *
 * Storage key must match the one in useAutoClockIn.ts → OFFLINE_QUEUE_KEY.
 */

import type { OfflineClockInEntry } from '../types';

const OFFLINE_QUEUE_KEY = 'klock_offline_clockin_queue';

/** Returns all pending offline clock-in entries. Never throws. */
export function getPendingQueue(): OfflineClockInEntry[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

/** Returns the count of pending entries — cheap to call from a render. */
export function getPendingCount(): number {
  return getPendingQueue().length;
}

/**
 * Clears the entire queue (use only after a confirmed full flush,
 * or for a user-initiated "discard pending" action).
 */
export function clearQueue(): void {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}
