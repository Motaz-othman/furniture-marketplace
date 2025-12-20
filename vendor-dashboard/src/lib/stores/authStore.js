import { create } from 'zustand';
import { authService } from '../api/auth.service';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // Initialize auth state
  initialize: () => {
    const user = authService.getCurrentUser();
    const isAuthenticated = authService.isAuthenticated();
    set({ user, isAuthenticated, isLoading: false });
  },

  // Login
  login: async (email, password) => {
    const response = await authService.login(email, password);
    set({ user: response.user, isAuthenticated: true });
    return response;
  },

  // Register
  register: async (data) => {
    const response = await authService.register(data);
    set({ user: response.user, isAuthenticated: true });
    return response;
  },

  // Logout
  logout: () => {
    authService.logout();
    set({ user: null, isAuthenticated: false });
  },
}));