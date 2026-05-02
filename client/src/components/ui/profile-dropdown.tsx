import * as React from "react";
import { LogOut, User, ChevronDown, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
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

const panelVariants = {
  hidden: { opacity: 0, scale: 0.96, y: -6 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -4,
    transition: { duration: 0.12, ease: "easeIn" },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.045, duration: 0.18, ease: "easeOut" },
  }),
};

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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
          "hover:bg-secondary transition-all duration-200",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          open && "bg-secondary"
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

        {/* Name + role */}
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
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="hidden sm:block shrink-0"
        >
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </motion.div>
      </button>

      {/* ── Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "absolute right-0 top-full mt-2 w-60",
              "bg-popover border border-border rounded-2xl",
              "shadow-xl shadow-black/[0.08] dark:shadow-black/30",
              "z-[9999] overflow-hidden origin-top-right"
            )}
          >
            {/* ── Header: avatar + name + role ── */}
            <motion.div
              custom={0}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="px-4 py-3.5"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0",
                    "ring-2 ring-offset-2 ring-offset-popover",
                    isSuperAdmin
                      ? "ring-amber-400/60"
                      : isAdmin
                      ? "ring-primary/50"
                      : "ring-border"
                  )}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : initials ? (
                    <span className="text-sm font-semibold text-foreground">
                      {initials}
                    </span>
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate leading-tight">
                    {displayName || "—"}
                  </p>
                  {roleLabel && (
                    <span
                      className={cn(
                        "inline-flex text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full mt-1",
                        roleBadgeClass
                      )}
                    >
                      {roleLabel}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* ── Divider ── */}
            <div className="mx-3 h-px bg-border" />

            {/* ── Theme row ── */}
            <motion.div
              custom={1}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="mx-1.5 mt-1.5"
            >
              <div
                className={cn(
                  "flex items-center justify-between px-2.5 py-2 rounded-xl",
                  "bg-muted/60"
                )}
              >
                <div className="flex items-center gap-2">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isDark ? "moon" : "sun"}
                      initial={{ rotate: -30, opacity: 0, scale: 0.7 }}
                      animate={{ rotate: 0, opacity: 1, scale: 1 }}
                      exit={{ rotate: 30, opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.2 }}
                    >
                      {isDark ? (
                        <Moon className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </motion.div>
                  </AnimatePresence>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={isDark ? "dark-label" : "light-label"}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 4 }}
                      transition={{ duration: 0.15 }}
                      className="text-xs font-medium text-foreground"
                    >
                      {isDark ? "Dark mode" : "Light mode"}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <AnimatedThemeToggle />
              </div>
            </motion.div>

            {/* ── Logout ── */}
            <motion.div
              custom={2}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="p-1.5 pt-1"
            >
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl",
                  "text-sm font-medium text-destructive",
                  "hover:bg-destructive/10 active:bg-destructive/15",
                  "transition-colors duration-150",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "group"
                )}
              >
                <motion.div
                  whileHover={{ x: 2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                </motion.div>
                <span>Log out</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
