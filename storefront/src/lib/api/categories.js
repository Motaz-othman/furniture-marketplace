/**
 * Categories API
 * Handles category-related API calls
 */

import { handleApiCall, get } from './client';
import {
  fakeCategories,
  getCategoryById as getFakeCategoryById,
  getCategoryBySlug as getFakeCategoryBySlug,
  getParentCategories as getFakeParentCategories,
  getSubcategories as getFakeSubcategories,
  getCategoryHierarchy as getFakeCategoryHierarchy,
} from '@/lib/fake-data';

/**
 * Get all categories
 * @returns {Promise<Array>} Categories list
 */
export async function getCategories() {
  return handleApiCall(
    // Real API call
    async () => {
      const response = await get('/categories');
      return response;
    },
    // Fake data
    () => {
      return { data: fakeCategories };
    }
  );
}

/**
 * Get category by ID
 * @param {string} id - Category ID
 * @returns {Promise<Object>} Category details
 */
export async function getCategoryById(id) {
  return handleApiCall(
    // Real API call
    async () => {
      const response = await get(`/categories/${id}`);
      return response;
    },
    // Fake data
    () => {
      const category = getFakeCategoryById(id);
      if (!category) {
        throw new Error('Category not found');
      }
      return { data: category };
    }
  );
}

/**
 * Get category by slug
 * @param {string} slug - Category slug
 * @returns {Promise<Object>} Category details
 */
export async function getCategoryBySlug(slug) {
  return handleApiCall(
    // Real API call
    async () => {
      const response = await get(`/categories/slug/${slug}`);
      return response;
    },
    // Fake data
    () => {
      const category = getFakeCategoryBySlug(slug);
      if (!category) {
        throw new Error('Category not found');
      }
      return { data: category };
    }
  );
}

/**
 * Get parent categories (top-level categories)
 * @returns {Promise<Array>} Parent categories
 */
export async function getParentCategories() {
  return handleApiCall(
    // Real API call
    async () => {
      const response = await get('/categories', { params: { parentOnly: true } });
      return response;
    },
    // Fake data
    () => {
      return { data: getFakeParentCategories() };
    }
  );
}

/**
 * Get subcategories for a parent category
 * @param {string} parentId - Parent category ID
 * @returns {Promise<Array>} Subcategories
 */
export async function getSubcategories(parentId) {
  return handleApiCall(
    // Real API call
    async () => {
      const response = await get(`/categories/${parentId}/subcategories`);
      return response;
    },
    // Fake data
    () => {
      return { data: getFakeSubcategories(parentId) };
    }
  );
}

/**
 * Get category hierarchy (category with subcategories)
 * @param {string} categoryId - Category ID
 * @returns {Promise<Object>} Category with subcategories
 */
export async function getCategoryHierarchy(categoryId) {
  return handleApiCall(
    // Real API call
    async () => {
      const response = await get(`/categories/${categoryId}/hierarchy`);
      return response;
    },
    // Fake data
    () => {
      const hierarchy = getFakeCategoryHierarchy(categoryId);
      if (!hierarchy) {
        throw new Error('Category not found');
      }
      return { data: hierarchy };
    }
  );
}