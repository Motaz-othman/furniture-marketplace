import api from './axios';

export const productsService = {
  // Get all vendor products
  getVendorProducts: async (params) => {
    const response = await api.get('/vendors/products', { params });
    return response.data;
  },

  // Get single product
  getProduct: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data.product || response.data;
  },

// Create product
createProduct: async (data) => {
  try {
    console.log('📤 Creating product with data:', data);
    const response = await api.post('/products', data);
    console.log('✅ Product created:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ createProduct service error:', error);
    console.error('❌ Error details:', error.details); // ← ADD THIS
    console.error('❌ Full error:', JSON.stringify(error, null, 2)); // ← ADD THIS
    throw error;
  }
},

  // Update product
  updateProduct: async (id, data) => {
    const response = await api.patch(`/products/${id}`, data);
    return response.data;
  },

  // Delete product
  deleteProduct: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  // Toggle product status (Active/Inactive)
  toggleProductStatus: async (productId) => {
    const response = await api.patch(`/products/${productId}/toggle`);
    return response.data;
  },

  // Activate product
  activateProduct: async (id) => {
    const response = await api.patch(`/products/${id}/activate`);
    return response.data;
  },

  // Deactivate product
  deactivateProduct: async (id) => {
    const response = await api.patch(`/products/${id}/deactivate`);
    return response.data;
  },
};