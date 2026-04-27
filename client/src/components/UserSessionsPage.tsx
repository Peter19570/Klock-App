import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  User,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SessionHistory } from "@/components/SessionHistory";
import { getUserSessionsById } from "@/services/sessionService";
import type { SessionResponse, UserDetailResponse } from "@/types";

// ─── Inner page content ────────────────────────────────────────────────────────

interface SessionPageContentProps {
  userId: number;
  displayName?: string;
  onBack?: () => void;
  headerActions?: React.ReactNode;
}

function SessionPageContent({
  userId,
  displayName,
  onBack,
  headerActions,
}: SessionPageContentProps) {
  const navigate = useNavigate();

  const [sessions, setSessions]       = React.useState<SessionResponse[]>([]);
  const [page, setPage]               = React.useState(0);
  const [hasMore, setHasMore]         = React.useState(true);
  const [loading, setLoading]         = React.useState(false);
  const [initialLoad, setInitialLoad] = React.useState(true);
  const [refreshing, setRefreshing]   = React.useState(false);
  const [ownerName, setOwnerName]     = React.useState<string | null>(
    displayName ?? null
  );
  const loaderRef = React.useRef<HTMLDivElement>(null);

  const fetchPage = React.useCallback(
    async (pageNum: number, isRefresh = false) => {
      if (loading && !isRefresh) return;
      if (!isRefresh) setLoading(true);
      try {
        const res  = await getUserSessionsById({ userId, page: pageNum, size: 20 });
        const data = res.data.data;
        setSessions((prev) =>
          pageNum === 0 ? data.content : [...prev, ...data.content]
        );
        if (
          pageNum === 0 &&
          data.content.length > 0 &&
          data.content[0].sessionOwner
        ) {
          setOwnerName(data.content[0].sessionOwner);
        }
        setHasMore(!data.last);
        setPage(pageNum + 1);
      } catch (err) {
        console.error("Failed to fetch user sessions", err);
      } finally {
        setLoading(false);
        setInitialLoad(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId]
  );

  React.useEffect(() => {
    setSessions([]);
    setPage(0);
    setHasMore(true);
    setInitialLoad(true);
  }, [userId]);

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

  const handleRefresh = () => {
    setRefreshing(true);
    setSessions([]);
    setPage(0);
    setHasMore(true);
    fetchPage(0, true);
  };

  const handleBack = () => (onBack ? onBack() : navigate(-1));

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky header — max-w-5xl matches Dashboard ── */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0 -ml-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-foreground truncate leading-tight">
                {ownerName ?? "User"}
              </h1>
              <p className="text-xs text-muted-foreground leading-tight">
                Session History
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {sessions.length > 0 && (
              <span className="hidden sm:block text-xs text-muted-foreground">
                {sessions.length} session{sessions.length !== 1 ? "s" : ""}
              </span>
            )}
            {headerActions}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleRefresh}
              disabled={refreshing || initialLoad}
              title="Refresh sessions"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Content — max-w-5xl, px-4 sm:px-6, py-8 matches Dashboard ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {initialLoad ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
            No sessions found for this user.
          </div>
        ) : (
          <>
            {/* SessionHistory renders identical cards to the Dashboard */}
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

// ─── Export ────────────────────────────────────────────────────────────────────

interface UserSessionsPageProps {
  userId?: number;
  user?: UserDetailResponse;
  onBack?: () => void;
  /** @deprecated Undo endpoints are disabled — prop kept for API compatibility */
  canUndo?: boolean;
  headerActions?: React.ReactNode;
}

export default function UserSessionsPage({
  userId: propUserId,
  user,
  onBack,
  headerActions,
}: UserSessionsPageProps) {
  const { userId: paramUserId } = useParams<{ userId: string }>();

  const resolvedId  = propUserId ?? (paramUserId ? parseInt(paramUserId, 10) : null);
  const displayName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email
    : undefined;

  if (!resolvedId || isNaN(resolvedId)) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground text-sm">
        Invalid user ID.
      </div>
    );
  }

  return (
    <SessionPageContent
      userId={resolvedId}
      displayName={displayName}
      onBack={onBack}
      headerActions={headerActions}
    />
  );
}
