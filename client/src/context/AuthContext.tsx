import * as React from "react";
import api, { tokenStore, clearLoggingOutFlag } from "@/services/api";
import type { UserDetailResponse, AuthRequest } from "@/types";

// ── Device registration helpers ───────────────────────────────────────────────

/**
 * Returns the same stable device ID used by useAutoClockIn (klock_device_id).
 * Generates a SHA-256 fingerprint from browser info on first call.
 */
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

/**
 * Returns true if the user has no device registered yet.
 * The backend sets deviceId to the string "not set" when unregistered,
 * but we also guard against null/undefined for safety.
 */
function deviceIsUnset(deviceId: UserDetailResponse["deviceId"]): boolean {
  return deviceId == null || deviceId === "NOT SET";
}

/**
 * Only registers the device if the user's deviceId is unset.
 * Fires silently in the background — non-fatal if it fails.
 * Shows a brief browser notification on success if permission is granted.
 */
async function registerDeviceIfNeeded(userData: UserDetailResponse): Promise<void> {
  if (!deviceIsUnset(userData.deviceId)) return;
  try {
    const deviceId = await getDeviceId();
    await api.post("/api/v1/auth/device", { deviceId });
    // Optional: non-disruptive success notification via the Notifications API
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Klock", { body: "Device registered successfully.", silent: true });
    }
  } catch (err) {
    console.warn("Device registration failed (non-fatal):", err);
  }
}

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

  const login = async (data: AuthRequest) => {
    const res = await api.post<{ data: { accessToken: string; refreshToken: string } }>(
      "/api/v1/auth/login",
      data
    );
    const { accessToken, refreshToken } = res.data.data;
    tokenStore.save(accessToken, refreshToken);
    const userData = await fetchUser();
    if (userData) {
      await registerDeviceIfNeeded(userData);
      handleHardRedirect(userData);
    }
  };

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
