import * as React from 'react';
import {
  Search, Trash2, ChevronLeft, ChevronRight, User,
  ArrowRightLeft, ChevronDown, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

function getStatusMeta(email: string, liveUsers: Map<string, { status: string }>) {
  const entry = liveUsers.get(email);
  if (!entry || entry.status === 'offline') return { dot: 'bg-gray-400', label: 'Offline' };
  if (entry.status === 'clocked-in')  return { dot: 'bg-emerald-500', label: 'Clocked In' };
  if (entry.status === 'clocked-out') return { dot: 'bg-red-500',     label: 'Clocked Out' };
  return { dot: 'bg-gray-400', label: 'Offline' };
}

export default function AdminUsers({ isSuperAdmin = false, branches = [], liveUsers = new Map() }: AdminUsersProps) {
  const [users, setUsers] = React.useState<UserResponse[]>([]);
  const [totalPages, setTotalPages] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const [nameFilter, setNameFilter] = React.useState('');
  const [emailFilter, setEmailFilter] = React.useState('');
  const [branchFilter, setBranchFilter] = React.useState<number | ''>('');
  const debouncedName = useDebounce(nameFilter);
  const debouncedEmail = useDebounce(emailFilter);

  const [deleteConfirm, setDeleteConfirm] = React.useState<number | null>(null);

  const [transferUserId, setTransferUserId] = React.useState<number | null>(null);
  const [transferBranchId, setTransferBranchId] = React.useState<number | null>(null);
  const [transferDropdownOpen, setTransferDropdownOpen] = React.useState(false);
  const [transferring, setTransferring] = React.useState(false);
  const transferDropdownRef = React.useRef<HTMLDivElement>(null);

  const [selectedUser, setSelectedUser] = React.useState<UserDetailResponse | null>(null);
  const [loadingUser, setLoadingUser] = React.useState<number | null>(null);

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

  if (selectedUser) {
    return (
      <UserSessionsPage
        userId={selectedUser.id}
        user={selectedUser}
        onBack={() => setSelectedUser(null)}
        canUndo={true}
      />
    );
  }

  return (
    <div>
      {/* Search filters */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name…"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by email…"
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        {isSuperAdmin && branches.length > 0 && (
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value === '' ? '' : Number(e.target.value))}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.displayName}</option>
            ))}
          </select>
        )}
      </div>

      {/* User cards */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading…</div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No users found.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((user, idx) => {
            const isTransferMode   = transferUserId === user.id;
            const selectedTransferBranch = branches.find((b) => b.id === transferBranchId);
            const isLoadingThisUser = loadingUser === user.id;
            const { dot, label } = getStatusMeta(user.email, liveUsers);

            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.18) }}
                whileHover={{ scale: 1.012, transition: { duration: 0.15 } }}
                className="rounded-xl border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/25 transition-shadow"
              >
                {/* ── Main row ── */}
                <div
                  className={`flex items-center justify-between gap-3 px-4 py-3 cursor-pointer ${
                    isLoadingThisUser ? 'opacity-60 pointer-events-none' : ''
                  }`}
                  onClick={() => !isTransferMode && handleCardClick(user.id)}
                >
                  {/* Left: avatar + info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
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
                      {/* Status dot */}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${dot}`}
                        title={label}
                      />
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

                  {/* Right: status badge + actions */}
                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Compact status pill */}
                    <span className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      dot === 'bg-emerald-500'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : dot === 'bg-red-500'
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                      {label}
                    </span>

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
    </div>
  );
}
