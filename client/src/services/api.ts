/// <reference types="vite/client" />
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    'ngrok-skip-browser-warning': 'true',
  },
});

// Single in-flight refresh gate — prevents double-refresh race
let refreshPromise: Promise<void> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isRefreshRequest = originalRequest?.url?.includes("/api/auth/refresh");
    const isLoginRequest = originalRequest?.url?.includes("/api/auth/v1/login");
    const isRegisterRequest = originalRequest?.url?.includes("/api/auth/v1/register");

    // If we are on the landing page or trying to auth, don't attempt refresh
    if (error.response?.status === 401 && (isLoginRequest || isRegisterRequest || window.location.pathname === "/")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && isRefreshRequest) {
      refreshPromise = null;
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
      return Promise.reject(error);
    }

    // For any other 401, attempt one token refresh then retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = axios
          .post(
            `${import.meta.env.VITE_API_BASE_URL}/api/auth/refresh`,
            {},
            { withCredentials: true }
          )
          .then(() => {
            // success — nothing to return, cookie is updated server-side
          })
          .catch((err) => {
            // propagate so the awaiter below rejects too
            return Promise.reject(err);
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        await refreshPromise;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — send user to login
        if (window.location.pathname !== "/") {
          window.location.replace("/");
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
