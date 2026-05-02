import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  ChevronDown, Clock, CalendarDays,
  Hand, Zap, SlidersHorizontal, X, Loader2, RefreshCw, Download, ArrowUp,
  Timer, AlarmClock, MapPin, Ruler, BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { exportSessions } from "@/services/sessionService";
import { getAdminSessions } from "@/services/sessionService";
import type { SessionResponse, ClockEventResponse, AdminSessionResponse, BranchResponse } from "@/types";

type ArrivalStatus = "EARLY" | "ON_TIME" | "LATE" | "";
type SessionStatus = "ACTIVE" | "COMPLETED" | "";

interface SessionFilterState {
  minDate: string;
  maxDate: string;
  arrivalStatus: ArrivalStatus;
  sessionStatus: SessionStatus;
  branchId: number | '';
}

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

// ─── Arrival status badge ─────────────────────────────────────────────────────

function ArrivalBadge({ status }: { status?: "EARLY" | "ON_TIME" | "LATE" | null }) {
  if (!status) return null;
  const map = {
    EARLY:   { label: "Early",   className: "bg-sky-400/15 text-sky-500 border-sky-400/30" },
    ON_TIME: { label: "On Time", className: "bg-emerald-500/15 text-emerald-500 border-emerald-400/30" },
    LATE:    { label: "Late",    className: "bg-rose-500/15 text-rose-500 border-rose-400/30" },
  };
  const { label, className } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}>
      <AlarmClock className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

// ─── Filter Modal ──────────────────────────────────────────────────────────────

// SessionFilterState defined above

interface SessionFilterModalProps {
  open: boolean;
  onClose: () => void;
  filters: SessionFilterState;
  onApply: (f: SessionFilterState) => void;
  onClear: () => void;
  branches?: BranchResponse[];
}

const ARRIVAL_OPTIONS: { value: ArrivalStatus; label: string }[] = [
  { value: "",        label: "Any" },
  { value: "EARLY",   label: "Early" },
  { value: "ON_TIME", label: "On Time" },
  { value: "LATE",    label: "Late" },
];

const STATUS_OPTIONS: { value: SessionStatus; label: string }[] = [
  { value: "",          label: "Any" },
  { value: "ACTIVE",    label: "Active" },
  { value: "COMPLETED", label: "Completed" },
];

