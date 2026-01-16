/**
 * Products API
 * Handles product-related API calls
 */

import { handleApiCall, get } from './client';
import {
  // New API format functions - Using these for all 42 products
  getProductsApiFormat,
  getFeaturedProductsApiFormat,
  getNewProductsApiFormat,
  productsApiFormat,
} from '@/lib/fake-data';

/**
 * Get all products
 * @param {Object} params - Query parameters (page, limit, category, etc.)
 * @returns {Promise<Object>} Products list with pagination
 */
export async function getProducts(params = {}) {
  return handleApiCall(
    // Real API call
    async () => {
      const response = await get('/products', { params });
      return response;
    },
    // Fake data - Using API format (all 42 products)
    () => {
      // Simple pagination simulation
      const page = params.page || 1;
      const limit = params.limit || 20;
      const start = (page - 1) * limit;
      const end = start + limit;

      let products = getProductsApiFormat();

      // Filter by category if provided
      if (params.categoryId) {
        products = products.filter(p => p.categoryId === params.categoryId);
      }

      // Filter by featured
      if (params.featured === 'true') {
        products = products.filter(p => p.isFeatured);
      }

      // Filter by new
      if (params.new === 'true') {
        products = products.filter(p => p.isNew);
      }

      // Filter by sale
      if (params.sale === 'true') {
        products = products.filter(p => p.isOnSale);
      }

      // Search by name
      if (params.search) {
        const searchLower = params.search.toLowerCase();
        products = products.filter(p =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower)
        );
      }

      // Sort
      if (params.sortBy) {
        if (params.sortBy === 'price-asc') {
          products.sort((a, b) => a.price - b.price);
        } else if (params.sortBy === 'price-desc') {
          products.sort((a, b) => b.price - a.price);
        } else if (params.sortBy === 'name') {
          products.sort((a, b) => a.name.localeCompare(b.name));
        } else if (params.sortBy === 'newest') {
          products.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        }
      }

      const paginatedProducts = products.slice(start, end);

      return {
        data: paginatedProducts,
        pagination: {
          page,
          limit,
          total: products.length,
          totalPages: Math.ceil(products.length / limit),
        },
      };
    }
  );
}

/**
 * Get single product by ID
 * @param {string} id - Product ID
 * @returns {Promise<Object>} Product details
 */
export async function getProductById(id) {
  return handleApiCall(
    // Real API call
    async () => {
      const response = await get(`/products/${id}`);
      return response;
    },
    // Fake data
    () => {
      const products = getProductsApiFormat();
      const product = products.find(p => p.id === id);
      if (!product) {
        throw new Error('Product not found');
      }
      return { data: product };
    }
  );
}

/**
 * Get single product by slug
 * @param {string} slug - Product slug
 * @returns {Promise<Object>} Product details
 */
export async function getProductBySlug(slug) {
  return handleApiCall(
    // Real API call
    async () => {
      const response = await get(`/products/slug/${slug}`);
      return response;
    },
    // Fake data
    () => {
      const products = getProductsApiFormat();
      const product = products.find(p => p.slug === slug);
      if (!product) {
        throw new Error('Product not found');
      }
      return { data: product };
    }
  );
}

/**
 * Get featured products
 * @returns {Promise<Array>} Featured products
 */
export async function getFeaturedProducts() {
  return handleApiCall(
    // Real API call
    async () => {
      const response = await get('/products', { params: { featured: true } });
      return response;
    },
    // Fake data - Using API format
    () => {
      return { data: getFeaturedProductsApiFormat() };
    }
  );
}

/**
 * Get new arrivals
 * @returns {Promise<Array>} New products
 */
export async function getNewProducts() {
  return handleApiCall(
    // Real API call
    async () => {
      const response = await get('/products', { params: { new: true } });
      return response;
    },
    // Fake data - Using API format
    () => {
      return { data: getNewProductsApiFormat() };
    }
  );
}

/**
 * Get sale products
 * @returns {Promise<Array>} Sale products
 */
export async function getSaleProducts() {
  return handleApiCall(
    // Real API call
    async () => {
      const response = await get('/products', { params: { sale: true } });
      return response;
    },
    // Fake data - Using API format
    () => {
      const products = getProductsApiFormat();
      return { data: products.filter(p => p.isOnSale).slice(0, 8) };
    }
  );
}

/**
 * Search products
 * @param {string} query - Search query
 * @param {Object} filters - Additional filters
 * @returns {Promise<Object>} Search results
 */
export async function searchProducts(query, filters = {}) {
  return handleApiCall(
    // Real API call
    async () => {
      const response = await get('/products/search', {
        params: { q: query, ...filters },
      });
      return response;
    },
    // Fake data
    () => {
      return getProducts({ search: query, ...filters });
    }
  );
}