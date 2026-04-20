import { useState, useRef, useCallback, useEffect } from 'react';
import {
  LayoutDashboard, Users, Clock, GitBranch, Plus, Trash2, Loader2,
  Lock, Unlock, X, MapPin, ChevronRight, ArrowLeft, Maximize2,
  Minimize2, Menu, ArrowUp, Users2, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { AdminMap } from './AdminMap';
import AdminUsers from './AdminUsers';
import AdminSessions from './AdminSessions';
import LocationSettings from './LocationSettings';
import CreateAdminModal from './CreateAdminModal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  SplashedPushNotifications,
  type SplashedPushNotificationsHandle,
} from './ui/splashed-push-notifications';

import { useAuth } from '../context/AuthContext';
import { useAdminWebSocket } from '../hooks/useAdminWebSocket';
import {
  getAllBranches,
  getManagedBranch,
  createBranch,
  deleteBranch,
  getBranchDetails,
  setBranchStatus,
} from '../services/branchService';
import type { BranchResponse, BranchRequest, BranchDetailsResponse } from '../types';

type TabId = 'dashboard' | 'users' | 'sessions' | 'branch' | 'branches';

interface BranchFormState {
  displayName: string;
  latitude: string;
  longitude: string;
  radius: string;
  autoClockOutDuration: string;
}

const emptyForm = (): BranchFormState => ({
  displayName: '',
  latitude: '',
  longitude: '',
  radius: '200',
  autoClockOutDuration: '',
});

function formToRequest(f: BranchFormState): BranchRequest {
  return {
    displayName: f.displayName.trim(),
    latitude: parseFloat(f.latitude),
    longitude: parseFloat(f.longitude),
    radius: parseFloat(f.radius),
    ...(f.autoClockOutDuration && { autoClockOutDuration: parseInt(f.autoClockOutDuration, 10) }),
  };
}

function isFormValid(f: BranchFormState): boolean {
  return (
    f.displayName.trim().length > 0 &&
    !isNaN(parseFloat(f.latitude)) &&
    !isNaN(parseFloat(f.longitude)) &&
    !isNaN(parseFloat(f.radius)) &&
    parseFloat(f.radius) > 0
  );
}

interface BranchFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  notify: (type: 'success' | 'error', msg: string) => void;
}

