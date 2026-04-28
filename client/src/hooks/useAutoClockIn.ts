/**
 * useAutoClockIn.ts
 *
 * Watches GPS position and automatically clocks the user in when they enter
 * a branch zone. Offline-aware: queues to IndexedDB when offline.
 *
 * API mapping:
 *   POST /api/v1/sessions/start → ClockInRequest
 *   isDelaySync: true  when meaningful time passed between zone entry + submit
 *   clientTimeStamp: HH:mm:ss of zone-entry moment
 */

import { useEffect, useRef, useCallback } from 'react';
import { haversineDistance } from '../lib/utils';
import { clockIn, getActiveMovement, getTodaySession } from '../services/sessionService';
import { getMe } from '../services/userService';
import { enqueueClockIn, getOpenOfflineSession } from '../services/offlineQueueService';
import { flushOfflineQueue } from '../services/syncEngine';
import api from '../services/api';
import type { GeoPosition, ClockInRequest } from '../types';

// ─── Public interface ──────────────────────────────────────────────────────────

export interface UseAutoClockInOptions {
  position: GeoPosition | null;
  branches: Array<{ id: number; lat: number; lng: number; radius: number }>;
  isClockedIn: boolean;
  onSuccess: (workdaySessionId: number) => void;
  onFallbackManual: () => void;
  onNotify: (type: 'success' | 'error' | 'warning', msg: string) => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const MAX_RETRIES              = 3;
const DELAY_THRESHOLD_SECONDS  = 30;

// ─── Device helpers ────────────────────────────────────────────────────────────

async function getDeviceId(): Promise<string> {
  const stored = localStorage.getItem('klock_device_id');
  if (stored) return stored;
  const ua  = navigator.userAgent + navigator.language + screen.width + screen.height;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ua));
  const id  = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
  localStorage.setItem('klock_device_id', id);
  return id;
}

