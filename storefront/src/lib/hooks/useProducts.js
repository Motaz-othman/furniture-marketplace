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

/**
 * Fetch all products with filters
 * @param {Object} params - Query parameters
 * @param {Object} options - React Query options
 */
export function useProducts(params = {}, options = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => getProducts(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    queryKey: ['product', id],
    queryFn: () => getProductById(id),
    enabled: !!id, // Only fetch if ID exists
    staleTime: 10 * 60 * 1000, // 10 minutes
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
    queryKey: ['product', 'slug', slug],
    queryFn: () => getProductBySlug(slug),
    enabled: !!slug, // Only fetch if slug exists
    staleTime: 10 * 60 * 1000, // 10 minutes
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
    staleTime: 10 * 60 * 1000, // 10 minutes
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
    staleTime: 10 * 60 * 1000, // 10 minutes
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
    staleTime: 10 * 60 * 1000, // 10 minutes
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
  return useQuery({
    queryKey: ['products', 'search', query, filters],
    queryFn: () => searchProducts(query, filters),
    enabled: !!query && query.length > 2, // Only search if query > 2 chars
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}