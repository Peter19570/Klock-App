/**
 * offlineClockQueue.ts
 *
 * localStorage queue for offline clock-in requests.
 * Stores the complete payload the backend expects so nothing is
 * reconstructed at sync time (avoids rejection due to missing fields).
 *
 * Storage key: 'klock_pending_clockin'
 * Java backend expects clientTimeStamp as LocalTime → HH:mm:ss
 */

const KEY = 'klock_pending_clockin';

export interface PendingClockIn {
  latitude:        number;
  longitude:       number;
  accuracy:        number;
  isDelaySync:     true;        // always true for offline-queued events
  deviceId?:       string;
  batteryLevel?:   number;
  signalStrength?: number;
  clientTimeStamp: string;      // HH:mm:ss  (Java LocalTime)
}

/** Save a pending clock-in. Overwrites any existing one. */
export function savePendingClockIn(payload: PendingClockIn): void {
  localStorage.setItem(KEY, JSON.stringify(payload));
}

/** Read the pending clock-in, or null if none. */
export function getPendingClockIn(): PendingClockIn | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingClockIn;
  } catch {
    localStorage.removeItem(KEY);
    return null;
  }
}

/** Remove the pending clock-in after it has been synced. */
export function clearPendingClockIn(): void {
  localStorage.removeItem(KEY);
}

/** True if there is a queued clock-in waiting to sync. */
export function hasPendingClockIn(): boolean {
  return localStorage.getItem(KEY) !== null;
}
