import * as React from 'react';
import {
  Loader2, RefreshCw,
  LogIn, LogOut, AlertTriangle, Smartphone, ShieldAlert, HelpCircle,
  User, Clock, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllAuditLogs } from '@/services/sessionService';
import type { AuditLogResponse, AuditLogType } from '@/types';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

const TYPE_CONFIG: Record<AuditLogType, {
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  badge: string;
}> = {
  CLOCK_IN_SUCCESS: {
    label: 'Clock In',
    icon: <LogIn className="h-4 w-4" />,
    iconBg: 'bg-emerald-500/15 text-emerald-500',
    badge: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-500',
  },
  CLOCK_OUT_SUCCESS: {
    label: 'Clock Out',
    icon: <LogOut className="h-4 w-4" />,
    iconBg: 'bg-sky-500/15 text-sky-500',
    badge: 'bg-sky-500/15 border-sky-400/30 text-sky-500',
  },
  SUSPICIOUS_CLOCK_OUT: {
    label: 'Suspicious',
    icon: <AlertTriangle className="h-4 w-4" />,
    iconBg: 'bg-rose-500/15 text-rose-500',
    badge: 'bg-rose-500/15 border-rose-400/30 text-rose-500',
  },
  DIFFERENT_DEVICE_DETECT: {
    label: 'New Device',
    icon: <Smartphone className="h-4 w-4" />,
    iconBg: 'bg-amber-500/15 text-amber-500',
    badge: 'bg-amber-500/15 border-amber-400/30 text-amber-500',
  },
  AMBIGUOUS_CLOCK_EVENT: {
    label: 'Ambiguous',
    icon: <HelpCircle className="h-4 w-4" />,
    iconBg: 'bg-purple-500/15 text-purple-500',
    badge: 'bg-purple-500/15 border-purple-400/30 text-purple-500',
  },
};

/**
 * Java LocalTime comes over the wire in two shapes depending on Jackson config:
 *   array  → [9, 30, 0]  (hour, minute, second)
 *   object → { hour: 9, minute: 30, second: 0, nano: 0 }
 * We detect both and format to HH:mm.
 */
function formatAuditValue(value: unknown): string {
  if (value == null || value === '') return '—';

  // Array shape: [H, M] or [H, M, S] — all numbers, H 0-23, M 0-59
  if (Array.isArray(value)) {
    const [h, m] = value as number[];
    if (
      value.length >= 2 &&
      value.every((v) => typeof v === 'number') &&
      h >= 0 && h <= 23 &&
      m >= 0 && m <= 59
    ) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return value.join(', ');
  }

  // Object shape: { hour, minute, second?, nano? }
  if (typeof value === 'object') {
    const t = value as Record<string, unknown>;
    if (
      typeof t.hour === 'number' &&
      typeof t.minute === 'number' &&
      t.hour >= 0 && t.hour <= 23 &&
      t.minute >= 0 && t.minute <= 59
    ) {
      return `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
    }
    return JSON.stringify(value);
  }

  return String(value);
}

function AuditInfoGrid({ auditInfo }: { auditInfo: Record<string, unknown> }) {
  const entries = Object.entries(auditInfo);
  if (entries.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-2 pb-3">
      {entries.map(([key, value]) => {
        const display = formatAuditValue(value);
        return (
          <div key={key} className="rounded-lg bg-muted/40 px-2.5 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </p>
            <p className="text-xs text-foreground font-medium truncate" title={display}>
              {display}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function LogRow({ log, index }: { log: AuditLogResponse; index: number }) {
  const [expanded, setExpanded] = React.useState(false);
  const cfg = TYPE_CONFIG[log.type] ?? {
    label: log.type,
    icon: <ShieldAlert className="h-4 w-4" />,
    iconBg: 'bg-muted text-muted-foreground',
    badge: 'bg-muted border-border text-muted-foreground',
  };

  const hasInfo = Object.keys(log.auditInfo ?? {}).length > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut', delay: Math.min(index * 0.03, 0.2) }}
      className="group rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors overflow-hidden"
      role="listitem"
    >
      <button
        type="button"
        className="flex items-center gap-4 p-2 w-full text-left"
        onClick={() => hasInfo && setExpanded((v) => !v)}
      >
        {/* Type icon */}
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${cfg.iconBg}`}>
          {cfg.icon}
        </div>

        {/* Text block */}
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm font-medium text-card-foreground leading-tight">
              {log.fullName || '—'}
            </p>
            <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              {formatDate(log.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <p className="text-sm text-muted-foreground sm:hidden">{formatDate(log.createdAt)}</p>
            <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3 shrink-0" />
              ID: {log.userId}
            </span>
          </div>
        </div>

        {/* Type badge + expand chevron */}
        <div className="shrink-0 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.badge}`}>
            {cfg.label}
          </span>
          {hasInfo && (
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          )}
        </div>
      </button>

      {/* Expanded auditInfo */}
      <AnimatePresence initial={false}>
        {expanded && hasInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <AuditInfoGrid auditInfo={log.auditInfo} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AuditLogsPage() {
  const [logs, setLogs]             = React.useState<AuditLogResponse[]>([]);
  const [loading, setLoading]       = React.useState(true);
  const [error, setError]           = React.useState('');
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchLogs = React.useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const res = await getAllAuditLogs();
      setLogs(res.data.data ?? []);
    } catch {
      setError('Failed to load audit logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground">Audit Logs</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            System-wide clock events with contextual metadata.
          </p>
        </div>
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0"
          onClick={() => fetchLogs(true)} disabled={refreshing || loading} title="Refresh">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : error ? (
        <div className="text-center py-12 text-sm text-destructive border border-dashed border-destructive/30 rounded-xl">
          {error}
          <div className="mt-3"><Button variant="outline" size="sm" onClick={() => fetchLogs()}>Retry</Button></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
          No audit logs found.
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground px-2">
            {logs.length} log{logs.length !== 1 ? 's' : ''} — tap any row to expand details
          </p>
          <div className="flex flex-col">
            <AnimatePresence>
              {logs.map((log, idx) => (
                <LogRow key={log.id} log={log} index={idx} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
