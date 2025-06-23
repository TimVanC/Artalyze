import axios from "axios";

// Automatically detect environment and use appropriate backend URL
const isStaging = window.location.hostname.includes('staging') || process.env.NODE_ENV === 'development';
const BASE_URL = isStaging 
  ? "https://artalyze-backend-staging.up.railway.app/api"
  : "https://artalyze-backend-production.up.railway.app/api";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  withCredentials: true,
});

// Attach token to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle authentication errors and redirect to login if needed
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.error("Authentication error, redirecting to login...");
      localStorage.removeItem("authToken");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
