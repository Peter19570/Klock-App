import { LogOut, Zap } from 'lucide-react';
import { AnimatedThemeToggle } from './ui/animated-theme-toggle';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

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
              {user.firstName} {user.lastName}
            </span>
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
