import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LogIn, LogOut, MapPin, AlertCircle, ChevronRight,
  Radio, Building2, WifiOff, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { FlowHoverButton }      from './ui/flow-hover-button';
import { OrbitalLoader }        from './ui/orbital-loader';
import { LocationMap }          from './ui/expand-map';
import { SessionHistory }       from './SessionHistory';
import { Button }               from './ui/button';
import {
  SplashedPushNotifications,
  type SplashedPushNotificationsHandle,
} from './ui/splashed-push-notifications';

import { useAuth }                  from '../context/AuthContext';
import { useGeolocation }           from '../hooks/useGeolocation';
import { useAutoClockIn }           from '../hooks/useAutoClockIn';
import { useAutoClockOut }          from '../hooks/useAutoClockOut';
import { useUserLocationBroadcast } from '../hooks/useAdminWebSocket';
import {
  clockIn,
  clockOut,
  getAllSessions,
  isActive,
  getActiveMovement,
} from '../services/sessionService';
import { getAllBranches, getBranchDetails }  from '../services/branchService';
import {
  savePendingClockIn,
  getPendingClockIn,
  clearPendingClockIn,
  hasPendingClockIn,
} from '../services/offlineClockQueue';
import {
  isOnline,
  onConnectivityChange,
  startConnectivityMonitor,
} from '../services/connectivityStore';
import type { SessionResponse, BranchResponse } from '../types';

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const json = await res.json();
    const a = json.address ?? {};
    const parts = [
      a.road ?? a.pedestrian ?? a.footway,
      a.suburb ?? a.neighbourhood ?? a.quarter,
      a.city ?? a.town ?? a.village,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : json.display_name ?? 'Unknown location';
  } catch {
    return 'Location unavailable';
  }
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const BRANCH_POLL_MS             = 30_000;
const MANUAL_RECLOCKING_DELAY_MS = 1 * 60 * 1000;

// ─── Component ─────────────────────────────────────────────────────────────────

