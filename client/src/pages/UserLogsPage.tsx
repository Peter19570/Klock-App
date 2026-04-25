import * as React from 'react';
import {
  ArrowLeft, Loader2, Smartphone, Battery, Signal,
  MapPin, ShieldCheck, ShieldX, Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserAuditLogs } from '@/services/sessionService';
import type { AuditLogResponse, UserDetailResponse } from '@/types';

interface UserLogsPageProps {
  userId: number;
  user: UserDetailResponse;
  onBack: () => void;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function formatTime(iso: string) {
  // clientTimeStamp is HH:mm:ss (Java LocalTime)
  return iso ? iso.slice(0, 5) : '—';
}

function BatteryIndicator({ level }: { level: number }) {
  const color = level > 50 ? 'text-emerald-500' : level > 20 ? 'text-amber-500' : 'text-rose-500';
  return (
    <span className={`flex items-center gap-1 font-medium ${color}`}>
      <Battery className="h-3 w-3" />{level}%
    </span>
  );
}

function LogRow({ log, index }: { log: AuditLogResponse; index: number }) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut', delay: Math.min(index * 0.03, 0.2) }}
      className="group rounded-lg hover:bg-accent overflow-hidden"
      role="listitem"
    >
      <button
        type="button"
        className="flex items-center gap-4 p-2 w-full text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Icon */}
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
          log.verified ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
        }`}>
          {log.verified ? <ShieldCheck className="h-4 w-4" /> : <ShieldX className="h-4 w-4" />}
        </div>

        {/* Text block */}
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm font-medium text-card-foreground leading-tight">
              {formatDate(log.createdAt)}
            </p>
            {/* Desktop: device + gps inline on first row */}
            <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <Smartphone className="h-3 w-3 shrink-0" />
              {log.deviceId ? `${log.deviceId.slice(0, 10)}…` : '—'}
            </span>
            {log.gpsAccuracy != null && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />±{log.gpsAccuracy.toFixed(1)}m
              </span>
            )}
            {log.batteryLevel != null && (
              <span className="hidden sm:inline-flex">
                <BatteryIndicator level={log.batteryLevel} />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {/* Desktop: client time + signal */}
            <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />Client: {formatTime(log.clientTimeStamp)}
            </span>
            {log.signalStrength != null && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <Signal className="h-3 w-3 shrink-0" />{log.signalStrength} bars
              </span>
            )}
            {/* Mobile condensed */}
            <p className="text-sm text-muted-foreground sm:hidden line-clamp-1">
              {log.deviceId ? `${log.deviceId.slice(0, 12)}…` : 'No device'}
              {log.gpsAccuracy != null && ` · ±${log.gpsAccuracy.toFixed(1)}m`}
            </p>
          </div>
        </div>

        {/* Verified badge */}
        <div className="shrink-0">
          {log.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">
              <ShieldCheck className="h-2.5 w-2.5" /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-400/30 px-2 py-0.5 text-[10px] font-semibold text-rose-500 uppercase tracking-wide">
              <ShieldX className="h-2.5 w-2.5" /> Unverified
            </span>
          )}
        </div>
      </button>

      {/* Expanded detail grid */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-2 pb-3">
              <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Client Time
                </p>
                <p className="text-xs text-foreground font-medium">{formatTime(log.clientTimeStamp)}</p>
              </div>
              <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5 flex items-center gap-1">
                  <Battery className="h-3 w-3" /> Battery
                </p>
                {log.batteryLevel != null
                  ? <BatteryIndicator level={log.batteryLevel} />
                  : <p className="text-xs text-muted-foreground">—</p>}
              </div>
              <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5 flex items-center gap-1">
                  <Signal className="h-3 w-3" /> Signal
                </p>
                <p className="text-xs text-foreground font-medium">
                  {log.signalStrength != null ? `${log.signalStrength} bars` : '—'}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5 flex items-center gap-1">
                  <Smartphone className="h-3 w-3" /> Device ID
                </p>
                <p className="text-xs text-foreground font-medium truncate" title={log.deviceId}>
                  {log.deviceId || '—'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function UserLogsPage({ userId, user, onBack }: UserLogsPageProps) {
  const [logs, setLogs]       = React.useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError]     = React.useState('');

  React.useEffect(() => {
    setLoading(true);
    setError('');
    getUserAuditLogs(userId)
      .then((res) => setLogs(res.data.data ?? []))
      .catch(() => setError('Failed to load audit logs.'))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {user.firstName} {user.lastName}
      </button>

      <div>
        <h2 className="text-lg font-bold text-foreground">
          Audit Logs — {user.firstName} {user.lastName}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-sm text-destructive border border-dashed border-destructive/30 rounded-xl">
          {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
          No audit logs found for this user.
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground px-2">
            {logs.length} log{logs.length !== 1 ? 's' : ''} — tap any row to expand details
          </p>
          <div className="flex flex-col">
            <AnimatePresence>
              {logs.map((log, idx) => (
                <LogRow key={`${log.createdAt}-${idx}`} log={log} index={idx} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
