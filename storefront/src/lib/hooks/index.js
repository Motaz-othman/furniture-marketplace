/**
 * Hooks - Central Export
 * Import all custom hooks from one place
 */

// Export product hooks
export {
    useProducts,
    useProduct,
    useProductBySlug,
    useFeaturedProducts,
    useNewProducts,
    useSaleProducts,
    useSearchProducts,
  } from './useProducts.js';
  
  // Export category hooks
  export {
    useCategories,
    useCategory,
    useCategoryBySlug,
    useParentCategories,
    useSubcategories,
    useCategoryHierarchy,
  } from './useCategories.js';

  // Export utility hooks
  export { useResponsiveColumns } from './useResponsiveColumns.js';

  // Export auth hooks
  export { useAuth } from './useAuth.js';

  // Export cart hooks
  export { useCart } from './useCart.js';

  // Export settings hooks
  export { useSettings } from './useSettings.js';