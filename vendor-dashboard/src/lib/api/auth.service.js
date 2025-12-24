// src/lib/api/auth.service.js
import api from './axios';

export const authService = {
  // Register
  register: async (data) => {
    const response = await api.post('/auth/register', data);
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  },

  // Login
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth/login';
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Get current user from API (for validation)
  getMe: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      // Try to get fresh user data from API
      const response = await api.get('/auth/me');
      const user = response?.user || response;
      
      // Update localStorage with fresh data
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      return user;
    } catch (error) {
      // If token is invalid, clear storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
  },

  // Check if authenticated
  isAuthenticated: () => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('token');
  },

  // Get token
  getToken: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response;
  },

  // Forgot password
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response;
  },

  // Reset password
  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', {
      token,
      newPassword,
    });
    return response;
  },

  // Get redirect path based on role
  getRedirectPath: (user) => {
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
};

export default authService;
