import axios, { AxiosInstance, AxiosError, AxiosResponse } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include Supabase JWT token
axiosInstance.interceptors.request.use(
  async (config) => {
    if (typeof window !== "undefined") {
      try {
        const { getSession } = await import('./authService');
        const session = await getSession();

        if (session?.access_token) {
          config.headers["Authorization"] = `Bearer ${session.access_token}`;
        }
      } catch (e) {
        console.error("Failed to add authentication header", e);
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Don't trigger logout if we're already on an auth page (prevents login loop)
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/auth/")) {
        return Promise.reject(error);
      }
      // Clear session and redirect to login
      try {
        const { logout } = await import('./authService');
        await logout();
      } catch (_) {
        // ignore logout errors
      }
      localStorage.removeItem("persist:root");
      window.location.href = "/auth/login";
    }
    return Promise.reject(error);
  }
);

export const apiClient = axiosInstance;
export default apiClient;
