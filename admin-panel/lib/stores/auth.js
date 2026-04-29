import { create } from 'zustand';
import { login as loginApi } from '../services/auth';

export const useAuthStore = create((set) => ({
  token: null,
  user: null,
  hydrated: false,

  hydrate: () => {
    const token = localStorage.getItem('auth-token');
    const user = JSON.parse(localStorage.getItem('auth-user') || 'null');
    set({ token, user, hydrated: true });
  },

  login: async (email, password) => {
    const data = await loginApi(email, password);
    localStorage.setItem('auth-token', data.token);
    localStorage.setItem('auth-user', JSON.stringify(data.user));
    set({ token: data.token, user: data.user });
    return data;
  },

  logout: () => {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('auth-user');
    set({ token: null, user: null });
  },
}));
