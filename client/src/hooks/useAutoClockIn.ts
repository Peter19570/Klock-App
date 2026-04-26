import { useEffect, useRef, useCallback } from 'react';
import { haversineDistance } from '../lib/utils';
import { clockIn, getActiveMovement } from '../services/sessionService';
import type { GeoPosition, ClockInRequest, OfflineClockInEntry } from '../types';

interface UseAutoClockInOptions {
  position: GeoPosition | null;
  branches: Array<{ id: number; lat: number; lng: number; radius: number }>;
  isClockedIn: boolean;
  onSuccess: (workdaySessionId: number) => void;
  onFallbackManual: () => void;
  onNotify: (type: 'success' | 'error' | 'warning', msg: string) => void;
}

const MAX_RETRIES = 3;
const OFFLINE_QUEUE_KEY = 'klock_offline_clockin_queue';

// ─── Device helpers ────────────────────────────────────────────────────────────

async function getDeviceId(): Promise<string> {
  const stored = localStorage.getItem('klock_device_id');
  if (stored) return stored;
  // Generate a stable pseudo-device-id from browser fingerprint
  const ua = navigator.userAgent + navigator.language + screen.width + screen.height;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ua));
  const id = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  localStorage.setItem('klock_device_id', id);
  return id;
}

async function getBatteryLevel(): Promise<number | undefined> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (typeof nav.getBattery === 'function') {
      const battery = await nav.getBattery();
      return Math.round(battery.level * 100);
    }
  } catch { /* not available */ }
  return undefined;
}

function getSignalStrength(): number | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = (navigator as any).connection;
    if (!conn) return undefined;
    // downlink in Mbps → map to rough 0-4 signal bars
    if (conn.downlink >= 10) return 4;
    if (conn.downlink >= 5)  return 3;
    if (conn.downlink >= 1)  return 2;
    if (conn.downlink > 0)   return 1;
    return 0;
  } catch { return undefined; }
}

// ─── Offline queue ─────────────────────────────────────────────────────────────

function readQueue(): OfflineClockInEntry[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) ?? '[]');
  } catch { return []; }
}

function writeQueue(q: OfflineClockInEntry[]) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
}

function enqueue(payload: ClockInRequest & { isDelaySync: true }) {
  const entry: OfflineClockInEntry = {
    id: crypto.randomUUID(),
    payload,
    queuedAt: new Date().toISOString(),
  };
  writeQueue([...readQueue(), entry]);
  // localStorage 'storage' events don't fire in the same tab — dispatch a
  // custom event so UserDashboard can update its pendingCount immediately.
  window.dispatchEvent(new Event('klock:queue-updated'));
}

async function flushQueue(
  onFlushed?: (count: number) => void,
): Promise<void> {
  const queue = readQueue();
  if (queue.length === 0) return;
  const remaining: OfflineClockInEntry[] = [];
  for (const entry of queue) {
    try {
      await clockIn(entry.payload);
    } catch {
      remaining.push(entry);
    }
  }
  writeQueue(remaining);
  const flushed = queue.length - remaining.length;
  if (flushed > 0) onFlushed?.(flushed);
  window.dispatchEvent(new Event('klock:queue-updated'));
}

