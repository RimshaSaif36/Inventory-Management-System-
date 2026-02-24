import axios, { AxiosInstance, AxiosError, AxiosResponse } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include auth headers
axiosInstance.interceptors.request.use(
  (config) => {
    // Get user data from localStorage
    const userStr = localStorage.getItem("persist:root");
    if (userStr) {
      try {
        const persistedState = JSON.parse(userStr);
        const userState = JSON.parse(persistedState.user || "{}");
        const currentUser = userState?.currentUser;
        
        if (currentUser && currentUser.id) {
          config.headers["user-id"] = currentUser.id;
          config.headers["user-role"] = currentUser.role;
        }
      } catch (e) {
        // Ignore parsing errors
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
