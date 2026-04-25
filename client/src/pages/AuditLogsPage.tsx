import * as React from 'react';
import {
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  Battery,
  Signal,
  MapPin,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { getAllAuditLogs } from '@/services/sessionService';
import type { AuditLogResponse } from '@/types';

function formatTimestamp(ts: string) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

function BatteryIndicator({ level }: { level: number }) {
  const color =
    level > 50 ? 'text-emerald-500' :
    level > 20 ? 'text-amber-500' :
    'text-rose-500';
  return (
    <span className={`flex items-center gap-1 font-medium ${color}`}>
      <Battery className="h-3.5 w-3.5" />
      {level}%
    </span>
  );
}

function LogCard({ log, index }: { log: AuditLogResponse; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.25) }}
      className="rounded-xl border border-border bg-card shadow-sm px-4 py-3 space-y-2.5"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-semibold text-foreground">
          {formatTimestamp(log.clientTimeStamp)}
        </p>
        {log.verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">
            <ShieldCheck className="h-3 w-3" /> Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-400/30 px-2 py-0.5 text-[10px] font-semibold text-rose-500 uppercase tracking-wide">
            <ShieldX className="h-3 w-3" /> Unverified
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg bg-muted/40 px-2.5 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5 flex items-center gap-1">
            <Smartphone className="h-3 w-3" /> Device
          </p>
          <p className="text-xs text-foreground font-medium truncate" title={log.deviceId}>
            {log.deviceId ?? '—'}
          </p>
        </div>

        <div className="rounded-lg bg-muted/40 px-2.5 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5 flex items-center gap-1">
            <Battery className="h-3 w-3" /> Battery
          </p>
          {log.batteryLevel != null ? (
            <BatteryIndicator level={log.batteryLevel} />
          ) : (
            <p className="text-xs text-muted-foreground">—</p>
          )}
        </div>

        <div className="rounded-lg bg-muted/40 px-2.5 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5 flex items-center gap-1">
            <Signal className="h-3 w-3" /> Signal
          </p>
          <p className="text-xs text-foreground font-medium">
            {log.signalStrength != null ? `${log.signalStrength} dBm` : '—'}
          </p>
        </div>

        <div className="rounded-lg bg-muted/40 px-2.5 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5 flex items-center gap-1">
            <MapPin className="h-3 w-3" /> GPS Accuracy
          </p>
          <p className="text-xs text-foreground font-medium">
            {log.gpsAccuracy != null ? `±${log.gpsAccuracy.toFixed(1)}m` : '—'}
          </p>
        </div>
      </div>
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
            System-wide clock-in records with device and GPS metadata.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => fetchLogs(true)}
          disabled={refreshing || loading}
          title="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-sm text-destructive border border-dashed border-destructive/30 rounded-xl">
          {error}
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => fetchLogs()}>Retry</Button>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
          No audit logs found.
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {logs.length} log{logs.length !== 1 ? 's' : ''} found
          </p>
          <div className="flex flex-col gap-2">
            {logs.map((log, idx) => (
              <LogCard key={`${log.clientTimeStamp}-${idx}`} log={log} index={idx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
