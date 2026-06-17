import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth-token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing = null; // shared promise so concurrent 401s only call refresh once

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retried || typeof window === 'undefined') {
      return Promise.reject(error);
    }

    const storedRefreshToken = localStorage.getItem('auth-refresh-token');
    if (!storedRefreshToken) {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('auth-user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    original._retried = true;

    try {
      if (!refreshing) {
        refreshing = axios
          .post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken: storedRefreshToken })
          .then((res) => res.data)
          .finally(() => { refreshing = null; });
      }

      const data = await refreshing;
      localStorage.setItem('auth-token', data.token);
      if (data.refreshToken) localStorage.setItem('auth-refresh-token', data.refreshToken);

      original.headers.Authorization = `Bearer ${data.token}`;
      return api(original);
    } catch {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('auth-refresh-token');
      localStorage.removeItem('auth-user');
      window.location.href = '/login';
      return Promise.reject(error);
    }
  }
);

export default api;