export function UserDashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const toastRef  = useRef<SplashedPushNotificationsHandle>(null);

  // ─── Core state ─────────────────────────────────────────────────────────
  const [sessions, setSessions]                 = useState<SessionResponse[]>([]);
  const [branches, setBranches]                 = useState<BranchResponse[]>([]);
  const [isClockedIn, setIsClockedIn]           = useState(false);
  const { position, error: geoError }           = useGeolocation(isClockedIn);
  const [activeSessionId, setActiveSessionId]   = useState<number | null>(null);
  const [activeBranchName, setActiveBranchName] = useState<string | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [actionLoading, setActionLoading]       = useState(false);
  const [manualClockInEnabled, setManualClockInEnabled]   = useState(false);
  const [manualClockOutEnabled, setManualClockOutEnabled] = useState(false);
  const [locationName, setLocationName]         = useState<string>('Locating…');
  const [cooldownActive, setCooldownActive]     = useState(false);
  const [sessionDoneForToday, setSessionDoneForToday] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [hooksReady, setHooksReady]             = useState(false);

  // ─── Offline state ───────────────────────────────────────────────────────
  const [isOffline, setIsOffline]               = useState(() => !isOnline());
  // Synchronous localStorage check — no async, no race conditions
  const [hasPending, setHasPending]             = useState(() => hasPendingClockIn());

  // ─── Refs ────────────────────────────────────────────────────────────────
  const reClockInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const positionRef       = useRef(position);
  positionRef.current     = position;
  const branchesRef       = useRef(branches);
  useEffect(() => { branchesRef.current = branches; }, [branches]);
  const isClockedInRef    = useRef(isClockedIn);
  useEffect(() => { isClockedInRef.current = isClockedIn; }, [isClockedIn]);

  // ─── Notify helper ───────────────────────────────────────────────────────
  const notify = useCallback(
    (type: 'success' | 'error' | 'warning', msg: string) => {
      toastRef.current?.createNotification(
        type,
        type.charAt(0).toUpperCase() + type.slice(1),
        msg,
      );
    },
    [],
  );

  // ─── Refresh offline state from localStorage (synchronous) ──────────────
  const refreshOfflineState = useCallback(() => {
    setHasPending(hasPendingClockIn());
  }, []);

  // ─── Connectivity tracking (connectivityStore — works on real network loss) ──
  useEffect(() => {
    // Start heartbeat monitor — pings /favicon.ico every 30s and verifies
    // native online/offline events with a real request. Returns cleanup fn.
    const stopMonitor = startConnectivityMonitor();

    const unsub = onConnectivityChange(async (online) => {
      setIsOffline(!online);
      if (!online) return;

      // Just came online — check for pending offline clock-in first
      const pending = getPendingClockIn();
      if (pending) {
        // Optimistically set clocked-in so auto hooks don't fire a duplicate
        setIsClockedIn(true);
        try {
          const res = await clockIn(pending);
          clearPendingClockIn();
          setHasPending(false);
          notify('success', 'Offline clock-in synced successfully.');
          await handleClockInSuccessRef.current(res.data.data.id);
        } catch {
          setIsClockedIn(false);
          notify('error', 'Failed to sync offline clock-in. Will retry on next reconnect.');
        }
      } else {
        // No pending — normal server reconcile
        try {
          const activeStatus = await isActive();
          setIsClockedIn(activeStatus);
          if (activeStatus) {
            await fetchActiveBranchRef.current();
          } else {
            setActiveBranchName(null);
          }
        } catch { /* silent */ }
      }
    });

    return () => {
      stopMonitor();
      unsub();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Cross-tab sync: if another tab clears the pending key, update state ──
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'klock_pending_clockin') setHasPending(hasPendingClockIn());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // ─── Data fetchers ───────────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    try {
      const res  = await getAllSessions({ page: 0, size: 20 });
      const sess = res.data.data.content ?? [];
      setSessions(sess);
      const active = sess.find((s) => s.status === 'ACTIVE');
      setActiveSessionId(active?.id ?? null);
    } catch {
      notify('error', 'Failed to load sessions.');
    }
  }, [notify]);

  const fetchActiveBranch = useCallback(async () => {
    try {
      const movement = await getActiveMovement();
      setActiveBranchName(movement?.branchName ?? null);
    } catch {
      setActiveBranchName(null);
    }
  }, []);

  // ─── Initial load ────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        if (user?.mustChangePassword) {
          window.location.href = '/onboarding';
          return;
        }

        const [branchRes, activeStatus] = await Promise.all([
          getAllBranches({ page: 0, size: 100 }),
          isActive(),
        ]);
        const fetched = branchRes.data.data.content ?? [];
        const enriched = await Promise.all(
          fetched.map(async (b) => {
            try {
              const det = await getBranchDetails(b.id);
              return { ...b, autoClockOutDuration: det.data.data.autoClockOutDuration };
            } catch {
              return b;
            }
          }),
        );
        setBranches(enriched);
        setIsClockedIn(activeStatus);
        await fetchSessions();
        if (activeStatus) await fetchActiveBranch();
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403) { window.location.href = '/onboarding'; return; }
        notify('error', 'Failed to load your data.');
      } finally {
        setLoading(false);
        setHooksReady(true);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Poll branches ────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(async () => {
      if (!isOnline()) return;
      try {
        const res      = await getAllBranches({ page: 0, size: 100 });
        const fetched  = res.data.data.content ?? [];
        const enriched = await Promise.all(
          fetched.map(async (b) => {
            try {
              const det = await getBranchDetails(b.id);
              return { ...b, autoClockOutDuration: det.data.data.autoClockOutDuration };
            } catch { return b; }
          }),
        );
        setBranches(enriched);
      } catch { /* silent */ }
    }, BRANCH_POLL_MS);
    return () => clearInterval(id);
  }, []);

  // ─── Broadcast location to admin map ─────────────────────────────────────
  useUserLocationBroadcast({ isClockedIn, position, email: user?.email ?? '' });

  // ─── Reverse geocode (debounced) ──────────────────────────────────────────
  const roundedLat = position ? Math.round(position.latitude  * 10_000) : null;
  const roundedLng = position ? Math.round(position.longitude * 10_000) : null;
  useEffect(() => {
    if (!position || !isOnline()) return;
    reverseGeocode(position.latitude, position.longitude).then(setLocationName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundedLat, roundedLng]);

  // ─── Stable callbacks for hooks ──────────────────────────────────────────
  const handleClockInSuccessRef  = useRef<(id: number) => Promise<void>>(async () => {});
  const handleClockOutSuccessRef = useRef<() => Promise<void>>(async () => {});
  const notifyRef = useRef(notify);
  useEffect(() => { notifyRef.current = notify; }, [notify]);
  const fetchSessionsRef = useRef(fetchSessions);
  useEffect(() => { fetchSessionsRef.current = fetchSessions; }, [fetchSessions]);
  const fetchActiveBranchRef = useRef(fetchActiveBranch);
  useEffect(() => { fetchActiveBranchRef.current = fetchActiveBranch; }, [fetchActiveBranch]);

  const handleClockInSuccess = useCallback(async (sessionId: number) => {
    setIsClockedIn(true);
    setActiveSessionId(sessionId);
    setManualClockInEnabled(false);
    setSessionDoneForToday(false);
    await fetchSessions();
    await fetchActiveBranch();
    refreshOfflineState();
  }, [fetchSessions, fetchActiveBranch, refreshOfflineState]);
  useEffect(() => { handleClockInSuccessRef.current = handleClockInSuccess; }, [handleClockInSuccess]);

  const handleClockOutSuccess = useCallback(async () => {
    setIsClockedIn(false);
    setActiveSessionId(null);
    setActiveBranchName(null);
    setManualClockOutEnabled(false);
    await fetchSessions();
    refreshOfflineState();
  }, [fetchSessions, refreshOfflineState]);
  useEffect(() => { handleClockOutSuccessRef.current = handleClockOutSuccess; }, [handleClockOutSuccess]);

  const stableOnClockInSuccess   = useCallback((id: number) => handleClockInSuccessRef.current(id), []);
  const stableOnClockOutSuccess  = useCallback(() => handleClockOutSuccessRef.current(), []);
  const stableNotify             = useCallback(
    (type: 'success' | 'error' | 'warning', msg: string) => notifyRef.current(type, msg), [],
  );
  const stableSetManualClockIn   = useCallback(() => setManualClockInEnabled(true), []);
  const stableSetManualClockOut  = useCallback(() => setManualClockOutEnabled(true), []);
  const stableOnCountdownChange  = useCallback((s: number | null) => setCountdownSeconds(s), []);

  // ─── Auto hooks ───────────────────────────────────────────────────────────
  const branchPerimeters = branches.map((b) => ({
    id: b.id, lat: b.latitude ?? 0, lng: b.longitude ?? 0, radius: b.radius,
  }));

  useAutoClockIn({
    position:        hooksReady ? position : null,
    branches:        branchPerimeters,
    isClockedIn:     isClockedIn || cooldownActive || sessionDoneForToday,
    onSuccess:       stableOnClockInSuccess,
    onFallbackManual: stableSetManualClockIn,
    onNotify:        stableNotify,
  });

  useAutoClockOut({
    position:          hooksReady ? position : null,
    branches,
    isClockedIn,
    activeSessionId,
    activeBranchId:    activeSessionId
      ? (branches.find((b) => b.displayName === activeBranchName)?.id ?? null)
      : null,
    onSuccess:         stableOnClockOutSuccess,
    onFallbackManual:  stableSetManualClockOut,
    onNotify:          stableNotify,
    onCountdownChange: stableOnCountdownChange,
  });

  // ─── Manual clock-in ─────────────────────────────────────────────────────
  const handleManualClockIn = async () => {
    if (!position) { notify('error', 'Location not available.'); return; }
    setActionLoading(true);

    // ── Offline: save full payload to localStorage — sync on reconnect ────
    if (!isOnline()) {
      const now = new Date();
      // Battery API reads from device hardware — works offline
      let batteryLevel: number | undefined;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nav = navigator as any;
        if (typeof nav.getBattery === 'function') {
          const bat = await nav.getBattery();
          batteryLevel = Math.round(bat.level * 100);
        }
      } catch { /* unavailable on this device */ }
      savePendingClockIn({
        latitude:        position.latitude,
        longitude:       position.longitude,
        accuracy:        position.accuracy ?? 0,
        isDelaySync:     true,
        deviceId:        localStorage.getItem('klock_device_id') ?? undefined,
        batteryLevel,
        clientTimeStamp: now.toTimeString().slice(0, 8), // HH:mm:ss for Java LocalTime
      });
      setHasPending(true);
      notify('warning', 'Offline — clock-in saved and will sync when back online.');
      setActionLoading(false);
      return;
    }

    try {
      // Gather diagnostics — mirrors useAutoClockIn's ensureDeviceRegistered / helpers
      const deviceId = await (async () => {
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
      })();

      let batteryLevel: number | undefined;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nav = navigator as any;
        if (typeof nav.getBattery === 'function') {
          const bat = await nav.getBattery();
          batteryLevel = Math.round(bat.level * 100);
        }
      } catch { /* unavailable */ }

      let signalStrength: number | undefined;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const conn = (navigator as any).connection;
        if (conn) {
          if (conn.downlink >= 10) signalStrength = 4;
          else if (conn.downlink >= 5)  signalStrength = 3;
          else if (conn.downlink >= 1)  signalStrength = 2;
          else if (conn.downlink > 0)   signalStrength = 1;
          else signalStrength = 0;
        }
      } catch { /* unavailable */ }

      const now = new Date();
      const res = await clockIn({
        latitude:        position.latitude,
        longitude:       position.longitude,
        accuracy:        position.accuracy ?? 0,
        deviceId,
        batteryLevel,
        signalStrength,
        clientTimeStamp: now.toTimeString().slice(0, 8),
        isDelaySync:     false,
      });
      await handleClockInSuccess(res.data.data.id);
      notify('success', 'Clocked in successfully.');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Clock-in failed. Please try again.';
      // api.ts sanitizer already stripped stack traces — safe to show directly
      notify('error', msg);
      // Surface fallback manual button if backend flagged a location issue
      setManualClockInEnabled(true);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Manual clock-out ────────────────────────────────────────────────────
  const handleManualClockOut = async () => {
    if (!position) { notify('error', 'Location not available.'); return; }
    setActionLoading(true);

    try {
      // ── Offline clock-out ────────────────────────────────────────────────
      // If there's a pending (unsynced) clock-in, the user never truly clocked
      // in on the server — cancel the pending clock-in instead.
      if (!isOnline()) {
        if (hasPendingClockIn()) {
          clearPendingClockIn();
          setHasPending(false);
          notify('warning', 'Offline — pending clock-in cancelled.');
          setActionLoading(false);
          return;
        }
        // Was clocked in online but went offline — can't clock out without server
        notify('error', 'Cannot clock out while offline. Please reconnect and try again.');
        setActionLoading(false);
        return;
      }

      // ── Online path ────────────────────────────────────────────────────
      if (!activeSessionId) { setActionLoading(false); return; }

      await clockOut({
        clockOutType: 'MANUAL',
        latitude:     position.latitude,
        longitude:    position.longitude,
      });
      notify('success', 'Clocked out successfully.');

      setSessionDoneForToday(true);
      setCooldownActive(true);

      reClockInTimerRef.current = setTimeout(async () => {
        try {
          const pos = positionRef.current;
          if (!pos || isClockedInRef.current) { setCooldownActive(false); return; }
          const { haversineDistance } = await import('../lib/utils');
          const inAnyZone = branchesRef.current.some(
            (b) =>
              b.latitude != null && b.longitude != null &&
              haversineDistance(pos.latitude, pos.longitude, b.latitude, b.longitude) <= b.radius,
          );
          if (inAnyZone) {
            notify('warning', 'Still in zone — auto clocking you back in.');
            try {
              // Gather diagnostics the same way useAutoClockIn does
              const zoneEnteredAt = new Date();
              let batteryLevel: number | undefined;
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const nav = navigator as any;
                if (typeof nav.getBattery === 'function') {
                  const bat = await nav.getBattery();
                  batteryLevel = Math.round(bat.level * 100);
                }
              } catch { /* unavailable */ }
              let signalStrength: number | undefined;
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const conn = (navigator as any).connection;
                if (conn) {
                  if (conn.downlink >= 10) signalStrength = 4;
                  else if (conn.downlink >= 5)  signalStrength = 3;
                  else if (conn.downlink >= 1)  signalStrength = 2;
                  else if (conn.downlink > 0)   signalStrength = 1;
                  else signalStrength = 0;
                }
              } catch { /* unavailable */ }

              // Resolve deviceId properly — mirrors ensureDeviceRegistered()
              const resolvedDeviceId = await (async () => {
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
              })();

              const res = await clockIn({
                latitude:        pos.latitude,
                longitude:       pos.longitude,
                accuracy:        pos.accuracy ?? 0,
                deviceId:        resolvedDeviceId,
                batteryLevel,
                signalStrength,
                clientTimeStamp: zoneEnteredAt.toTimeString().slice(0, 8),
                isDelaySync:     false,
              });
              setCooldownActive(false);
              setSessionDoneForToday(false);
              await handleClockInSuccess(res.data.data.id);
            } catch (err: unknown) {
              setCooldownActive(false);
              const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                ?? 'Auto re-clock-in failed. Please clock in manually.';
              notify('error', msg);
              setManualClockInEnabled(true);
            }
          } else {
            setCooldownActive(false);
          }
        } catch {
          setCooldownActive(false);
        }
      }, MANUAL_RECLOCKING_DELAY_MS);

      await handleClockOutSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Clock-out failed. Please try again.';
      notify('error', msg);
      setSessionDoneForToday(false);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => () => {
    if (reClockInTimerRef.current) clearTimeout(reClockInTimerRef.current);
  }, []);

  // ─── Manual sync — retry if the online handler failed ───────────────────
  const handleManualFlush = useCallback(async () => {
    if (!isOnline()) return;
    const pending = getPendingClockIn();
    if (!pending) return;
    try {
      const res = await clockIn(pending); // payload is already complete
      clearPendingClockIn();
      setHasPending(false);
      notify('success', 'Offline clock-in synced successfully.');
      await handleClockInSuccessRef.current(res.data.data.id);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Sync failed. Will retry automatically.';
      notify('error', msg);
    }
  }, [notify]);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <OrbitalLoader message="Loading your dashboard…" />
      </div>
    );
  }

  // ─── Derived values ───────────────────────────────────────────────────────
  const todaySessions = sessions.filter(
    (s) => s.workDate === new Date().toISOString().split('T')[0],
  );

  const displayRadius = branches.length
    ? Math.min(...branches.map((b) => b.radius))
    : 0;

  // ── Button disable logic ─────────────────────────────────────────────────
  // clockIn enabled when offline + not clocked in + no pending queued yet
  const offlineClockInUnlocked =
    isOffline && !isClockedIn && !hasPending && !cooldownActive && !sessionDoneForToday && !actionLoading;

  const clockInDisabled = offlineClockInUnlocked
    ? false
    : isClockedIn ||
      cooldownActive ||
      sessionDoneForToday ||
      hasPending ||
      (!manualClockInEnabled && !geoError) ||
      actionLoading;

  const clockOutDisabled =
    (!isClockedIn && !hasPending) ||
    sessionDoneForToday ||
    actionLoading;

  const statusLabel = isClockedIn
    ? 'You are currently clocked in.'
    : sessionDoneForToday
    ? 'Session complete for today.'
    : hasPending
    ? 'Clock-in saved offline — will sync when back online.'
    : 'You are not clocked in.';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <SplashedPushNotifications ref={toastRef} />

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Welcome, {user?.firstName} {user?.lastName} 👋
        </h1>
        <p className="text-muted-foreground mt-1">{statusLabel}</p>
      </div>

      {/* ── Offline banner (no connection) ────────────────────────────────── */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            key="connectivity-banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 p-4 rounded-xl border border-red-400/40 bg-red-400/10 text-sm"
            role="status"
            aria-live="polite"
          >
            <WifiOff className="w-4 h-4 shrink-0 text-red-500" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-red-600 dark:text-red-400">
                You are currently offline
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Clock events will be saved and synced automatically when your connection is restored.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Geo error banner ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {geoError && (
          <motion.div
            className="flex items-center gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {geoError} — Location tracking required for auto clock-in/out.
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pending sync banner ────────────────────────────────────────────── */}
      <AnimatePresence>
        {hasPending && (
          <motion.div
            key="offline-banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-xl border border-amber-400/40 bg-amber-400/10 text-sm"
          >
            <WifiOff className="w-4 h-4 shrink-0 text-amber-500" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-600 dark:text-amber-400">
                Clock-in pending sync
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isOffline
                  ? 'Offline — will sync automatically when back online.'
                  : 'Syncing…'}
              </p>
            </div>
            {!isOffline && (
              <RefreshCw className="w-4 h-4 shrink-0 text-amber-500 animate-spin" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Clock actions card */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isClockedIn
                    ? 'bg-emerald-500 animate-pulse'
                    : hasPending
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-muted-foreground'
                }`}
              />
              Attendance
            </h2>

            <AnimatePresence>
              {isClockedIn && activeBranchName && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0"
                >
                  <Building2 className="w-3 h-3 shrink-0" />
                  {activeBranchName}
                </motion.div>
              )}
              {!isClockedIn && hasPending && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 shrink-0"
                >
                  <WifiOff className="w-3 h-3 shrink-0" />
                  Clock-in pending sync
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <FlowHoverButton
              icon={<LogIn className="w-4 h-4" />}
              disabled={clockInDisabled}
              onClick={handleManualClockIn}
              className="flex-1 h-12 text-base"
            >
              {actionLoading ? 'Processing…' : 'Clock In'}
            </FlowHoverButton>

            <FlowHoverButton
              icon={<LogOut className="w-4 h-4" />}
              disabled={clockOutDisabled}
              onClick={handleManualClockOut}
              className="flex-1 h-12 text-base"
            >
              {actionLoading ? 'Processing…' : 'Clock Out'}
            </FlowHoverButton>
          </div>

          <AnimatePresence mode="wait">
            {/* Countdown bar — shown while auto clock-out is counting down */}
            {countdownSeconds !== null && (
              <motion.div
                key="countdown"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    Auto clock-out in
                  </span>
                  <span className="tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                    {countdownSeconds >= 60
                      ? `${Math.floor(countdownSeconds / 60)}m ${countdownSeconds % 60}s`
                      : `${countdownSeconds}s`}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-amber-500/15 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-amber-500"
                    initial={{ width: '100%' }}
                    animate={{
                      width: `${Math.max(
                        0,
                        (countdownSeconds /
                          (branches.find((b) => b.displayName === activeBranchName)
                            ?.autoClockOutDuration ?? 300)) *
                          100,
                      )}%`,
                    }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {/* Session done online */}
            {sessionDoneForToday && !cooldownActive && countdownSeconds === null && !hasPending && (
              <motion.p
                key="done"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-muted-foreground border border-dashed border-border rounded-lg p-3"
              >
                ✅ You have clocked out for today. See you tomorrow!
              </motion.p>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className={`text-sm font-semibold mt-0.5 ${
                isClockedIn
                  ? 'text-emerald-500'
                  : hasPending
                  ? 'text-amber-500'
                  : 'text-muted-foreground'
              }`}>
                {isClockedIn
                  ? 'Clocked In'
                  : hasPending
                  ? 'Clocked In (Offline)'
                  : 'Clocked Out'}
              </p>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground">Sessions Today</p>
              <p className="text-sm font-semibold mt-0.5 text-foreground">
                {todaySessions.length}
              </p>
            </div>
          </div>
        </div>

        {/* Map / location card */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Your Location
          </h2>
          <div className="flex justify-center">
            <LocationMap
              location={locationName}
              coordinates={
                position
                  ? `${position.latitude.toFixed(5)}° N, ${position.longitude.toFixed(5)}° E`
                  : ''
              }
            />
          </div>
          {position && (
            <p className="text-xs text-muted-foreground text-center truncate px-2">
              📍 {locationName}
            </p>
          )}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-muted/60 border border-border px-3 py-2">
              <Radio className="h-3.5 w-3.5 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground">
                {branches.length > 1
                  ? `${branches.length} branches available`
                  : 'Office check-in radius: '}
                {branches.length <= 1 && (
                  <span className="font-semibold text-foreground">{displayRadius}m</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Session history */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Session History</h2>
          <span className="text-xs text-muted-foreground">Last 20 sessions</span>
        </div>
        <SessionHistory sessions={sessions} />
        <div className="flex justify-center pt-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate('/sessions')}>
            View All Sessions
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;