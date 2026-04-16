import { useState, useEffect, useRef, useCallback } from 'react';
import { LogIn, LogOut, MapPin, AlertCircle, ChevronRight, Radio, Timer, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { FlowHoverButton } from './ui/flow-hover-button';
import { OrbitalLoader } from './ui/orbital-loader';
import { LocationMap } from './ui/expand-map';
import { SessionHistory } from './SessionHistory';
import { Button } from './ui/button';
import {
  SplashedPushNotifications,
  type SplashedPushNotificationsHandle,
} from './ui/splashed-push-notifications';

import { useAuth } from '../context/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAutoClockIn } from '../hooks/useAutoClockIn';
import { useAutoClockOut } from '../hooks/useAutoClockOut';
import { useUserLocationBroadcast } from '../hooks/useAdminWebSocket';
import {
  clockIn,
  clockOut,
  getAllSessions,
  isActive,
  getActiveMovement,
} from '../services/sessionService';
import { getAllBranches } from '../services/branchService';
import type { SessionResponse, BranchResponse } from '../types';

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

const BRANCH_POLL_MS             = 30_000;
const MANUAL_RECLOCKING_DELAY_MS = 1 * 60 * 1000;

export function UserDashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const { position, error: geoError } = useGeolocation();
  const toastRef   = useRef<SplashedPushNotificationsHandle>(null);

  const [sessions, setSessions]               = useState<SessionResponse[]>([]);
  const [branches, setBranches]               = useState<BranchResponse[]>([]);
  const [isClockedIn, setIsClockedIn]         = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [activeBranchName, setActiveBranchName] = useState<string | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [actionLoading, setActionLoading]     = useState(false);
  const [manualClockInEnabled, setManualClockInEnabled]   = useState(false);
  const [manualClockOutEnabled, setManualClockOutEnabled] = useState(false);
  const [locationName, setLocationName]       = useState<string>('Locating…');
  const [cooldownActive, setCooldownActive]   = useState(false);
  const [sessionDoneForToday, setSessionDoneForToday] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [hooksReady, setHooksReady]           = useState(false);

  const reClockInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const positionRef       = useRef(position);
  positionRef.current     = position;

  const branchesRef       = useRef(branches);
  useEffect(() => { branchesRef.current = branches; }, [branches]);

  const isClockedInRef    = useRef(isClockedIn);
  useEffect(() => { isClockedInRef.current = isClockedIn; }, [isClockedIn]);

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

  const fetchSessions = useCallback(async () => {
    try {
      const res = await getAllSessions({ page: 0, size: 20 });
      const sess: SessionResponse[] = res.data.data.content ?? [];
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

  // ─── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        // If mustChangePassword is set, the backend will 403 on /me detail calls.
        // Detect it up-front via the user object from AuthContext.
        if (user?.mustChangePassword) {
          window.location.href = '/onboarding';
          return;
        }

        const [branchRes, activeStatus] = await Promise.all([
          getAllBranches({ page: 0, size: 100 }),
          isActive(),
        ]);
        const fetched = branchRes.data.data.content ?? [];
        setBranches(fetched);
        setIsClockedIn(activeStatus);
        await fetchSessions();
        if (activeStatus) {
          await fetchActiveBranch();
        }
      } catch (err: unknown) {
        // Backend returns 403 with mustChangePassword hint — redirect to onboarding
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
          window.location.href = '/onboarding';
          return;
        }
        notify('error', 'Failed to load your data.');
      } finally {
        setLoading(false);
        setHooksReady(true);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Poll branches so radius changes propagate ─────────────────────────────
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await getAllBranches({ page: 0, size: 100 });
        setBranches(res.data.data.content ?? []);
      } catch { /* silent */ }
    }, BRANCH_POLL_MS);
    return () => clearInterval(id);
  }, []);

  // ─── Broadcast user location to admin map ─────────────────────────────────
  useUserLocationBroadcast({
    isClockedIn,
    position,
    email: user?.email ?? '',
  });

  // ─── Reverse geocode (debounced to 4 decimal places) ──────────────────────
  const roundedLat = position ? Math.round(position.latitude  * 10_000) : null;
  const roundedLng = position ? Math.round(position.longitude * 10_000) : null;
  useEffect(() => {
    if (!position) return;
    reverseGeocode(position.latitude, position.longitude).then(setLocationName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundedLat, roundedLng]);

  // ─── Stable callback refs ──────────────────────────────────────────────────
  const handleClockInSuccessRef  = useRef<(id: number) => Promise<void>>(async () => {});
  const handleClockOutSuccessRef = useRef<() => Promise<void>>(async () => {});
  const notifyRef = useRef(notify);
  useEffect(() => { notifyRef.current = notify; }, [notify]);

  const handleClockInSuccess = useCallback(async (sessionId: number) => {
    setIsClockedIn(true);
    setActiveSessionId(sessionId);
    setManualClockInEnabled(false);
    setSessionDoneForToday(false);
    await fetchSessions();
    await fetchActiveBranch();
  }, [fetchSessions, fetchActiveBranch]);
  useEffect(() => { handleClockInSuccessRef.current = handleClockInSuccess; }, [handleClockInSuccess]);

  const handleClockOutSuccess = useCallback(async () => {
    setIsClockedIn(false);
    setActiveSessionId(null);
    setActiveBranchName(null);
    setManualClockOutEnabled(false);
    await fetchSessions();
  }, [fetchSessions]);
  useEffect(() => { handleClockOutSuccessRef.current = handleClockOutSuccess; }, [handleClockOutSuccess]);

  const stableOnClockInSuccess  = useCallback((id: number) => handleClockInSuccessRef.current(id), []);
  const stableOnClockOutSuccess = useCallback(() => handleClockOutSuccessRef.current(), []);
  const stableNotify = useCallback(
    (type: 'success' | 'error' | 'warning', msg: string) => notifyRef.current(type, msg),
    [],
  );
  const stableSetManualClockIn  = useCallback(() => setManualClockInEnabled(true), []);
  const stableSetManualClockOut = useCallback(() => setManualClockOutEnabled(true), []);
  const stableOnCountdownChange = useCallback((s: number | null) => setCountdownSeconds(s), []);

  // ─── Auto hooks ───────────────────────────────────────────────────────────
  const branchPerimeters = branches.map((b) => ({
    id:     b.id,
    lat:    b.latitude,
    lng:    b.longitude,
    radius: b.radius,
  }));

  useAutoClockIn({
    position: hooksReady ? position : null,
    branches: branchPerimeters,
    isClockedIn: isClockedIn || cooldownActive || sessionDoneForToday,
    onSuccess:        stableOnClockInSuccess,
    onFallbackManual: stableSetManualClockIn,
    onNotify:         stableNotify,
  });

  const { delaySeconds: autoClockOutDelaySeconds } = useAutoClockOut({
    position: hooksReady ? position : null,
    branches,
    isClockedIn,
    activeSessionId,
    onSuccess:         stableOnClockOutSuccess,
    onFallbackManual:  stableSetManualClockOut,
    onNotify:          stableNotify,
    onCountdownChange: stableOnCountdownChange,
  });

  // ─── Manual clock-in ──────────────────────────────────────────────────────
  const handleManualClockIn = async () => {
    if (!position) { notify('error', 'Location not available.'); return; }
    setActionLoading(true);
    try {
      const res = await clockIn({
        latitude:  position.latitude,
        longitude: position.longitude,
      });
      await handleClockInSuccess(res.data.data.id);
      notify('success', 'Clocked in successfully.');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Clock-in failed. Please try again.';
      notify('error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Manual clock-out ─────────────────────────────────────────────────────
  const handleManualClockOut = async () => {
    if (!activeSessionId) return;
    setActionLoading(true);
    try {
      await clockOut({ clockOutType: 'MANUAL' });
      notify('success', 'Clocked out successfully.');

      setSessionDoneForToday(true);
      setCooldownActive(true);

      reClockInTimerRef.current = setTimeout(async () => {
        try {
          const pos = positionRef.current;
          if (!pos || isClockedInRef.current) {
            setCooldownActive(false);
            return;
          }
          const { haversineDistance } = await import('../lib/utils');
          const inAnyZone = branchesRef.current.some(
            (b) => haversineDistance(pos.latitude, pos.longitude, b.latitude, b.longitude) <= b.radius,
          );
          if (inAnyZone) {
            notify('warning', 'Still in zone — auto clocking you back in.');
            try {
              const res = await clockIn({ latitude: pos.latitude, longitude: pos.longitude });
              setCooldownActive(false);
              setSessionDoneForToday(false);
              await handleClockInSuccess(res.data.data.id);
            } catch {
              setCooldownActive(false);
              notify('error', 'Auto re-clock-in failed. Please clock in manually.');
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
    } catch {
      notify('error', 'Clock-out failed. Please try again.');
      setSessionDoneForToday(false);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => () => {
    if (reClockInTimerRef.current) clearTimeout(reClockInTimerRef.current);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <OrbitalLoader message="Loading your dashboard…" />
      </div>
    );
  }

  const todaySessions = sessions.filter((s) =>
    s.workDate === new Date().toISOString().split('T')[0],
  );

  const clockInDisabled =
    isClockedIn ||
    cooldownActive ||
    sessionDoneForToday ||
    (!manualClockInEnabled && !geoError) ||
    actionLoading;

  const clockOutDisabled =
    !isClockedIn ||
    sessionDoneForToday ||
    actionLoading;

  const statusLabel = isClockedIn
    ? 'You are currently clocked in.'
    : sessionDoneForToday
    ? 'Session complete for today.'
    : 'You are not clocked in.';

  const displayRadius = branches.length
    ? Math.min(...branches.map((b) => b.radius))
    : 0;

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

      {/* Geo error banner */}
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

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clock actions card */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isClockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
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
            {countdownSeconds !== null && isClockedIn && (
              <motion.div
                key="countdown"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3"
              >
                <Timer className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-400">You left the office zone</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Auto clocking out in{' '}
                    <span className="font-mono font-bold text-amber-400 tabular-nums">
                      {Math.floor(countdownSeconds / 60)}:
                      {String(countdownSeconds % 60).padStart(2, '0')}
                    </span>
                    {' '}— return to cancel
                  </p>
                </div>
                <div className="w-16 h-1.5 rounded-full bg-amber-400/20 overflow-hidden shrink-0">
                  <motion.div
                    className="h-full bg-amber-400 rounded-full origin-left"
                    animate={{ scaleX: countdownSeconds / autoClockOutDelaySeconds }}
                    transition={{ duration: 0.9, ease: 'linear' }}
                  />
                </div>
              </motion.div>
            )}

            {sessionDoneForToday && !cooldownActive && countdownSeconds === null && (
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

            {cooldownActive && (
              <motion.p
                key="cooldown"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-muted-foreground border border-dashed border-border rounded-lg p-3"
              >
                ⏳ Still in zone. Checking if auto clock-in is needed in ~1 minute.
              </motion.p>
            )}

            {(manualClockInEnabled || manualClockOutEnabled) && !cooldownActive && !sessionDoneForToday && (
              <motion.p
                key="manual"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-muted-foreground border border-dashed border-border rounded-lg p-3"
              >
                ⚠️ Auto clock-in/out failed after 3 retries. Manual action is now enabled.
              </motion.p>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className={`text-sm font-semibold mt-0.5 ${isClockedIn ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                {isClockedIn ? 'Clocked In' : 'Clocked Out'}
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

          <div className="flex items-center gap-2 rounded-lg bg-muted/60 border border-border px-3 py-2">
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

      {/* Session history */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Session History</h2>
          <span className="text-xs text-muted-foreground">Last 20 sessions</span>
        </div>

        <SessionHistory sessions={sessions} />

        <div className="mt-4 pt-4 border-t border-border flex justify-center">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate('/sessions')}
          >
            View All Sessions
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;