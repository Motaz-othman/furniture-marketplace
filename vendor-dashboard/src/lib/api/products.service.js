// src/lib/api/products.service.js
import api from './axios';

export const productsService = {
  // Get all vendor products
  getVendorProducts: async (params) => {
    const response = await api.get('/vendors/products', { params });
    return response?.data || response;
  },

  // Get single product
  getProduct: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response?.data?.product || response?.data || response;
  },

  // Create product
  createProduct: async (data) => {
    const response = await api.post('/products', data);
    return response?.data || response;
  },

  // Update product
  updateProduct: async (id, data) => {
    const response = await api.patch(`/products/${id}`, data);
    return response?.data || response;
  },

  // Delete product
  deleteProduct: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response?.data || response;
  },

  // Toggle product status (Active/Inactive)
  toggleProductStatus: async (productId) => {
    const response = await api.patch(`/products/${productId}/toggle`);
    return response?.data || response;
  },

  // Activate product
  activateProduct: async (id) => {
    const response = await api.patch(`/products/${id}/activate`);
    return response?.data || response;
  },

  // Deactivate product
  deactivateProduct: async (id) => {
    const response = await api.patch(`/products/${id}/deactivate`);
    return response?.data || response;
  },
};

export default productsService;