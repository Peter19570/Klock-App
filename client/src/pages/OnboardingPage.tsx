import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

// ── Password Change Form ──────────────────────────────────────────────────────

function PasswordChangeForm({ userId }: { userId: number }) {
  const navigate = useNavigate();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const passwordsMatch = confirm === "" || password === confirm;
  const isValid = password.length >= 6 && password === confirm;

  const handleSubmit = async () => {
    if (!isValid) return;
    setIsLoading(true);
    setError(null);
    try {
      await api.post(`/api/v1/auth/reset-password`, { password });
      // Re-fetch user to get cleared mustChangePassword flag, then redirect
      const me = await api.get("/api/v1/users/me");
      const userData = me.data.data;
      if (userData.role === "ADMIN" || userData.role === "SUPER_ADMIN") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update password. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border/50 p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-foreground">Set your password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a secure password to access your account
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor="new-password">New Password</Label>
          <div className="relative mt-1">
            <Input
              id="new-password"
              type={showPassword ? "text" : "password"}
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter" && isValid) handleSubmit(); }}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password.length > 0 && password.length < 6 && (
            <p className="mt-1 text-xs text-destructive">Password must be at least 6 characters</p>
          )}
        </div>

        <div>
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <div className="relative mt-1">
            <Input
              id="confirm-password"
              type={showConfirm ? "text" : "password"}
              placeholder="Repeat your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && isValid) handleSubmit(); }}
              className={`pr-10 ${!passwordsMatch ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {!passwordsMatch && (
            <p className="mt-1 text-xs text-destructive">Passwords do not match</p>
          )}
        </div>

        <Button
          className="mt-2 w-full"
          disabled={!isValid || isLoading}
          onClick={handleSubmit}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Set Password"
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If user is loaded and does NOT need a password change, redirect away.
  // This prevents the page from showing on refresh for users who already set their password.
  React.useEffect(() => {
    if (!user) return;
    if (!user.mustChangePassword) {
      if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(to top, #fffbeb, #ffffff)" }}
    >
      <PasswordChangeForm userId={user.id} />
    </div>
  );
}