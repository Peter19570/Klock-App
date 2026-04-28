/**
 * syncEngine.ts
 *
 * Flushes queued offline events (clock-in + clock-out) to the backend
 * in chronological order.
 *
 * Mapped to API:
 *   POST /api/v1/sessions/start  (ClockInRequest)
 *   PUT  /api/v1/sessions/end    (ClockOutRequest)
 *
 * ClockInRequest fields used here:
 *   latitude, longitude, accuracy (required)
 *   isDelaySync: true             (always true for queued events)
 *   clientTimeStamp               (HH:mm:ss from queued clientTimestamp)
 *   deviceId, batteryLevel, signalStrength (optional, not re-captured at sync time)
 *
 * ClockOutRequest fields:
 *   clockOutType, latitude, longitude
 *
 * Backoff schedule (seconds): 60 → 300 → 900 → 3600 → 21600
 */

import { clockIn, clockOut } from './sessionService';
import {
  getPendingEvents,
  deleteEvent,
  markEventSynced,
  markEventFailed,
  incrementRetry,
  MAX_RETRY_COUNT,
} from './offlineQueueService';
import type { PendingEvent } from './offlineQueueService';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SyncResult {
  synced:   number;
  failed:   number;
  skipped:  number;
}

export interface SyncCallbacks {
  onSynced?:  (count: number) => void;
  onFailed?:  (event: PendingEvent, reason: string) => void;
  onProgress?: (current: number, total: number) => void;
}

// ─── Backoff ───────────────────────────────────────────────────────────────────

const BACKOFF_SCHEDULE_MS = [
  1  * 60 * 1000,  //  1 min
  5  * 60 * 1000,  //  5 min
  15 * 60 * 1000,  // 15 min
  60 * 60 * 1000,  //  1 hour
  6  * 60 * 60 * 1000, // 6 hours
];

/** Map retry count (1-based) to delay ms. */
export function backoffDelay(retryCount: number): number {
  const idx = Math.min(retryCount - 1, BACKOFF_SCHEDULE_MS.length - 1);
  return BACKOFF_SCHEDULE_MS[idx];
}

// ─── Backoff tracker (in-memory, resets on page load) ─────────────────────────

const _nextAllowedAt: Map<string, number> = new Map();

function isBackedOff(eventId: string): boolean {
  const t = _nextAllowedAt.get(eventId);
  return t != null && Date.now() < t;
}

function scheduleBackoff(eventId: string, retryCount: number): void {
  _nextAllowedAt.set(eventId, Date.now() + backoffDelay(retryCount));
}

// ─── Sync a single event ───────────────────────────────────────────────────────

async function syncEvent(event: PendingEvent): Promise<'synced' | 'failed' | 'skipped'> {
  if (isBackedOff(event.id)) return 'skipped';

  // Derive HH:mm:ss from stored ISO clientTimestamp for the API field
  const clientTimeStamp = new Date(event.clientTimestamp).toTimeString().slice(0, 8);

  try {
    if (event.type === 'clock_in') {
      const res = await clockIn({
        latitude:       event.latitude,
        longitude:      event.longitude,
        accuracy:       event.accuracy,
        isDelaySync:    true,
        clientTimeStamp,
      });
      const serverTs = res.data?.data?.clockInTime ?? new Date().toISOString();
      await markEventSynced(event.id, serverTs);
      await deleteEvent(event.id);
      return 'synced';
    }

    if (event.type === 'clock_out') {
      const res = await clockOut({
        clockOutType: event.clockOutType ?? 'MANUAL',
        latitude:     event.latitude,
        longitude:    event.longitude,
        clientTimeStamp,
        isDelaySync:  true,
      });
      const serverTs = res.data?.data?.clockOutTime ?? new Date().toISOString();
      await markEventSynced(event.id, serverTs);
      await deleteEvent(event.id);
      return 'synced';
    }

    return 'skipped';
  } catch (err: unknown) {
    const status  = (err as { response?: { status?: number } })?.response?.status;
    const message = (err as { response?: { data?: { message?: string } } })
      ?.response?.data?.message ?? 'Network error';

    // Server hard-rejected — no point retrying
    if (status === 400 || status === 409 || status === 422) {
      await markEventFailed(event.id, message);
      return 'failed';
    }

    // Transient failure — increment retry, schedule backoff
    const retryCount = await incrementRetry(event.id);
    if (retryCount >= MAX_RETRY_COUNT) {
      await markEventFailed(event.id, `Max retries reached. Last error: ${message}`);
      return 'failed';
    }

    scheduleBackoff(event.id, retryCount);
    return 'skipped'; // will retry on next flush cycle
  }
}

// ─── Main flush ────────────────────────────────────────────────────────────────

let _isFlushing = false;

/**
 * Flush all pending events in chronological order.
 * Guards against concurrent flushes.
 */
export async function flushOfflineQueue(
  callbacks?: SyncCallbacks,
): Promise<SyncResult> {
  if (_isFlushing) return { synced: 0, failed: 0, skipped: 0 };
  _isFlushing = true;

  const result: SyncResult = { synced: 0, failed: 0, skipped: 0 };

  try {
    const events = await getPendingEvents(); // already sorted oldest-first
    const total  = events.length;
    if (total === 0) return result;

    for (let i = 0; i < events.length; i++) {
      callbacks?.onProgress?.(i + 1, total);
      const outcome = await syncEvent(events[i]);
      if (outcome === 'synced')  result.synced++;
      if (outcome === 'failed')  {
        result.failed++;
        callbacks?.onFailed?.(events[i], events[i].failReason ?? 'Unknown error');
      }
      if (outcome === 'skipped') result.skipped++;
    }

    if (result.synced > 0) {
      callbacks?.onSynced?.(result.synced);
    }
  } finally {
    _isFlushing = false;
  }

  return result;
}

// ─── Periodic retry scheduler ─────────────────────────────────────────────────

let _retryInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start a background retry loop (every 30 seconds when online).
 * Call once on app mount. Returns a cleanup fn.
 */
export function startSyncScheduler(callbacks?: SyncCallbacks): () => void {
  if (_retryInterval) clearInterval(_retryInterval);

  const tick = async () => {
    if (!navigator.onLine) return;
    await flushOfflineQueue(callbacks);
  };

  _retryInterval = setInterval(tick, 30_000);

  // Also flush immediately on online recovery
  const handleOnline = () => flushOfflineQueue(callbacks);
  window.addEventListener('online', handleOnline);

  return () => {
    if (_retryInterval) clearInterval(_retryInterval);
    _retryInterval = null;
    window.removeEventListener('online', handleOnline);
  };
}