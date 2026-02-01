/**
 * useProducts Hook
 * Fetch and manage product data with React Query
 */

import { useQuery } from '@tanstack/react-query';
import {
  getProducts,
  getProductById,
  getProductBySlug,
  getFeaturedProducts,
  getNewProducts,
  getSaleProducts,
  searchProducts,
} from '@/lib/api';

// Stale time constants for consistency
const STALE_TIME = {
  SHORT: 5 * 60 * 1000,    // 5 minutes - for frequently changing data
  MEDIUM: 10 * 60 * 1000,  // 10 minutes - for moderately changing data
  LONG: 30 * 60 * 1000,    // 30 minutes - for rarely changing data
};

/**
 * Create stable query key from params object
 * Serializes params to avoid reference comparison issues
 */
function createProductsQueryKey(params = {}) {
  const { page, limit, sortBy, categoryId, search, ...filters } = params;
  return [
    'products',
    'list',
    page ?? 1,
    limit ?? 12,
    sortBy ?? 'newest',
    categoryId ?? null,
    search ?? null,
    // Sort filter keys for consistent ordering
    Object.keys(filters).length > 0 ? JSON.stringify(filters, Object.keys(filters).sort()) : null,
  ];
}

/**
 * Fetch all products with filters
 * @param {Object} params - Query parameters
 * @param {Object} options - React Query options
 */
export function useProducts(params = {}, options = {}) {
  return useQuery({
    queryKey: createProductsQueryKey(params),
    queryFn: () => getProducts(params),
    staleTime: STALE_TIME.SHORT,
    ...options,
  });
}

/**
 * Fetch single product by ID
 * @param {string} id - Product ID
 * @param {Object} options - React Query options
 */
export function useProduct(id, options = {}) {
  return useQuery({
    queryKey: ['products', 'detail', 'id', id],
    queryFn: () => getProductById(id),
    enabled: !!id,
    staleTime: STALE_TIME.MEDIUM,
    ...options,
  });
}

/**
 * Fetch single product by slug
 * @param {string} slug - Product slug
 * @param {Object} options - React Query options
 */
export function useProductBySlug(slug, options = {}) {
  return useQuery({
    queryKey: ['products', 'detail', 'slug', slug],
    queryFn: () => getProductBySlug(slug),
    enabled: !!slug,
    staleTime: STALE_TIME.MEDIUM,
    ...options,
  });
}

/**
 * Fetch featured products
 * @param {Object} options - React Query options
 */
export function useFeaturedProducts(options = {}) {
  return useQuery({
    queryKey: ['products', 'featured'],
    queryFn: getFeaturedProducts,
    staleTime: STALE_TIME.MEDIUM,
    ...options,
  });
}

/**
 * Fetch new arrivals
 * @param {Object} options - React Query options
 */
export function useNewProducts(options = {}) {
  return useQuery({
    queryKey: ['products', 'new'],
    queryFn: getNewProducts,
    staleTime: STALE_TIME.MEDIUM,
    ...options,
  });
}

/**
 * Fetch sale products
 * @param {Object} options - React Query options
 */
export function useSaleProducts(options = {}) {
  return useQuery({
    queryKey: ['products', 'sale'],
    queryFn: getSaleProducts,
    staleTime: STALE_TIME.SHORT, // Sale products change more frequently
    ...options,
  });
}

/**
 * Search products
 * @param {string} query - Search query
 * @param {Object} filters - Additional filters
 * @param {Object} options - React Query options
 */
export function useSearchProducts(query, filters = {}, options = {}) {
  // Create stable key from filters
  const filtersKey = Object.keys(filters).length > 0
    ? JSON.stringify(filters, Object.keys(filters).sort())
    : null;

  return useQuery({
    queryKey: ['products', 'search', query, filtersKey],
    queryFn: () => searchProducts(query, filters),
    enabled: !!query && query.length > 2,
    staleTime: STALE_TIME.SHORT,
    ...options,
  });
}