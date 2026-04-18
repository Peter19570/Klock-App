/// <reference types="vite/client" />
import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

// ---------------------------------------------------------------------------
// Token store — both tokens in localStorage so they survive page reloads
// ---------------------------------------------------------------------------
export const tokenStore = {
  getAccess: () => localStorage.getItem("klock-access-token"),
  getRefresh: () => localStorage.getItem("klock-refresh-token"),

  /** Call on login — saves both tokens */
  save: (accessToken: string, refreshToken: string) => {
    localStorage.setItem("klock-access-token", accessToken);
    localStorage.setItem("klock-refresh-token", refreshToken);
  },

  /** Call on logout — wipes both tokens */
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
// Used in both the request interceptor and the retry path so the retry
// never carries a stale/expired Authorization header.
// ---------------------------------------------------------------------------
function attachToken(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const token = tokenStore.getAccess();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers["Authorization"] = `Bearer ${token}`;
  } else {
    if (config.headers) delete config.headers["Authorization"];
  }
  return config;
}

// ---------------------------------------------------------------------------
// Request interceptor — attach Bearer token to every outgoing request
// ---------------------------------------------------------------------------
api.interceptors.request.use(attachToken);

// ---------------------------------------------------------------------------
// Single in-flight refresh gate.
// All concurrent 401s await the SAME promise — only one refresh call fires.
// ---------------------------------------------------------------------------
let refreshPromise: Promise<void> | null = null;

// ---------------------------------------------------------------------------
// Logout guard — set to true the moment we decide to log the user out.
//
// NEVER reset this flag manually. A full page navigation (window.location.*)
// reloads the JS module from scratch, which resets all module-level variables
// to their initial values automatically. Resetting it inside a setTimeout
// would re-open the refresh flow while the login page is still mounting,
// causing the "must log in twice" bug.
// ---------------------------------------------------------------------------
let isLoggingOut = false;

function forceLogout() {
  if (isLoggingOut) return;
  isLoggingOut = true;
  refreshPromise = null;
  tokenStore.clear();
  window.location.replace("/");
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

    // ── Non-401 — pass through ───────────────────────────────────────────────
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // ── Auth/logout endpoints or already logging out — bail immediately ───────
    // Logout is explicitly excluded: if the logout POST 401s (e.g. backend
    // already revoked the token), we just silently ignore it — the local
    // tokens are already cleared, so the user IS effectively logged out.
    if (isLoginRequest || isRegisterRequest || isLogoutRequest || isLoggingOut) {
      return Promise.reject(error);
    }

    // ── Refresh call itself 401'd — refresh token is dead ────────────────────
    if (isRefreshRequest) {
      forceLogout();
      return Promise.reject(error);
    }

    // ── Normal 401 — attempt one refresh then retry ───────────────────────────
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
          })
          .catch((err) => Promise.reject(err))
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        await refreshPromise;
        // Re-stamp the NEW access token — originalRequest still has the old
        // expired Bearer baked in from when it originally fired.
        attachToken(originalRequest);
        return api(originalRequest);
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
