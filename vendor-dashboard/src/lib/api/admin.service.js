// src/lib/api/admin.service.js
import api from './axios';

export const adminService = {
  // ============================================
  // DASHBOARD & STATS
  // ============================================
  
  // Get platform-wide statistics
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response;
  },

  // Get revenue chart data (last 12 months)
  getRevenueChart: async () => {
    const response = await api.get('/admin/revenue-chart');
    return response;
  },

  // Get recent activity for dashboard
  getRecentActivity: async () => {
    const response = await api.get('/admin/recent-activity');
    return response;
  },

  // ============================================
  // USER MANAGEMENT
  // ============================================
  
  // Get all users with filters
  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response;
  },

  // Get single user details
  getUser: async (id) => {
    const response = await api.get(`/admin/users/${id}`);
    return response;
  },

  // Update user
  updateUser: async (id, data) => {
    const response = await api.patch(`/admin/users/${id}`, data);
    return response;
  },

  // Delete user
  deleteUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response;
  },

  // ============================================
  // VENDOR MANAGEMENT
  // ============================================
  
  // Get all vendors with filters
  getVendors: async (params = {}) => {
    const response = await api.get('/admin/vendors', { params });
    return response;
  },

  // Get vendor details
  getVendor: async (id) => {
    const response = await api.get(`/admin/vendors/${id}`);
    return response;
  },

  // Update vendor status (PENDING, APPROVED, VERIFIED)
  updateVendorStatus: async (id, status) => {
    const response = await api.patch(`/admin/vendors/${id}/status`, { status });
    return response;
  },

  // Update vendor admin rating
  updateVendorRating: async (id, adminRating) => {
    const response = await api.patch(`/admin/vendors/${id}/rating`, { adminRating });
    return response;
  },

  // Update vendor commission rate
  updateVendorCommission: async (id, commissionRate) => {
    const response = await api.patch(`/admin/vendors/${id}/commission`, { commissionRate });
    return response;
  },

  // Verify vendor (backwards compatibility)
  verifyVendor: async (id) => {
    const response = await api.patch(`/admin/vendors/${id}/verify`);
    return response;
  },

  // Unverify vendor (backwards compatibility)
  unverifyVendor: async (id) => {
    const response = await api.patch(`/admin/vendors/${id}/unverify`);
    return response;
  },

  // ============================================
  // ORDER MANAGEMENT
  // ============================================
  
  // Get all orders with filters
  getOrders: async (params = {}) => {
    const response = await api.get('/admin/orders', { params });
    return response;
  },

  // Get order details
  getOrder: async (id) => {
    const response = await api.get(`/admin/orders/${id}`);
    return response;
  },

  // Update order status
  updateOrderStatus: async (id, status, note) => {
    const response = await api.patch(`/admin/orders/${id}/status`, { status, note });
    return response;
  },

  // ============================================
  // PRODUCT MANAGEMENT
  // ============================================
  
  // Get all products with filters
  getProducts: async (params = {}) => {
    const response = await api.get('/admin/products', { params });
    return response;
  },

  // Toggle product active status
  toggleProductActive: async (id) => {
    const response = await api.patch(`/admin/products/${id}/toggle`);
    return response;
  },

  // Delete product
  deleteProduct: async (id) => {
    const response = await api.delete(`/admin/products/${id}`);
    return response;
  },

  // ============================================
  // CATEGORIES (using admin endpoint for product count)
  // ============================================
  
  // Get all categories with product count
  getCategories: async () => {
    const response = await api.get('/admin/categories');
    return response;
  },

  // Create category
  createCategory: async (data) => {
    const response = await api.post('/categories', data);
    return response;
  },

  // Update category
  updateCategory: async (id, data) => {
    const response = await api.put(`/categories/${id}`, data);
    return response;
  },

  // Delete category
  deleteCategory: async (id) => {
    const response = await api.delete(`/categories/${id}`);
    return response;
  },
};

export default adminService;