import api from './axios';

export const variantsService = {
  // Get all variants for a product
  getProductVariants: async (productId) => {
    return await api.get(`/products/${productId}/variants`);
  },

  // Create variant
  createVariant: async (productId, data) => {
    return await api.post(`/products/${productId}/variants`, data);
  },

  // Update variant
  updateVariant: async (variantId, data) => {
    return await api.put(`/variants/${variantId}`, data);
  },

  // Delete variant
  deleteVariant: async (variantId) => {
    return await api.delete(`/variants/${variantId}`);
  },
};