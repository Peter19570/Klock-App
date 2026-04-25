import { useEffect, useRef, useCallback } from 'react';
import { haversineDistance } from '../lib/utils';
import { clockIn, getActiveMovement } from '../services/sessionService';
import type { GeoPosition } from '../types';

interface UseAutoClockInOptions {
  position: GeoPosition | null;
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

  const prevClockedInRef = useRef(isClockedIn);
  useEffect(() => {
    if (prevClockedInRef.current && !isClockedIn) {
      wasInsideRef.current  = false;
      retriesRef.current    = MAX_RETRIES;
      attemptingRef.current = false;
    }
    prevClockedInRef.current = isClockedIn;
  }, [isClockedIn]);

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

      // FIXED: accuracy is now required by the new API.
      // Use position.accuracy if available, default to 0 if browser didn't provide it.
      const payload = {
        latitude:  pos.latitude,
        longitude: pos.longitude,
        accuracy:  pos.accuracy ?? 0,
      };

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
