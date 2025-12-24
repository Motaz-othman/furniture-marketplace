// src/lib/stores/authStore.js
import { create } from 'zustand';
import { authService } from '@/lib/api/auth.service';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  // Initialize auth state from localStorage
  initialize: () => {
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ 
          user, 
          token, 
          isAuthenticated: true,
          isLoading: false 
        });
      } catch (e) {
        // Invalid user data, clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false,
          isLoading: false 
        });
      }
    } else {
      set({ isLoading: false });
    }
  },

  // Login
  login: async (email, password) => {
    const response = await authService.login(email, password);
    const user = response.user;
    const token = response.token;
    
    set({ 
      user, 
      token, 
      isAuthenticated: true,
      isLoading: false 
    });
    
    return response;  // ← THIS IS THE KEY LINE
  },

  // Register
  register: async (data) => {
    const response = await authService.register(data);
    const user = response.user;
    const token = response.token;
    
    set({ 
      user, 
      token, 
      isAuthenticated: true,
      isLoading: false 
    });
    
    return response;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ 
      user: null, 
      token: null, 
      isAuthenticated: false 
    });
    window.location.href = '/auth/login';
  },

  // Update user in store (after profile update, etc.)
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  // Check if user has specific role
  hasRole: (role) => {
    const { user } = get();
    return user?.role === role;
  },

  // Check if user is admin
  isAdmin: () => {
    const { user } = get();
    return user?.role === 'ADMIN';
  },

  // Check if user is vendor
  isVendor: () => {
    const { user } = get();
    return user?.role === 'VENDOR';
  },

  // Check if user is customer
  isCustomer: () => {
    const { user } = get();
    return user?.role === 'CUSTOMER';
  },

  // Get redirect path based on role
  getRedirectPath: () => {
    const { user } = get();
    if (!user) return '/auth/login';
    
    switch (user.role) {
      case 'ADMIN':
        return '/admin';
      case 'VENDOR':
        return '/dashboard';
      case 'CUSTOMER':
        return '/account';
      default:
        return '/';
    }
  },

  // Refresh user data from API
  refreshUser: async () => {
    try {
      const user = await authService.getMe();
      if (user) {
        set({ user, isAuthenticated: true });
        return user;
      } else {
        set({ user: null, token: null, isAuthenticated: false });
        return null;
      }
    } catch (error) {
      set({ user: null, token: null, isAuthenticated: false });
      return null;
    }
  },
}));