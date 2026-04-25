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
  }, []);

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

  // FIXED: /api/auth/v1/login → /api/v1/auth/login
  const login = async (data: AuthRequest) => {
    const res = await api.post<{ data: { accessToken: string; refreshToken: string } }>(
      "/api/v1/auth/login",
      data
    );
    const { accessToken, refreshToken } = res.data.data;
    tokenStore.save(accessToken, refreshToken);
    const userData = await fetchUser();
    if (userData) handleHardRedirect(userData);
  };

  // FIXED: /api/auth/logout → /api/v1/auth/logout
  const logout = async () => {
    const refreshToken = tokenStore.getRefresh();
    setUser(null);
    try {
      if (refreshToken) {
        await api.post("/api/v1/auth/logout", { refreshToken });
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
