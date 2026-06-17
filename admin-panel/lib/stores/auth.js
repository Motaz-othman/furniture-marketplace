import { create } from 'zustand';
import { login as loginApi } from '../services/auth';

export const useAuthStore = create((set) => ({
  token: null,
  refreshToken: null,
  user: null,
  hydrated: false,

  hydrate: () => {
    const token = localStorage.getItem('auth-token');
    const refreshToken = localStorage.getItem('auth-refresh-token');
    const user = JSON.parse(localStorage.getItem('auth-user') || 'null');
    set({ token, refreshToken, user, hydrated: true });
  },

  login: async (email, password) => {
    const data = await loginApi(email, password);
    localStorage.setItem('auth-token', data.token);
    localStorage.setItem('auth-refresh-token', data.refreshToken);
    localStorage.setItem('auth-user', JSON.stringify(data.user));
    set({ token: data.token, refreshToken: data.refreshToken, user: data.user });
    return data;
  },

  setToken: (token, refreshToken) => {
    localStorage.setItem('auth-token', token);
    if (refreshToken) localStorage.setItem('auth-refresh-token', refreshToken);
    set((s) => ({ token, refreshToken: refreshToken ?? s.refreshToken }));
  },

  logout: () => {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('auth-refresh-token');
    localStorage.removeItem('auth-user');
    set({ token: null, refreshToken: null, user: null });
  },
}));
