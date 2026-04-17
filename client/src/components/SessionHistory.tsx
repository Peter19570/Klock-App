import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Clock, LogOut, Zap, Hand, CalendarDays, ChevronDown } from 'lucide-react';
import type { SessionResponse, ClockEventResponse } from '../types';

interface SessionHistoryProps {
  sessions: SessionResponse[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(iso: string | undefined | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(start: string, end?: string | null): string {
  const ms =
    (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const totalMins = Math.floor(ms / 60_000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function MovementRow({ movement }: { movement: ClockEventResponse }) {
  const isActive = !movement.clockOutTime;
  const isManual = movement.clockOutType === 'MANUAL';

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/40 text-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3 shrink-0" />
        {formatTime(movement.clockInTime)}
        {movement.clockOutTime && (
          <>
            <span className="text-muted-foreground/40">→</span>
            <LogOut className="w-3 h-3 shrink-0" />
            {formatTime(movement.clockOutTime)}
          </>
        )}
        {movement.branchName && (
          <span className="text-[10px] text-primary/70 ml-1">@ {movement.branchName}</span>
        )}
      </div>
      <div className="shrink-0">
        {isActive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">
            Active
          </span>
        ) : isManual ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wide">
            <Hand className="w-2.5 h-2.5" />
            Manual
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold text-sky-400 uppercase tracking-wide">
            <Zap className="w-2.5 h-2.5" />
            Auto
          </span>
        )}
      </div>
    </div>
  );
}

function SessionCard({
  session,
  index,
}: {
  session: SessionResponse;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });
  const [expanded, setExpanded] = useState(false);

  const isActive = session.status === 'ACTIVE';
  const firstMovement = session.movements[0];
  const lastMovement = session.movements[session.movements.length - 1];

  const totalDuration =
    firstMovement
      ? formatDuration(firstMovement.clockInTime, lastMovement?.clockOutTime)
      : '—';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.25) }}
      className={`w-full rounded-xl border overflow-hidden transition-shadow hover:shadow-md
        ${isActive
          ? 'border-emerald-500/30 bg-emerald-500/5 hover:shadow-emerald-500/10'
          : 'border-border bg-card hover:shadow-black/10 dark:hover:shadow-black/40'
        }`}
    >
      {/* Header row — click to expand */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0
            ${isActive ? 'bg-emerald-500/15' : 'bg-primary/10'}`}
          >
            {isActive ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : (
              <CalendarDays className="w-3.5 h-3.5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground flex items-center gap-2">
              {formatDate(session.workDate)}
              {isActive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">
                  Active
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {session.movements.length} visit{session.movements.length !== 1 ? 's' : ''}
              {firstMovement && (
                <> · {formatTime(firstMovement.clockInTime)} → {isActive ? 'now' : formatTime(lastMovement?.clockOutTime)} · {totalDuration}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-semibold text-sm text-foreground">{totalDuration}</span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      </button>

      {/* Expanded movements */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-1.5 border-t border-border pt-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Clock Events
              </p>
              {session.movements.length > 0 ? (
                session.movements.map((m) => (
                  <MovementRow key={m.id} movement={m} />
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No clock events recorded.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function SessionHistory({ sessions }: SessionHistoryProps) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No sessions recorded yet.
      </p>
    );
  }

  const sorted = [...sessions].sort(
    (a, b) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime(),
  );

  return (
    <div className="space-y-2">
      {sorted.map((s, i) => (
        <SessionCard key={s.id} session={s} index={i} />
      ))}
    </div>
  );
}
