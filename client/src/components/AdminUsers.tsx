import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {
  Search, Trash2, ChevronLeft, ChevronRight, User, Plus,
  ArrowRightLeft, Check, SlidersHorizontal, X, Loader2, RefreshCw,
  FileText, MapPin, Navigation, MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/services/api';
import { transferUser } from '@/services/userService';
import { getLocationHistory } from '@/services/sessionService';
import type { UserResponse, UserDetailResponse, ApiResponse, PageResponse, BranchResponse, LocationResponse, UserRole } from '@/types';
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

function UserLocationHistory({ userId, user, onBack }: UserLocationHistoryProps) {
  const [points, setPoints]   = React.useState<LocationResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError]     = React.useState<string | null>(null);
  const svgRef                = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    setLoading(true);
    setError(null);
    getLocationHistory(userId)
      .then((res) => setPoints(res.data.data ?? []))
      .catch(() => setError('Failed to load location history.'))
      .finally(() => setLoading(false));
  }, [userId]);

  // Project lat/lng into SVG space
  const projected = React.useMemo(() => {
    if (points.length === 0) return [];
    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const pad = 40;
    const W = 540, H = 320;
    const rangeX = maxLng - minLng || 0.001;
    const rangeY = maxLat - minLat || 0.001;
    return points.map((p) => ({
      x: pad + ((p.longitude - minLng) / rangeX) * (W - pad * 2),
      // Flip Y: larger lat = higher on screen
      y: pad + ((maxLat - p.latitude) / rangeY) * (H - pad * 2),
    }));
  }, [points]);

  const polyline = projected.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary shrink-0" />
            Location History — {user.firstName} {user.lastName}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Movement trail (all recorded pings)</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-sm text-destructive border border-dashed border-destructive/30 rounded-xl">
          {error}
        </div>
      ) : points.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
          No location history recorded for this user.
        </div>
      ) : (
        <>
          {/* Map */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <svg
              ref={svgRef}
              viewBox="0 0 540 320"
              className="w-full"
              style={{ background: 'var(--muted)' }}
            >
              {/* Grid lines */}
              {[1,2,3].map((i) => (
                <React.Fragment key={i}>
                  <line x1={0} y1={i * 80} x2={540} y2={i * 80} stroke="var(--border)" strokeWidth={0.5} />
                  <line x1={i * 135} y1={0} x2={i * 135} y2={320} stroke="var(--border)" strokeWidth={0.5} />
                </React.Fragment>
              ))}

              {/* Trail line */}
              {projected.length > 1 && (
                <polyline
                  points={polyline}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.8}
                />
              )}

              {/* Points */}
              {projected.map((p, i) => {
                const isFirst = i === 0;
                const isLast  = i === projected.length - 1;
                return (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={isFirst || isLast ? 7 : 4}
                    fill={isFirst ? 'var(--primary)' : isLast ? '#10b981' : 'var(--primary)'}
                    opacity={isFirst || isLast ? 1 : 0.5}
                  />
                );
              })}

              {/* Start / End labels */}
              {projected.length > 0 && (
                <>
                  <text x={projected[0].x + 10} y={projected[0].y + 4} fontSize={10} fill="var(--primary)" fontWeight="600">Start</text>
                  <text x={projected[projected.length - 1].x + 10} y={projected[projected.length - 1].y + 4} fontSize={10} fill="#10b981" fontWeight="600">End</text>
                </>
              )}
            </svg>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground">Total Points</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{points.length}</p>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground">Coordinates</p>
              <p className="text-sm font-semibold text-foreground mt-0.5 truncate">
                {points[points.length - 1]?.latitude.toFixed(4)}°, {points[points.length - 1]?.longitude.toFixed(4)}°
              </p>
            </div>
          </div>
        </>
      )}
    </div>
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
}

function UserActionSheet({ open, user, isSuperAdmin, hasBranches, onClose, onTransfer, onDelete }: UserActionSheetProps) {
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
          View Location History
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
                    View Location History
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
  const [totalPages, setTotalPages]   = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [loading, setLoading]         = React.useState(false);
  const [refreshing, setRefreshing]   = React.useState(false);

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

  const fetchUsers = React.useCallback(async (page: number) => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<PageResponse<UserResponse>>>('/api/v1/users', {
        params: {
          page,
          size: 20,
          ...(debouncedName  && { fullName: debouncedName }),
          ...(debouncedEmail && { email: debouncedEmail }),
          ...(branchFilter !== '' && { homeBranchId: branchFilter }),
        },
      });
      const data = res.data.data;
      setUsers(data.content);
      setTotalPages(data.totalPages);
      setCurrentPage(data.number);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedName, debouncedEmail, branchFilter]);

  React.useEffect(() => { fetchUsers(0); }, [fetchUsers]);

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

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/v1/users/${id}`);
      setDeleteConfirm(null);
      fetchUsers(currentPage);
    } catch (err) {
      console.error('Failed to delete user', err);
    }
  };

  const handleTransfer = async () => {
    if (!transferUserId || !transferBranchId) return;
    setTransferring(true);
    try {
      await transferUser(transferUserId, transferBranchId);
      fetchUsers(currentPage);
      setTransferUserId(null);
      setTransferBranchId(null);
    } catch (err) {
      console.error('Failed to transfer user', err);
    } finally {
      setTransferring(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers(currentPage);
    setRefreshing(false);
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

      {/* User list */}
      {loading ? (
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
                  {/* Avatar */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground overflow-hidden">
                    {user.picture ? (
                      <img src={user.picture} alt={user.fullName} className="h-10 w-10 object-cover" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>

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
                    {/* Mobile: branch + role under name */}
                    <div className="sm:hidden flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {user.homeBranchName && (
                        <p className="text-xs text-muted-foreground/70 truncate">
                          📍 {user.homeBranchName}
                        </p>
                      )}
                      {user.role && <RolePill role={user.role} />}
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
                      {user.role && <RolePill role={user.role} />}
                    </div>

                    {/* Action buttons — zero width when hidden, expand in on hover */}
                    <div
                      className="flex items-center gap-1 overflow-hidden w-0 group-hover:w-auto group-focus-within:w-auto transition-all duration-200 ease-out"
                      onClick={(e) => e.stopPropagation()}
                    >
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">Page {currentPage + 1} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" disabled={currentPage === 0} onClick={() => fetchUsers(currentPage - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" disabled={currentPage >= totalPages - 1} onClick={() => fetchUsers(currentPage + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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
      />

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