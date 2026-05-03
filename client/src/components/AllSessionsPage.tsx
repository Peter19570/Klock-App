import * as React from "react";
import * as ReactDOM from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowUp, Loader2, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { getUserSessions } from "@/services/sessionService";
import { SessionHistory } from "@/components/SessionHistory";
import type { SessionResponse, PageResponse } from "@/types";

// ─── Filter Modal ─────────────────────────────────────────────────────────────

interface FilterModalProps {
  open: boolean;
  onClose: () => void;
  minDate: string;
  maxDate: string;
  onApply: (min: string, max: string) => void;
  onClear: () => void;
}

function FilterModal({ open, onClose, minDate, maxDate, onApply, onClear }: FilterModalProps) {
  const [localMin, setLocalMin] = React.useState(minDate);
  const [localMax, setLocalMax] = React.useState(maxDate);

  React.useEffect(() => {
    if (open) { setLocalMin(minDate); setLocalMax(maxDate); }
  }, [open, minDate, maxDate]);

  const handleApply = () => { onApply(localMin, localMax); onClose(); };
  const handleClear = () => { setLocalMin(""); setLocalMax(""); onClear(); onClose(); };
  const hasLocal = localMin !== "" || localMax !== "";

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
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl p-5 w-full sm:max-w-sm"
          >
            {/* Handle — mobile only */}
            <div className="flex justify-center mb-4 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

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
              <Button variant="outline" className="flex-1 h-9 text-sm" onClick={handleClear} disabled={!hasLocal}>
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

// ─── AllSessionsPage ──────────────────────────────────────────────────────────

export default function AllSessionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [minDate, setMinDate] = React.useState(searchParams.get("minWorkDate") ?? "");
  const [maxDate, setMaxDate] = React.useState(searchParams.get("maxWorkDate") ?? "");
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const [sessions, setSessions]         = React.useState<SessionResponse[]>([]);
  const [page, setPage]                 = React.useState(0);
  const [hasMore, setHasMore]           = React.useState(true);
  const [loading, setLoading]           = React.useState(false);
  const [initialLoad, setInitialLoad]   = React.useState(true);
  const loaderRef = React.useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
        if (entries[0].isIntersecting && hasMore && !loading && !initialLoad)
          fetchPage(page);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchPage, hasMore, loading, page, initialLoad]);

  const applyFilters = (min: string, max: string) => {
    setMinDate(min);
    setMaxDate(max);
    const params: Record<string, string> = {};
    if (min) params.minWorkDate = min;
    if (max) params.maxWorkDate = max;
    setSearchParams(params, { replace: true });
  };

  const clearFilters = () => {
    setMinDate("");
    setMaxDate("");
    setSearchParams({}, { replace: true });
  };

  const removeChip = (key: "minWorkDate" | "maxWorkDate") => {
    const next = new URLSearchParams(searchParams);
    next.delete(key);
    if (key === "minWorkDate") setMinDate("");
    else setMaxDate("");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex flex-col bg-background">
      {/* ── Sticky header ── */}
      <div className="sticky top-16 z-10 bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0 -ml-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <h1 className="text-base font-semibold text-foreground flex-1">My Sessions</h1>

          {sessions.length > 0 && (
            <span className="hidden sm:block text-xs text-muted-foreground">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""}
            </span>
          )}

          <Button
            variant={hasActiveFilters ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setFiltersOpen(true)}
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

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-2 flex items-center gap-1.5 flex-wrap">
            {appliedFilters.minWorkDate && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-foreground">
                From: {appliedFilters.minWorkDate}
                <button onClick={() => removeChip("minWorkDate")} className="text-muted-foreground hover:text-foreground ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {appliedFilters.maxWorkDate && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-foreground">
                To: {appliedFilters.maxWorkDate}
                <button onClick={() => removeChip("maxWorkDate")} className="text-muted-foreground hover:text-foreground ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Session list ── */}
      <div className="flex-1 max-w-5xl mx-auto w-full min-h-[calc(100vh-8rem)] px-4 sm:px-6 py-8 space-y-8">
        {initialLoad ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
            {hasActiveFilters ? "No sessions match your filters." : "No sessions found."}
          </div>
        ) : (
          <>
            <SessionHistory sessions={sessions} />
            <div ref={loaderRef} className="flex justify-center py-5">
              {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              {!hasMore && sessions.length > 0 && (
                <p className="text-xs text-muted-foreground">You've reached the end</p>
              )}
            </div>
          </>
        )}
      </div>

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

      <FilterModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        minDate={minDate}
        maxDate={maxDate}
        onApply={applyFilters}
        onClear={clearFilters}
      />
    </div>
  );
}
