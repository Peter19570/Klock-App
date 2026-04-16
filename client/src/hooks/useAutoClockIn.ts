import { useEffect, useRef, useCallback } from 'react';
import { haversineDistance } from '../lib/utils';
import { clockIn, getActiveMovement } from '../services/sessionService';
import type { GeoPosition } from '../types';

interface UseAutoClockInOptions {
  position: GeoPosition | null;
  /**
   * Array of branch perimeters to check against.
   * In multi-branch mode, the hook checks ALL branches and triggers as soon as
   * the user steps into any one of them. The backend then does the authoritative
   * Smart Discovery match, so this client-side check is just a debounce guard.
   */
  branches: Array<{ id: number; lat: number; lng: number; radius: number }>;
  isClockedIn: boolean;
  onSuccess: (workdaySessionId: number) => void;
  onFallbackManual: () => void;
  onNotify: (type: 'success' | 'error', msg: string) => void;
}

const MAX_RETRIES = 3;

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

  // When the user clocks out while still inside the zone, reset so the next
  // position tick can re-detect entry. Also abort any in-flight retry loop.
  const prevClockedInRef = useRef(isClockedIn);
  useEffect(() => {
    if (prevClockedInRef.current && !isClockedIn) {
      wasInsideRef.current  = false;
      retriesRef.current    = MAX_RETRIES; // cancels the while-loop
      attemptingRef.current = false;
    }
    prevClockedInRef.current = isClockedIn;
  }, [isClockedIn]);

  const attempt = useCallback(
    async (pos: GeoPosition) => {
      if (attemptingRef.current) return;
      attemptingRef.current = true;
      retriesRef.current    = 0;

      // Guard: check if an open ClockEvent already exists (handles page-refresh
      // case where React state hasn't hydrated yet).
      try {
        const activeMovement = await getActiveMovement();
        if (activeMovement) {
          // Surface the parent workday id via onSuccess so the dashboard
          // can hydrate isClockedIn correctly, then bail.
          // getActiveMovement returns a ClockEvent; we need the workday id.
          // getTodaySession gives us that.
          const { getTodaySession } = await import('../services/sessionService');
          const session = await getTodaySession();
          if (session) onSuccess(session.id);
          retriesRef.current    = 0;
          attemptingRef.current = false;
          return;
        }
      } catch {
        // If the check fails, fall through to the retry loop.
      }

      // Smart Discovery: just send coords — backend resolves which branch.
      const payload = { latitude: pos.latitude, longitude: pos.longitude };

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

          if (isClockedInRef.current) return; // race guard

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

    // User is "inside" if they are within the radius of ANY registered branch.
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
