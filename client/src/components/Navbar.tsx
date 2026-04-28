import { useState, useEffect } from 'react';
import { LogOut, Zap, User } from 'lucide-react';
import { AnimatedThemeToggle } from './ui/animated-theme-toggle';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { getMe } from '../services/userService';
import type { UserDetailResponse } from '../types';

export function Navbar() {
  const { user, logout } = useAuth();
  const isAdmin      = user?.role === 'ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isEmployee   = user?.role === 'USER';

  const [meData, setMeData] = useState<UserDetailResponse | null>(null);

  useEffect(() => {
    if (!user) return;
    getMe()
      .then((res) => setMeData(res.data.data))
      .catch(() => { /* silently fall back to initials */ });
  }, [user]);

  const displayName = meData
    ? `${meData.firstName} ${meData.lastName}`
    : user
    ? `${user.firstName} ${user.lastName}`
    : '';

  // Get initials for avatar fallback
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

        {/* ── Logo (no role badge here anymore) ── */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">Klock</span>
        </div>

        {/* ── Right side ── */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">

          {/* Desktop: name shown as plain text */}
          {user && (
            <span className="hidden sm:block text-sm text-muted-foreground truncate max-w-[160px]">
              {displayName}
            </span>
          )}

          {/* Desktop: role badge shown separately */}
          {user && roleLabel && (
            <span className={`hidden sm:inline-flex text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${roleBadgeClass}`}>
              {roleLabel}
            </span>
          )}

          {/* Avatar — on mobile this is the ONLY identity element, so make it informative */}
          {user && (
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : initials ? (
                  <span className="text-[11px] font-semibold text-foreground leading-none">
                    {initials}
                  </span>
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              {/* Mobile-only: role dot indicator on avatar */}
              {roleLabel && (
                <span
                  className={`sm:hidden absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                    isSuperAdmin
                      ? 'bg-amber-400'
                      : isAdmin
                      ? 'bg-primary'
                      : 'bg-muted-foreground'
                  }`}
                  title={roleLabel}
                />
              )}
            </div>
          )}

          {/* Mobile-only: name + role stacked, shown next to avatar */}
          {user && (
            <div className="flex sm:hidden flex-col min-w-0 max-w-[90px]">
              <span className="text-xs font-medium text-foreground truncate leading-tight">
                {displayName.split(' ')[0]}
              </span>
              {roleLabel && (
                <span className={`text-[9px] font-semibold uppercase tracking-wider truncate leading-tight mt-0.5 ${
                  isSuperAdmin
                    ? 'text-amber-500'
                    : isAdmin
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}>
                  {roleLabel}
                </span>
              )}
            </div>
          )}

          <AnimatedThemeToggle />
          <Button variant="ghost" size="icon" onClick={logout} title="Logout" className="shrink-0">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

      </div>
    </header>
  );
}