async function ensureDeviceRegistered(): Promise<string> {
  const deviceId = await getDeviceId();
  try {
    const res = await getMe();
    if (!res.data.data.deviceId) {
      await api.post('/api/v1/users/device', { deviceId });
    }
  } catch { /* offline or error — proceed with local id */ }
  return deviceId;
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
    if (conn.downlink >= 10) return 4;
    if (conn.downlink >= 5)  return 3;
    if (conn.downlink >= 1)  return 2;
    if (conn.downlink > 0)   return 1;
    return 0;
  } catch { return undefined; }
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

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
  const zoneEnteredAtRef = useRef<Date | null>(null);

  const isClockedInRef = useRef(isClockedIn);
  useEffect(() => { isClockedInRef.current = isClockedIn; }, [isClockedIn]);

  // Reset wasInside when user clocks out
  const prevClockedInRef = useRef(isClockedIn);
  useEffect(() => {
    if (prevClockedInRef.current && !isClockedIn) {
      wasInsideRef.current   = false;
      retriesRef.current     = MAX_RETRIES;
      attemptingRef.current  = false;
      zoneEnteredAtRef.current = null;
    }
    prevClockedInRef.current = isClockedIn;
  }, [isClockedIn]);

  // ─── Flush offline queue on connectivity restore ───────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      flushOfflineQueue({
        onSynced: (count) => {
          onNotify('success', `Synced ${count} offline clock event${count !== 1 ? 's' : ''}.`);
        },
        onFailed: (_evt, reason) => {
          onNotify('error', `An offline clock event was rejected: ${reason}`);
        },
      });
    };

    window.addEventListener('online', handleOnline);

    // On mount: if online and there are pending events, flush immediately
    if (navigator.onLine) {
      flushOfflineQueue({
        onSynced: (count) => {
          if (count > 0) {
            onNotify('success', `Synced ${count} pending clock event${count !== 1 ? 's' : ''}.`);
          }
        },
      });
    }

    return () => window.removeEventListener('online', handleOnline);
  }, [onNotify]);

  // ─── Attempt clock-in ─────────────────────────────────────────────────────
  const attempt = useCallback(
    async (pos: GeoPosition, zoneEnteredAt: Date) => {
      if (attemptingRef.current) return;
      attemptingRef.current = true;
      retriesRef.current    = 0;

      // Check if already clocked in (e.g. from a previous session)
      try {
        const activeMovement = await getActiveMovement();
        if (activeMovement) {
          const session = await getTodaySession();
          if (session) onSuccess(session.id);
          attemptingRef.current = false;
          return;
        }
      } catch { /* fall through */ }

      const [deviceId, batteryLevel] = await Promise.all([
        ensureDeviceRegistered(),
        getBatteryLevel(),
      ]);
      const signalStrength   = getSignalStrength();
      const clientTimeStamp  = zoneEnteredAt.toTimeString().slice(0, 8);
      const delaySecs        = (Date.now() - zoneEnteredAt.getTime()) / 1000;
      const isDelaySync      = delaySecs > DELAY_THRESHOLD_SECONDS;

      const payload: ClockInRequest = {
        latitude:       pos.latitude,
        longitude:      pos.longitude,
        accuracy:       pos.accuracy ?? 0,
        deviceId,
        batteryLevel,
        signalStrength,
        clientTimeStamp,
        isDelaySync,
      };

      // ── Offline: queue to IndexedDB ────────────────────────────────────────
      if (!navigator.onLine) {
        try {
          await enqueueClockIn({
            latitude:        pos.latitude,
            longitude:       pos.longitude,
            accuracy:        pos.accuracy ?? 0,
            clientTimestamp: zoneEnteredAt.toISOString(),
          });
          onNotify('warning', 'No connection — clock-in saved and will sync when back online.');
        } catch {
          onNotify('error', 'Failed to save offline clock-in. Please try again.');
        }
        attemptingRef.current = false;
        return;
      }

      // ── Flush any queued events first ──────────────────────────────────────
      await flushOfflineQueue({
        onSynced: (count) => {
          onNotify('success', `Synced ${count} delayed clock event${count !== 1 ? 's' : ''}.`);
        },
      });

      // If flush resolved an existing clock-in, don't double-submit
      try {
        const session = await getTodaySession();
        if (session?.status === 'ACTIVE') {
          onSuccess(session.id);
          attemptingRef.current = false;
          return;
        }
      } catch { /* fall through */ }

      // ── Online: submit with retries ───────────────────────────────────────
      while (retriesRef.current < MAX_RETRIES) {
        if (isClockedInRef.current) {
          attemptingRef.current = false;
          return;
        }
        try {
          const res = await clockIn(payload);
          onSuccess(res.data.data.id);
          onNotify('success', 'Clocked in automatically! 👍');
          attemptingRef.current = false;
          return;
        } catch {
          retriesRef.current++;
        }
      }

      attemptingRef.current = false;
      if (!isClockedInRef.current) {
        onFallbackManual();
        onNotify('error', 'Auto clock-in failed. Please clock in manually.');
      }
    },
    [onSuccess, onFallbackManual, onNotify],
  );

  // ─── Watch GPS position ───────────────────────────────────────────────────
  useEffect(() => {
    if (!position || isClockedIn || branches.length === 0) return;

    const isInside = branches.some(
      (b) => haversineDistance(position.latitude, position.longitude, b.lat, b.lng) <= b.radius,
    );

    if (isInside && !wasInsideRef.current) {
      wasInsideRef.current     = true;
      zoneEnteredAtRef.current = new Date();
      attempt(position, zoneEnteredAtRef.current);
    } else if (!isInside) {
      wasInsideRef.current     = false;
      zoneEnteredAtRef.current = null;
    }
  }, [position, branches, isClockedIn, attempt]);
}

/**
 * Exposed for manual flushing (e.g. "Sync Now" button in UserDashboard).
 * Re-exported from syncEngine for convenience.
 */
export { flushOfflineQueue as flushOfflineClockInQueue };

/**
 * Exposed for UserDashboard to check if there's an open offline session
 * to attach a clock-out against.
 */
export { getOpenOfflineSession };
