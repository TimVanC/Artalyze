import { BASE_URL } from "./config";
import axios from "axios";

// Create an instance of Axios for the Admin console
const axiosInstance = axios.create({
  baseURL: BASE_URL, // Updated to use deployed backend
  withCredentials: true, // Ensures cookies are sent if needed
  headers: {
    "Content-Type": "application/json",
  },
});

// Debug Log: Log All Outgoing Requests
axiosInstance.interceptors.request.use((config) => {
  console.log(`[Admin] Request made with URL: ${config.baseURL}${config.url}`);
  return config;
});

export default axiosInstance;
