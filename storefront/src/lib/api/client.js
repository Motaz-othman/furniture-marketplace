/**
 * API Client Configuration
 * Handles switching between fake data and real API
 */

import axios from 'axios';
import { logger } from '@/lib/logger';

// Check if we should use fake data
const USE_FAKE_DATA = process.env.NEXT_PUBLIC_USE_FAKE_DATA === 'true';
const API_URL = process.env.NEXT_PUBLIC_API_URL || (
  process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('NEXT_PUBLIC_API_URL must be set in production'); })()
    : 'http://localhost:3000/api'
);

/**
 * Create axios instance with default configuration
 */
export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - Add auth token to requests
 */
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let _refreshPromise = null;

/**
 * Response interceptor - Handle errors globally
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const original = error.config;

    // Handle 401 — try refresh once, then log out
    if (
      error.response?.status === 401 &&
      !original._retry &&
      typeof window !== 'undefined' &&
      !original.url?.includes('/auth/refresh')
    ) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        original._retry = true;
        try {
          if (!_refreshPromise) {
            _refreshPromise = axios
              .post(`${API_URL}/auth/refresh`, { refreshToken })
              .finally(() => { _refreshPromise = null; });
          }
          const { data } = await _refreshPromise;
          localStorage.setItem('token', data.token);
          if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
          original.headers = { ...original.headers, Authorization: `Bearer ${data.token}` };
          return apiClient(original);
        } catch {
          // Refresh failed — fall through to log out
        }
      }
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:logout'));
      return Promise.reject(error);
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      logger.error('Access forbidden:', error.response?.data?.error);
    }

    // Handle 500 Server Error (skip auth/me — handled by AuthContext)
    if (error.response?.status === 500) {
      const url = error.config?.url || '';
      if (!url.includes('/auth/me')) {
        logger.error('Server error:', error.response?.data?.error);
      }
    }
    
    return Promise.reject(error);
  }
);

/**
 * Check if using fake data
 */
export function isUsingFakeData() {
  return USE_FAKE_DATA;
}

/**
 * Get API base URL
 */
export function getApiUrl() {
  return API_URL;
}

/**
 * Handle API response or fake data
 * @param {Function} realApiCall - Function that calls real API
 * @param {Function} fakeDataCall - Function that returns fake data
 * @returns {Promise} Response data
 */
export async function handleApiCall(realApiCall, fakeDataCall) {
  if (USE_FAKE_DATA) {
    // Simulate network delay for realism
    await new Promise(resolve => setTimeout(resolve, 300));
    return fakeDataCall();
  }
  
  return realApiCall();
}

/**
 * Generic GET request
 */
export async function get(url, config = {}) {
  const response = await apiClient.get(url, config);
  return response.data;
}

/**
 * Generic POST request
 */
export async function post(url, data = {}, config = {}) {
  const response = await apiClient.post(url, data, config);
  return response.data;
}

/**
 * Generic PUT request
 */
export async function put(url, data = {}, config = {}) {
  const response = await apiClient.put(url, data, config);
  return response.data;
}

/**
 * Generic PATCH request
 */
export async function patch(url, data = {}, config = {}) {
  const response = await apiClient.patch(url, data, config);
  return response.data;
}

/**
 * Generic DELETE request
 */
export async function del(url, config = {}) {
  const response = await apiClient.delete(url, config);
  return response.data;
}

export default apiClient;