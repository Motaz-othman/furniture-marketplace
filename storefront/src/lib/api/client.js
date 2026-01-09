/**
 * API Client Configuration
 * Handles switching between fake data and real API
 */

import axios from 'axios';

// Check if we should use fake data
const USE_FAKE_DATA = process.env.NEXT_PUBLIC_USE_FAKE_DATA === 'true';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

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

/**
 * Response interceptor - Handle errors globally
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth/login';
      }
    }
    
    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response?.data?.message);
    }
    
    // Handle 500 Server Error
    if (error.response?.status === 500) {
      console.error('Server error:', error.response?.data?.message);
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