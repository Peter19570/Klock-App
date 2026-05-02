import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMe } from '../services/userService';
import type { UserDetailResponse } from '../types';
import { ProfileDropdown } from './ui/profile-dropdown';

export function Navbar() {
  const { user } = useAuth();
  const isAdmin      = user?.role === 'ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isEmployee   = user?.role === 'USER';

  const [meData, setMeData] = useState<UserDetailResponse | null>(null);

  useEffect(() => {
    if (!user) return;
    getMe()
      .then((res) => setMeData(res.data.data))
      .catch(() => { /* silently fall back */ });
  }, [user]);

  const displayName = meData
    ? `${meData.firstName} ${meData.lastName}`
    : user
    ? `${user.firstName} ${user.lastName}`
    : '';

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const avatarUrl = meData?.picture ?? null;

  const roleLabel = isSuperAdmin
    ? 'Super Admin'
    : isAdmin
    ? 'Admin'
    : isEmployee
    ? 'Employee'
    : null;

  const roleBadgeClass = isSuperAdmin
    ? 'bg-amber-400/15 text-amber-500 border border-amber-400/30'
    : isAdmin
    ? 'bg-primary/15 text-primary border border-primary/20'
    : 'bg-muted text-muted-foreground border border-border';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* ── Logo ── */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">Klock</span>
        </div>

        {/* ── Profile dropdown (replaces name + role badge + theme toggle + logout button) ── */}
        {user && (
          <ProfileDropdown
            displayName={displayName}
            initials={initials}
            avatarUrl={avatarUrl}
            roleLabel={roleLabel}
            roleBadgeClass={roleBadgeClass}
            isSuperAdmin={isSuperAdmin}
            isAdmin={isAdmin}
          />
        )}

      </div>
    </header>
  );
}
