import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {
  Search, Trash2, User, Plus,
  ArrowRightLeft, ArrowUp, Check, SlidersHorizontal, X, Loader2, RefreshCw,
  FileText, MapPin, Navigation, MoreVertical, Pencil, KeyRound, Smartphone,
  Mail, Phone, Building2, CalendarDays, ChevronLeft, Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/services/api';
import { transferUser, updateUserProfile, adminResetPassword, adminResetDeviceId } from '@/services/userService';
import { getLocationHistory } from '@/services/sessionService';
import type { UserResponse, UserDetailResponse, ApiResponse, PageResponse, BranchResponse, LocationResponse, UserRole, AdminUpdateUserRequest } from '@/types';
import UserSessionsPage from './UserSessionsPage';
import UserLogsPage from '../pages/UserLogsPage';

function useDebounce<T>(value: T, delay = 400): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

interface AdminUsersProps {
  isSuperAdmin?: boolean;
  branches?: BranchResponse[];
  liveUsers?: Map<string, { status: 'clocked-in' | 'clocked-out' | 'offline' }>;
  /** Lifted up from AdminDashboard so button sits inline with Filters */
  onCreateUser?: () => void;
}


// ─── Role Pill ────────────────────────────────────────────────────────────────

function RolePill({ role }: { role: UserRole }) {
  if (role === 'SUPER_ADMIN') {
    return (
      <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-500 border border-amber-400/30 shrink-0">
        Super Admin
      </span>
    );
  }
  if (role === 'ADMIN') {
    return (
      <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-primary/15 text-primary shrink-0">
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border shrink-0">
      Employee
    </span>
  );
}

// ─── Filter Modal ──────────────────────────────────────────────────────────────

interface FilterModalProps {
  open: boolean;
  onClose: () => void;
  nameFilter: string;
  emailFilter: string;
  branchFilter: number | '';
  branches: BranchResponse[];
  isSuperAdmin: boolean;
  onApply: (name: string, email: string, branch: number | '') => void;
  onClear: () => void;
}

function FilterModal({
  open, onClose,
  nameFilter, emailFilter, branchFilter,
  branches, isSuperAdmin,
  onApply, onClear,
}: FilterModalProps) {
  const [localName, setLocalName]     = React.useState(nameFilter);
  const [localEmail, setLocalEmail]   = React.useState(emailFilter);
  const [localBranch, setLocalBranch] = React.useState<number | ''>(branchFilter);

  React.useEffect(() => {
    if (open) {
      setLocalName(nameFilter);
      setLocalEmail(emailFilter);
      setLocalBranch(branchFilter);
    }
  }, [open, nameFilter, emailFilter, branchFilter]);

  const handleApply = () => {
    onApply(localName, localEmail, localBranch);
    onClose();
  };

  const handleClear = () => {
    setLocalName('');
    setLocalEmail('');
    setLocalBranch('');
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
                <h2 className="text-sm font-semibold text-foreground">Filter Users</h2>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Name</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search by name…"
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    className="pl-9 h-9"
                  />
                  {localName && (
                    <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setLocalName('')}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search by email…"
                    value={localEmail}
                    onChange={(e) => setLocalEmail(e.target.value)}
                    className="pl-9 h-9"
                  />
                  {localEmail && (
                    <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setLocalEmail('')}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {isSuperAdmin && branches.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Branch</Label>
                  <select
                    value={localBranch}
                    onChange={(e) => setLocalBranch(e.target.value === '' ? '' : Number(e.target.value))}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">All branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.displayName}</option>
                    ))}
                  </select>
                </div>
              )}
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

// ─── Transfer Branch Modal ─────────────────────────────────────────────────────

interface TransferBranchModalProps {
  open: boolean;
  userName: string;
  branches: BranchResponse[];
  selectedBranchId: number | null;
  transferring: boolean;
  onSelect: (id: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function TransferBranchModal({
  open, userName, branches, selectedBranchId,
  transferring, onSelect, onConfirm, onCancel,
}: TransferBranchModalProps) {
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  const filtered = branches.filter((b) =>
    b.displayName.toLowerCase().includes(search.toLowerCase()),
  );

  return ReactDOM.createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 z-[70]"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
            className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-primary" />
                  Transfer Branch
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Moving <span className="font-medium text-foreground">{userName}</span> to:
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="px-5 py-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search branches…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
                {search && (
                  <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch('')}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-2 min-h-0">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No branches found.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {filtered.map((b) => {
                    const isSelected = selectedBranchId === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => onSelect(b.id)}
                        className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                          isSelected
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-foreground hover:bg-muted/60'
                        }`}
                      >
                        <span className="truncate">{b.displayName}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-border shrink-0">
              <Button variant="outline" className="flex-1" onClick={onCancel} disabled={transferring}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!selectedBranchId || transferring}
                onClick={onConfirm}
              >
                {transferring ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Moving…</> : 'Confirm'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ─── Location History Map ──────────────────────────────────────────────────────

interface UserLocationHistoryProps {
  userId: number;
  user: UserDetailResponse;
  onBack: () => void;
}

// ─── Reverse geocode cache ────────────────────────────────────────────────────

const geocodeCache = new Map<string, string>();

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } },
    );
    const json = await res.json();
    const addr = json.address ?? {};
    const place =
      addr.road ||
      addr.suburb ||
      addr.neighbourhood ||
      addr.city_district ||
      addr.village ||
      addr.town ||
      addr.city ||
      addr.county ||
      json.display_name?.split(',')[0] ||
      'Unknown location';
    const city = addr.city || addr.town || addr.village || addr.county || '';
    const label = city && city !== place ? `${place}, ${city}` : place;
    geocodeCache.set(key, label);
    return label;
  } catch {
    return 'Unknown location';
  }
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

const PAGE_SIZE = 20;

function UserLocationHistory({ userId, user, onBack }: UserLocationHistoryProps) {
  const today = todayStr();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [minDate, setMinDate] = React.useState(today);
  const [maxDate, setMaxDate] = React.useState(today);
  const [filterModalOpen, setFilterModalOpen] = React.useState(false);
  const [draftMin, setDraftMin] = React.useState(today);
  const [draftMax, setDraftMax] = React.useState(today);

  // ── Raw data from API ─────────────────────────────────────────────────────
  const [allPoints, setAllPoints]   = React.useState<LocationResponse[]>([]);
  const [loading, setLoading]       = React.useState(false);
  const [error, setError]           = React.useState<string | null>(null);

  // ── Client-side pagination ────────────────────────────────────────────────
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  // ── Geocoded labels: key = "lat,lng" ─────────────────────────────────────
  const [labels, setLabels] = React.useState<Record<string, string>>({});

  // ── Fetch when filters change ─────────────────────────────────────────────
  React.useEffect(() => {
    setLoading(true);
    setError(null);
    setAllPoints([]);
    setVisibleCount(PAGE_SIZE);
    setLabels({});
    getLocationHistory(userId, {
      ...(minDate && { minWorkDate: minDate }),
      ...(maxDate && { maxWorkDate: maxDate }),
    })
      .then((res) => setAllPoints(res.data.data ?? []))
      .catch(() => setError('Failed to load location history.'))
      .finally(() => setLoading(false));
  }, [userId, minDate, maxDate]);

  // ── Resolve place names for visible slice only ────────────────────────────
  const visiblePoints = allPoints.slice(0, visibleCount);

  React.useEffect(() => {
    let cancelled = false;
    const unresolved = visiblePoints.filter((p) => {
      const k = `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`;
      return !labels[k];
    });
    if (unresolved.length === 0) return;

    // Resolve one at a time with a small delay to respect Nominatim rate limit
    (async () => {
      for (const p of unresolved) {
        if (cancelled) break;
        const label = await reverseGeocode(p.latitude, p.longitude);
        if (cancelled) break;
        const k = `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`;
        setLabels((prev) => ({ ...prev, [k]: label }));
        await new Promise((r) => setTimeout(r, 120));
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visiblePoints.length, allPoints]);

  // ── Infinite scroll sentinel ──────────────────────────────────────────────
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < allPoints.length) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, allPoints.length));
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, allPoints.length]);

  const hasMore = visibleCount < allPoints.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground truncate flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary shrink-0" />
            Location History — {user.firstName} {user.lastName}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Recorded location pings</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 h-9 shrink-0"
          onClick={() => { setDraftMin(minDate); setDraftMax(maxDate); setFilterModalOpen(true); }}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {(minDate !== today || maxDate !== today) && (
            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              1
            </span>
          )}
        </Button>

        {/* Active date chips */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          {(minDate || maxDate) && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-foreground">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              {minDate === maxDate ? minDate : `${minDate || '…'} → ${maxDate || '…'}`}
              <button
                onClick={() => { setMinDate(today); setMaxDate(today); }}
                className="text-muted-foreground hover:text-foreground ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Filter modal */}
      {ReactDOM.createPortal(
        <AnimatePresence>
          {filterModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 z-[60]"
              onMouseDown={(e) => { if (e.target === e.currentTarget) setFilterModalOpen(false); }}
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
                    <h2 className="text-sm font-semibold text-foreground">Filter by Date</h2>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFilterModalOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">From</Label>
                    <input
                      type="date"
                      value={draftMin}
                      onChange={(e) => setDraftMin(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">To</Label>
                    <input
                      type="date"
                      value={draftMax}
                      onChange={(e) => setDraftMax(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 mt-5">
                  <Button
                    variant="outline"
                    className="flex-1 h-9 text-sm"
                    onClick={() => {
                      setDraftMin(today);
                      setDraftMax(today);
                      setMinDate(today);
                      setMaxDate(today);
                      setFilterModalOpen(false);
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    className="flex-1 h-9 text-sm"
                    onClick={() => {
                      setMinDate(draftMin);
                      setMaxDate(draftMax);
                      setFilterModalOpen(false);
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-sm text-destructive border border-dashed border-destructive/30 rounded-xl">
          {error}
        </div>
      ) : allPoints.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
          No location history for this date range.
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground px-1">
            {allPoints.length} ping{allPoints.length !== 1 ? 's' : ''} recorded
          </p>

          <div className="flex flex-col gap-2">
            {visiblePoints.map((p, i) => {
              const k = `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`;
              const placeName = labels[k];
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
                >
                  {/* Index badge */}
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Place name */}
                    <p className="text-sm font-medium text-foreground leading-snug">
                      {placeName ?? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Resolving…
                        </span>
                      )}
                    </p>
                    {/* Lat / lng */}
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {p.latitude.toFixed(6)}°, {p.longitude.toFixed(6)}°
                    </p>
                  </div>

                  {/* Ping number */}
                  <span className="text-[10px] font-semibold text-muted-foreground/60 shrink-0 tabular-nums mt-1">
                    #{i + 1}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="py-2 flex justify-center">
            {hasMore && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Edit User Modal ───────────────────────────────────────────────────────────

interface EditUserModalProps {
  open: boolean;
  user: UserDetailResponse | UserResponse | null;
  onClose: () => void;
  onSaved: () => void;
}

function EditUserModal({ open, user, onClose, onSaved }: EditUserModalProps) {
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName]   = React.useState('');
  const [email, setEmail]         = React.useState('');
  const [role, setRole]           = React.useState<UserRole>('USER');
  const [phone, setPhone]         = React.useState('');
  const [saving, setSaving]       = React.useState(false);
  const [error, setError]         = React.useState<string | null>(null);

  const requiresPhone = role === 'ADMIN' || role === 'SUPER_ADMIN';

  React.useEffect(() => {
    if (open && user) {
      // UserDetailResponse has firstName/lastName; UserResponse has fullName
      if ('firstName' in user) {
        setFirstName(user.firstName);
        setLastName(user.lastName);
      } else {
        const parts = user.fullName.split(' ');
        setFirstName(parts[0] ?? '');
        setLastName(parts.slice(1).join(' '));
      }
      setEmail(user.email);
      setRole(user.role ?? 'USER');
      setPhone(('phone' in user ? user.phone : null) ?? '');
      setError(null);
    }
  }, [open, user]);

  const handleSave = async () => {
    if (!user) return;
    if (requiresPhone && !phone.trim()) {
      setError('A contact number is required for Admin and Super Admin roles.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: AdminUpdateUserRequest = {
        firstName,
        lastName,
        email,
        role,
        ...(requiresPhone ? { phone: phone.trim() } : {}),
      };
      await updateUserProfile(user.id, payload);
      onSaved();
      onClose();
    } catch {
      setError('Failed to update user. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 z-[70]"
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
                <Pencil className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Edit User</h2>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} disabled={saving}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">First Name</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="h-9"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Last Name</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="h-9"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="h-9"
                  disabled={saving}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Role</Label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  disabled={saving}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                >
                  <option value="USER">Employee</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Contact Number
                  {requiresPhone && <span className="ml-1 text-destructive">*</span>}
                </Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={requiresPhone ? 'Required for Admin roles' : 'Optional'}
                  className="h-9"
                  disabled={saving}
                />
                {requiresPhone && (
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    A contact number is required for Admin and Super Admin accounts.
                  </p>
                )}
              </div>

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>

            <div className="flex gap-2.5 mt-5">
              <Button variant="outline" className="flex-1 h-9 text-sm" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button
                className="flex-1 h-9 text-sm"
                onClick={handleSave}
                disabled={saving || !firstName.trim() || !lastName.trim() || !email.trim() || (requiresPhone && !phone.trim())}
              >
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save Changes'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ─── Profile Card Modal ────────────────────────────────────────────────────────

function roleLabel(role: UserRole) {
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'ADMIN') return 'Admin';
  return 'Employee';
}

function rolePillClass(role: UserRole) {
  if (role === 'SUPER_ADMIN')
    return 'bg-amber-400/15 text-amber-500 border border-amber-400/30';
  if (role === 'ADMIN') return 'bg-primary/15 text-primary border border-primary/20';
  return 'bg-muted text-muted-foreground border border-border';
}

interface ProfileCardModalProps {
  open: boolean;
  user: UserDetailResponse | null;
  loading: boolean;
  onClose: () => void;
}

function ProfileCardModal({ open, user, loading, onClose }: ProfileCardModalProps) {
  const fullName = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
    : '';

  const joinedOn = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 z-[80]"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 flex items-center justify-center h-7 w-7 rounded-full bg-muted/80 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {/* Gradient glow behind avatar */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent pointer-events-none" />

            {loading || !user ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="flex flex-col items-center px-6 pt-8 pb-6 gap-0">
                {/* Avatar */}
                <div className="relative h-20 w-20 rounded-full ring-2 ring-border bg-muted flex items-center justify-center overflow-hidden shrink-0 mb-4">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={fullName}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <User className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                {/* Name + role pill */}
                <h2 className="text-lg font-bold text-foreground text-center leading-tight truncate max-w-full">
                  {fullName}
                </h2>
                <span
                  className={`mt-1.5 inline-flex items-center text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${rolePillClass(user.role)}`}
                >
                  {roleLabel(user.role)}
                </span>

                {/* Divider */}
                <div className="w-2/3 h-px bg-border my-5" />

                {/* Fields */}
                <div className="w-full flex flex-col gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-muted shrink-0">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground leading-none mb-0.5">Email</p>
                      <p className="text-sm text-foreground truncate">{user.email}</p>
                    </div>
                  </div>

                  {user.homeBranchName && (
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-muted shrink-0">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground leading-none mb-0.5">Branch</p>
                        <p className="text-sm text-foreground truncate">{user.homeBranchName}</p>
                      </div>
                    </div>
                  )}

                  {user.phone && (
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-muted shrink-0">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground leading-none mb-0.5">Phone</p>
                        <p className="text-sm text-foreground truncate">{user.phone}</p>
                      </div>
                    </div>
                  )}

                  {joinedOn && (
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-muted shrink-0">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground leading-none mb-0.5">Joined</p>
                        <p className="text-sm text-foreground">{joinedOn}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

// ─── User Action Sheet (mobile) ────────────────────────────────────────────────

interface UserActionSheetProps {
  open: boolean;
  user: UserResponse | null;
  isSuperAdmin: boolean;
  hasBranches: boolean;
  onClose: () => void;
  onTransfer: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onResetPassword: () => void;
  onResetDevice: () => void;
}

function UserActionSheet({ open, user, isSuperAdmin, hasBranches, onClose, onTransfer, onDelete, onEdit, onResetPassword, onResetDevice }: UserActionSheetProps) {
  if (!user) return null;
  return ReactDOM.createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-end justify-center bg-black/40 backdrop-blur-sm z-[80]"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="w-full max-w-lg bg-card rounded-t-2xl border-t border-border shadow-xl pb-safe"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            {/* User info */}
            <div className="px-5 pt-2 pb-4 border-b border-border">
              <p className="text-sm font-semibold text-foreground truncate">{user.fullName}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
            </div>
            {/* Actions */}
            <div className="flex flex-col py-2">
              <button
                className="flex items-center gap-3 px-5 py-3.5 text-sm text-foreground hover:bg-muted/40 transition-colors"
                onClick={() => { onEdit(); onClose(); }}
              >
                <Pencil className="h-4 w-4 text-muted-foreground" />
                Edit Profile
              </button>
              <button
                className="flex items-center gap-3 px-5 py-3.5 text-sm text-foreground hover:bg-muted/40 transition-colors"
                onClick={() => { onResetPassword(); onClose(); }}
              >
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                Reset Password
              </button>
              <button
                className="flex items-center gap-3 px-5 py-3.5 text-sm text-foreground hover:bg-muted/40 transition-colors"
                onClick={() => { onResetDevice(); onClose(); }}
              >
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                Reset Device ID
              </button>
              {isSuperAdmin && hasBranches && (
                <button
                  className="flex items-center gap-3 px-5 py-3.5 text-sm text-foreground hover:bg-muted/40 transition-colors"
                  onClick={() => { onTransfer(); onClose(); }}
                >
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  Transfer Branch
                </button>
              )}
              <button
                className="flex items-center gap-3 px-5 py-3.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                onClick={() => { onDelete(); onClose(); }}
              >
                <Trash2 className="h-4 w-4" />
                Delete User
              </button>
            </div>
            <div className="px-5 pb-5 pt-1">
              <Button variant="outline" className="w-full" onClick={onClose}>Cancel</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

type UserView = 'list' | 'sessions' | 'logs' | 'location';

// ─── User Detail Header Actions ────────────────────────────────────────────────

function UserDetailHeaderActions({
  onLocation,
  onLogs,
}: {
  onLocation: () => void;
  onLogs: () => void;
}) {
  const [sheetOpen, setSheetOpen] = React.useState(false);

  return (
    <>
      {/* Mobile: single kebab → bottom sheet */}
      <button
        className="sm:hidden flex items-center justify-center h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
        onClick={() => setSheetOpen(true)}
        title="More actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {/* Desktop: both buttons inline */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" className="flex items-center gap-2 h-9" onClick={onLocation}>
          <MapPin className="h-3.5 w-3.5" />
          Location History
        </Button>
        <Button variant="outline" size="sm" className="flex items-center gap-2 h-9" onClick={onLogs}>
          <FileText className="h-3.5 w-3.5" />
          Logs
        </Button>
      </div>

      {/* Mobile action sheet */}
      {ReactDOM.createPortal(
        <AnimatePresence>
          {sheetOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="sm:hidden fixed inset-0 flex items-end justify-center bg-black/40 backdrop-blur-sm z-[90]"
              onMouseDown={(e) => { if (e.target === e.currentTarget) setSheetOpen(false); }}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="w-full max-w-lg bg-card rounded-t-2xl border-t border-border shadow-xl pb-safe"
              >
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>
                <div className="flex flex-col py-2">
                  <button
                    className="flex items-center gap-3 px-5 py-3.5 text-sm text-foreground hover:bg-muted/40 transition-colors"
                    onClick={() => { setSheetOpen(false); onLocation(); }}
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Location History
                  </button>
                  <button
                    className="flex items-center gap-3 px-5 py-3.5 text-sm text-foreground hover:bg-muted/40 transition-colors"
                    onClick={() => { setSheetOpen(false); onLogs(); }}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Logs
                  </button>
                </div>
                <div className="px-5 pb-5 pt-1">
                  <Button variant="outline" className="w-full" onClick={() => setSheetOpen(false)}>Cancel</Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

export default function AdminUsers({
  isSuperAdmin = false,
  branches = [],
  liveUsers = new Map(),
  onCreateUser,
}: AdminUsersProps) {
  const [users, setUsers]             = React.useState<UserResponse[]>([]);
  const [page, setPage]               = React.useState(0);
  const [hasMore, setHasMore]         = React.useState(true);
  const [loading, setLoading]         = React.useState(false);
  const [initialLoad, setInitialLoad] = React.useState(true);
  const [refreshing, setRefreshing]   = React.useState(false);
  const [showBackToTop, setShowBackToTop] = React.useState(false);
  const loaderRef = React.useRef<HTMLDivElement>(null);

  const [nameFilter, setNameFilter]     = React.useState('');
  const [emailFilter, setEmailFilter]   = React.useState('');
  const [branchFilter, setBranchFilter] = React.useState<number | ''>('');
  const debouncedName  = useDebounce(nameFilter);
  const debouncedEmail = useDebounce(emailFilter);

  const [filterOpen, setFilterOpen] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState<number | null>(null);

  const [transferUserId, setTransferUserId]     = React.useState<number | null>(null);
  const [transferBranchId, setTransferBranchId] = React.useState<number | null>(null);
  const [transferring, setTransferring]         = React.useState(false);

  const [selectedUser, setSelectedUser] = React.useState<UserDetailResponse | null>(null);
  const [loadingUser, setLoadingUser]   = React.useState<number | null>(null);
  const [userView, setUserView]         = React.useState<UserView>('list');
  const [actionSheetUser, setActionSheetUser] = React.useState<UserResponse | null>(null);

  // Profile card modal (avatar click)
  const [profileCardUser, setProfileCardUser]       = React.useState<UserDetailResponse | null>(null);
  const [profileCardOpen, setProfileCardOpen]       = React.useState(false);
  const [loadingProfileCard, setLoadingProfileCard] = React.useState(false);

  // ── New admin action state ─────────────────────────────────────────────────
  const [editUser, setEditUser]                       = React.useState<UserResponse | null>(null);
  const [resetPasswordUserId, setResetPasswordUserId] = React.useState<number | null>(null);
  const [resetPasswordName, setResetPasswordName]     = React.useState('');
  const [resettingPassword, setResettingPassword]     = React.useState(false);
  const [resetDeviceUserId, setResetDeviceUserId]     = React.useState<number | null>(null);
  const [resetDeviceName, setResetDeviceName]         = React.useState('');
  const [resettingDevice, setResettingDevice]         = React.useState(false);

  const fetchUsers = React.useCallback(async (pageNum: number) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<PageResponse<UserResponse>>>('/api/v1/users', {
        params: {
          page: pageNum,
          size: 20,
          ...(debouncedName  && { fullName: debouncedName }),
          ...(debouncedEmail && { email: debouncedEmail }),
          ...(branchFilter !== '' && { homeBranchId: branchFilter }),
        },
      });
      const data = res.data.data;
      setUsers((prev) => pageNum === 0 ? data.content : [...prev, ...data.content]);
      setHasMore(!data.last);
      setPage(pageNum + 1);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [debouncedName, debouncedEmail, branchFilter]);

  // Reset on filter change
  React.useEffect(() => {
    setUsers([]);
    setPage(0);
    setHasMore(true);
    setInitialLoad(true);
  }, [debouncedName, debouncedEmail, branchFilter]);

  React.useEffect(() => {
    if (initialLoad) fetchUsers(0);
  }, [initialLoad, fetchUsers]);

  // Infinite scroll sentinel
  React.useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !initialLoad)
          fetchUsers(page);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchUsers, hasMore, loading, page, initialLoad]);

  // Back to top
  React.useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleCardClick = async (id: number) => {
    if (loadingUser !== null) return;
    setLoadingUser(id);
    try {
      const res = await api.get<ApiResponse<UserDetailResponse>>(`/api/v1/users/${id}`);
      const userData = res.data.data;
      if (!userData) throw new Error('No user data returned');
      setSelectedUser(userData);
      setUserView('sessions');
    } catch (err) {
      console.error('Failed to fetch user detail', err);
    } finally {
      setLoadingUser(null);
    }
  };

  const handleAvatarClick = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setProfileCardUser(null);
    setProfileCardOpen(true);
    setLoadingProfileCard(true);
    try {
      const res = await api.get<ApiResponse<UserDetailResponse>>(`/api/v1/users/${id}`);
      const userData = res.data.data;
      if (!userData) throw new Error('No user data returned');
      setProfileCardUser(userData);
    } catch (err) {
      console.error('Failed to fetch user profile', err);
      setProfileCardOpen(false);
    } finally {
      setLoadingProfileCard(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/v1/users/${id}`);
      setDeleteConfirm(null);
      setUsers([]);
      setPage(0);
      setHasMore(true);
      setInitialLoad(true);
    } catch (err) {
      console.error('Failed to delete user', err);
    }
  };

  const handleTransfer = async () => {
    if (!transferUserId || !transferBranchId) return;
    setTransferring(true);
    try {
      await transferUser(transferUserId, transferBranchId);
      setUsers([]);
      setPage(0);
      setHasMore(true);
      setInitialLoad(true);
      setTransferUserId(null);
      setTransferBranchId(null);
    } catch (err) {
      console.error('Failed to transfer user', err);
    } finally {
      setTransferring(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setUsers([]);
    setPage(0);
    setHasMore(true);
    setInitialLoad(true);
    setRefreshing(false);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUserId) return;
    setResettingPassword(true);
    try {
      await adminResetPassword(resetPasswordUserId);
      setResetPasswordUserId(null);
    } catch (err) {
      console.error('Failed to reset password', err);
    } finally {
      setResettingPassword(false);
    }
  };

  const handleResetDevice = async () => {
    if (!resetDeviceUserId) return;
    setResettingDevice(true);
    try {
      await adminResetDeviceId(resetDeviceUserId);
      setResetDeviceUserId(null);
    } catch (err) {
      console.error('Failed to reset device ID', err);
    } finally {
      setResettingDevice(false);
    }
  };

  const activeFilterCount = [
    nameFilter !== '',
    emailFilter !== '',
    branchFilter !== '',
  ].filter(Boolean).length;

  const transferUser_ = users.find((u) => u.id === transferUserId);

  const handleBackToList = () => {
    setSelectedUser(null);
    setUserView('list');
  };

  // ── User detail views ──────────────────────────────────────────────────────
  if (selectedUser && userView === 'location') {
    return (
      <UserLocationHistory
        userId={selectedUser.id}
        user={selectedUser}
        onBack={() => setUserView('sessions')}
      />
    );
  }

  if (selectedUser && userView === 'logs') {
    return (
      <UserLogsPage
        userId={selectedUser.id}
        user={selectedUser}
        onBack={() => setUserView('sessions')}
      />
    );
  }

  if (selectedUser && userView === 'sessions') {
    return (
      <UserSessionsPage
        userId={selectedUser.id}
        user={selectedUser}
        onBack={handleBackToList}
        canUndo={false}
        embedded
        headerActions={
          <UserDetailHeaderActions
            onLocation={() => setUserView('location')}
            onLogs={() => setUserView('logs')}
          />
        }
      />
    );
  }

  // ── User list ──────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Top bar: Create User + Filters + chips + Refresh — all on one row */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Create User — only for SUPER_ADMIN, only on list view */}
        {isSuperAdmin && onCreateUser && (
          <Button
            size="sm"
            className="flex items-center gap-2 h-9 shrink-0"
            onClick={onCreateUser}
          >
            <Plus className="h-3.5 w-3.5" />
            Create User
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 h-9 shrink-0"
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

        {/* Active filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          {nameFilter && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-foreground">
              Name: {nameFilter}
              <button onClick={() => setNameFilter('')} className="text-muted-foreground hover:text-foreground ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {emailFilter && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-foreground">
              Email: {emailFilter}
              <button onClick={() => setEmailFilter('')} className="text-muted-foreground hover:text-foreground ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {branchFilter !== '' && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-foreground">
              {branches.find(b => b.id === branchFilter)?.displayName ?? 'Branch'}
              <button onClick={() => setBranchFilter('')} className="text-muted-foreground hover:text-foreground ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          title="Refresh users"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Interaction hint */}
      <div className="flex items-center gap-2 mb-3 px-1 text-xs text-muted-foreground/70">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-muted-foreground/20 shrink-0" />
          Tap a name to view sessions
        </span>
        <span className="text-muted-foreground/30">·</span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-muted-foreground/20 shrink-0" />
          Tap an avatar to view profile
        </span>
      </div>

      {/* User list */}
      {initialLoad ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
          No users found.
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <AnimatePresence>
            {users.map((user, idx) => {
              const isLoadingThisUser = loadingUser === user.id;

              return (
                <motion.div
                  key={user.id}
                  layout
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: isLoadingThisUser ? 0.98 : 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: 'easeOut', delay: Math.min(idx * 0.03, 0.15) }}
                  className={`group relative flex items-center gap-4 p-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors ${
                    isLoadingThisUser ? 'opacity-60 pointer-events-none' : ''
                  }`}
                  role="listitem"
                >
                  {/* Avatar — click opens profile card */}
                  <button
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground overflow-hidden ring-0 hover:ring-2 hover:ring-primary/40 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    onClick={(e) => handleAvatarClick(e, user.id)}
                    title="View profile"
                    aria-label={`View ${user.fullName} profile`}
                  >
                    {user.picture ? (
                      <img src={user.picture} alt={user.fullName} className="h-10 w-10 object-cover" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </button>

                  {/* Text — click goes to sessions */}
                  <button
                    className="flex-grow text-left min-w-0"
                    onClick={() => handleCardClick(user.id)}
                  >
                    <p className="text-sm font-medium text-card-foreground truncate leading-tight">
                      {user.fullName}
                      {isLoadingThisUser && (
                        <span className="ml-2 text-xs text-muted-foreground animate-pulse">…</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {user.email}
                    </p>
                    {/* Mobile: branch + role + proximity under name */}
                    <div className="sm:hidden flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {user.homeBranchName && (
                        <p className="text-xs text-muted-foreground/70 truncate">
                          📍 {user.homeBranchName}
                        </p>
                      )}
                      {user.role && <RolePill role={user.role} />}
                      {user.avgEntryProximityDistance != null && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded-full border border-border/50 shrink-0">
                          <Navigation className="h-2.5 w-2.5 shrink-0" />
                          {Math.round(user.avgEntryProximityDistance)}m avg
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Mobile: kebab menu */}
                  <button
                    className="sm:hidden flex items-center justify-center h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
                    onClick={(e) => { e.stopPropagation(); setActionSheetUser(user); }}
                    title="User actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {/* Desktop: info + actions — info sits flush right, nudges left on hover to reveal action buttons */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    {/* Info chips — always visible, shift left on hover */}
                    <div className="flex items-center gap-2 transition-all duration-200 ease-out group-hover:mr-1 group-focus-within:mr-1">
                      {user.homeBranchName && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/70 max-w-[140px] truncate">
                          📍 {user.homeBranchName}
                        </span>
                      )}
                      {user.avgEntryProximityDistance != null && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded-full border border-border/50 shrink-0">
                          <Navigation className="h-2.5 w-2.5 shrink-0" />
                          {Math.round(user.avgEntryProximityDistance)}m avg
                        </span>
                      )}
                      {user.role && <RolePill role={user.role} />}
                    </div>

                    {/* Action buttons — zero width when hidden, expand in on hover */}
                    <div
                      className="flex items-center gap-1 overflow-hidden w-0 group-hover:w-auto group-focus-within:w-auto transition-all duration-200 ease-out"
                      onClick={(e) => e.stopPropagation()}
                    >
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary"
                      onClick={() => setEditUser(user)}
                      title="Edit profile"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-amber-500"
                      onClick={() => { setResetPasswordUserId(user.id); setResetPasswordName(user.fullName); }}
                      title="Reset password"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-blue-500"
                      onClick={() => { setResetDeviceUserId(user.id); setResetDeviceName(user.fullName); }}
                      title="Reset device ID"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                    </Button>

                    {isSuperAdmin && branches.length > 0 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary"
                        onClick={() => { setTransferUserId(user.id); setTransferBranchId(null); }}
                        title="Transfer branch"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    {deleteConfirm === user.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Sure?</span>
                        <Button size="sm" variant="destructive" className="h-6 text-xs px-2" onClick={() => handleDelete(user.id)}>Yes</Button>
                        <Button size="sm" variant="outline"     className="h-6 text-xs px-2" onClick={() => setDeleteConfirm(null)}>No</Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteConfirm(user.id)}
                        title="Delete user"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    </div>{/* end action buttons */}
                  </div>{/* end info+actions wrapper */}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {!initialLoad && (
        <div ref={loaderRef} className="flex justify-center py-5">
          {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          {!hasMore && users.length > 0 && (
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
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-50 flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
            aria-label="Back to top"
          >
            <ArrowUp className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Profile Card Modal */}
      <ProfileCardModal
        open={profileCardOpen}
        user={profileCardUser}
        loading={loadingProfileCard}
        onClose={() => { setProfileCardOpen(false); setProfileCardUser(null); }}
      />

      <FilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        nameFilter={nameFilter}
        emailFilter={emailFilter}
        branchFilter={branchFilter}
        branches={branches}
        isSuperAdmin={isSuperAdmin}
        onApply={(name, email, branch) => {
          setNameFilter(name);
          setEmailFilter(email);
          setBranchFilter(branch);
        }}
        onClear={() => {
          setNameFilter('');
          setEmailFilter('');
          setBranchFilter('');
        }}
      />

      <TransferBranchModal
        open={transferUserId !== null}
        userName={transferUser_?.fullName ?? ''}
        branches={branches}
        selectedBranchId={transferBranchId}
        transferring={transferring}
        onSelect={(id) => setTransferBranchId(id)}
        onConfirm={handleTransfer}
        onCancel={() => { setTransferUserId(null); setTransferBranchId(null); }}
      />

      <UserActionSheet
        open={actionSheetUser !== null}
        user={actionSheetUser}
        isSuperAdmin={isSuperAdmin}
        hasBranches={branches.length > 0}
        onClose={() => setActionSheetUser(null)}
        onTransfer={() => { if (actionSheetUser) { setTransferUserId(actionSheetUser.id); setTransferBranchId(null); } }}
        onDelete={() => { if (actionSheetUser) setDeleteConfirm(actionSheetUser.id); }}
        onEdit={() => { if (actionSheetUser) setEditUser(actionSheetUser); }}
        onResetPassword={() => { if (actionSheetUser) { setResetPasswordUserId(actionSheetUser.id); setResetPasswordName(actionSheetUser.fullName); } }}
        onResetDevice={() => { if (actionSheetUser) { setResetDeviceUserId(actionSheetUser.id); setResetDeviceName(actionSheetUser.fullName); } }}
      />

      <EditUserModal
        open={editUser !== null}
        user={editUser}
        onClose={() => setEditUser(null)}
        onSaved={() => { setUsers([]); setPage(0); setHasMore(true); setInitialLoad(true); }}
      />

      {/* Password Reset Confirm Modal */}
      {ReactDOM.createPortal(
        <AnimatePresence>
          {resetPasswordUserId !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 z-[90]"
              onMouseDown={(e) => { if (e.target === e.currentTarget) setResetPasswordUserId(null); }}
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 16 }}
                transition={{ duration: 0.18 }}
                className="bg-card rounded-2xl border border-border shadow-xl p-5 w-full max-w-sm"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center h-9 w-9 rounded-full bg-amber-400/15 shrink-0">
                    <KeyRound className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Reset Password?</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium text-foreground truncate block">{resetPasswordName}</span>
                      will need to set a new password on next login.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2.5 mt-5">
                  <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => setResetPasswordUserId(null)} disabled={resettingPassword}>
                    Cancel
                  </Button>
                  <Button className="flex-1 h-9 text-sm bg-amber-500 hover:bg-amber-600 text-white" onClick={handleResetPassword} disabled={resettingPassword}>
                    {resettingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resetting…</> : 'Confirm Reset'}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Device ID Reset Confirm Modal */}
      {ReactDOM.createPortal(
        <AnimatePresence>
          {resetDeviceUserId !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 z-[90]"
              onMouseDown={(e) => { if (e.target === e.currentTarget) setResetDeviceUserId(null); }}
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 16 }}
                transition={{ duration: 0.18 }}
                className="bg-card rounded-2xl border border-border shadow-xl p-5 w-full max-w-sm"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center h-9 w-9 rounded-full bg-blue-400/15 shrink-0">
                    <Smartphone className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Reset Device ID?</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium text-foreground truncate block">{resetDeviceName}</span>
                      's device will be re-registered on next login.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2.5 mt-5">
                  <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => setResetDeviceUserId(null)} disabled={resettingDevice}>
                    Cancel
                  </Button>
                  <Button className="flex-1 h-9 text-sm bg-blue-500 hover:bg-blue-600 text-white" onClick={handleResetDevice} disabled={resettingDevice}>
                    {resettingDevice ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resetting…</> : 'Confirm Reset'}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Mobile delete confirm — shown when deleteConfirm is set but action came from mobile sheet */}
      {ReactDOM.createPortal(
        <AnimatePresence>
          {deleteConfirm !== null && !users.find(u => u.id === deleteConfirm) === false && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="sm:hidden fixed inset-0 flex items-end justify-center bg-black/40 backdrop-blur-sm z-[90]"
              onMouseDown={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="w-full max-w-lg bg-card rounded-t-2xl border-t border-border shadow-xl pb-safe"
              >
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>
                <div className="px-5 pt-3 pb-5">
                  <p className="text-sm font-semibold text-foreground mb-1">Delete user?</p>
                  <p className="text-xs text-muted-foreground mb-5">
                    {users.find(u => u.id === deleteConfirm)?.fullName ?? 'This user'} will be permanently removed.
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                    <Button variant="destructive" className="flex-1" onClick={() => handleDelete(deleteConfirm!)}>Delete</Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}