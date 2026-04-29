/**
 * API - Central Export
 * Import all API functions from one place
 */

// Export API client
export { default as apiClient, isUsingFakeData, getApiUrl } from './client';

// Export products API
export {
  getProducts,
  getProductById,
  getProductBySlug,
  getFeaturedProducts,
  getNewProducts,
  getSaleProducts,
  searchProducts,
} from './products';

// Export categories API
export {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  getParentCategories,
  getSubcategories,
  getCategoryHierarchy,
} from './categories';

// Export auth API
export {
  loginUser,
  registerUser,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  deleteAccount,
  getAuthError,
} from './auth';

// Export addresses API
export {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from './addresses';

// Export orders API
export {
  getCustomerOrders,
  getOrderById,
  cancelOrder,
} from './orders';

// Export cart API
export {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from './cart';