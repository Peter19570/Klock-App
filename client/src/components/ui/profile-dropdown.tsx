import * as React from "react";
import { LogOut, User, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { AnimatedThemeToggle } from "@/components/ui/animated-theme-toggle";

interface ProfileDropdownProps {
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  roleLabel: string | null;
  roleBadgeClass: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

export function ProfileDropdown({
  displayName,
  initials,
  avatarUrl,
  roleLabel,
  roleBadgeClass,
  isSuperAdmin,
  isAdmin,
}: ProfileDropdownProps) {
  const { logout } = useAuth();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-xl",
          "border border-border bg-background",
          "hover:bg-secondary hover:border-border/80",
          "transition-all duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          open && "bg-secondary border-border/80"
        )}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-7 h-7 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : initials ? (
              <span className="text-[10px] font-semibold text-foreground leading-none">
                {initials}
              </span>
            ) : (
              <User className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
          {/* role dot — always visible on trigger */}
          {roleLabel && (
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background",
                isSuperAdmin
                  ? "bg-amber-400"
                  : isAdmin
                  ? "bg-primary"
                  : "bg-muted-foreground"
              )}
            />
          )}
        </div>

        {/* Name + role — hidden on very small screens */}
        <div className="hidden sm:flex flex-col items-start min-w-0">
          <span className="text-xs font-medium text-foreground leading-tight truncate max-w-[110px]">
            {displayName || "—"}
          </span>
          {roleLabel && (
            <span
              className={cn(
                "text-[9px] font-semibold uppercase tracking-wider leading-tight truncate",
                isSuperAdmin
                  ? "text-amber-500"
                  : isAdmin
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {roleLabel}
            </span>
          )}
        </div>

        {/* Chevron */}
        <ChevronDown
          className={cn(
            "hidden sm:block w-3 h-3 text-muted-foreground shrink-0 transition-transform duration-200",
            open ? "rotate-180" : "rotate-0"
          )}
        />
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 w-56",
            "bg-popover border border-border rounded-xl shadow-lg",
            "z-[9999] overflow-hidden",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
          )}
        >
          {/* User info header */}
          <div className="px-3 py-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : initials ? (
                  <span className="text-xs font-semibold text-foreground">
                    {initials}
                  </span>
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate leading-tight">
                  {displayName || "—"}
                </p>
                {roleLabel && (
                  <span
                    className={cn(
                      "inline-flex text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-full mt-0.5",
                      roleBadgeClass
                    )}
                  >
                    {roleLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Theme toggle row */}
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Theme</span>
            <AnimatedThemeToggle />
          </div>

          {/* Logout */}
          <div className="p-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg",
                "text-sm text-destructive",
                "hover:bg-destructive/10",
                "transition-colors duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