function SessionFilterModal({ open, onClose, filters, onApply, onClear, branches = [] }: SessionFilterModalProps) {
  const [local, setLocal] = React.useState<SessionFilterState>(filters);

  React.useEffect(() => {
    if (open) setLocal(filters);
  }, [open, filters]);

  const set = <K extends keyof SessionFilterState>(key: K, value: SessionFilterState[K]) =>
    setLocal((prev) => ({ ...prev, [key]: value }));

  const handleApply = () => { onApply(local); onClose(); };
  const handleClear = () => {
    const empty: SessionFilterState = { minDate: "", maxDate: "", arrivalStatus: "", sessionStatus: "", branchId: "" };
    setLocal(empty);
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
              {/* Date range */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">From</Label>
                <Input
                  type="date"
                  value={local.minDate}
                  onChange={(e) => set("minDate", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">To</Label>
                <Input
                  type="date"
                  value={local.maxDate}
                  onChange={(e) => set("maxDate", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              {/* Branch picker — client-side filter */}
              {branches.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Branch
                  </Label>
                  <div className="flex flex-col gap-1 max-h-36 overflow-y-auto rounded-lg border border-border bg-muted/30 p-1">
                    <button
                      type="button"
                      onClick={() => set("branchId", "")}
                      className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors text-left ${
                        local.branchId === ""
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <span>All branches</span>
                      {local.branchId === "" && <ChevronDown className="h-3.5 w-3.5 text-primary shrink-0 rotate-[-90deg]" />}
                    </button>
                    {branches.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => set("branchId", b.id)}
                        className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors text-left ${
                          local.branchId === b.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground hover:bg-muted/60"
                        }`}
                      >
                        <span className="truncate">{b.displayName}</span>
                        {local.branchId === b.id && <ChevronDown className="h-3.5 w-3.5 text-primary shrink-0 rotate-[-90deg]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Arrival status */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <AlarmClock className="h-3.5 w-3.5" /> Arrival Status
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {ARRIVAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set("arrivalStatus", opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        local.arrivalStatus === opt.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Session status */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5" /> Session Status
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set("sessionStatus", opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        local.sessionStatus === opt.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
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

  function fmtDist(m: number | null | undefined): string | null {
    if (m == null) return null;
    if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
    return `${Math.round(m)} m`;
  }

  const departureLabel = fmtDist(movement.siteDepartureDistance);
  const proximityLabel = fmtDist(movement.entryProximityDistance);
  const isDepartureFar = (movement.siteDepartureDistance ?? 0) > 200;

  return (
    <div className="rounded-lg bg-muted/40 text-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
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

      {/* Distance sub-row */}
      {(proximityLabel || departureLabel) && (
        <div className="flex items-center gap-2 px-3 pb-2 flex-wrap">
          {proximityLabel && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
              <MapPin className="h-2.5 w-2.5 shrink-0 text-primary/60" />
              {proximityLabel} from branch
            </span>
          )}
          {departureLabel && !isActive && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
              isDepartureFar
                ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                : "bg-muted text-muted-foreground"
            }`}>
              <Ruler className="h-2.5 w-2.5 shrink-0" />
              {departureLabel} departure{isDepartureFar && " ⚠"}
            </span>
          )}
        </div>
      )}
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
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isActive ? "bg-emerald-500/15" : "bg-primary/10"}`}>
            {isActive ? (
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <CalendarDays className="w-3.5 h-3.5 text-primary" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground leading-tight">{formatDate(session.workDate)}</p>
              {isActive && (
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">Active</span>
              )}
              <ArrivalBadge status={session.arrivalStatus} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {session.sessionOwner && <span>👤 {session.sessionOwner} · </span>}
              {session.movements.length} visit{session.movements.length !== 1 ? "s" : ""}
              {firstMovement && (
                <> · {formatTime(firstMovement.clockInTime)} → {isActive ? "now" : formatTime(lastMovement?.clockOutTime)} · {formatDuration(firstMovement.clockInTime, lastMovement?.clockOutTime)}</>
              )}
            </p>
          </div>

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
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-y-1.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Clock Events
                </p>
                {/* ── Legend ── */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3 text-emerald-500 shrink-0" />
                    Clock-in
                  </span>
                  <span className="text-muted-foreground/40 text-[10px]">·</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Hand className="h-3 w-3 text-amber-400 shrink-0" />
                    Manual clock-out
                  </span>
                  <span className="text-muted-foreground/40 text-[10px]">·</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Zap className="h-3 w-3 text-sky-400 shrink-0" />
                    Auto clock-out
                  </span>
                </div>
              </div>
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

// ─── Location Report ──────────────────────────────────────────────────────────

interface BranchStat {
  branchName: string;
  count: number;
  avgDistanceMeters: number | null;
  lateCount: number;
}

function buildLocationReport(sessions: SessionResponse[]): BranchStat[] {
  const map = new Map<string, { count: number; distances: number[]; lateCount: number }>();
  for (const s of sessions) {
    for (const m of s.movements) {
      const branch = m.branchName || "Unknown";
      const entry = map.get(branch) ?? { count: 0, distances: [], lateCount: 0 };
      entry.count++;
      if (m.distanceMeters != null) entry.distances.push(m.distanceMeters);
      if (s.arrivalStatus === "LATE") entry.lateCount++;
      map.set(branch, entry);
    }
  }
  return [...map.entries()]
    .map(([branchName, { count, distances, lateCount }]) => ({
      branchName,
      count,
      avgDistanceMeters: distances.length
        ? distances.reduce((a, b) => a + b, 0) / distances.length
        : null,
      lateCount,
    }))
    .sort((a, b) => b.count - a.count);
}

function formatDistanceShort(m: number | null): string {
  if (m == null) return "—";
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

function LocationReport({ sessions }: { sessions: SessionResponse[] }) {
  const [open, setOpen] = React.useState(false);
  const stats = React.useMemo(() => buildLocationReport(sessions), [sessions]);

  if (stats.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <BarChart2 className="h-4 w-4 text-primary" />
          Location Report
          <span className="text-[11px] text-muted-foreground font-normal">
            — clock-ins per branch
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 space-y-2">
              {stats.map((stat) => (
                <div
                  key={stat.branchName}
                  className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-3 w-3 shrink-0 text-primary/60" />
                    <span className="font-medium text-foreground truncate">{stat.branchName}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {stat.count} clock-in{stat.count !== 1 ? "s" : ""}
                    </span>
                    {stat.avgDistanceMeters != null && (
                      <span className="flex items-center gap-1">
                        <Ruler className="h-2.5 w-2.5" />
                        avg {formatDistanceShort(stat.avgDistanceMeters)}
                      </span>
                    )}
                    {stat.lateCount > 0 && (
                      <span className="flex items-center gap-1 text-rose-500">
                        <AlarmClock className="h-2.5 w-2.5" />
                        {stat.lateCount} late
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── AdminSessions ────────────────────────────────────────────────────────────

const EMPTY_FILTERS: SessionFilterState = {
  minDate: "",
  maxDate: "",
  arrivalStatus: "",
  sessionStatus: "",
  branchId: "",
};

interface AdminSessionsProps {
  branches?: BranchResponse[];
}

export default function AdminSessions({ branches = [] }: AdminSessionsProps) {
  const [sessions, setSessions]       = React.useState<SessionResponse[]>([]);
  const [page, setPage]               = React.useState(0);
  const [hasMore, setHasMore]         = React.useState(true);
  const [loading, setLoading]         = React.useState(false);
  const [initialLoad, setInitialLoad] = React.useState(true);
  const [refreshing, setRefreshing]   = React.useState(false);
  const [showBackToTop, setShowBackToTop] = React.useState(false);
  const loaderRef = React.useRef<HTMLDivElement>(null);

  const [filters, setFilters] = React.useState<SessionFilterState>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);

  const fetchSessions = React.useCallback(async (pageNum: number) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await getAdminSessions({
        page: pageNum,
        size: 20,
        ...(filters.minDate       && { minWorkDate:    filters.minDate }),
        ...(filters.maxDate       && { maxWorkDate:    filters.maxDate }),
        ...(filters.arrivalStatus && { arrivalStatus:  filters.arrivalStatus }),
        ...(filters.sessionStatus && { sessionStatus:  filters.sessionStatus }),
      });
      const data = res.data.data;
      setSessions((prev) => pageNum === 0 ? data.content : [...prev, ...data.content]);
      setHasMore(!data.last);
      setPage(pageNum + 1);
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [filters]);

  // Reset on filter change
  React.useEffect(() => {
    setSessions([]);
    setPage(0);
    setHasMore(true);
    setInitialLoad(true);
  }, [filters]);

  React.useEffect(() => {
    if (initialLoad) fetchSessions(0);
  }, [initialLoad, fetchSessions]);

  // Infinite scroll sentinel
  React.useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !initialLoad)
          fetchSessions(page);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchSessions, hasMore, loading, page, initialLoad]);

  // Back to top
  React.useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setSessions([]);
    setPage(0);
    setHasMore(true);
    setInitialLoad(true);
    setRefreshing(false);
  };

  const handleTodayFilter = () => {
    const today = new Date().toISOString().slice(0, 10);
    setFilters((prev) => ({ ...prev, minDate: today, maxDate: today }));
  };

  const isTodayActive = (() => {
    const today = new Date().toISOString().slice(0, 10);
    return filters.minDate === today && filters.maxDate === today;
  })();

  const activeFilterCount = [
    filters.minDate !== "",
    filters.maxDate !== "",
    filters.arrivalStatus !== "",
    filters.sessionStatus !== "",
    filters.branchId !== "",
  ].filter(Boolean).length;

  const removeChip = (key: keyof SessionFilterState) =>
    setFilters((prev) => ({ ...prev, [key]: "" }));

  const ARRIVAL_LABEL: Record<string, string> = { EARLY: "Early", ON_TIME: "On Time", LATE: "Late" };
  const STATUS_LABEL:  Record<string, string> = { ACTIVE: "Active", COMPLETED: "Completed" };

  return (
    <div>
      <div className="flex flex-col gap-2 mb-4">
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
            onClick={isTodayActive ? () => setFilters((prev) => ({ ...prev, minDate: "", maxDate: "" })) : handleTodayFilter}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Today
          </Button>

          <div className="flex items-center gap-2 ml-auto">
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
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {filters.minDate && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-foreground">
                From: {filters.minDate}
                <button onClick={() => removeChip("minDate")} className="text-muted-foreground hover:text-foreground ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.maxDate && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-foreground">
                To: {filters.maxDate}
                <button onClick={() => removeChip("maxDate")} className="text-muted-foreground hover:text-foreground ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.arrivalStatus && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-foreground">
                <AlarmClock className="h-3 w-3" />
                {ARRIVAL_LABEL[filters.arrivalStatus]}
                <button onClick={() => removeChip("arrivalStatus")} className="text-muted-foreground hover:text-foreground ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.sessionStatus && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-foreground">
                <Timer className="h-3 w-3" />
                {STATUS_LABEL[filters.sessionStatus]}
                <button onClick={() => removeChip("sessionStatus")} className="text-muted-foreground hover:text-foreground ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.branchId !== "" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-foreground">
                <MapPin className="h-3 w-3" />
                {branches.find(b => b.id === filters.branchId)?.displayName ?? "Branch"}
                <button onClick={() => removeChip("branchId")} className="text-muted-foreground hover:text-foreground ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {initialLoad ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
          No sessions found.
        </div>
      ) : (() => {
        // Client-side branch filter — match selected branchId's displayName against movement branchName
        const selectedBranchName = branches.find(b => b.id === filters.branchId)?.displayName;
        const filtered = selectedBranchName
          ? sessions.filter((s) =>
              s.movements.some((m) =>
                m.branchName?.toLowerCase() === selectedBranchName.toLowerCase()
              )
            )
          : sessions;

        return (
          <>
            <div className="flex flex-col gap-2">
              {filtered.map((session, idx) => (
                <SessionCard key={session.id} session={session} index={idx} />
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                  No sessions match the selected branch.
                </div>
              )}
            </div>
            <LocationReport sessions={filtered} />
          </>
        );
      })()}

      {/* Infinite scroll sentinel */}
      {!initialLoad && (
        <div ref={loaderRef} className="flex justify-center py-5">
          {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          {!hasMore && sessions.length > 0 && (
            <p className="text-xs text-muted-foreground">You've reached the end</p>
          )}
        </div>
      )}

      {/* Back to top */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 z-50 flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
            aria-label="Back to top"
          >
            <ArrowUp className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      <SessionFilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={setFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
        branches={branches}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />
    </div>
  );
}