export function useAutoClockIn({
  position,
  branches,
  isClockedIn,
  onSuccess,
  onFallbackManual,
  onNotify,
}: UseAutoClockInOptions) {
  const wasInsideRef    = useRef(false);
  const retriesRef      = useRef(0);
  const attemptingRef   = useRef(false);

  const isClockedInRef = useRef(isClockedIn);
  useEffect(() => { isClockedInRef.current = isClockedIn; }, [isClockedIn]);

  const prevClockedInRef = useRef(isClockedIn);
  useEffect(() => {
    if (prevClockedInRef.current && !isClockedIn) {
      wasInsideRef.current  = false;
      retriesRef.current    = MAX_RETRIES;
      attemptingRef.current = false;
    }
    prevClockedInRef.current = isClockedIn;
  }, [isClockedIn]);

  // ─── Flush offline queue when connectivity is restored ────────────────────
  useEffect(() => {
    const handleOnline = () => {
      flushQueue((count) => {
        onNotify('success', `Synced ${count} offline clock-in${count !== 1 ? 's' : ''} from queue.`);
      });
    };
    window.addEventListener('online', handleOnline);
    // On mount, only flush if there's actually something queued — don't
    // trigger a flush that would race with the first attempt() call.
    if (navigator.onLine && readQueue().length > 0) handleOnline();
    return () => window.removeEventListener('online', handleOnline);
  }, [onNotify]);

  const attempt = useCallback(
    async (pos: GeoPosition) => {
      if (attemptingRef.current) return;
      attemptingRef.current = true;
      retriesRef.current    = 0;

      try {
        const activeMovement = await getActiveMovement();
        if (activeMovement) {
          const { getTodaySession } = await import('../services/sessionService');
          const session = await getTodaySession();
          if (session) onSuccess(session.id);
          retriesRef.current    = 0;
          attemptingRef.current = false;
          return;
        }
      } catch {
        // fall through
      }

      // ── Collect device integrity metadata ──────────────────────────────────
      const [deviceId, batteryLevel] = await Promise.all([
        getDeviceId(),
        getBatteryLevel(),
      ]);
      const signalStrength = getSignalStrength();
      // Java LocalTime expects "HH:mm:ss" — send only the time portion
      const clientTimeStamp = new Date().toTimeString().slice(0, 8);

      const payload: ClockInRequest = {
        latitude:       pos.latitude,
        longitude:      pos.longitude,
        accuracy:       pos.accuracy ?? 0,
        deviceId,
        batteryLevel,
        signalStrength,
        clientTimeStamp,
      };

      // ── Offline mode: queue and bail ───────────────────────────────────────
      if (!navigator.onLine) {
        enqueue({ ...payload, isDelaySync: true });
        onNotify('warning', 'No connection — clock-in queued and will sync automatically when back online.');
        retriesRef.current    = 0;
        attemptingRef.current = false;
        return;
      }

      // ── If there are queued entries from a previous offline attempt, flush
      //    those first (they carry isDelaySync: true + the original clientTimeStamp)
      //    rather than submitting a new fresh clock-in without the flag. ─────────
      if (readQueue().length > 0) {
        await flushQueue((count) => {
          onNotify('success', `Synced ${count} delayed clock-in${count !== 1 ? 's' : ''} from queue.`);
        });
        // If the flush succeeded the session now exists — resolve via onSuccess
        try {
          const { getTodaySession } = await import('../services/sessionService');
          const session = await getTodaySession();
          if (session) {
            onSuccess(session.id);
            retriesRef.current    = 0;
            attemptingRef.current = false;
            return;
          }
        } catch { /* fall through to fresh attempt below */ }
      }

      while (retriesRef.current < MAX_RETRIES) {
        if (isClockedInRef.current) {
          retriesRef.current    = 0;
          attemptingRef.current = false;
          return;
        }

        try {
          const res = await clockIn(payload);
          retriesRef.current    = 0;
          attemptingRef.current = false;

          if (isClockedInRef.current) return;

          onSuccess(res.data.data.id);
          onNotify('success', 'Clocked in automatically! 👍');
          return;
        } catch {
          retriesRef.current += 1;
        }
      }

      retriesRef.current    = 0;
      attemptingRef.current = false;
      if (!isClockedInRef.current) {
        onFallbackManual();
        onNotify('error', 'Auto clock-in failed. Please clock in manually.');
      }
    },
    [onSuccess, onFallbackManual, onNotify],
  );

  useEffect(() => {
    if (!position || isClockedIn || branches.length === 0) return;

    const isInside = branches.some(
      (b) =>
        haversineDistance(position.latitude, position.longitude, b.lat, b.lng) <= b.radius,
    );

    if (isInside && !wasInsideRef.current) {
      wasInsideRef.current = true;
      attempt(position);
    } else if (!isInside) {
      wasInsideRef.current = false;
    }
  }, [position, branches, isClockedIn, attempt]);
}

/** Exposed for manual flushing (e.g. from a Settings page or banner) */
export { flushQueue as flushOfflineClockInQueue };
