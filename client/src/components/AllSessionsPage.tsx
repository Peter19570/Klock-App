import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { getUserSessions } from "@/services/sessionService";
import { SessionHistory } from "@/components/SessionHistory";
import type { SessionResponse, PageResponse } from "@/types";

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

  const appliedFilters = React.useMemo(
    () => ({
      minWorkDate: searchParams.get("minWorkDate") ?? undefined,
      maxWorkDate: searchParams.get("maxWorkDate") ?? undefined,
    }),
    [searchParams]
  );

  const hasActiveFilters = Object.values(appliedFilters).some(Boolean);

  // Reset on filter change
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
        setSessions((prev) =>
          pageNum === 0 ? data.content : [...prev, ...data.content]
        );
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

  // Infinite scroll sentinel
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
      {/* ── Sticky header — matches Dashboard max-w-5xl ── */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
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

      {/* ── Filter panel — same max-w ── */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-b border-border bg-muted/30"
          >
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="minDate" className="text-xs">From date</Label>
                <Input
                  id="minDate"
                  type="date"
                  value={minDate}
                  onChange={(e) => setMinDate(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maxDate" className="text-xs">To date</Label>
                <Input
                  id="maxDate"
                  type="date"
                  value={maxDate}
                  onChange={(e) => setMaxDate(e.target.value)}
                  className="h-9"
                />
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

      {/* ── Session list — max-w-5xl, px-4 sm:px-6, py-8 matches Dashboard ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {initialLoad ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
            {hasActiveFilters
              ? "No sessions match your filters."
              : "No sessions found."}
          </div>
        ) : (
          <>
            {/* SessionHistory renders the same cards as the Dashboard */}
            <SessionHistory sessions={sessions} />

            {/* Infinite scroll sentinel */}
            <div ref={loaderRef} className="flex justify-center py-5">
              {loading && (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              )}
              {!hasMore && sessions.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  You've reached the end
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
