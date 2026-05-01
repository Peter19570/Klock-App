import { useRef, useState, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Clock, LogOut, Zap, Hand, CalendarDays, ChevronDown, MapPin, Ruler, AlarmClock, Route } from 'lucide-react';
import type { SessionResponse, ClockEventResponse } from '../types';

interface SessionHistoryProps {
  sessions: SessionResponse[];
  /**
   * Pass `true` when the caller has already sorted sessions (e.g. AllSessionsPage
   * or UserSessionsPage which receive server-ordered results). Skips the internal
   * descending-date sort so the API order is preserved.
   * Defaults to `false` — the Dashboard relies on client-side sorting.
   */
  presorted?: boolean;
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

function formatDistance(metres: number | null | undefined): string | null {
  if (metres == null) return null;
  if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`;
  return `${Math.round(metres)} m`;
}

function ArrivalBadge({ status }: { status?: 'EARLY' | 'ON_TIME' | 'LATE' | null }) {
  if (!status) return null;
  const map = {
    EARLY:   { label: 'Early',   cls: 'bg-sky-400/15 text-sky-500 border-sky-400/30' },
    ON_TIME: { label: 'On Time', cls: 'bg-emerald-500/15 text-emerald-500 border-emerald-400/30' },
    LATE:    { label: 'Late',    cls: 'bg-rose-500/15 text-rose-500 border-rose-400/30' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      <AlarmClock className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

/** Renders a Leaflet mini-map showing clock-in (green) and clock-out (red) pins
 *  connected by a polyline. Only mounts when the movement has both coordinates. */
function MovementMap({ movement }: { movement: ClockEventResponse }) {
  const mapRef    = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled || leafletRef.current) return;

      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;

      const inLat  = movement.latitudeIn;
      const inLng  = movement.longitudeIn;
      const outLat = movement.latitudeOut ?? null;
      const outLng = movement.longitudeOut ?? null;

      const center: [number, number] = outLat != null
        ? [(inLat + outLat) / 2, (inLng + (outLng ?? inLng)) / 2]
        : [inLat, inLng];

      const map = L.map(mapRef.current!, {
        scrollWheelZoom: false,
        zoomControl: false,
        dragging: false,
        doubleClickZoom: false,
        attributionControl: false,
      }).setView(center, 16);

      leafletRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      // Clock-in marker (green)
      const inIcon = L.divIcon({
        html: `<div style="width:10px;height:10px;border-radius:50%;background:#22c55e;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
        className: '', iconSize: [10, 10], iconAnchor: [5, 5],
      });
      L.marker([inLat, inLng], { icon: inIcon }).addTo(map)
        .bindTooltip('Clock In', { permanent: false, direction: 'top' });

      if (outLat != null && outLng != null) {
        // Clock-out marker (red)
        const outIcon = L.divIcon({
          html: `<div style="width:10px;height:10px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
          className: '', iconSize: [10, 10], iconAnchor: [5, 5],
        });
        L.marker([outLat, outLng], { icon: outIcon }).addTo(map)
          .bindTooltip('Clock Out', { permanent: false, direction: 'top' });

        // Polyline connecting the two points
        const polyline = L.polyline([[inLat, inLng], [outLat, outLng]], {
          color: '#6366f1', weight: 2.5, opacity: 0.85, dashArray: '6 4',
        }).addTo(map);

        map.fitBounds(polyline.getBounds(), { padding: [24, 24] });
      }
    });

    return () => {
      cancelled = true;
      leafletRef.current?.remove();
      leafletRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={mapRef}
      className="w-full rounded-lg overflow-hidden border border-border"
      style={{ height: 160 }}
    />
  );
}

function MovementRow({ movement }: { movement: ClockEventResponse }) {
  const isActive  = !movement.clockOutTime;
  const isManual  = movement.clockOutType === 'MANUAL';
  const distLabel = formatDistance(movement.distanceMeters);
  const isFarAway = (movement.distanceMeters ?? 0) > 200;
  const [mapOpen, setMapOpen] = useState(false);
  const hasCoords = movement.latitudeIn != null;

  return (
    <div className="rounded-lg bg-muted/40 text-sm overflow-hidden">
      {/* Main row */}
      <div className="flex items-center justify-between py-2 px-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
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

      {/* Distance + coords sub-row */}
      {(distLabel || movement.latitudeIn || movement.entryProximityDistance != null || movement.siteDepartureDistance != null) && (
        <div className="flex items-center gap-3 px-3 pb-2 flex-wrap">
          {movement.latitudeIn != null && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="w-2.5 h-2.5 shrink-0" />
              {movement.latitudeIn.toFixed(4)}°, {movement.longitudeIn.toFixed(4)}°
            </span>
          )}
          {distLabel && !isActive && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
              isFarAway
                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                : 'bg-muted text-muted-foreground'
            }`}>
              <Ruler className="w-2.5 h-2.5 shrink-0" />
              {distLabel} moved
              {isFarAway && ' ⚠'}
            </span>
          )}
          {movement.entryProximityDistance != null && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
              <MapPin className="w-2.5 h-2.5 shrink-0 text-primary/60" />
              {formatDistance(movement.entryProximityDistance)} from branch
            </span>
          )}
          {movement.siteDepartureDistance != null && !isActive && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
              (movement.siteDepartureDistance ?? 0) > 200
                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                : 'bg-muted text-muted-foreground'
            }`}>
              <Ruler className="w-2.5 h-2.5 shrink-0" />
              {formatDistance(movement.siteDepartureDistance)} departure
              {(movement.siteDepartureDistance ?? 0) > 200 && ' ⚠'}
            </span>
          )}
          {hasCoords && (
            <button
              type="button"
              onClick={() => setMapOpen((v) => !v)}
              className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-1.5 py-0.5 border transition-colors ${
                mapOpen
                  ? 'bg-indigo-500/15 text-indigo-500 border-indigo-400/30'
                  : 'bg-muted text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              <Route className="w-2.5 h-2.5 shrink-0" />
              {mapOpen ? 'Hide map' : 'View path'}
            </button>
          )}
        </div>
      )}

      {/* Path map */}
      <AnimatePresence initial={false}>
        {mapOpen && hasCoords && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden px-3 pb-2"
          >
            <MovementMap movement={movement} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SessionCard({
  session,
  index,
  defaultOpen = false,
}: {
  session: SessionResponse;
  index: number;
  defaultOpen?: boolean;
}) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -40px 0px' });
  const [expanded, setExpanded] = useState(defaultOpen);

  const isActive      = session.status === 'ACTIVE';
  const firstMovement = session.movements[0];
  const lastMovement  = session.movements[session.movements.length - 1];

  const totalDuration = firstMovement
    ? formatDuration(firstMovement.clockInTime, lastMovement?.clockOutTime)
    : '—';

  const totalDistLabel = formatDistance(session.totalDistanceMeters);

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
            <p className="font-semibold text-sm text-foreground flex items-center gap-2 flex-wrap">
              {formatDate(session.workDate)}
              {isActive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">
                  Active
                </span>
              )}
              <ArrivalBadge status={session.arrivalStatus} />
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {session.movements.length} visit{session.movements.length !== 1 ? 's' : ''}
              {firstMovement && (
                <> · {formatTime(firstMovement.clockInTime)} → {isActive ? 'now' : formatTime(lastMovement?.clockOutTime)} · {totalDuration}</>
              )}
              {totalDistLabel && !isActive && (
                <> · <Ruler className="inline w-2.5 h-2.5 mb-0.5" /> {totalDistLabel}</>
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
                    <LogOut className="h-3 w-3 text-foreground/50 shrink-0" />
                    Clock-out
                  </span>
                  <span className="text-muted-foreground/40 text-[10px]">·</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Hand className="h-3 w-3 text-amber-400 shrink-0" />
                    Manual
                  </span>
                  <span className="text-muted-foreground/40 text-[10px]">·</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Zap className="h-3 w-3 text-sky-400 shrink-0" />
                    Auto
                  </span>
                </div>
              </div>
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

export function SessionHistory({ sessions, presorted = false }: SessionHistoryProps) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No sessions recorded yet.
      </p>
    );
  }

  const ordered = presorted
    ? sessions
    : [...sessions].sort(
        (a, b) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime(),
      );

  // Auto-expand the active session when present
  const activeIdx = ordered.findIndex((s) => s.status === 'ACTIVE');

  return (
    <div className="space-y-2">
      {ordered.map((s, i) => (
        <SessionCard
          key={s.id}
          session={s}
          index={i}
          defaultOpen={i === activeIdx}
        />
      ))}
    </div>
  );
}
