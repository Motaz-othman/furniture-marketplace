// Main index file for fake data
import { categories } from './categories';
import { productsApiFormat, inventoryApiFormat } from './products-api';
import { transformApiProductsToFrontend, mergeProductWithInventory } from '../utils/productTransform';

// Helper Functions

export const getParentCategories = () => {
  return categories.filter(cat => cat.parentId === null);
};

export const getSubcategories = (parentId) => {
  return categories.filter(cat => cat.parentId === parentId);
};

export const getCategoryById = (id) => {
  return categories.find(cat => cat.id === id);
};

export const getCategoryBySlug = (slug) => {
  return categories.find(cat => cat.slug === slug);
};

// Get all products in API format (transformed)
const getAllProducts = () => {
  const transformed = transformApiProductsToFrontend(productsApiFormat);
  return transformed.map(product =>
    mergeProductWithInventory(product, inventoryApiFormat)
  );
};

export const getProductsByCategory = (categoryId) => {
  const products = getAllProducts();
  return products.filter(product => product.categoryId === categoryId);
};

export const getProductsByCategorySlug = (slug) => {
  const category = getCategoryBySlug(slug);
  if (!category) return [];

  const products = getAllProducts();

  if (category.parentId === null) {
    const subcats = getSubcategories(category.id);
    const subcatIds = subcats.map(sub => sub.id);
    return products.filter(product => subcatIds.includes(product.categoryId));
  }

  return products.filter(product => product.categoryId === category.id);
};

export const getProductById = (id) => {
  const products = getAllProducts();
  return products.find(product => product.id === id);
};

export const getProductBySlug = (slug) => {
  const products = getAllProducts();
  return products.find(product => product.slug === slug);
};

export const getFeaturedProducts = (limit = 8) => {
  const products = getAllProducts();
  return products.filter(product => product.isFeatured).slice(0, limit);
};

export const getNewProducts = (limit = 8) => {
  const products = getAllProducts();
  return products.filter(product => product.isNew).slice(0, limit);
};

export const getSaleProducts = (limit = 8) => {
  const products = getAllProducts();
  return products.filter(product => product.isOnSale).slice(0, limit);
};

export const getProductsPaginated = (page = 1, limit = 12) => {
  const products = getAllProducts();
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedProducts = products.slice(start, end);

  return {
    data: paginatedProducts,
    pagination: {
      page,
      limit,
      totalCount: products.length,
      totalPages: Math.ceil(products.length / limit)
    }
  };
};

export const filterProducts = (filters = {}) => {
  const products = getAllProducts();
  let filtered = [...products];

  if (filters.categories && filters.categories.length > 0) {
    filtered = filtered.filter(product =>
      filters.categories.includes(product.categoryId)
    );
  }

  if (filters.priceRange) {
    const [min, max] = filters.priceRange;
    filtered = filtered.filter(product =>
      product.price >= min && product.price <= max
    );
  }

  if (filters.inStock) {
    filtered = filtered.filter(product => product.stockQuantity > 0);
  }

  if (filters.onSale) {
    filtered = filtered.filter(product => product.isOnSale);
  }

  if (filters.isNew) {
    filtered = filtered.filter(product => product.isNew);
  }

  return filtered;
};

export const sortProducts = (productsList, sortBy = 'newest') => {
  const sorted = [...productsList];

  switch (sortBy) {
    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price);
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case 'newest':
      return sorted.sort((a, b) => b.id - a.id);
    default:
      return sorted;
  }
};

export const searchProducts = (query) => {
  const products = getAllProducts();
  const lowerQuery = query.toLowerCase();
  return products.filter(product =>
    product.name.toLowerCase().includes(lowerQuery) ||
    product.description.toLowerCase().includes(lowerQuery) ||
    product.shortDescription?.toLowerCase().includes(lowerQuery)
  );
};

export const getRelatedProducts = (productId, limit = 4) => {
  const product = getProductById(productId);
  if (!product) return [];

  const products = getAllProducts();
  return products
    .filter(p => p.categoryId === product.categoryId && p.id !== productId)
    .slice(0, limit);
};

export const getCategoryHierarchy = (categoryId) => {
  const hierarchy = [];
  let current = getCategoryById(categoryId);

  while (current) {
    hierarchy.unshift(current);
    current = current.parentId ? getCategoryById(current.parentId) : null;
  }

  return hierarchy;
};

// API Format Functions (for testing API integration)
export const getProductsApiFormat = () => {
  // Transform API format to frontend format
  const transformed = transformApiProductsToFrontend(productsApiFormat);

  // Merge with inventory data
  return transformed.map(product =>
    mergeProductWithInventory(product, inventoryApiFormat)
  );
};

export const getFeaturedProductsApiFormat = (limit = 8) => {
  const allProducts = getProductsApiFormat();
  return allProducts.filter(p => p.isFeatured).slice(0, limit);
};

export const getNewProductsApiFormat = (limit = 8) => {
  const allProducts = getProductsApiFormat();
  return allProducts.filter(p => p.isNew).slice(0, limit);
};

// Export data arrays
export { categories, productsApiFormat, inventoryApiFormat };

// Export aliases for backwards compatibility
export const fakeCategories = categories;

// Default export
export default {
  categories,
  fakeCategories,
  getParentCategories,
  getSubcategories,
  getCategoryById,
  getCategoryBySlug,
  getProductsByCategory,
  getProductsByCategorySlug,
  getProductById,
  getProductBySlug,
  getFeaturedProducts,
  getNewProducts,
  getSaleProducts,
  getProductsPaginated,
  filterProducts,
  sortProducts,
  searchProducts,
  getRelatedProducts,
  getCategoryHierarchy,
  // API format functions
  getProductsApiFormat,
  getFeaturedProductsApiFormat,
  getNewProductsApiFormat,
  productsApiFormat,
  inventoryApiFormat
};