// src/lib/api/vendor.service.js
import api from './axios';

export const vendorService = {
  // Get vendor profile
  getProfile: async () => {
    const response = await api.get('/vendors/profile');
    return response?.data || response;
  },

  // Get vendor statistics (simple - for dashboard)
  getStatistics: async () => {
    const response = await api.get('/vendors/statistics');
    return response?.data || response;
  },

  // Get vendor stats (detailed - for earnings page)
  getStats: async () => {
    const response = await api.get('/vendors/stats');
    return response?.data || response;
  },

  // Update vendor profile
  updateProfile: async (data) => {
    const response = await api.patch('/vendors/profile', data);
    return response?.data || response;
  },

  // Get Stripe connect status
  getStripeStatus: async () => {
    const response = await api.get('/vendors/connect/status');
    return response?.data || response;
  },

  // Connect Stripe account
  connectStripe: async () => {
    const response = await api.post('/vendors/connect/stripe');
    return response?.data || response;
  },

  // Disconnect Stripe account
  disconnectStripe: async () => {
    const response = await api.delete('/vendors/connect/stripe');
    return response?.data || response;
  },

  // Get Stripe dashboard link
  getStripeDashboard: async () => {
    const response = await api.get('/vendors/connect/dashboard');
    return response?.data || response;
  },
};

export default vendorService;