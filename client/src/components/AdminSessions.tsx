import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Clock, LogOut, CalendarDays, RotateCcw, Hand, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/services/api";
import { undoClockOut } from "@/services/sessionService";
import type { ApiResponse, PageResponse, SessionResponse, ClockEventResponse } from "@/types";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(start: string, end?: string | null): string {
  if (!end) return "Active";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalMins = Math.floor(ms / 60_000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Movement row ─────────────────────────────────────────────────────────────

function MovementRow({
  movement,
  onUndo,
  undoing,
}: {
  movement: ClockEventResponse;
  onUndo: (id: number) => void;
  undoing: boolean;
}) {
  const isActive = !movement.clockOutTime;
  const isManual = movement.clockOutType === "MANUAL";

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 min-w-0">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0 text-emerald-500" />
          <span className="text-foreground font-medium">{formatTime(movement.clockInTime)}</span>
        </span>
        <span className="text-muted-foreground">→</span>
        <span className={`font-medium ${isActive ? "text-emerald-500" : "text-foreground"}`}>
          {isActive ? "now" : formatTime(movement.clockOutTime)}
        </span>
        {!isActive && movement.clockOutTime && (
          <span className="text-muted-foreground">({formatDuration(movement.clockInTime, movement.clockOutTime)})</span>
        )}
        {movement.branchName && (
          <span className="text-primary/60 truncate">@ {movement.branchName}</span>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isActive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">Active</span>
        ) : isManual ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wide">
            <Hand className="h-2.5 w-2.5" /> Manual
          </span>
        ) : movement.clockOutType === "AUTOMATIC" ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400 uppercase tracking-wide">
            <Zap className="h-2.5 w-2.5" /> Auto
          </span>
        ) : null}

        {!isActive && movement.id !== -1 && (
          <Button
            size="icon" variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            disabled={undoing}
            onClick={() => onUndo(movement.id)}
            title="Undo clock-out"
          >
            <RotateCcw className={`h-3 w-3 ${undoing ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({
  session,
  index,
  onUndoSuccess,
}: {
  session: SessionResponse;
  index: number;
  onUndoSuccess: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [undoingId, setUndoingId] = React.useState<number | null>(null);

  const isActive = session.status === "ACTIVE";
  const firstMovement = session.movements[0];
  const lastMovement  = session.movements[session.movements.length - 1];

  const handleUndo = async (movementId: number) => {
    setUndoingId(movementId);
    try {
      await undoClockOut(movementId);
      onUndoSuccess();
    } catch (err) {
      console.error("Failed to undo clock-out", err);
    } finally {
      setUndoingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.18) }}
      whileHover={{ scale: 1.012, transition: { duration: 0.15 } }}
      className={`rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
        isActive ? "border-emerald-500/30" : "border-border"
      }`}
    >
      {/* Header — click to expand */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3"
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isActive ? "bg-emerald-500/15" : "bg-primary/10"}`}>
            {isActive ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : (
              <CalendarDays className="w-3.5 h-3.5 text-primary" />
            )}
          </div>

          {/* Date + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground leading-tight">{formatDate(session.workDate)}</p>
              {isActive && (
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">Active</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {session.sessionOwner && <span>👤 {session.sessionOwner} · </span>}
              {session.movements.length} visit{session.movements.length !== 1 ? "s" : ""}
              {firstMovement && (
                <> · {formatTime(firstMovement.clockInTime)} → {isActive ? "now" : formatTime(lastMovement?.clockOutTime)} · {formatDuration(firstMovement.clockInTime, lastMovement?.clockOutTime)}</>
              )}
            </p>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            {!isActive && (
              <span className="hidden sm:inline-flex items-center rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Done
              </span>
            )}
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </div>
        </div>
      </button>

      {/* Expanded clock events */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
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
                  <MovementRow
                    key={m.id}
                    movement={m}
                    onUndo={handleUndo}
                    undoing={undoingId === m.id}
                  />
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-1">No clock events recorded.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── AdminSessions ────────────────────────────────────────────────────────────

export default function AdminSessions() {
  const [sessions, setSessions]     = React.useState<SessionResponse[]>([]);
  const [totalPages, setTotalPages] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [loading, setLoading]       = React.useState(false);
  const [minDate, setMinDate]       = React.useState("");
  const [maxDate, setMaxDate]       = React.useState("");

  const fetchSessions = React.useCallback(async (page: number) => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<PageResponse<SessionResponse>>>("/api/v1/sessions/all", {
        params: {
          page,
          size: 20,
          ...(minDate && { minWorkDate: minDate }),
          ...(maxDate && { maxWorkDate: maxDate }),
        },
      });
      const data = res.data.data;
      setSessions(data.content);
      setTotalPages(data.totalPages);
      setCurrentPage(data.number);
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    } finally {
      setLoading(false);
    }
  }, [minDate, maxDate]);

  React.useEffect(() => { fetchSessions(0); }, [fetchSessions]);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2.5 mb-4 p-3.5 rounded-xl border border-border bg-muted/30">
        <div className="flex flex-col gap-1 w-full sm:w-auto sm:flex-1 min-w-[130px]">
          <Label className="text-xs">From</Label>
          <Input type="date" value={minDate} onChange={(e) => setMinDate(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto sm:flex-1 min-w-[130px]">
          <Label className="text-xs">To</Label>
          <Input type="date" value={maxDate} onChange={(e) => setMaxDate(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="flex items-end w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => { setMinDate(""); setMaxDate(""); }} className="w-full sm:w-auto">
            Clear
          </Button>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No sessions found.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((session, idx) => (
            <SessionCard
              key={session.id}
              session={session}
              index={idx}
              onUndoSuccess={() => fetchSessions(currentPage)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">Page {currentPage + 1} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" disabled={currentPage === 0} onClick={() => fetchSessions(currentPage - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={currentPage >= totalPages - 1} onClick={() => fetchSessions(currentPage + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
