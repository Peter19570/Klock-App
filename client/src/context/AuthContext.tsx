import * as React from "react";
import api, { tokenStore, clearLoggingOutFlag } from "@/services/api";
import type { UserDetailResponse, AuthRequest } from "@/types";

interface AuthContextValue {
  user: UserDetailResponse | null;
  loading: boolean;
  login: (data: AuthRequest) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  // ── fetchUser ──────────────────────────────────────────────────────────────
  const fetchUser = React.useCallback(async (): Promise<UserDetailResponse | null> => {
    try {
      const res = await api.get<{ data: UserDetailResponse }>("/api/v1/users/me");
      const userData = res.data.data;
      setUser(userData);
      return userData;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Session restore on mount ───────────────────────────────────────────────
  // FIX (Bug 1): Instead of relying on window.location.pathname (which is
  // fragile — query strings, hash routes, and trailing slashes all break the
  // equality check), we look at whether BOTH tokens exist. If they do, we
  // attempt to restore the session regardless of the current route. If the
  // access token is expired, the Axios interceptor will silently refresh it
  // before /users/me fires, so the user stays logged in. If both tokens are
  // absent we just stop loading — the router's protected-route guards handle
  // the redirect to login.
  //
  // We also call clearLoggingOutFlag() here so that a user who was force-
  // logged-out and lands back on the login page can log in again on the first
  // attempt. Without this, the sessionStorage flag from forceLogout() would
  // block every subsequent request.
  React.useEffect(() => {
    clearLoggingOutFlag();

    const hasAccess  = Boolean(tokenStore.getAccess());
    const hasRefresh = Boolean(tokenStore.getRefresh());

    if (hasAccess && hasRefresh) {
      fetchUser();
    } else {
      tokenStore.clear();
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — run once on mount only

  // ── Redirect after login ───────────────────────────────────────────────────
  const handleHardRedirect = (userData: UserDetailResponse) => {
    if (userData.mustChangePassword) {
      window.location.href = "/onboarding";
      return;
    }
    if (userData.role === "SUPER_ADMIN" || userData.role === "ADMIN") {
      window.location.href = "/admin";
      return;
    }
    window.location.href = "/dashboard";
  };

  // ── login ──────────────────────────────────────────────────────────────────
  const login = async (data: AuthRequest) => {
    const res = await api.post<{ data: { accessToken: string; refreshToken: string } }>(
      "/api/auth/v1/login",
      data
    );
    const { accessToken, refreshToken } = res.data.data;

    // Save BEFORE fetchUser so /users/me goes out with a valid Bearer header
    tokenStore.save(accessToken, refreshToken);

    const userData = await fetchUser();
    if (userData) handleHardRedirect(userData);
  };

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    const refreshToken = tokenStore.getRefresh();
    setUser(null);

    try {
      if (refreshToken) {
        await api.post("/api/auth/logout", { refreshToken });
      }
    } catch (err) {
      console.warn("Logout request failed (token may already be revoked):", err);
    } finally {
      tokenStore.clear();
      localStorage.removeItem("klock-theme");
      window.location.href = "/";
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, refetchUser: fetchUser }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
