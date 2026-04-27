import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {
  ArrowLeft, Loader2,
  LogIn, LogOut, AlertTriangle, Smartphone, ShieldAlert, HelpCircle,
  Clock, ChevronDown, SlidersHorizontal, X, Search, CalendarDays,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getUserAuditLogs } from '@/services/sessionService';
import type { AuditLogResponse, AuditLogType, UserDetailResponse } from '@/types';

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

const ALL_TYPES: AuditLogType[] = [
  'CLOCK_IN_SUCCESS',
  'CLOCK_OUT_SUCCESS',
  'SUSPICIOUS_CLOCK_OUT',
  'DIFFERENT_DEVICE_DETECT',
  'AMBIGUOUS_CLOCK_EVENT',
];

function formatAuditValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) {
    const [h, m] = value as number[];
    if (
      value.length >= 2 &&
      value.every((v) => typeof v === 'number') &&
      h >= 0 && h <= 23 && m >= 0 && m <= 59
    ) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return value.join(', ');
  }
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
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${cfg.iconBg}`}>
          {cfg.icon}
        </div>

        <div className="flex-grow min-w-0">
          <p className="text-sm font-medium text-card-foreground leading-tight">
            {formatDate(log.createdAt)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
            <Clock className="h-3 w-3 shrink-0 inline mr-1" />
            {formatDate(log.createdAt)}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.badge}`}>
            {cfg.label}
          </span>
          {hasInfo && (
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          )}
        </div>
      </button>

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

// ─── Filter state ─────────────────────────────────────────────────────────────

interface LogFilters {
  date: string;
  actionType: AuditLogType | '';
}

const EMPTY_FILTERS: LogFilters = { date: '', actionType: '' };

interface LogFilterModalProps {
  open: boolean;
  onClose: () => void;
  filters: LogFilters;
  onApply: (f: LogFilters) => void;
  onClear: () => void;
}

function LogFilterModal({ open, onClose, filters, onApply, onClear }: LogFilterModalProps) {
  const [local, setLocal] = React.useState<LogFilters>(filters);

  React.useEffect(() => {
    if (open) setLocal(filters);
  }, [open, filters]);

  const set = <K extends keyof LogFilters>(key: K, value: LogFilters[K]) =>
    setLocal((prev) => ({ ...prev, [key]: value }));

  const handleApply = () => { onApply(local); onClose(); };
  const handleClear = () => { setLocal(EMPTY_FILTERS); onClear(); onClose(); };

  return ReactDOM.createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 z-[60]"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
            className="bg-card rounded-2xl border border-border shadow-xl p-5 w-full max-w-sm"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Filter Logs</h2>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Date */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" /> Date
                </Label>
                <Input
                  type="date"
                  value={local.date}
                  onChange={(e) => set('date', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              {/* Event type */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Event Type</Label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => set('actionType', '')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      local.actionType === ''
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground'
                    }`}
                  >
                    All
                  </button>
                  {ALL_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set('actionType', t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        local.actionType === t
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground'
                      }`}
                    >
                      {TYPE_CONFIG[t].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <Button variant="outline" className="flex-1" onClick={handleClear}>Clear</Button>
              <Button className="flex-1" onClick={handleApply}>Apply</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UserLogsPage({ userId, user, onBack }: UserLogsPageProps) {
  const [allLogs, setAllLogs]     = React.useState<AuditLogResponse[]>([]);
  const [loading, setLoading]     = React.useState(true);
  const [error, setError]         = React.useState('');
  const [filters, setFilters]     = React.useState<LogFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [search, setSearch]       = React.useState('');

  React.useEffect(() => {
    setLoading(true);
    setError('');
    getUserAuditLogs(userId)
      .then((res) => setAllLogs(res.data.data ?? []))
      .catch(() => setError('Failed to load audit logs.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const logs = React.useMemo(() => {
    let result = allLogs;
    if (filters.date) {
      result = result.filter((l) => l.createdAt.startsWith(filters.date));
    }
    if (filters.actionType) {
      result = result.filter((l) => l.type === filters.actionType);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) => formatDate(l.createdAt).toLowerCase().includes(q));
    }
    return result;
  }, [allLogs, filters, search]);

  const activeFilterCount = [
    filters.date !== '',
    filters.actionType !== '',
  ].filter(Boolean).length;

  const removeChip = (key: keyof LogFilters) =>
    setFilters((prev) => ({ ...prev, [key]: '' }));

  const TYPE_LABEL: Record<string, string> = Object.fromEntries(
    ALL_TYPES.map((t) => [t, TYPE_CONFIG[t].label]),
  );

  // User initials for avatar
  const initials = [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('').toUpperCase();

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {user.firstName} {user.lastName}
      </button>

      {/* User header with avatar */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          {user.profilePictureUrl ? (
            <img
              src={user.profilePictureUrl}
              alt={`${user.firstName} ${user.lastName}`}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <span className="text-sm font-bold text-primary">{initials || '?'}</span>
          )}
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground leading-tight">
            Audit Logs — {user.firstName} {user.lastName}
          </h2>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 h-9 shrink-0"
            onClick={() => setFilterOpen(true)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Active chips */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {filters.date && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-foreground">
                <Clock className="h-3 w-3" /> {filters.date}
                <button onClick={() => removeChip('date')} className="text-muted-foreground hover:text-foreground ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.actionType && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-foreground">
                {TYPE_LABEL[filters.actionType] ?? filters.actionType}
                <button onClick={() => removeChip('actionType')} className="text-muted-foreground hover:text-foreground ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
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
          {allLogs.length === 0 ? 'No audit logs found for this user.' : 'No logs match your filters.'}
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground px-2">
            {logs.length} log{logs.length !== 1 ? 's' : ''}{allLogs.length !== logs.length ? ` of ${allLogs.length}` : ''} — tap any row to expand details
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

      <LogFilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={setFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
      />
    </div>
  );
}