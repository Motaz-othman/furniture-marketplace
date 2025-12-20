import api from './axios';

export const vendorService = {
  // Get vendor profile
  getProfile: async () => {
    return await api.get('/vendors/profile');
  },

  // Get vendor statistics
  getStatistics: async () => {
    return await api.get('/vendors/statistics');
  },

  // Update vendor profile
  updateProfile: async (data) => {
    return await api.put('/vendors/profile', data);
  },
};