import * as React from "react";
import api from "@/services/api";
import { tokenStore } from "@/services/api";
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
  // Plain profile fetch. Does NOT touch tokens — token lifecycle is owned
  // exclusively by login() / logout() / the api.ts interceptor.
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
  // Only runs when NOT on the login page, and only when BOTH tokens exist.
  // Never runs concurrently with login() — the login page short-circuits here.
  React.useEffect(() => {
    const onLoginPage = window.location.pathname === "/";

    if (onLoginPage) {
      setLoading(false);
      return;
    }

    const hasAccess  = Boolean(tokenStore.getAccess());
    const hasRefresh = Boolean(tokenStore.getRefresh());

    if (hasAccess && hasRefresh) {
      fetchUser();
    } else {
      tokenStore.clear();
      setLoading(false);
    }
  }, [fetchUser]);

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
  // ORDER MATTERS:
  //   1. Tell the backend to revoke the refresh token FIRST — while the
  //      access token is still in localStorage so the request goes out
  //      with a valid Authorization header.
  //   2. Clear tokens locally AFTER the request completes (or fails).
  //   3. Redirect.
  //
  // Previously tokens were cleared before the POST, so the logout request
  // went out with no Authorization header. If the backend requires auth on
  // /logout it would 401, hit the interceptor, find no refresh token, and
  // call forceLogout() — setting isLoggingOut=true and poisoning the next
  // login attempt.
  const logout = async () => {
    const refreshToken = tokenStore.getRefresh();
    setUser(null);

    try {
      if (refreshToken) {
        await api.post("/api/auth/logout", { refreshToken });
      }
    } catch (err) {
      // Silently ignore — backend may have already revoked the token.
      // The interceptor's isLogoutRequest guard ensures a 401 here does
      // NOT trigger forceLogout() or corrupt the next login session.
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
