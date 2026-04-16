import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {
  Search, Trash2, ChevronLeft, ChevronRight, User,
  ArrowRightLeft, ChevronDown, Check, SlidersHorizontal, X, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/services/api';
import { transferUser } from '@/services/userService';
import type { UserResponse, UserDetailResponse, ApiResponse, PageResponse, BranchResponse } from '@/types';
import UserSessionsPage from './UserSessionsPage';

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

  // Sync when modal opens
  React.useEffect(() => {
    if (open) {
      setLocalName(nameFilter);
      setLocalEmail(emailFilter);
      setLocalBranch(branchFilter);
    }
  }, [open, nameFilter, emailFilter, branchFilter]);

  const activeCount = [
    nameFilter !== '',
    emailFilter !== '',
    branchFilter !== '',
  ].filter(Boolean).length;

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
            {/* Header */}
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
              {/* Name */}
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
                    <button
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setLocalName('')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Email */}
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
                    <button
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setLocalEmail('')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Branch — super admin only */}
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

            {/* Actions */}
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

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdminUsers({ isSuperAdmin = false, branches = [], liveUsers = new Map() }: AdminUsersProps) {
  const [users, setUsers]             = React.useState<UserResponse[]>([]);
  const [totalPages, setTotalPages]   = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [loading, setLoading]         = React.useState(false);

  // Applied filters
  const [nameFilter, setNameFilter]     = React.useState('');
  const [emailFilter, setEmailFilter]   = React.useState('');
  const [branchFilter, setBranchFilter] = React.useState<number | ''>('');
  const debouncedName  = useDebounce(nameFilter);
  const debouncedEmail = useDebounce(emailFilter);

  // Filter modal
  const [filterOpen, setFilterOpen] = React.useState(false);

  const [deleteConfirm, setDeleteConfirm] = React.useState<number | null>(null);

  const [transferUserId, setTransferUserId]       = React.useState<number | null>(null);
  const [transferBranchId, setTransferBranchId]   = React.useState<number | null>(null);
  const [transferDropdownOpen, setTransferDropdownOpen] = React.useState(false);
  const [transferring, setTransferring]           = React.useState(false);
  const transferDropdownRef = React.useRef<HTMLDivElement>(null);

  const [selectedUser, setSelectedUser] = React.useState<UserDetailResponse | null>(null);
  const [loadingUser, setLoadingUser]   = React.useState<number | null>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (transferDropdownRef.current && !transferDropdownRef.current.contains(e.target as Node)) {
        setTransferDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchUsers = React.useCallback(async (page: number) => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<PageResponse<UserResponse>>>('/api/v1/users/all', {
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
      setTransferDropdownOpen(false);
    } catch (err) {
      console.error('Failed to transfer user', err);
    } finally {
      setTransferring(false);
    }
  };

  const handleApplyFilters = (name: string, email: string, branch: number | '') => {
    setNameFilter(name);
    setEmailFilter(email);
    setBranchFilter(branch);
  };

  const handleClearFilters = () => {
    setNameFilter('');
    setEmailFilter('');
    setBranchFilter('');
  };

  const activeFilterCount = [
    nameFilter !== '',
    emailFilter !== '',
    branchFilter !== '',
  ].filter(Boolean).length;

  if (selectedUser) {
    return (
      <UserSessionsPage
        userId={selectedUser.id}
        user={selectedUser}
        onBack={() => setSelectedUser(null)}
        canUndo={false}
      />
    );
  }

  return (
    <div>
      {/* Top bar: filter button (left) */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 h-9"
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
        <div className="flex flex-col gap-2">
          {users.map((user, idx) => {
            const isTransferMode        = transferUserId === user.id;
            const isLoadingThisUser     = loadingUser === user.id;
            const selectedTransferBranch = branches.find((b) => b.id === transferBranchId);

            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: Math.min(idx * 0.03, 0.15) }}
                className={`rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
                  isLoadingThisUser ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                <div
                  className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => !isTransferMode && handleCardClick(user.id)}
                >
                  {/* Left: avatar + info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0">
                      {user.picture ? (
                        <img
                          src={user.picture}
                          alt={user.fullName}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate leading-tight">
                        {user.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      {user.homeBranchName && (
                        <p className="text-[10px] text-muted-foreground/60 truncate">📍 {user.homeBranchName}</p>
                      )}
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isLoadingThisUser && (
                      <span className="text-xs text-muted-foreground animate-pulse">…</span>
                    )}

                    {isSuperAdmin && !isTransferMode && branches.length > 0 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
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
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteConfirm(user.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* ── Transfer panel ── */}
                <AnimatePresence>
                  {isTransferMode && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden border-t border-border"
                    >
                      <div className="px-4 py-3 space-y-2.5">
                        <p className="text-xs font-medium text-foreground">
                          Transfer <span className="text-primary">{user.fullName}</span> to:
                        </p>
                        <div className="relative" ref={transferDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setTransferDropdownOpen(!transferDropdownOpen)}
                            className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                          >
                            <span className={selectedTransferBranch ? 'text-foreground' : 'text-muted-foreground'}>
                              {selectedTransferBranch ? selectedTransferBranch.displayName : 'Choose branch…'}
                            </span>
                            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${transferDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence>
                            {transferDropdownOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.12 }}
                                className="absolute z-50 w-full mt-1 rounded-lg border border-border bg-card shadow-lg max-h-40 overflow-auto"
                              >
                                {branches.map((b) => (
                                  <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => { setTransferBranchId(b.id); setTransferDropdownOpen(false); }}
                                    className="relative flex w-full items-center px-3 py-2 text-sm text-foreground hover:bg-muted/60 transition-colors"
                                  >
                                    <span className="flex-1 text-left">{b.displayName}</span>
                                    {transferBranchId === b.id && <Check className="h-3.5 w-3.5 text-primary" />}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline" size="sm" className="flex-1"
                            onClick={() => { setTransferUserId(null); setTransferBranchId(null); }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm" className="flex-1"
                            disabled={!transferBranchId || transferring}
                            onClick={handleTransfer}
                          >
                            {transferring ? 'Moving…' : 'Confirm'}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
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

      {/* Filter Modal */}
      <FilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        nameFilter={nameFilter}
        emailFilter={emailFilter}
        branchFilter={branchFilter}
        branches={branches}
        isSuperAdmin={isSuperAdmin}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />
    </div>
  );
}
