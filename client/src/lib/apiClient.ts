import axios, { AxiosInstance, AxiosError, AxiosResponse } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include auth headers
axiosInstance.interceptors.request.use(
  async (config) => {
    if (typeof window !== "undefined") {
      try {
        // Try to get token from Supabase session first
        const { getSession } = await import('./authService');
        const session = await getSession();
        
        if (session?.access_token) {
          config.headers["Authorization"] = `Bearer ${session.access_token}`;
          console.log("ApiClient - Added Authorization header with Supabase token");
        } else {
          // Fallback to Redux persisted state
          const persistedRoot = localStorage.getItem("persist:root");
          console.log("ApiClient - persist:root in localStorage:", persistedRoot);
          if (persistedRoot) {
            const parsedRoot = JSON.parse(persistedRoot);
            console.log("ApiClient - Parsed root:", parsedRoot);
            if (parsedRoot.user) {
              const userState = JSON.parse(parsedRoot.user);
              console.log("ApiClient - User state:", userState);
              const user = userState.currentUser;
              console.log("ApiClient - Current user:", user);
              if (user && user.id) {
                config.headers["user-id"] = user.id;
                config.headers["user-role"] = user.role;
                console.log("ApiClient - Added headers:", {
                  "user-id": user.id,
                  "user-role": user.role
                });
              } else {
                console.log("ApiClient - No user or user ID found");
              }
            } else {
              console.log("ApiClient - No user in parsedRoot");
            }
          } else {
            console.log("ApiClient - No persist:root found in localStorage");
          }
        }
      } catch (e) {
        console.error("Failed to add authentication headers", e);
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
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem("persist:root");
      window.location.href = "/auth/login";
    }
    return Promise.reject(error);
  }
);

export const apiClient = axiosInstance;
export default apiClient;
