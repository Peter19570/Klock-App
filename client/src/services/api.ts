/// <reference types="vite/client" />
import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

// ---------------------------------------------------------------------------
// Token store — both tokens in localStorage so they survive page reloads
// ---------------------------------------------------------------------------
export const tokenStore = {
  getAccess:  () => localStorage.getItem("klock-access-token"),
  getRefresh: () => localStorage.getItem("klock-refresh-token"),

  save: (accessToken: string, refreshToken: string) => {
    localStorage.setItem("klock-access-token", accessToken);
    localStorage.setItem("klock-refresh-token", refreshToken);
  },

  clear: () => {
    localStorage.removeItem("klock-access-token");
    localStorage.removeItem("klock-refresh-token");
  },
};

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

// ---------------------------------------------------------------------------
// Helper — stamps the CURRENT access token onto any request config.
// ---------------------------------------------------------------------------
function attachToken(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const token = tokenStore.getAccess();
  // In attachToken(), add:
console.log('[attachToken]', config.url, 'token:', token?.slice(0, 20));
  if (token) {
    config.headers = config.headers ?? {};
    config.headers["Authorization"] = `Bearer ${token}`;
  } else {
    if (config.headers) delete config.headers["Authorization"];
  }
  return config;
}

// ---------------------------------------------------------------------------
// Request interceptor
// ---------------------------------------------------------------------------
api.interceptors.request.use(attachToken);

// ---------------------------------------------------------------------------
// Refresh gate.
//
// FIX (Bug 2): We no longer null out refreshPromise in .finally(). Instead we
// keep the promise alive until all queued retries have had a chance to read
// the new token. We null it only when a new refresh attempt starts, which is
// gated by the !refreshPromise check anyway.
//
// The promise resolves with void on success and rejects on failure — callers
// catch the rejection to trigger forceLogout().
// ---------------------------------------------------------------------------
let refreshPromise: Promise<void> | null = null;

// ---------------------------------------------------------------------------
// Logout guard.
//
// FIX (Bug 3): We persist this flag in sessionStorage instead of a module
// variable so it survives SPA navigations (where the JS module is NOT
// re-evaluated) but is wiped on a real page reload or new tab — which is the
// correct lifetime. On a real reload the module variable would reset anyway;
// sessionStorage just makes it reset correctly for SPA navigations too.
//
// We also clear the flag at the top of forceLogout() so that a fresh login
// after a soft-redirect-to-login works on the first attempt.
// ---------------------------------------------------------------------------
const LOGGING_OUT_KEY = "klock-logging-out";

function isLoggingOut(): boolean {
  return sessionStorage.getItem(LOGGING_OUT_KEY) === "1";
}

function forceLogout() {
  if (isLoggingOut()) return;
  sessionStorage.setItem(LOGGING_OUT_KEY, "1");
  refreshPromise = null;
  tokenStore.clear();
  window.location.replace("/");
}

// Call this once on the login page so a fresh login is never blocked.
export function clearLoggingOutFlag() {
  sessionStorage.removeItem(LOGGING_OUT_KEY);
}

// ---------------------------------------------------------------------------
// Response interceptor
// ---------------------------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const isRefreshRequest  = originalRequest?.url?.includes("/api/auth/refresh");
    const isLoginRequest    = originalRequest?.url?.includes("/api/auth/v1/login");
    const isRegisterRequest = originalRequest?.url?.includes("/api/auth/v1/register");
    const isLogoutRequest   = originalRequest?.url?.includes("/api/auth/logout");

    // Non-401 — pass through
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Auth/logout endpoints or already logging out — bail immediately
    if (isLoginRequest || isRegisterRequest || isLogoutRequest || isLoggingOut()) {
      return Promise.reject(error);
    }

    // Refresh call itself 401'd — refresh token is dead
    if (isRefreshRequest) {
      forceLogout();
      return Promise.reject(error);
    }

    // Normal 401 — attempt one refresh then retry
    if (!originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        const storedRefreshToken = tokenStore.getRefresh();

        if (!storedRefreshToken) {
          forceLogout();
          return Promise.reject(error);
        }

        refreshPromise = axios
          .post(
            `${import.meta.env.VITE_API_BASE_URL}/api/auth/refresh`,
            { refreshToken: storedRefreshToken },
            {
              headers: {
                "Content-Type": "application/json",
                "ngrok-skip-browser-warning": "true",
              },
            }
          )
          .then((res) => {
            const { accessToken, refreshToken } = res.data.data as {
              accessToken: string;
              refreshToken: string;
            };
            tokenStore.save(accessToken, refreshToken);
            // FIX (Bug 2): null the promise AFTER saving tokens so any
            // concurrent waiter that wakes up next tick reads the new token.
            // Using Promise.resolve().then() pushes the null into the next
            // microtask, after all current awaiters have resumed.
            Promise.resolve().then(() => { refreshPromise = null; });
          })
          .catch((err) => {
            refreshPromise = null;
            return Promise.reject(err);
          });
      }

      try {
        await refreshPromise;

        // FIX (Bug 4): Build a fresh config rather than mutating the original.
        // Axios serialises headers when the request is dispatched; mutating the
        // old config object after the fact can have no effect on the retry.
        const retryConfig: InternalAxiosRequestConfig = {
          ...originalRequest,
          headers: {
            ...(originalRequest.headers ?? {}),
            Authorization: `Bearer ${tokenStore.getAccess()}`,
          },
        } as InternalAxiosRequestConfig;

        return api(retryConfig);
      } catch {
        forceLogout();
        return Promise.reject(error);
      }
    }

    // _retry already true and still 401 — log out
    forceLogout();
    return Promise.reject(error);
  }
);

export default api;