function BranchFormModal({ open, onClose, onSaved, notify }: BranchFormModalProps) {
  const [form, setForm] = useState<BranchFormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm(emptyForm()); }, [open]);

  const set = (key: keyof BranchFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!isFormValid(form)) return;
    setSaving(true);
    try {
      await createBranch(formToRequest(form));
      notify('success', 'Branch created successfully.');
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save branch.';
      notify('error', msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 z-50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="bg-card rounded-xl border border-border shadow-xl p-5 sm:p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-foreground">Create Branch</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Branch Name</Label>
            <Input placeholder="e.g. Lagos HQ" value={form.displayName} onChange={set('displayName')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Latitude</Label>
              <Input placeholder="6.5244" type="number" step="any" value={form.latitude} onChange={set('latitude')} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Longitude</Label>
              <Input placeholder="3.3792" type="number" step="any" value={form.longitude} onChange={set('longitude')} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            💡 Right-click on{' '}
            <a href="https://www.openstreetmap.org" target="_blank" rel="noreferrer" className="underline text-primary">openstreetmap.org</a>{' '}
            to copy coordinates.
          </p>
          <div className="space-y-1.5">
            <Label className="text-sm">Radius (meters)</Label>
            <Input placeholder="200" type="number" min={10} value={form.radius} onChange={set('radius')} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Auto clock-out delay <span className="text-muted-foreground font-normal">(minutes, optional)</span></Label>
            <Input placeholder="e.g. 30" type="number" min={1} value={form.autoClockOutDuration} onChange={set('autoClockOutDuration')} />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!isFormValid(form) || saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Create'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Branch Detail Page ────────────────────────────────────────────────────────
interface BranchDetailPageProps {
  branch: BranchResponse;
  onBack: () => void;
  onSaved: () => void;
  notify: (type: 'success' | 'error', msg: string) => void;
}

type StaffTab = 'assigned' | 'active';

function BranchDetailPage({ branch, onBack, onSaved, notify }: BranchDetailPageProps) {
  const [details, setDetails]         = useState<BranchDetailsResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [liveRadius, setLiveRadius]   = useState<number | null>(null);
  const [togglingLock, setTogglingLock] = useState(false);
  const [currentLocked, setCurrentLocked] = useState(
    branch.branchStatus === 'LOCKED' || branch.isLocked,
  );
  const [staffTab, setStaffTab]       = useState<StaffTab>('assigned');
  const topRef                        = useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setLoadingDetails(true);
    getBranchDetails(branch.id)
      .then((res) => setDetails(res.data.data))
      .catch(() => notify('error', 'Failed to load branch details.'))
      .finally(() => setLoadingDetails(false));
  }, [branch.id, notify]);

  const handleToggleLock = async () => {
    setTogglingLock(true);
    try {
      await setBranchStatus(branch.id, {
        branchStatus: currentLocked ? 'UNLOCKED' : 'LOCKED',
      });
      setCurrentLocked((v) => !v);
      notify('success', `Branch ${currentLocked ? 'unlocked' : 'locked'} successfully.`);
      onSaved();
    } catch {
      notify('error', 'Failed to update branch status.');
    } finally {
      setTogglingLock(false);
    }
  };

  const previewBranch: BranchResponse = {
    ...branch,
    radius: liveRadius ?? branch.radius,
    isLocked: currentLocked,
  };

  return (
    <div className="space-y-6" ref={topRef}>
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to branches
      </button>

      {/* Header — name + status badge + lock toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-foreground">{branch.displayName}</h2>
        {currentLocked ? (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-400/15 text-amber-500 font-medium border border-amber-400/30">
            <Lock className="h-3 w-3" /> Locked
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-emerald-400/15 text-emerald-500 font-medium border border-emerald-400/30">
            <Unlock className="h-3 w-3" /> Unlocked
          </span>
        )}

        {/* Desktop: full button. Mobile: icon only */}
        <div className="ml-auto">
          {/* Desktop */}
          <Button
            size="sm"
            variant="outline"
            className="hidden sm:flex gap-2"
            onClick={handleToggleLock}
            disabled={togglingLock}
          >
            {togglingLock
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : currentLocked
                ? <><Unlock className="h-3.5 w-3.5" />Unlock Branch</>
                : <><Lock className="h-3.5 w-3.5" />Lock Branch</>
            }
          </Button>
          {/* Mobile: padlock icon */}
          <Button
            size="icon"
            variant="outline"
            className="sm:hidden h-8 w-8"
            onClick={handleToggleLock}
            disabled={togglingLock}
            title={currentLocked ? 'Unlock Branch' : 'Lock Branch'}
          >
            {togglingLock
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : currentLocked
                ? <Unlock className="h-4 w-4" />
                : <Lock className="h-4 w-4" />
            }
          </Button>
        </div>
      </div>

      {/* Stats row */}
      {loadingDetails ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : details ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Staff',  value: details.totalAssignedStaff,  className: 'text-foreground' },
            { label: 'Active Now',   value: details.currentActiveCount,  className: 'text-emerald-500' },
            { label: 'Radius',       value: `${branch.radius}m`,          className: 'text-foreground' },
            { label: 'Status',       value: currentLocked ? 'Locked' : 'Unlocked', className: currentLocked ? 'text-amber-500' : 'text-emerald-500' },
          ].map(({ label, value, className }) => (
            <div key={label} className="rounded-xl bg-muted/60 dark:bg-muted/30 p-3 shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-lg font-bold mt-0.5 ${className}`}>{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Branch Settings + Map */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        <div className="w-full xl:flex-1">
          <LocationSettings
            branchId={branch.id}
            isLockedForCurrentUser={false}
            onRadiusChange={(r) => setLiveRadius(r)}
            onSaved={onSaved}
          />
        </div>
        <div className="w-full xl:flex-1 rounded-2xl border border-border bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
          <h3 className="text-sm font-semibold text-foreground mb-3">Live radius preview — {branch.displayName}</h3>
          <AdminMap branches={[previewBranch]} liveUsers={new Map()} />
        </div>
      </div>

      {/* Staff section — tabbed */}
      {details && (
        <div className="rounded-xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)] overflow-hidden">
          {/* Tab buttons */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setStaffTab('assigned')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors relative ${
                staffTab === 'assigned' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users2 className="h-4 w-4" />
              Assigned Staff
              <span className={`inline-flex items-center justify-center h-4.5 min-w-[1.25rem] px-1 rounded-full text-[10px] font-bold ${
                staffTab === 'assigned' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {details.assignedStaff.length}
              </span>
              {staffTab === 'assigned' && (
                <motion.div
                  layoutId="branch-staff-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
            <button
              onClick={() => setStaffTab('active')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors relative ${
                staffTab === 'active' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Active Now
              <span className={`inline-flex items-center justify-center h-4.5 min-w-[1.25rem] px-1 rounded-full text-[10px] font-bold ${
                staffTab === 'active' ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {details.activeNow.length}
              </span>
              {staffTab === 'active' && (
                <motion.div
                  layoutId="branch-staff-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          </div>

          {/* Tab content */}
          <div className="p-4">
            <AnimatePresence mode="wait">
              {staffTab === 'assigned' ? (
                <motion.div
                  key="assigned"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  {details.assignedStaff.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No assigned staff.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {details.assignedStaff.map((u) => (
                        <div key={u.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {u.fullName?.charAt(0) ?? '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-foreground font-medium truncate text-xs">{u.fullName}</p>
                            <p className="text-muted-foreground truncate text-[10px]">{u.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="active"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  {details.activeNow.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No one is currently active.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {details.activeNow.map((u) => (
                        <div key={u.id} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                          <div className="h-7 w-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-600 shrink-0">
                            {u.fullName?.charAt(0) ?? '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-foreground font-medium truncate text-xs">{u.fullName}</p>
                            <p className="text-muted-foreground truncate text-[10px]">{u.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Back to top */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => topRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-50 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
            title="Back to top"
          >
            <ArrowUp className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export function AdminDashboard() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const toastRef = useRef<SplashedPushNotificationsHandle>(null);
  const [activeTab, setActiveTab]     = useState<TabId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [mapFocusBranchId, setMapFocusBranchId] = useState<number | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [branchListOpen, setBranchListOpen] = useState(false);

  // SUPER_ADMIN: all branches list
  const [branches, setBranches]       = useState<BranchResponse[]>([]);
  // ADMIN: their single managed branch (from GetManagedBranch)
  const [adminBranch, setAdminBranch] = useState<BranchResponse | null>(null);
  const [adminBranchLoading, setAdminBranchLoading] = useState(false);

  const [liveRadius, setLiveRadius]   = useState<number | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<BranchResponse | null>(null);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [deletingBranchId, setDeletingBranchId] = useState<number | null>(null);
  const [deleting, setDeleting]       = useState(false);
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [refreshingBranches, setRefreshingBranches] = useState(false);

  const { users: liveUsers } = useAdminWebSocket();
  const [visibleUserCount, setVisibleUserCount] = useState(0);

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'users',     label: 'Users',     icon: <Users className="w-4 h-4" /> },
    { id: 'sessions',  label: 'Sessions',  icon: <Clock className="w-4 h-4" /> },
    isSuperAdmin
      ? { id: 'branches' as TabId, label: 'Branches', icon: <GitBranch className="w-4 h-4" /> }
      : { id: 'branch'   as TabId, label: 'Branch',   icon: <MapPin className="w-4 h-4" /> },
  ];

  const notify = useCallback((type: 'success' | 'error', msg: string) => {
    toastRef.current?.createNotification(type, type === 'success' ? 'Success' : 'Error', msg);
  }, []);

  // ── SUPER_ADMIN: fetch all branches ────────────────────────────────────────
  const fetchBranches = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await getAllBranches({ page: 0, size: 100 });
      const content = res.data.data.content ?? [];
      setBranches(content.map((b) => ({
        ...b,
        isLocked: b.branchStatus === 'LOCKED' || b.isLocked,
      })));
    } catch {
      notify('error', 'Could not load branch data.');
    }
  }, [isSuperAdmin, notify]);

  // ── ADMIN: fetch managed branch via correct endpoint ───────────────────────
  const fetchAdminBranch = useCallback(async () => {
    if (isSuperAdmin) return;
    setAdminBranchLoading(true);
    try {
      // Backend ignores the ID for admins and returns their assigned branch.
      // Hardcode ID=0 as specified.
      const res = await getManagedBranch(0);
      const detail = res.data.data;
      // Map BranchDetailsResponse → BranchResponse shape for map usage.
      // latitude/longitude are optional on BranchDetailsResponse — fall back to
      // 0 so the map still renders instead of receiving NaN coordinates.
      setAdminBranch({
        id: detail.id,
        displayName: detail.displayName,
        latitude: detail.latitude ?? 0,
        longitude: detail.longitude ?? 0,
        radius: detail.radius,
        branchStatus: detail.branchStatus,
        isLocked: detail.branchStatus === 'LOCKED',
      });
    } catch {
      notify('error', 'Could not load your branch data.');
    } finally {
      setAdminBranchLoading(false);
    }
  }, [isSuperAdmin, notify]);

  // Initial fetch on mount
  useEffect(() => {
    if (isSuperAdmin) {
      fetchBranches();
    } else {
      fetchAdminBranch();
    }
  }, [isSuperAdmin, fetchBranches, fetchAdminBranch]);

  // Re-fetch branches fresh every time the Branches/Branch tab is opened
  const handleTabChange = (id: TabId) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
    if (id !== 'branches') setSelectedBranch(null);

    // BUG FIX: always fetch fresh data when navigating to the branch tab(s)
    if (id === 'branches' && isSuperAdmin) {
      fetchBranches();
    }
    if (id === 'branch' && !isSuperAdmin) {
      fetchAdminBranch();
    }
  };

  const handleRefreshBranches = async () => {
    setRefreshingBranches(true);
    if (isSuperAdmin) {
      await fetchBranches();
    } else {
      await fetchAdminBranch();
    }
    setRefreshingBranches(false);
  };

  const previewBranches: BranchResponse[] = branches.map((b, i) =>
    i === 0 && liveRadius !== null ? { ...b, radius: liveRadius } : b,
  );

  const handleDeleteBranch = async (id: number) => {
    setDeleting(true);
    try {
      await deleteBranch(id);
      notify('success', 'Branch deleted.');
      setDeletingBranchId(null);
      if (selectedBranch?.id === id) setSelectedBranch(null);
      fetchBranches();
    } catch {
      notify('error', 'Failed to delete branch.');
    } finally {
      setDeleting(false);
    }
  };

  const activeTabDef = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  // Dashboard map: Super Admin sees all branches; Admin sees their own managed branch
  const dashboardMapBranches = isSuperAdmin
    ? branches
    : adminBranch ? [adminBranch] : [];

  // Branches passed to AdminUsers for transfer dropdown
  const branchesForUsers = isSuperAdmin ? branches : (adminBranch ? [adminBranch] : []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <SplashedPushNotifications ref={toastRef} />

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {isSuperAdmin ? 'Super Admin Dashboard' : 'Admin Dashboard'}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isSuperAdmin
              ? 'Manage all branches, users, and sessions across the organisation.'
              : 'Manage your branch users, sessions, and settings.'}
          </p>
        </div>

        {/* Tab bar — desktop */}
        <div className="hidden md:flex border-b border-border w-full">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap
                ${activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="admin-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab bar — mobile */}
        <div className="md:hidden">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              {activeTabDef.icon}
              {activeTabDef.label}
            </div>
            <Button variant="outline" size="icon" onClick={() => setMobileMenuOpen((v) => !v)}>
              <svg className="pointer-events-none" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12L20 12" className={`origin-center transition-all duration-300 ${mobileMenuOpen ? 'translate-y-0 rotate-[315deg]' : '-translate-y-[7px]'}`} />
                <path d="M4 12H20" className={`origin-center transition-all duration-300 ${mobileMenuOpen ? 'rotate-45' : ''}`} />
                <path d="M4 12H20" className={`origin-center transition-all duration-300 ${mobileMenuOpen ? 'translate-y-0 rotate-[135deg]' : 'translate-y-[7px]'}`} />
              </svg>
            </Button>
          </div>
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className="mt-2 rounded-xl border border-border bg-card shadow-lg overflow-hidden"
              >
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-2.5 w-full px-4 py-3 text-sm transition-colors
                      ${activeTab === tab.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'}`}
                  >
                    {tab.icon}
                    {tab.label}
                    {activeTab === tab.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tab Panels */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >

            {/* ── DASHBOARD ────────────────────────────────────────────────── */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />Clocked in</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />Clocked out</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />Offline</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />Near perimeter</span>
                  <span className="ml-auto font-medium">{visibleUserCount} user{visibleUserCount !== 1 ? 's' : ''} in perimeter</span>
                </div>

                {isSuperAdmin && branches.length > 0 && (
                  <>
                    {/* Desktop: grid — max 6 cards */}
                    <div className="hidden md:block">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(showAllBranches ? branches : branches.slice(0, 6)).map((b) => (
                          <motion.button
                            key={b.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => setMapFocusBranchId(b.id)}
                            className="text-left rounded-xl border border-border bg-card p-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)] hover:border-primary/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-all"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-foreground truncate">{b.displayName}</p>
                              {b.isLocked && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-500 font-medium shrink-0">
                                  <Lock className="h-2.5 w-2.5" /> Locked
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1.5">Click to locate on map</p>
                          </motion.button>
                        ))}
                      </div>
                      {branches.length > 6 && (
                        <div className="mt-3 flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8"
                            onClick={() => setShowAllBranches((v) => !v)}
                          >
                            {showAllBranches ? 'Show Less' : `View All Branches (${branches.length})`}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Mobile: hamburger */}
                    <div className="md:hidden">
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => setBranchListOpen((v) => !v)}
                      >
                        <span className="flex items-center gap-2">
                          <Menu className="h-4 w-4" />
                          {branches.length} Branch{branches.length !== 1 ? 'es' : ''}
                        </span>
                        <ChevronRight className={`h-4 w-4 transition-transform ${branchListOpen ? 'rotate-90' : ''}`} />
                      </Button>
                      <AnimatePresence>
                        {branchListOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                              {branches.map((b) => (
                                <button
                                  key={b.id}
                                  className="flex w-full items-center justify-between px-4 py-3 text-sm text-foreground hover:bg-muted/40 transition-colors border-b border-border last:border-0"
                                  onClick={() => { setMapFocusBranchId(b.id); setBranchListOpen(false); }}
                                >
                                  <span className="font-medium truncate">{b.displayName}</span>
                                  {b.isLocked && (
                                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-500 font-medium shrink-0">
                                      <Lock className="h-2.5 w-2.5" /> Locked
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                )}

                {/* Map */}
                <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-foreground">
                      {isSuperAdmin ? 'All Branches — Live' : 'Office Zone — Live'}
                    </h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setMapExpanded((v) => !v)}
                      title={mapExpanded ? 'Collapse map' : 'Expand map'}
                    >
                      {mapExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                  </div>
                  <motion.div
                    animate={{ height: mapExpanded ? 600 : 360 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden rounded-xl"
                  >
                    {dashboardMapBranches.length > 0 ? (
                      <AdminMap
                        branches={dashboardMapBranches}
                        liveUsers={liveUsers}
                        focusBranchId={mapFocusBranchId}
                        onFocusConsumed={() => setMapFocusBranchId(null)}
                        onVisibleCountChange={setVisibleUserCount}
                      />
                    ) : adminBranchLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-sm text-muted-foreground rounded-xl border border-dashed border-border">
                        No branches configured yet.
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            )}

            {/* ── USERS ────────────────────────────────────────────────────── */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                {isSuperAdmin && (
                  <div className="flex justify-end">
                    <Button onClick={() => setShowCreateAdmin(true)} className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Create User
                    </Button>
                  </div>
                )}
                <AdminUsers isSuperAdmin={isSuperAdmin} branches={branchesForUsers} />
              </div>
            )}

            {/* ── SESSIONS ─────────────────────────────────────────────────── */}
            {activeTab === 'sessions' && <AdminSessions />}

            {/* ── BRANCH (ADMIN only) ──────────────────────────────────────── */}
            {activeTab === 'branch' && !isSuperAdmin && (
              <div>
                {adminBranchLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : adminBranch ? (
                  <div className="flex flex-col xl:flex-row gap-6 items-start">
                    <div className="w-full xl:flex-1">
                      <LocationSettings
                        branchId={adminBranch.id}
                        isLockedForCurrentUser={adminBranch.isLocked}
                        onRadiusChange={(r) => setLiveRadius(r)}
                        onSaved={fetchAdminBranch}
                      />
                    </div>
                    <div className="w-full xl:flex-1 rounded-2xl border border-border bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-foreground">Live radius preview — {adminBranch.displayName}</h3>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMapExpanded((v) => !v)}>
                          {mapExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                      <motion.div
                        animate={{ height: mapExpanded ? 540 : 360 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden rounded-xl"
                      >
                        <AdminMap
                          branches={[{
                            ...adminBranch,
                            radius: liveRadius ?? adminBranch.radius,
                          }]}
                          liveUsers={new Map()}
                        />
                      </motion.div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-12">
                    No branch assigned. Contact your Super Admin.
                  </div>
                )}
              </div>
            )}

            {/* ── BRANCHES (SUPER_ADMIN) ────────────────────────────────────── */}
            {activeTab === 'branches' && isSuperAdmin && (
              <AnimatePresence mode="wait">
                {selectedBranch ? (
                  <motion.div
                    key={`detail-${selectedBranch.id}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <BranchDetailPage
                      branch={selectedBranch}
                      onBack={() => setSelectedBranch(null)}
                      onSaved={fetchBranches}
                      notify={notify}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="branch-list"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {branches.length} branch{branches.length !== 1 ? 'es' : ''} total
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={handleRefreshBranches}
                          disabled={refreshingBranches}
                          title="Refresh branches"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${refreshingBranches ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button onClick={() => setBranchModalOpen(true)} className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          New Branch
                        </Button>
                      </div>
                    </div>

                    {branches.length === 0 ? (
                      <div className="text-center py-16 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                        No branches yet. Create your first branch.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {branches.map((b, idx) => (
                          <motion.div
                            key={b.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22, delay: Math.min(idx * 0.04, 0.2) }}
                            className="relative rounded-xl border border-border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)] hover:border-primary/30 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition-all overflow-hidden"
                          >
                            <div className="flex items-center gap-3 px-4 py-3.5">
                              <button
                                className="flex-1 text-left min-w-0 overflow-hidden"
                                onClick={() => setSelectedBranch(b)}
                              >
                                {/* Mobile: name + (locked badge + radius) stacked */}
                                <div className="sm:hidden">
                                  <p className="font-semibold text-sm text-foreground truncate">{b.displayName}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {b.isLocked && (
                                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-500 font-medium border border-amber-400/30 shrink-0">
                                        <Lock className="h-2.5 w-2.5" /> Locked
                                      </span>
                                    )}
                                    <span className="text-xs text-muted-foreground">{b.radius}m radius</span>
                                  </div>
                                </div>

                                {/* Desktop: name fades into status */}
                                <div className="hidden sm:flex items-center gap-3">
                                  <div className="relative min-w-0 flex-1 max-w-[55%]">
                                    <p
                                      className="font-semibold text-sm text-foreground truncate"
                                      title={b.displayName}
                                      style={{
                                        maskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
                                        WebkitMaskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
                                      }}
                                    >
                                      {b.displayName}
                                    </p>
                                  </div>
                                  <div className="flex-1 flex justify-center">
                                    {b.isLocked && (
                                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-500 font-medium border border-amber-400/30 shrink-0">
                                        <Lock className="h-2.5 w-2.5" /> Locked
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground shrink-0">{b.radius}m</span>
                                </div>
                              </button>

                              {/* Actions */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelectedBranch(b)}>
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => setDeletingBranchId(b.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Delete confirmation — overlay */}
                            <AnimatePresence>
                              {deletingBranchId === b.id && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute inset-0 flex items-center justify-between gap-3 px-4 bg-card/95 backdrop-blur-[2px] rounded-xl border border-destructive/30"
                                >
                                  <p className="text-sm text-foreground font-medium">
                                    Delete <span className="text-destructive">{b.displayName}</span>?
                                  </p>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                      size="sm" variant="outline" className="h-7 text-xs"
                                      onClick={() => setDeletingBranchId(null)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm" variant="destructive" className="h-7 text-xs"
                                      disabled={deleting}
                                      onClick={() => handleDeleteBranch(b.id)}
                                    >
                                      {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Delete'}
                                    </Button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {branchModalOpen && (
          <BranchFormModal
            open={branchModalOpen}
            onClose={() => setBranchModalOpen(false)}
            onSaved={fetchBranches}
            notify={notify}
          />
        )}
      </AnimatePresence>

      {isSuperAdmin && (
        <CreateAdminModal
          open={showCreateAdmin}
          branches={branches}
          onClose={() => setShowCreateAdmin(false)}
          onCreated={() => {
            setShowCreateAdmin(false);
            notify('success', 'User account created successfully.');
          }}
        />
      )}
    </div>
  );
}

export default AdminDashboard;
