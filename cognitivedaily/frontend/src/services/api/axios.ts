/**
 * Shared Axios instance for API requests.
 * Handles base URL, error interception, and (optionally) auth token injection.
 */
import axios from 'axios';

// Optionally import your auth context or token storage here
import { getAuthToken } from '@/utils/auth';
import { API_BASE_URL } from './endpoints';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Set to true if you use cookies for auth
});

// Request interceptor for auth token (uncomment and implement if needed)
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Optionally show a toast or log the error here
    // e.g., toast.error(error.response?.data?.message || 'API Error');
    return Promise.reject(error);
  }
);

export default api; 