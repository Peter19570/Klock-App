import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  ChevronDown,
  Clock,
  LogOut,
  Zap,
  Hand,
  CalendarDays,
  Undo2,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getUserSessionsById, undoClockOut } from "@/services/sessionService";
import type { SessionResponse, ClockEventResponse, UserDetailResponse } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "long",
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

// ─── Movement row ─────────────────────────────────────────────────────────────

function MovementRow({
  movement,
  onUndo,
  undoing,
}: {
  movement: ClockEventResponse;
  onUndo?: (id: number) => void;
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
        {movement.latitudeIn != null && movement.longitudeIn != null && (
          <span className="text-[10px] text-muted-foreground/50 font-mono">
            {movement.latitudeIn.toFixed(4)}, {movement.longitudeIn.toFixed(4)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isActive ? (
          <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">Active</span>
        ) : isManual ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wide">
            <Hand className="h-2.5 w-2.5" /> Manual
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400 uppercase tracking-wide">
            <Zap className="h-2.5 w-2.5" /> Auto
          </span>
        )}

        {!isActive && onUndo && (
          <Button
            size="icon" variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            title="Undo clock-out"
            disabled={undoing}
            onClick={() => onUndo(movement.id)}
          >
            {undoing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Undo2 className="h-3 w-3" />
            )}
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
  defaultOpen,
  onUndoSuccess,
  canUndo,
}: {
  session: SessionResponse;
  index: number;
  defaultOpen: boolean;
  onUndoSuccess: () => void;
  canUndo: boolean;
}) {
  const [expanded, setExpanded] = React.useState(defaultOpen);
  const [undoingId, setUndoingId] = React.useState<number | null>(null);

  const isActive      = session.status === "ACTIVE";
  const firstMovement = session.movements[0];
  const lastMovement  = session.movements[session.movements.length - 1];

  const handleUndo = async (movementId: number) => {
    setUndoingId(movementId);
    try {
      await undoClockOut(movementId);
      onUndoSuccess();
    } catch {
      // silently fail — parent refreshes
    } finally {
      setUndoingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.22) }}
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
          {/* Icon */}
          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isActive ? "bg-emerald-500/15" : "bg-primary/10"}`}>
            {isActive ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : (
              <CalendarDays className="w-3.5 h-3.5 text-primary" />
            )}
          </div>

          {/* Meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground leading-tight">{formatDate(session.workDate)}</p>
              {isActive && (
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {session.movements.length} visit{session.movements.length !== 1 ? "s" : ""}
              {firstMovement && (
                <> · {formatTime(firstMovement.clockInTime)} → {isActive ? "now" : formatTime(lastMovement?.clockOutTime)} · {formatDuration(firstMovement.clockInTime, lastMovement?.clockOutTime)}</>
              )}
            </p>
          </div>

          <ChevronDown
            className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

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
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Clock events
              </p>
              {session.movements.map((m) => (
                <MovementRow
                  key={m.id}
                  movement={m}
                  onUndo={canUndo ? handleUndo : undefined}
                  undoing={undoingId === m.id}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Inner page content ────────────────────────────────────────────────────────

interface SessionPageContentProps {
  userId: number;
  displayName?: string;
  canUndo: boolean;
  onBack?: () => void;
}

function SessionPageContent({ userId, displayName, canUndo, onBack }: SessionPageContentProps) {
  const navigate = useNavigate();

  const [sessions, setSessions]       = React.useState<SessionResponse[]>([]);
  const [page, setPage]               = React.useState(0);
  const [hasMore, setHasMore]         = React.useState(true);
  const [loading, setLoading]         = React.useState(false);
  const [initialLoad, setInitialLoad] = React.useState(true);
  const [ownerName, setOwnerName]     = React.useState<string | null>(displayName ?? null);
  const loaderRef = React.useRef<HTMLDivElement>(null);

  const fetchPage = React.useCallback(
    async (pageNum: number) => {
      if (loading) return;
      setLoading(true);
      try {
        const res  = await getUserSessionsById({ userId, page: pageNum, size: 20 });
        const data = res.data.data;
        setSessions((prev) => pageNum === 0 ? data.content : [...prev, ...data.content]);
        if (pageNum === 0 && data.content.length > 0 && data.content[0].sessionOwner) {
          setOwnerName(data.content[0].sessionOwner);
        }
        setHasMore(!data.last);
        setPage(pageNum + 1);
      } catch (err) {
        console.error("Failed to fetch user sessions", err);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId],
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

  const handleUndoSuccess = () => {
    setSessions([]);
    setPage(0);
    setHasMore(true);
    setInitialLoad(true);
  };

  const handleBack = () => (onBack ? onBack() : navigate(-1));

  const activeSessionIdx = sessions.findIndex((s) => s.status === "ACTIVE");

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-foreground truncate leading-tight">
                {ownerName ?? "User Sessions"}
              </h1>
              <p className="text-xs text-muted-foreground">Work session history</p>
            </div>
          </div>
          {sessions.length > 0 && (
            <span className="text-xs text-muted-foreground shrink-0">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5">
        {initialLoad ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            No sessions found for this user.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((session, idx) => (
              <SessionCard
                key={session.id}
                session={session}
                index={idx}
                defaultOpen={idx === activeSessionIdx}
                onUndoSuccess={handleUndoSuccess}
                canUndo={canUndo}
              />
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

// ─── Export ────────────────────────────────────────────────────────────────────

interface UserSessionsPageProps {
  userId?: number;
  user?: UserDetailResponse;
  onBack?: () => void;
  canUndo?: boolean;
}

export default function UserSessionsPage({ userId: propUserId, user, onBack, canUndo = false }: UserSessionsPageProps) {
  const { userId: paramUserId } = useParams<{ userId: string }>();

  const resolvedId  = propUserId ?? (paramUserId ? parseInt(paramUserId, 10) : null);
  const displayName = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
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
      canUndo={canUndo}
      onBack={onBack}
    />
  );
}
