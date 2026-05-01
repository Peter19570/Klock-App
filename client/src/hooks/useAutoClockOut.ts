/**
 * useAutoClockOut.ts
 *
 * Watches GPS position when clocked in and triggers auto clock-out when the
 * user leaves all branch zones for longer than autoClockOutDuration.
 * Offline-aware: queues clock-out to IndexedDB when offline.
 *
 * API mapping:
 *   PUT /api/v1/sessions/end → ClockOutRequest
 *   clockOutType: 'AUTOMATIC'
 *   latitude, longitude (required)
 *   clientTimeStamp, isDelaySync (added for offline queued events)
 *
 * NOTE: autoClockOutDuration from BranchResponse is in SECONDS (int64 per API
 * schema). All internal timers use milliseconds — convert on the way in via
 * resolveDelayMs(), never elsewhere.
 */

import { useEffect, useRef, useCallback } from 'react';
import { hasPendingClockIn } from '../services/offlineClockQueue';
import { isOnline } from '../services/connectivityStore';
import { haversineDistance } from '../lib/utils';
import { clockOut } from '../services/sessionService';
import {
  enqueueClockOut,
  getOpenOfflineSession,
} from '../services/offlineQueueService';
import type { BranchResponse, GeoPosition } from '../types';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface UseAutoClockOutOptions {
  position: GeoPosition | null;
  branches: BranchResponse[];
  isClockedIn: boolean;
  activeSessionId: number | null;
  /** ID of the branch the user clocked into — used to pick the correct autoClockOutDuration */
  activeBranchId?: number | null;
  onSuccess: () => void;
  onFallbackManual: () => void;
  onNotify: (type: 'success' | 'error' | 'warning', msg: string) => void;
  onCountdownChange?: (secondsLeft: number | null) => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;

/**
 * Fallback duration in SECONDS when no branch supplies autoClockOutDuration.
 * Kept in seconds to match the API unit — resolveDelayMs converts to ms.
 */
const DEFAULT_DURATION_S = 5 * 60; // 5 minutes

/**
 * How many seconds before auto clock-out we show the "you're about to be
 * clocked out" warning notification.
 */
const WARNING_THRESHOLD_S = 60; // 1 minute

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Picks the autoClockOutDuration for the branch the user clocked into and
 * converts it from seconds (API unit) to milliseconds (timer unit).
 *
 * Falls back to DEFAULT_DURATION_S when activeBranchId is unknown or the
 * matching branch has no duration set.
 */
function resolveDelayMs(branches: BranchResponse[], activeBranchId?: number | null): number {
  // Prefer the branch the user is actually clocked into
  if (activeBranchId != null) {
    const activeBranch = branches.find((b) => b.id === activeBranchId);
    if (activeBranch?.autoClockOutDuration && activeBranch.autoClockOutDuration > 0) {
      return activeBranch.autoClockOutDuration * 1_000;
    }
  }

  // Fallback: shortest duration across all branches (legacy behaviour)
  const durationsS = branches
    .map((b) => b.autoClockOutDuration)
    .filter((d): d is number => typeof d === 'number' && d > 0);

  const chosenS = durationsS.length ? Math.min(...durationsS) : DEFAULT_DURATION_S;
  return chosenS * 1_000; // ← seconds → milliseconds
}

function isInsideAnyBranch(position: GeoPosition, branches: BranchResponse[]): boolean {
  return branches.some((b) => {
    if (b.latitude == null || b.longitude == null) return false;
    return haversineDistance(
      position.latitude, position.longitude, b.latitude, b.longitude,
    ) <= b.radius;
  });
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAutoClockOut({
  position,
  branches,
  isClockedIn,
  activeSessionId,
  activeBranchId,
  onSuccess,
  onFallbackManual,
  onNotify,
  onCountdownChange,
}: UseAutoClockOutOptions) {
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOutsideRef = useRef(false);

  // Always-current refs (avoid stale closure issues in timers)
  const branchesRef          = useRef(branches);
  const positionRef          = useRef(position);
  const onNotifyRef          = useRef(onNotify);
  const onSuccessRef         = useRef(onSuccess);
  const onFallbackManualRef  = useRef(onFallbackManual);
  const onCountdownChangeRef = useRef(onCountdownChange);

  useEffect(() => { branchesRef.current         = branches; },        [branches]);
  useEffect(() => { positionRef.current          = position; },        [position]);
  useEffect(() => { onNotifyRef.current          = onNotify; },        [onNotify]);
  useEffect(() => { onSuccessRef.current         = onSuccess; },       [onSuccess]);
  useEffect(() => { onFallbackManualRef.current  = onFallbackManual; },[onFallbackManual]);
  useEffect(() => { onCountdownChangeRef.current = onCountdownChange; },[onCountdownChange]);

  // ─── Ticker helpers ──────────────────────────────────────────────────────

  const stopTicker = useCallback(() => {
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
    onCountdownChangeRef.current?.(null);
  }, []);

  const startTicker = useCallback((durationMs: number) => {
    if (tickerRef.current) clearInterval(tickerRef.current);

    const endAt = Date.now() + durationMs;
    onCountdownChangeRef.current?.(Math.ceil(durationMs / 1000));

    tickerRef.current = setInterval(() => {
      const remaining = Math.ceil((endAt - Date.now()) / 1000);
      if (remaining <= 0) {
        stopTicker();
      } else {
        onCountdownChangeRef.current?.(remaining);
      }
    }, 1000);
  }, [stopTicker]);

  // ─── Clear all timers ────────────────────────────────────────────────────

  const clearAllTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (warnTimerRef.current) {
      clearTimeout(warnTimerRef.current);
      warnTimerRef.current = null;
    }
    stopTicker();
  }, [stopTicker]);

  // Reset outside-flag when user manually clocks out
  const prevClockedInRef = useRef(isClockedIn);
  useEffect(() => {
    if (prevClockedInRef.current && !isClockedIn) {
      isOutsideRef.current = false;
      clearAllTimers();
    }
    prevClockedInRef.current = isClockedIn;
  }, [isClockedIn, clearAllTimers]);

  // ─── Attempt clock-out ───────────────────────────────────────────────────

  const attemptClockOut = useCallback(async () => {
    const pos = positionRef.current;

    // ── Offline: queue to IndexedDB ────────────────────────────────────────
    if (!isOnline()) {
      try {
        const openSession = await getOpenOfflineSession();
        const sessionId   = openSession?.sessionId;

        if (sessionId) {
          await enqueueClockOut({
            sessionId,
            latitude:        pos?.latitude  ?? 0,
            longitude:       pos?.longitude ?? 0,
            accuracy:        pos?.accuracy  ?? 0,
            clientTimestamp: new Date().toISOString(),
            clockOutType:    'AUTOMATIC',
          });
          onNotifyRef.current(
            'warning',
            'Offline — clock-out saved and will sync automatically when back online.',
          );
        } else {
          onFallbackManualRef.current();
          onNotifyRef.current(
            'error',
            'Could not queue offline clock-out: no matching clock-in found. Please clock out manually when online.',
          );
        }
        onSuccessRef.current();
      } catch {
        onFallbackManualRef.current();
        onNotifyRef.current('error', 'Failed to save offline clock-out. Please clock out manually.');
      }
      return;
    }

    // ── Online: submit with retries ────────────────────────────────────────
    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        const res = await clockOut({
          clockOutType: 'AUTOMATIC',
          latitude:     pos?.latitude  ?? 0,
          longitude:    pos?.longitude ?? 0,
        });
        onSuccessRef.current();

        const movement = res.data?.data;
        if (movement?.siteDepartureDistance != null) {
          const distM     = movement.siteDepartureDistance;
          const distLabel = distM >= 1000
            ? `${(distM / 1000).toFixed(1)} km`
            : `${Math.round(distM)} m`;
          onNotifyRef.current(
            distM > 200 ? 'warning' : 'success',
            distM > 200
              ? `You clocked out ${distLabel} from where you clocked in.`
              : 'Clocked out automatically.',
          );
        } else {
          onNotifyRef.current('success', 'Clocked out automatically.');
        }
        return;
      } catch {
        retries++;
      }
    }

    onFallbackManualRef.current();
    onNotifyRef.current('error', 'Auto clock-out failed. Please clock out manually.');
  }, []);

  // ─── Start the full countdown sequence ──────────────────────────────────
  //
  //  1. Immediately: "leaving zone" toast with full duration
  //  2. At (delayMs - WARNING_THRESHOLD_S * 1000): "1 minute left" warning
  //  3. At delayMs: attemptClockOut()
  //
  // Ticker runs throughout so the UI can show remaining seconds.

  const startCountdown = useCallback((delayMs: number) => {
    const totalSeconds = Math.ceil(delayMs / 1_000);
    const durationLabel =
      totalSeconds < 60
        ? `${totalSeconds} second${totalSeconds !== 1 ? 's' : ''}`
        : (() => {
            const minutes = Math.ceil(delayMs / 60_000);
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
          })();

    onNotifyRef.current(
      'warning',
      `You left the office zone. Clocking out in ${durationLabel}…`,
    );

    startTicker(delayMs);

    // Schedule the "1 minute left" warning if there's room for it
    const warnAfterMs = delayMs - WARNING_THRESHOLD_S * 1_000;
    if (warnAfterMs > 0) {
      warnTimerRef.current = setTimeout(() => {
        // Only fire warning if still outside (timer wasn't cancelled)
        if (isOutsideRef.current) {
          onNotifyRef.current(
            'warning',
            'You will be automatically clocked out in 1 minute.',
          );
        }
      }, warnAfterMs);
    }

    timerRef.current = setTimeout(attemptClockOut, delayMs);
  }, [startTicker, attemptClockOut]);

  // ─── Main distance-check effect ─────────────────────────────────────────

  useEffect(() => {
    // If there's a pending offline clock-in being synced, isClockedIn may have
    // been set optimistically. Don't start a clock-out countdown until the sync
    // fully completes and the pending key is cleared.
    if (!position || !isClockedIn || branches.length === 0 || hasPendingClockIn()) return;

    const inside = isInsideAnyBranch(position, branches);

    if (!inside && !isOutsideRef.current) {
      // User just left all branch zones → start countdown
      isOutsideRef.current = true;
      const delayMs = resolveDelayMs(branches, activeBranchId);
      startCountdown(delayMs);
    } else if (inside && isOutsideRef.current) {
      // User came back → cancel everything
      isOutsideRef.current = false;
      clearAllTimers();
      onNotifyRef.current('success', 'Welcome back! Clock-out cancelled.');
    }
  }, [position, branches, isClockedIn, startCountdown, clearAllTimers]);

  // ─── Re-evaluate when branches change ───────────────────────────────────

  useEffect(() => {
    if (!isClockedIn || !position || branches.length === 0) return;
    const inside = isInsideAnyBranch(position, branches);
    if (inside && isOutsideRef.current) {
      isOutsideRef.current = false;
      clearAllTimers();
      onNotifyRef.current('success', 'Welcome back inside the new zone! Clock-out cancelled.');
    }
  }, [branches, isClockedIn, position, clearAllTimers]);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  // Expose the resolved delay in seconds for UI display
  const delaySeconds = resolveDelayMs(branches, activeBranchId) / 1_000;
  return { delaySeconds };
}
