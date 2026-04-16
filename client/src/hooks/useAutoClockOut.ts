import { useEffect, useRef, useCallback } from 'react';
import { haversineDistance } from '../lib/utils';
import { clockOut } from '../services/sessionService';
import type { BranchResponse, GeoPosition } from '../types';

interface UseAutoClockOutOptions {
  position: GeoPosition | null;
  /**
   * All branches the user can clock into.
   * The hook checks if the user is within ANY branch radius.
   * If they leave ALL branches, the grace-period timer starts.
   */
  branches: BranchResponse[];
  isClockedIn: boolean;
  activeSessionId: number | null;
  onSuccess: () => void;
  onFallbackManual: () => void;
  onNotify: (type: 'success' | 'error' | 'warning', msg: string) => void;
  /**
   * Called every second while the auto clock-out countdown is running.
   * Receives the remaining seconds, or null when the countdown is not active.
   */
  onCountdownChange?: (secondsLeft: number | null) => void;
}

const MAX_RETRIES = 3;
/** Default grace period (ms) when no autoClockOutDuration is set on any branch */
const DEFAULT_DELAY_MS = 5 * 60 * 1000; // 5 minutes

/** Returns the minimum autoClockOutDuration across all branches (strictest rule). */
function resolveDelayMs(branches: BranchResponse[]): number {
  const durations = branches
    .map((b) => (b as BranchResponse & { autoClockOutDuration?: number }).autoClockOutDuration)
    .filter((d): d is number => typeof d === 'number' && d > 0);
  if (durations.length === 0) return DEFAULT_DELAY_MS;
  return Math.min(...durations);
}

/** Returns true if the position is within ANY branch radius. */
function isInsideAnyBranch(position: GeoPosition, branches: BranchResponse[]): boolean {
  return branches.some((b) => {
    const dist = haversineDistance(position.latitude, position.longitude, b.latitude, b.longitude);
    return dist <= b.radius;
  });
}

export function useAutoClockOut({
  position,
  branches,
  isClockedIn,
  activeSessionId,
  onSuccess,
  onFallbackManual,
  onNotify,
  onCountdownChange,
}: UseAutoClockOutOptions) {
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const isOutsideRef = useRef(false);

  // Always-current mirrors
  const branchesRef = useRef(branches);
  useEffect(() => { branchesRef.current = branches; }, [branches]);

  const onNotifyRef = useRef(onNotify);
  useEffect(() => { onNotifyRef.current = onNotify; }, [onNotify]);

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);

  const onFallbackManualRef = useRef(onFallbackManual);
  useEffect(() => { onFallbackManualRef.current = onFallbackManual; }, [onFallbackManual]);

  const onCountdownChangeRef = useRef(onCountdownChange);
  useEffect(() => { onCountdownChangeRef.current = onCountdownChange; }, [onCountdownChange]);

  // ─── Ticker helpers ───────────────────────────────────────────────────────

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

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    stopTicker();
  }, [stopTicker]);

  // Reset outside-tracking when the session ends (user clocked out manually).
  const prevClockedInRef = useRef(isClockedIn);
  useEffect(() => {
    if (prevClockedInRef.current && !isClockedIn) {
      isOutsideRef.current = false;
      clearTimer();
    }
    prevClockedInRef.current = isClockedIn;
  }, [isClockedIn, clearTimer]);

  const attemptClockOut = useCallback(async () => {
    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        await clockOut({ clockOutType: 'AUTOMATIC' });
        onSuccessRef.current();
        onNotifyRef.current('success', 'Clocked out automatically.');
        return;
      } catch {
        retries++;
      }
    }
    onFallbackManualRef.current();
    onNotifyRef.current('error', 'Auto clock-out failed. Please clock out manually.');
  }, []);

  // ─── Main distance-check effect ──────────────────────────────────────────
  useEffect(() => {
    if (!position || !isClockedIn || branches.length === 0) return;

    const inside = isInsideAnyBranch(position, branches);

    if (!inside && !isOutsideRef.current) {
      // Newly outside ALL branches — start the grace-period timer
      isOutsideRef.current = true;
      const delayMs = resolveDelayMs(branches);
      const minutes = Math.round(delayMs / 60000);
      onNotifyRef.current(
        'warning',
        `You left the office zone. Clocking out in ${minutes} minute${minutes !== 1 ? 's' : ''}…`,
      );
      startTicker(delayMs);
      timerRef.current = setTimeout(attemptClockOut, delayMs);
    } else if (inside && isOutsideRef.current) {
      // Back inside a branch — cancel everything
      isOutsideRef.current = false;
      clearTimer();
      onNotifyRef.current('success', 'Welcome back! Clock-out cancelled.');
    }
  }, [position, branches, isClockedIn, attemptClockOut, clearTimer, startTicker]);

  // ─── Branches-change re-evaluation ───────────────────────────────────────
  // When radii change (e.g. admin update), re-check if user is now inside/outside.
  const prevBranchesRef = useRef(branches);
  useEffect(() => {
    prevBranchesRef.current = branches;
    if (!isClockedIn || !position || branches.length === 0) return;

    const inside = isInsideAnyBranch(position, branches);
    if (inside && isOutsideRef.current) {
      isOutsideRef.current = false;
      clearTimer();
      onNotifyRef.current('success', 'Welcome back inside the new zone! Clock-out cancelled.');
    }
    // If still outside, the existing timer continues; no restart needed.
  }, [branches, isClockedIn, position, clearTimer]);

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), [clearTimer]);

  // Expose the delay in seconds for the countdown bar in UserDashboard
  const delaySeconds = resolveDelayMs(branches) / 1000;
  return { delaySeconds };
}
