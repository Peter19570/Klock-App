import * as React from "react";
import api, { tokenStore, clearLoggingOutFlag } from "@/services/api";
import type { UserDetailResponse, AuthRequest } from "@/types";

// ── Device registration helpers ───────────────────────────────────────────────

async function getDeviceId(): Promise<string> {
  const stored = localStorage.getItem("klock_device_id");
  if (stored) return stored;
  const ua = navigator.userAgent + navigator.language + screen.width + screen.height;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ua));
  const id = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
  localStorage.setItem("klock_device_id", id);
  return id;
}

function deviceIsUnset(deviceId: UserDetailResponse["deviceId"]): boolean {
  return deviceId == null || deviceId === "NOT SET";
}

async function registerDeviceIfNeeded(userData: UserDetailResponse): Promise<void> {
  if (!deviceIsUnset(userData.deviceId)) return;
  try {
    const deviceId = await getDeviceId();
    await api.post("/api/v1/auth/device", { deviceId });
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Klock", { body: "Device registered successfully.", silent: true });
    }
  } catch (err) {
    console.warn("Device registration failed (non-fatal):", err);
  }
}

// ── Resolve where a user should land after login ──────────────────────────────

export function resolveHomeRoute(userData: UserDetailResponse): string {
  if (userData.mustChangePassword) return "/onboarding";
  if (userData.role === "SUPER_ADMIN" || userData.role === "ADMIN") return "/admin";
  return "/dashboard";
}

interface AuthContextValue {
  user: UserDetailResponse | null;
  loading: boolean;
  login: (data: AuthRequest, navigate: (path: string) => void) => Promise<void>;
  logout: (navigate: (path: string) => void) => Promise<void>;
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

  // FIX: accept navigate from the caller so we use React Router's history stack
  // instead of window.location.href, which nukes the SPA history on every call.
  const login = async (data: AuthRequest, navigate: (path: string) => void) => {
    const res = await api.post<{ data: { accessToken: string; refreshToken: string } }>(
      "/api/v1/auth/login",
      data
    );
    const { accessToken, refreshToken } = res.data.data;
    tokenStore.save(accessToken, refreshToken);
    const userData = await fetchUser();
    if (userData) {
      await registerDeviceIfNeeded(userData);
      // replace: true so the login page is NOT pushed onto the history stack —
      // pressing back from /dashboard won't return to /login.
      navigate(resolveHomeRoute(userData));
    }
  };

  const logout = async (navigate: (path: string) => void) => {
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
      // replace: true so users can't press forward to get back into the app
      // after logging out.
      navigate("/");
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
