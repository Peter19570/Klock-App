import { useEffect, useRef, useState } from 'react';
import type { GeoPosition } from '../types';
import { sendLocationPing } from '../services/sessionService';

const PING_INTERVAL_MS = 1 * 60 * 1000; // 1 minute (change back to 10 for production)

export function useGeolocation(isClockedIn = false) {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef   = useRef<number | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const positionRef  = useRef<GeoPosition | null>(null);

  // Keep positionRef current so the ping interval always sends fresh coords
  useEffect(() => { positionRef.current = position; }, [position]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setError(null);
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // ── /ping every 10 minutes while clocked in ───────────────────────────────
  useEffect(() => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }

    if (!isClockedIn) return;

    pingTimerRef.current = setInterval(async () => {
      const pos = positionRef.current;
      if (!pos || !navigator.onLine) return;
      try {
        await sendLocationPing({ latitude: pos.latitude, longitude: pos.longitude });
      } catch {
        // silent — ping failure should never disrupt the UI
      }
    }, PING_INTERVAL_MS);

    return () => {
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
    };
  }, [isClockedIn]);

  return { position, error };
}
