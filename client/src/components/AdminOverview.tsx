import * as React from 'react';
import {
  Users, GitBranch, Activity, Lock, TrendingUp,
  CheckCircle2, Clock, Loader2, RefreshCw,
} from 'lucide-react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Button } from '@/components/ui/button';
import api from '@/services/api';
import { getAllBranches, getBranchDetails } from '@/services/branchService';
import type {
  ApiResponse, PageResponse, BranchResponse, BranchDetailsResponse,
  SessionResponse,
} from '@/types';

// ── Animated number counter ───────────────────────────────────────────────────
function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) =>
    decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString(),
  );
  React.useEffect(() => {
    const ctrl = animate(count, value, { duration: 1.2, ease: 'easeOut' });
    return ctrl.stop;
  }, [value, count]);
  return <motion.span>{rounded}</motion.span>;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  suffix?: string;
  accent?: boolean; // amber tint
  loading?: boolean;
}

function StatCard({ icon, label, value, suffix, accent, loading }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl border p-4 sm:p-5 flex flex-col gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)] ${
        accent
          ? 'bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30'
          : 'bg-card border-border'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
          accent ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
        }`}>
          {icon}
        </div>
      </div>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="flex items-baseline gap-1.5">
          <span className={`text-3xl font-bold tracking-tight ${accent ? 'text-primary' : 'text-foreground'}`}>
            {value !== null ? <AnimatedNumber value={value} /> : '—'}
          </span>
          {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
        </div>
      )}
    </motion.div>
  );
}

// ── Branch row in the breakdown list ─────────────────────────────────────────
interface BranchRowProps {
  branch: BranchResponse;
  details: BranchDetailsResponse | null;
  index: number;
}

function BranchRow({ branch, details, index }: BranchRowProps) {
  const total = details?.totalAssignedStaff ?? 0;
  const active = details?.currentActiveCount ?? 0;
  const pct = total > 0 ? Math.round((active / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.3) }}
      className="flex items-center gap-3 py-2.5 border-b border-border last:border-0"
    >
      {/* Branch name + lock badge */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{branch.displayName}</p>
          {branch.isLocked && (
            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-500 font-medium border border-amber-400/25 shrink-0">
              <Lock className="h-2.5 w-2.5" />Locked
            </span>
          )}
        </div>
        {details && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {active} active · {total} assigned
          </p>
        )}
      </div>

      {/* Progress bar */}
      {details ? (
        <div className="w-24 sm:w-32 shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, delay: 0.2 + index * 0.05, ease: 'easeOut' }}
            />
          </div>
        </div>
      ) : (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
      )}
    </motion.div>
  );
}

// ── Sessions-per-day bar chart (last 7 days) ──────────────────────────────────
interface DayBar {
  label: string;    // e.g. "Mon"
  date: string;     // yyyy-mm-dd
  count: number;
}

function SessionsChart({ bars, loading }: { bars: DayBar[]; loading: boolean }) {
  const max = Math.max(...bars.map((b) => b.count), 1);
  const _now = new Date();
  const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Sessions — Last 7 Days</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Total sessions recorded per day</p>
        </div>
        <TrendingUp className="h-4 w-4 text-primary" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {/* Bar area — fixed height */}
          <div className="flex items-end gap-1.5" style={{ height: '80px' }}>
            {bars.map((bar, i) => {
              const isToday = bar.date === today;
              const heightPx = bar.count > 0 ? Math.max((bar.count / max) * 76, 6) : 3;
              return (
                <div key={bar.date} className="flex-1 flex items-end h-full group relative">
                  {/* hover count */}
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {bar.count}
                  </span>
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      isToday ? 'bg-primary' : 'bg-primary/35 dark:bg-primary/30'
                    }`}
                    style={{
                      height: `${heightPx}px`,
                      transitionDelay: `${i * 60}ms`,
                      opacity: bar.count === 0 ? 0.25 : 1,
                    }}
                  />
                </div>
              );
            })}
          </div>
          {/* Labels row — separate from bar area */}
          <div className="flex gap-1.5">
            {bars.map((bar) => {
              const isToday = bar.date === today;
              return (
                <div key={bar.date} className="flex-1 flex justify-center">
                  <span className={`text-[10px] font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {bar.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Clock-out type breakdown donut ────────────────────────────────────────────
function ClockOutBreakdown({
  manual, automatic, loading,
}: { manual: number; automatic: number; loading: boolean }) {
  const total = manual + automatic;
  const autoPct = total > 0 ? Math.round((automatic / total) * 100) : 0;
  const manualPct = total > 0 ? 100 - autoPct : 0;

  // SVG donut params
  const r = 36;
  const circ = 2 * Math.PI * r;
  const autoDash = (autoPct / 100) * circ;
  const manualDash = (manualPct / 100) * circ;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Clock-out Method</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Auto vs manual — last 7 days</p>
        </div>
        <CheckCircle2 className="h-4 w-4 text-primary" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-28">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : total === 0 ? (
        <div className="flex items-center justify-center h-28 text-sm text-muted-foreground">
          No sessions this week
        </div>
      ) : (
        <div className="flex items-center gap-6">
          {/* Donut */}
          <div className="relative shrink-0">
            <svg width="88" height="88" viewBox="0 0 88 88">
              {/* track */}
              <circle cx="44" cy="44" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
              {/* auto slice */}
              {autoPct > 0 && (
                <motion.circle
                  cx="44" cy="44" r={r}
                  fill="none"
                  strokeWidth="10"
                  className="stroke-primary"
                  strokeDasharray={`${autoDash} ${circ - autoDash}`}
                  strokeDashoffset={circ / 4}
                  strokeLinecap="round"
                  initial={{ strokeDasharray: `0 ${circ}` }}
                  animate={{ strokeDasharray: `${autoDash} ${circ - autoDash}` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              )}
              {/* manual slice */}
              {manualPct > 0 && (
                <motion.circle
                  cx="44" cy="44" r={r}
                  fill="none"
                  strokeWidth="10"
                  className="stroke-muted-foreground/30"
                  strokeDasharray={`${manualDash} ${circ - manualDash}`}
                  strokeDashoffset={circ / 4 - autoDash}
                  strokeLinecap="round"
                  initial={{ strokeDasharray: `0 ${circ}` }}
                  animate={{ strokeDasharray: `${manualDash} ${circ - manualDash}` }}
                  transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-foreground">{autoPct}%</span>
              <span className="text-[9px] text-muted-foreground">auto</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-3 flex-1">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                <span className="text-xs font-medium text-foreground">Automatic</span>
              </div>
              <p className="text-2xl font-bold text-foreground ml-4.5">
                <AnimatedNumber value={automatic} />
              </p>
              <p className="text-[11px] text-muted-foreground ml-4.5">geofence triggered</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40 shrink-0" />
                <span className="text-xs font-medium text-foreground">Manual</span>
              </div>
              <p className="text-2xl font-bold text-foreground ml-4.5">
                <AnimatedNumber value={manual} />
              </p>
              <p className="text-[11px] text-muted-foreground ml-4.5">user initiated</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main AdminOverview ────────────────────────────────────────────────────────
interface AdminOverviewProps {
  branches: BranchResponse[];
  liveUsers: Map<string, { sessionState?: string; branchId?: number }>;
  isSuperAdmin: boolean;
  adminBranch?: BranchResponse | null;
  onNavigateToTab: (tab: string) => void;
}

export default function AdminOverview({
  branches,
  liveUsers,
  isSuperAdmin,
  adminBranch,
  onNavigateToTab,
}: AdminOverviewProps) {
  const [totalUsers, setTotalUsers]     = React.useState<number | null>(null);
  const [todaySessions, setTodaySessions] = React.useState<number | null>(null);
  const [branchDetails, setBranchDetails] = React.useState<Map<number, BranchDetailsResponse>>(new Map());
  const [sessionBars, setSessionBars]   = React.useState<DayBar[]>([]);
  const [clockOutStats, setClockOutStats] = React.useState({ manual: 0, automatic: 0 });
  const [loadingUsers, setLoadingUsers] = React.useState(true);
  const [loadingToday, setLoadingToday] = React.useState(true);
  const [loadingChart, setLoadingChart] = React.useState(true);
  const [refreshKey, setRefreshKey]     = React.useState(0);

  // Live active count from WebSocket
  const liveActiveCount = React.useMemo(() => {
    let count = 0;
    liveUsers.forEach((u) => {
      const state = (u.sessionState ?? '').toLowerCase().replace(' ', '_');
      if (state === 'clocked_in' || state === 'clocked in') count++;
    });
    return count;
  }, [liveUsers]);

  // Stats from branch details
  const branchStats = React.useMemo(() => {
    const list = isSuperAdmin ? branches : (adminBranch ? [adminBranch] : []);
    let totalAssigned = 0;
    let totalActive = 0;
    let locked = 0;
    list.forEach((b) => {
      const d = branchDetails.get(b.id);
      if (d) {
        totalAssigned += d.totalAssignedStaff;
        totalActive   += d.currentActiveCount;
      }
      if (b.isLocked) locked++;
    });
    return { totalAssigned, totalActive, locked };
  }, [branches, adminBranch, branchDetails, isSuperAdmin]);

  // Fetch total users
  React.useEffect(() => {
    setLoadingUsers(true);
    api.get<ApiResponse<PageResponse<{ id: number }>>>('/api/v1/users/all', {
      params: { page: 0, size: 1 },
    }).then((res) => {
      setTotalUsers(res.data.data.totalElements);
    }).catch(() => setTotalUsers(null))
      .finally(() => setLoadingUsers(false));
  }, [refreshKey]);

  // Fetch branch details for breakdown
  React.useEffect(() => {
    const list = isSuperAdmin ? branches : (adminBranch ? [adminBranch] : []);
    if (list.length === 0) return;
    const map = new Map<number, BranchDetailsResponse>();
    Promise.all(
      list.map((b) =>
        getBranchDetails(b.id)
          .then((res) => { map.set(b.id, res.data.data); })
          .catch(() => {}),
      ),
    ).then(() => setBranchDetails(new Map(map)));
  }, [branches, adminBranch, isSuperAdmin, refreshKey]);

  // Fetch sessions for last 7 days — build chart by grouping all sessions by workDate
  React.useEffect(() => {
    const now = new Date();

    // Build last 7 days as yyyy-MM-dd strings (local date, no UTC shift)
    const toLocalDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const days: DayBar[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push({
        label: d.toLocaleDateString(undefined, { weekday: 'short' }),
        date: toLocalDateStr(d),
        count: 0,
      });
    }

    const minDate = days[0].date;
    const maxDate = days[days.length - 1].date;

    setLoadingChart(true);
    setLoadingToday(true);

    api.get<ApiResponse<PageResponse<SessionResponse>>>('/api/v1/sessions/all', {
      params: { page: 0, size: 200, minWorkDate: minDate, maxWorkDate: maxDate },
    }).then((res) => {
      const sessions = res.data.data.content ?? [];

      // Group sessions by workDate — workDate from backend is already yyyy-MM-dd
      const countByDate = new Map<string, number>();
      sessions.forEach((s) => {
        countByDate.set(s.workDate, (countByDate.get(s.workDate) ?? 0) + 1);
      });

      // Apply counts to the pre-built day slots
      const filledDays = days.map((d) => ({ ...d, count: countByDate.get(d.date) ?? 0 }));
      setSessionBars(filledDays);

      // Today count
      const today = toLocalDateStr(now);
      setTodaySessions(countByDate.get(today) ?? 0);

      // Clock-out breakdown
      let manual = 0, automatic = 0;
      sessions.forEach((s) => {
        s.movements.forEach((m) => {
          if (m.clockOutTime) {
            if (m.clockOutType === 'AUTOMATIC') automatic++;
            else if (m.clockOutType === 'MANUAL') manual++;
          }
        });
      });
      setClockOutStats({ manual, automatic });
    }).catch(() => {
      setSessionBars(days);
      setTodaySessions(null);
    }).finally(() => {
      setLoadingChart(false);
      setLoadingToday(false);
    });
  }, [refreshKey]);

  const displayBranches = isSuperAdmin ? branches : (adminBranch ? [adminBranch] : []);

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Overview</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setRefreshKey((k) => k + 1)}
          title="Refresh overview"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Total Users"
          value={totalUsers}
          loading={loadingUsers}
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Active Now"
          value={liveActiveCount}
          accent
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Sessions Today"
          value={todaySessions}
          loading={loadingToday}
        />
        <StatCard
          icon={<GitBranch className="h-4 w-4" />}
          label={isSuperAdmin ? 'Total Branches' : 'Your Branch'}
          value={isSuperAdmin ? branches.length : (adminBranch ? 1 : null)}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SessionsChart bars={sessionBars} loading={loadingChart} />
        <ClockOutBreakdown
          manual={clockOutStats.manual}
          automatic={clockOutStats.automatic}
          loading={loadingChart}
        />
      </div>

      {/* Branch breakdown — Super Admin only shows all, Admin shows their one */}
      {displayBranches.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {isSuperAdmin ? 'Branch Breakdown' : 'Your Branch'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Staff assignment & active rate</p>
            </div>
            {isSuperAdmin && branchStats.locked > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-500 font-medium border border-amber-400/20">
                <Lock className="h-3 w-3" />{branchStats.locked} locked
              </span>
            )}
          </div>

          <div className="mt-3">
            {displayBranches.map((b, i) => (
              <BranchRow
                key={b.id}
                branch={b}
                details={branchDetails.get(b.id) ?? null}
                index={i}
              />
            ))}
          </div>

          {/* Summary footer */}
          {branchDetails.size > 0 && (
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{branchStats.totalActive}</span> of{' '}
                <span className="font-semibold text-foreground">{branchStats.totalAssigned}</span> staff active
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onNavigateToTab(isSuperAdmin ? 'branches' : 'branch')}
              >
                Manage
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
