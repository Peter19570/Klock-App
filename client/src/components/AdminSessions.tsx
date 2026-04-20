import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  ChevronLeft, ChevronRight, ChevronDown, Clock, CalendarDays,
  Hand, Zap, SlidersHorizontal, X, Loader2, RefreshCw, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/services/api";
import { exportSessions } from "@/services/sessionService";
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

// ─── Filter Modal ──────────────────────────────────────────────────────────────

interface SessionFilterModalProps {
  open: boolean;
  onClose: () => void;
  minDate: string;
  maxDate: string;
  onApply: (min: string, max: string) => void;
  onClear: () => void;
}

function SessionFilterModal({ open, onClose, minDate, maxDate, onApply, onClear }: SessionFilterModalProps) {
  const [localMin, setLocalMin] = React.useState(minDate);
  const [localMax, setLocalMax] = React.useState(maxDate);

  React.useEffect(() => {
    if (open) {
      setLocalMin(minDate);
      setLocalMax(maxDate);
    }
  }, [open, minDate, maxDate]);

  const handleApply = () => {
    onApply(localMin, localMax);
    onClose();
  };

  const handleClear = () => {
    setLocalMin('');
    setLocalMax('');
    onClear();
    onClose();
  };

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
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Filter Sessions</h2>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">From</Label>
                <Input
                  type="date"
                  value={localMin}
                  onChange={(e) => setLocalMin(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">To</Label>
                <Input
                  type="date"
                  value={localMax}
                  onChange={(e) => setLocalMax(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2.5 mt-5">
              <Button variant="outline" className="flex-1 h-9 text-sm" onClick={handleClear}>
                Clear all
              </Button>
              <Button className="flex-1 h-9 text-sm" onClick={handleApply}>
                Apply filters
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ─── Export Modal ─────────────────────────────────────────────────────────────

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

function ExportModal({ open, onClose }: ExportModalProps) {
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate]     = React.useState("");
  const [exporting, setExporting] = React.useState(false);
  const [error, setError]         = React.useState("");

  React.useEffect(() => {
    if (open) { setStartDate(""); setEndDate(""); setError(""); }
  }, [open]);

  const handleExport = async () => {
    setError("");
    setExporting(true);
    try {
      const res = await exportSessions(startDate || undefined, endDate || undefined);
      // Build a filename like: sessions_2024-01-01_2024-01-31.csv
      const from = startDate || "all";
      const to   = endDate   || "all";
      const filename = `sessions_${from}_${to}.csv`;

      const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const a   = document.createElement("a");
      a.href    = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      console.error("Export failed", err);
      setError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

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
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Export Session History</h2>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} disabled={exporting}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              Select a date range to export. Leave both blank to export all sessions.
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-sm"
                  disabled={exporting}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-sm"
                  disabled={exporting}
                />
              </div>
            </div>

            {error && (
              <p className="mt-3 text-xs text-destructive">{error}</p>
            )}

            <div className="flex gap-2.5 mt-5">
              <Button variant="outline" className="flex-1 h-9 text-sm" onClick={onClose} disabled={exporting}>
                Cancel
              </Button>
              <Button className="flex-1 h-9 text-sm gap-1.5" onClick={handleExport} disabled={exporting}>
                {exporting ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Exporting…</>
                ) : (
                  <><Download className="h-3.5 w-3.5" /> Export CSV</>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ─── Movement row ─────────────────────────────────────────────────────────────

function MovementRow({ movement }: { movement: ClockEventResponse }) {
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
      </div>
    </div>
  );
}

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({ session, index }: { session: SessionResponse; index: number }) {
  const [expanded, setExpanded] = React.useState(false);

  const isActive      = session.status === "ACTIVE";
  const firstMovement = session.movements[0];
  const lastMovement  = session.movements[session.movements.length - 1];

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
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
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
                  <MovementRow key={m.id} movement={m} />
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
  const [sessions, setSessions]       = React.useState<SessionResponse[]>([]);
  const [totalPages, setTotalPages]   = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [loading, setLoading]         = React.useState(false);
  const [refreshing, setRefreshing]   = React.useState(false);

  // Applied filters
  const [minDate, setMinDate] = React.useState("");
  const [maxDate, setMaxDate] = React.useState("");

  // Modals
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSessions(currentPage);
    setRefreshing(false);
  };

  const activeFilterCount = [minDate !== '', maxDate !== ''].filter(Boolean).length;

  const handleTodayFilter = () => {
    const today = new Date().toISOString().slice(0, 10);
    setMinDate(today);
    setMaxDate(today);
  };

  const isTodayActive = (() => {
    const today = new Date().toISOString().slice(0, 10);
    return minDate === today && maxDate === today;
  })();

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-col gap-2 mb-4">
        {/* Row 1: action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 h-9 shadow-sm shrink-0"
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

          <Button
            variant={isTodayActive ? "default" : "outline"}
            size="sm"
            className="flex items-center gap-2 h-9 shadow-sm shrink-0"
            onClick={isTodayActive ? () => { setMinDate(''); setMaxDate(''); } : handleTodayFilter}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Today
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            {/* Export: icon-only on mobile, full label on sm+ */}
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 sm:hidden shadow-sm shrink-0"
              onClick={() => setExportOpen(true)}
              title="Export CSV"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex items-center gap-2 h-9 shadow-sm shrink-0"
              onClick={() => setExportOpen(true)}
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              title="Refresh sessions"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Row 2: active filter chips — only shown when filters are set */}
        {(minDate || maxDate) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {minDate && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-foreground">
                From: {minDate}
                <button onClick={() => setMinDate('')} className="text-muted-foreground hover:text-foreground ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {maxDate && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-foreground">
                To: {maxDate}
                <button onClick={() => setMaxDate('')} className="text-muted-foreground hover:text-foreground ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
          No sessions found.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((session, idx) => (
            <SessionCard key={session.id} session={session} index={idx} />
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

      {/* Filter Modal */}
      <SessionFilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        minDate={minDate}
        maxDate={maxDate}
        onApply={(min, max) => { setMinDate(min); setMaxDate(max); }}
        onClear={() => { setMinDate(''); setMaxDate(''); }}
      />

      {/* Export Modal */}
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />
    </div>
  );
}
