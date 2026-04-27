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

  const avatarUrl = meData?.picture ?? null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">Klock</span>
          {isSuperAdmin && (
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-500 border border-amber-400/30">
              Super Admin
            </span>
          )}
          {isAdmin && (
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/15 text-primary">
              Admin
            </span>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user && (
            <span className="hidden sm:block text-sm text-muted-foreground">
              {displayName}
            </span>
          )}

          {/* Avatar */}
          {user && (
            <div className="w-8 h-8 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // If the image fails to load, hide it so the fallback icon shows
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <User className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          )}

          <AnimatedThemeToggle />
          <Button variant="ghost" size="icon" onClick={logout} title="Logout">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
