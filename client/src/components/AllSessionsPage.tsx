import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, SlidersHorizontal, X, Clock, LogOut, Hand, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { getUserSessions } from "@/services/sessionService";
import type { SessionResponse, PageResponse } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const totalMins = Math.floor(ms / 60_000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({ session, idx }: { session: SessionResponse; idx: number }) {
  const [expanded, setExpanded] = React.useState(false);
  const isActive       = session.status === "ACTIVE";
  const firstMovement  = session.movements[0];
  const lastMovement   = session.movements[session.movements.length - 1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.03, 0.25) }}
      whileHover={{ scale: 1.012, transition: { duration: 0.15 } }}
      className={`rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
        isActive ? "border-emerald-500/30" : "border-border"
      }`}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3"
      >
        <div className="flex items-center justify-between gap-3">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isActive ? "bg-emerald-500/15" : "bg-primary/10"}`}>
              {isActive ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground leading-tight">{formatDate(session.workDate)}</p>
                {isActive && (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">
                    Active
                  </span>
                )}
              </div>
              {firstMovement && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {session.movements.length} visit{session.movements.length !== 1 ? "s" : ""}
                  {" · "}
                  {formatTime(firstMovement.clockInTime)} → {isActive ? "now" : formatTime(lastMovement?.clockOutTime)}
                  {" · "}
                  {formatDuration(firstMovement.clockInTime, lastMovement?.clockOutTime)}
                </p>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 shrink-0">
            {!isActive && (
              <span className="hidden sm:inline-flex items-center rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Done
              </span>
            )}
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </motion.div>
          </div>
        </div>
      </button>

      {/* Expanded: movement rows */}
      <AnimatePresence initial={false}>
        {expanded && session.movements.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-1.5 border-t border-border pt-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Clock Events</p>
              {session.movements.map((m) => {
                const mActive = !m.clockOutTime;
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs gap-2"
                  >
                    <span className="flex items-center gap-2 min-w-0 text-muted-foreground flex-wrap">
                      <Clock className="h-3 w-3 text-emerald-500 shrink-0" />
                      <span className="text-foreground font-medium">{formatTime(m.clockInTime)}</span>
                      <span>→</span>
                      <span className={mActive ? "text-emerald-500 font-medium" : "text-foreground font-medium"}>
                        {mActive ? "now" : formatTime(m.clockOutTime)}
                      </span>
                      {!mActive && m.clockOutTime && (
                        <span>({formatDuration(m.clockInTime, m.clockOutTime)})</span>
                      )}
                      {m.branchName && <span className="text-primary/60">@ {m.branchName}</span>}
                    </span>
                    <span className="shrink-0">
                      {mActive ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">Active</span>
                      ) : m.clockOutType === "MANUAL" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wide">
                          <Hand className="h-2.5 w-2.5" /> Manual
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400 uppercase tracking-wide">
                          <Zap className="h-2.5 w-2.5" /> Auto
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── AllSessionsPage ──────────────────────────────────────────────────────────

export default function AllSessionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [minDate, setMinDate] = React.useState(searchParams.get("minWorkDate") ?? "");
  const [maxDate, setMaxDate] = React.useState(searchParams.get("maxWorkDate") ?? "");
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const [sessions, setSessions]     = React.useState<SessionResponse[]>([]);
  const [page, setPage]             = React.useState(0);
  const [hasMore, setHasMore]       = React.useState(true);
  const [loading, setLoading]       = React.useState(false);
  const [initialLoad, setInitialLoad] = React.useState(true);
  const loaderRef = React.useRef<HTMLDivElement>(null);

  const appliedFilters = React.useMemo(
    () => ({
      minWorkDate: searchParams.get("minWorkDate") ?? undefined,
      maxWorkDate: searchParams.get("maxWorkDate") ?? undefined,
    }),
    [searchParams]
  );

  const hasActiveFilters = Object.values(appliedFilters).some(Boolean);

  React.useEffect(() => {
    setSessions([]);
    setPage(0);
    setHasMore(true);
    setInitialLoad(true);
  }, [searchParams.toString()]);

  const fetchPage = React.useCallback(
    async (pageNum: number) => {
      if (loading) return;
      setLoading(true);
      try {
        const res = await getUserSessions({ page: pageNum, size: 20, ...appliedFilters });
        const data: PageResponse<SessionResponse> = res.data.data;
        setSessions((prev) => pageNum === 0 ? data.content : [...prev, ...data.content]);
        setHasMore(!data.last);
        setPage(pageNum + 1);
      } catch (err) {
        console.error("Failed to fetch sessions", err);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appliedFilters]
  );

  React.useEffect(() => {
    if (initialLoad) fetchPage(0);
  }, [initialLoad, fetchPage]);

  React.useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !initialLoad) fetchPage(page);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchPage, hasMore, loading, page, initialLoad]);

  const applyFilters = () => {
    const params: Record<string, string> = {};
    if (minDate) params.minWorkDate = minDate;
    if (maxDate) params.maxWorkDate = maxDate;
    setSearchParams(params, { replace: true });
    setFiltersOpen(false);
  };

  const clearFilters = () => {
    setMinDate("");
    setMaxDate("");
    setSearchParams({}, { replace: true });
    setFiltersOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold text-foreground flex-1">My Sessions</h1>
          <Button
            variant={hasActiveFilters ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
                {Object.values(appliedFilters).filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-b border-border bg-muted/30"
          >
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="minDate" className="text-xs">From date</Label>
                <Input id="minDate" type="date" value={minDate} onChange={(e) => setMinDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maxDate" className="text-xs">To date</Label>
                <Input id="maxDate" type="date" value={maxDate} onChange={(e) => setMaxDate(e.target.value)} className="h-9" />
              </div>
              <div className="sm:col-span-2 flex gap-2 justify-end">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                    <X className="h-3.5 w-3.5" /> Clear
                  </Button>
                )}
                <Button size="sm" onClick={applyFilters}>Apply</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session list */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5">
        {initialLoad ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            {hasActiveFilters ? "No sessions match your filters." : "No sessions found."}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((session, idx) => (
              <SessionCard key={session.id} session={session} idx={idx} />
            ))}

            <div ref={loaderRef} className="flex justify-center py-5">
              {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              {!hasMore && sessions.length > 0 && (
                <p className="text-xs text-muted-foreground">You've reached the end</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
