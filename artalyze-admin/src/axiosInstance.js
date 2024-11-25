// artalyze-admin/src/axiosInstance.js
import axios from 'axios';

// Create an instance of Axios for the Admin console
const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000/api', // Update the baseURL if needed for your backend routes
  withCredentials: true, // Include credentials if needed
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;