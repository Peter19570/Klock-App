import * as React from 'react';
import {
  Users, GitBranch, Activity, Lock, TrendingUp,
  CheckCircle2, Clock, Loader2, RefreshCw, AlertCircle,
} from 'lucide-react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { getDashboard } from '@/services/branchService';
import type { BranchResponse, DashboardResponse } from '@/types';

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
  accent?: boolean;
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

// ── Branch row ────────────────────────────────────────────────────────────────
function BranchRow({ branch, index }: { branch: BranchResponse; index: number }) {
  const total = branch.totalAssignedStaff ?? 0;
  const active = branch.currentActiveCount ?? 0;
  const pct = total > 0 ? Math.round((active / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.3) }}
      className="flex items-center gap-3 py-2.5 border-b border-border last:border-0"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{branch.displayName}</p>
          {branch.branchStatus === 'LOCKED' && (
            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-500 font-medium border border-amber-400/25 shrink-0">
              <Lock className="h-2.5 w-2.5" />Locked
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {active} active · {total} assigned
        </p>
      </div>
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
    </motion.div>
  );
}

// ── Sessions bar chart ────────────────────────────────────────────────────────
interface DayBar { label: string; date: string; count: number; }

function SessionsChart({ bars, loading }: { bars: DayBar[]; loading: boolean }) {
  const max = Math.max(...bars.map((b) => b.count), 1);
  const _now = new Date();
  const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;

  // Bars start at height 0. After one animation frame they flip to their real
  // height so the CSS transition has a "from" state to animate from.
  const [grown, setGrown] = React.useState(false);
  React.useEffect(() => {
    if (loading || bars.length === 0) { setGrown(false); return; }
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
  }, [loading, bars]);

  const CHART_H = 80;

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: `${CHART_H}px` }}>
            {bars.map((bar, i) => {
              const isToday = bar.date === today;
              const targetH = bar.count === 0
                ? 3
                : Math.max(Math.round((bar.count / max) * CHART_H), 8);
              const currentH = grown ? targetH : 0;

              const bg = bar.count === 0
                ? 'var(--border, #e2e8f0)'
                : isToday
                  ? 'var(--primary)'
                  : 'color-mix(in srgb, var(--primary) 50%, transparent)';

              return (
                <div
                  key={bar.date}
                  title={`${bar.label}: ${bar.count} session${bar.count !== 1 ? 's' : ''}`}
                  style={{
                    flex: 1,
                    height: `${currentH}px`,
                    backgroundColor: bg,
                    borderRadius: '4px 4px 0 0',
                    transition: `height 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * 60}ms`,
                    cursor: 'default',
                  }}
                />
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {bars.map((bar) => {
              const isToday = bar.date === today;
              return (
                <div key={bar.date} style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 500,
                    color: isToday ? 'var(--primary)' : 'var(--muted-foreground)',
                  }}>
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

// ── Clock-out donut ───────────────────────────────────────────────────────────
function ClockOutBreakdown({ manual, automatic, loading }: { manual: number; automatic: number; loading: boolean }) {
  const total = manual + automatic;
  const autoPct = total > 0 ? Math.round((automatic / total) * 100) : 0;
  const manualPct = total > 0 ? 100 - autoPct : 0;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const autoDash = (autoPct / 100) * circ;
  const manualDash = (manualPct / 100) * circ;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Clock-out Method</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Auto vs manual — Today</p>
        </div>
        <CheckCircle2 className="h-4 w-4 text-primary" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-28">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : total === 0 ? (
        <div className="flex items-center justify-center h-28 text-sm text-muted-foreground">
          No sessions today
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <div className="relative shrink-0">
            <svg width="88" height="88" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
              {autoPct > 0 && (
                <motion.circle cx="44" cy="44" r={r} fill="none" strokeWidth="10"
                  className="stroke-primary"
                  strokeDasharray={`${autoDash} ${circ - autoDash}`}
                  strokeDashoffset={circ / 4} strokeLinecap="round"
                  initial={{ strokeDasharray: `0 ${circ}` }}
                  animate={{ strokeDasharray: `${autoDash} ${circ - autoDash}` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              )}
              {manualPct > 0 && (
                <motion.circle cx="44" cy="44" r={r} fill="none" strokeWidth="10"
                  className="stroke-muted-foreground/30"
                  strokeDasharray={`${manualDash} ${circ - manualDash}`}
                  strokeDashoffset={circ / 4 - autoDash} strokeLinecap="round"
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
          <div className="flex flex-1 gap-4">
            <div className="flex-1 rounded-xl bg-muted/40 px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                <span className="text-xs font-medium text-foreground">Automatic</span>
              </div>
              <p className="text-2xl font-bold text-foreground"><AnimatedNumber value={automatic} /></p>
              <p className="text-[11px] text-muted-foreground mt-0.5">geofence triggered</p>
            </div>
            <div className="flex-1 rounded-xl bg-muted/40 px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40 shrink-0" />
                <span className="text-xs font-medium text-foreground">Manual</span>
              </div>
              <p className="text-2xl font-bold text-foreground"><AnimatedNumber value={manual} /></p>
              <p className="text-[11px] text-muted-foreground mt-0.5">user initiated</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main AdminOverview ────────────────────────────────────────────────────────
interface AdminOverviewProps {
  liveUsers: Map<string, { sessionState?: string; branchId?: number }>;
  isSuperAdmin: boolean;
  onNavigateToTab: (tab: string) => void;
}

export default function AdminOverview({ liveUsers, isSuperAdmin, onNavigateToTab }: AdminOverviewProps) {
  const [dashboard, setDashboard] = React.useState<DashboardResponse | null>(null);
  const [loading, setLoading]     = React.useState(true);
  const [error, setError]         = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const liveActiveCount = React.useMemo(() => {
    let count = 0;
    liveUsers.forEach((u) => {
      const state = (u.sessionState ?? '').toLowerCase().replace(' ', '_');
      if (state === 'clocked_in' || state === 'clocked in') count++;
    });
    return count;
  }, [liveUsers]);

  React.useEffect(() => {
    setLoading(true);
    setError(false);
    getDashboard()
      .then((res) => setDashboard(res.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const sessionBars: DayBar[] = React.useMemo(() =>
    (dashboard?.sessionTrend ?? []).map((t) => ({
      label: t.dayLabel,
      date: t.date,
      count: t.count,
    })),
  [dashboard]);

  const branchSummaries = dashboard?.branchSummaries ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Overview</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button
          variant="outline" size="icon" className="h-8 w-8"
          onClick={() => setRefreshKey((k) => k + 1)}
          title="Refresh overview"
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && !loading && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load dashboard data.</span>
          <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs text-destructive hover:text-destructive"
            onClick={() => setRefreshKey((k) => k + 1)}>
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Users className="h-4 w-4" />} label="Total Users"
          value={dashboard?.totalUsers ?? null} loading={loading} />
        <StatCard icon={<Activity className="h-4 w-4" />} label="Active Now"
          value={liveActiveCount} accent />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Sessions Today"
          value={dashboard?.todaySessionCount ?? null} loading={loading} />
        <StatCard icon={<GitBranch className="h-4 w-4" />}
          label={isSuperAdmin ? 'Total Branches' : 'Your Branch'}
          value={isSuperAdmin ? (dashboard?.branchSummaries.length ?? null) : (dashboard ? 1 : null)}
          loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SessionsChart bars={sessionBars} loading={loading} />
        <ClockOutBreakdown
          manual={dashboard?.clockOutStats.manual ?? 0}
          automatic={dashboard?.clockOutStats.automatic ?? 0}
          loading={loading}
        />
      </div>

      {(loading || branchSummaries.length > 0) && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {isSuperAdmin ? 'Branch Breakdown' : 'Your Branch'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Staff assignment & active rate</p>
            </div>
            {isSuperAdmin && (dashboard?.lockedBranchCount ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-500 font-medium border border-amber-400/20">
                <Lock className="h-3 w-3" />{dashboard!.lockedBranchCount} locked
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="mt-3">
                {branchSummaries.map((b, i) => <BranchRow key={b.id} branch={b} index={i} />)}
              </div>
              {branchSummaries.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{dashboard?.totalActiveStaff ?? 0}</span> of{' '}
                    <span className="font-semibold text-foreground">{dashboard?.totalAssignedStaff ?? 0}</span> staff active
                  </p>
                  <Button variant="outline" size="sm" className="h-7 text-xs"
                    onClick={() => onNavigateToTab(isSuperAdmin ? 'branches' : 'branch')}>
                    Manage
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}