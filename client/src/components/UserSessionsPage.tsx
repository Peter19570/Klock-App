import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUp,
  Loader2,
  User,
  RefreshCw,
  Mail,
  Building2,
  ShieldCheck,
  CalendarDays,
  Navigation,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SessionHistory } from "@/components/SessionHistory";
import { getUserSessionsById } from "@/services/sessionService";
import type { SessionResponse, UserDetailResponse } from "@/types";

// ─── Role label helper ─────────────────────────────────────────────────────────

function roleLabel(role: string) {
  if (role === "SUPER_ADMIN") return "Super Admin";
  if (role === "ADMIN") return "Admin";
  return "Employee";
}

function rolePillClass(role: string) {
  if (role === "SUPER_ADMIN")
    return "bg-amber-400/15 text-amber-500 border border-amber-400/30";
  if (role === "ADMIN") return "bg-primary/15 text-primary";
  return "bg-muted text-muted-foreground border border-border";
}

// ─── User Info Panel ───────────────────────────────────────────────────────────

interface UserInfoPanelProps {
  user: UserDetailResponse;
  /** avgEntryProximityDistance lives on UserResponse; pass it through if available */
  avgProximityDistance?: number | null;
}

function UserInfoPanel({ user, avgProximityDistance }: UserInfoPanelProps) {
  const fullName =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;

  const joinedOn = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const fields: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [
    {
      icon: <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />,
      label: "Email",
      value: user.email,
    },
    {
      icon: <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />,
      label: "Role",
      value: (
        <span
          className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${rolePillClass(user.role)}`}
        >
          {roleLabel(user.role)}
        </span>
      ),
    },
    {
      icon: <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />,
      label: "Branch",
      value: user.homeBranchName ?? "—",
    },
    ...(avgProximityDistance != null
      ? [
          {
            icon: <Navigation className="h-3.5 w-3.5 text-muted-foreground shrink-0" />,
            label: "Avg. Clock-in Distance",
            value: `${Math.round(avgProximityDistance)} m`,
          },
        ]
      : []),
    ...(joinedOn
      ? [
          {
            icon: <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />,
            label: "Added On",
            value: joinedOn,
          },
        ]
      : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4"
    >
      {/* Avatar + name row */}
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          {user.picture ? (
            <img
              src={user.picture}
              alt={fullName}
              className="h-11 w-11 rounded-full object-cover"
            />
          ) : (
            <User className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate leading-tight">
            {fullName}
          </p>
          <p className="text-xs text-muted-foreground leading-tight mt-0.5">
            User Profile
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Field grid — 1 col on mobile, 2 cols on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map(({ icon, label, value }) => (
          <div key={label} className="flex items-start gap-2.5 min-w-0">
            <div className="mt-0.5">{icon}</div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground leading-none mb-1">
                {label}
              </p>
              <div className="text-sm text-foreground truncate leading-snug">
                {value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Inner page content ────────────────────────────────────────────────────────

interface SessionPageContentProps {
  userId: number;
  user?: UserDetailResponse;
  displayName?: string;
  avgProximityDistance?: number | null;
  onBack?: () => void;
  headerActions?: React.ReactNode;
  embedded?: boolean;
}

function SessionPageContent({
  userId,
  user,
  displayName,
  avgProximityDistance,
  onBack,
  headerActions,
  embedded = false,
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
  const [showBackToTop, setShowBackToTop] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      {/* ── Sticky header ── */}
      <div
        className={`${
          embedded
            ? ""
            : "sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border"
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2">
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

      {/* ── Content ── */}
      <div
        className={`max-w-5xl mx-auto space-y-6 ${
          embedded ? "px-0 py-4" : "px-4 sm:px-6 py-8"
        }`}
      >
        {/* 1. User Info Panel */}
        {user && (
          <UserInfoPanel user={user} avgProximityDistance={avgProximityDistance} />
        )}

        {/* 2. Session History heading */}
        {user && (
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Session History
            </p>
            {sessions.length > 0 && (
              <span className="text-xs text-muted-foreground sm:hidden">
                · {sessions.length}
              </span>
            )}
          </div>
        )}

        {/* 3. Sessions */}
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
    </div>
  );
}

interface UserSessionsPageProps {
  userId?: number;
  user?: UserDetailResponse;
  /** Pass avgEntryProximityDistance from UserResponse if available at the call site */
  avgProximityDistance?: number | null;
  onBack?: () => void;
  /** @deprecated Undo endpoints are disabled — prop kept for API compatibility */
  canUndo?: boolean;
  headerActions?: React.ReactNode;
  embedded?: boolean;
}

export default function UserSessionsPage({
  userId: propUserId,
  user,
  avgProximityDistance,
  onBack,
  headerActions,
  embedded = false,
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
      user={user}
      displayName={displayName}
      avgProximityDistance={avgProximityDistance}
      onBack={onBack}
      headerActions={headerActions}
      embedded={embedded}
    />
  );
}
