import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim() || !password) return;
    setIsLoading(true);
    setError(null);
    try {
      await login({ email: email.trim(), password });
      // AuthContext.login() handles redirect via window.location.href
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Invalid email or password. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="light min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        background: "linear-gradient(to top, #fffbeb, #ffffff)",
        colorScheme: "light",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="mx-auto mb-3 sm:mb-4 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <svg className="h-6 w-6 sm:h-7 sm:w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome to Klock</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="email" className="text-gray-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                autoComplete="email"
                autoFocus
                className="mt-1"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  autoComplete="current-password"
                  className={`pr-10 ${error ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error && (
                <p className="mt-1.5 text-xs text-red-500">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              className="mt-2 w-full h-11 text-base"
              disabled={!email.trim() || !password || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {import.meta.env.VITE_SUPPORT_PHONE && (
            <p className="mt-5 text-center text-xs text-gray-400">
              Need help?{" "}
              <a
                href={`tel:${import.meta.env.VITE_SUPPORT_PHONE}`}
                className="text-gray-500 hover:text-gray-700 underline underline-offset-2 transition-colors"
              >
                {import.meta.env.VITE_SUPPORT_PHONE}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}