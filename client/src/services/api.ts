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
// ---------------------------------------------------------------------------
let refreshPromise: Promise<void> | null = null;

// ---------------------------------------------------------------------------
// Logout guard.
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

    // ── FIXED: updated to new API paths ──
    const isRefreshRequest  = originalRequest?.url?.includes("/api/v1/auth/refresh");
    const isLoginRequest    = originalRequest?.url?.includes("/api/v1/auth/login");
    const isRegisterRequest = originalRequest?.url?.includes("/api/v1/auth/register");
    const isLogoutRequest   = originalRequest?.url?.includes("/api/v1/auth/logout");

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (isLoginRequest || isRegisterRequest || isLogoutRequest || isLoggingOut()) {
      return Promise.reject(error);
    }

    if (isRefreshRequest) {
      forceLogout();
      return Promise.reject(error);
    }

    if (!originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        const storedRefreshToken = tokenStore.getRefresh();

        if (!storedRefreshToken) {
          forceLogout();
          return Promise.reject(error);
        }

        // ── FIXED: /api/v1/auth/refresh ──
        refreshPromise = axios
          .post(
            `${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/refresh`,
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
            Promise.resolve().then(() => { refreshPromise = null; });
          })
          .catch((err) => {
            refreshPromise = null;
            return Promise.reject(err);
          });
      }

      try {
        await refreshPromise;

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

    forceLogout();
    return Promise.reject(error);
  }
);

export default api;
