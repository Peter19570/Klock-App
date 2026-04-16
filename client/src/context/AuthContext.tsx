import * as React from "react";
import api from "@/services/api";
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
    fetchUser();
  }, [fetchUser]);

  /**
   * Redirect logic after login:
   *   mustChangePassword → /onboarding  (password change screen only)
   *   SUPER_ADMIN / ADMIN → /admin
   *   USER → /dashboard
   */
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

  const login = async (data: AuthRequest) => {
    await api.post("/api/auth/v1/login", data);
    const userData = await fetchUser();
    if (userData) handleHardRedirect(userData);
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("klock-theme");
    try {
      await api.post("/api/auth/logout");
    } catch (err) {
      console.warn("Logout failed", err);
    } finally {
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