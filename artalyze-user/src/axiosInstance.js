import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:5000/api", // Correct baseURL
  headers: {
    "Content-Type": "application/json",
  },
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

// Handle potential authentication errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.error("Authentication error, redirecting to login...");
      // Add logic to redirect to login or clear token
      localStorage.removeItem("authToken"); // Optionally remove the token
      window.location.href = "/login"; // Redirect to login page
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
