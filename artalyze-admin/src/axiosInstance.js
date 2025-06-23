import { BASE_URL } from "./config";
import axios from "axios";

// Configure Axios instance for admin API requests
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 120000, // 2 minutes timeout for DALL-E 3 generation
  headers: {
    "Content-Type": "application/json",
  },
});

// Add authentication token to all requests
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;
