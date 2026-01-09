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