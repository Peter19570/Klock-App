import { useEffect, useRef, useCallback } from 'react';
import { haversineDistance } from '../lib/utils';
import { clockOut } from '../services/sessionService';
import type { BranchResponse, GeoPosition } from '../types';

interface UseAutoClockOutOptions {
  position: GeoPosition | null;
  branches: BranchResponse[];
  isClockedIn: boolean;
  activeSessionId: number | null;
  onSuccess: () => void;
  onFallbackManual: () => void;
  onNotify: (type: 'success' | 'error' | 'warning', msg: string) => void;
  onCountdownChange?: (secondsLeft: number | null) => void;
}

const MAX_RETRIES = 3;
const DEFAULT_DELAY_MS = 5 * 60 * 1000;

function resolveDelayMs(branches: BranchResponse[]): number {
  const durations = branches
    .map((b) => b.autoClockOutDuration)
    .filter((d): d is number => typeof d === 'number' && d > 0);
  if (durations.length === 0) return DEFAULT_DELAY_MS;
  return Math.min(...durations);
}

function isInsideAnyBranch(position: GeoPosition, branches: BranchResponse[]): boolean {
  return branches.some((b) => {
    if (b.latitude == null || b.longitude == null) return false;
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

  const positionRef = useRef(position);
  useEffect(() => { positionRef.current = position; }, [position]);

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

  const prevClockedInRef = useRef(isClockedIn);
  useEffect(() => {
    if (prevClockedInRef.current && !isClockedIn) {
      isOutsideRef.current = false;
      clearTimer();
    }
    prevClockedInRef.current = isClockedIn;
  }, [isClockedIn, clearTimer]);

  // FIXED: clockOut now requires latitude + longitude
  const attemptClockOut = useCallback(async () => {
    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        const pos = positionRef.current;
        const res = await clockOut({
          clockOutType: 'AUTOMATIC',
          latitude:  pos?.latitude  ?? 0,
          longitude: pos?.longitude ?? 0,
        });
        onSuccessRef.current();

        // ── Distance alert: use server-provided siteDepartureDistance ──────────
        const movement = res.data?.data;
        if (movement?.siteDepartureDistance != null) {
          const distM = movement.siteDepartureDistance;
          if (distM > 200) {
            const distLabel = distM >= 1000
              ? `${(distM / 1000).toFixed(1)} km`
              : `${Math.round(distM)} m`;
            onNotifyRef.current('warning', `You clocked out ${distLabel} from where you clocked in.`);
          } else {
            onNotifyRef.current('success', 'Clocked out automatically.');
          }
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

  // ─── Main distance-check effect ──────────────────────────────────────────
  useEffect(() => {
    if (!position || !isClockedIn || branches.length === 0) return;

    const inside = isInsideAnyBranch(position, branches);

    if (!inside && !isOutsideRef.current) {
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
      isOutsideRef.current = false;
      clearTimer();
      onNotifyRef.current('success', 'Welcome back! Clock-out cancelled.');
    }
  }, [position, branches, isClockedIn, attemptClockOut, clearTimer, startTicker]);

  // ─── Branches-change re-evaluation ───────────────────────────────────────
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
  }, [branches, isClockedIn, position, clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const delaySeconds = resolveDelayMs(branches) / 1000;
  return { delaySeconds };
}
