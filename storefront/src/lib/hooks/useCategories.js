/**
 * useCategories Hook
 * Fetch and manage category data with React Query
 */

import { useQuery } from '@tanstack/react-query';
import {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  getParentCategories,
  getSubcategories,
  getCategoryHierarchy,
} from '@/lib/api';

/**
 * Fetch all categories
 * @param {Object} options - React Query options
 */
export function useCategories(options = {}) {
  return useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 30 * 60 * 1000, // 30 minutes (categories don't change often)
    ...options,
  });
}

/**
 * Fetch single category by ID
 * @param {string} id - Category ID
 * @param {Object} options - React Query options
 */
export function useCategory(id, options = {}) {
  return useQuery({
    queryKey: ['category', id],
    queryFn: () => getCategoryById(id),
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch single category by slug
 * @param {string} slug - Category slug
 * @param {Object} options - React Query options
 */
export function useCategoryBySlug(slug, options = {}) {
  return useQuery({
    queryKey: ['category', 'slug', slug],
    queryFn: () => getCategoryBySlug(slug),
    enabled: !!slug,
    staleTime: 30 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch parent categories (top-level)
 * @param {Object} options - React Query options
 */
export function useParentCategories(options = {}) {
  return useQuery({
    queryKey: ['categories', 'parents'],
    queryFn: getParentCategories,
    staleTime: 30 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch subcategories for a parent
 * @param {string} parentId - Parent category ID
 * @param {Object} options - React Query options
 */
export function useSubcategories(parentId, options = {}) {
  return useQuery({
    queryKey: ['categories', 'subcategories', parentId],
    queryFn: () => getSubcategories(parentId),
    enabled: !!parentId,
    staleTime: 30 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch category hierarchy (category with subcategories)
 * @param {string} categoryId - Category ID
 * @param {Object} options - React Query options
 */
export function useCategoryHierarchy(categoryId, options = {}) {
  return useQuery({
    queryKey: ['category', 'hierarchy', categoryId],
    queryFn: () => getCategoryHierarchy(categoryId),
    enabled: !!categoryId,
    staleTime: 30 * 60 * 1000,
    ...options,
  });
}