'use client';

import { useState, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import FilterModal from '@/components/products/FilterModal';
import ProductCard from '@/components/products/ProductCard';
import { ProductsGridSkeleton } from '@/components/products/ProductCardSkeleton';
import { useProducts, useCategories } from '@/lib/hooks';

const DEFAULT_FILTERS = {
  categories: [],
  subcategories: [],
  priceRange: [0, 5000],
  availability: null
};

function parseFiltersFromParams(params) {
  return {
    categories: params.get('categories') ? params.get('categories').split(',') : [],
    subcategories: params.get('subcategories') ? params.get('subcategories').split(',') : [],
    priceRange: [
      parseInt(params.get('minPrice') || '0'),
      parseInt(params.get('maxPrice') || '5000'),
    ],
    availability: params.get('availability') || null,
  };
}

function filtersToParams(filters, sort, page) {
  const p = new URLSearchParams();
  if (filters.categories.length) p.set('categories', filters.categories.join(','));
  if (filters.subcategories.length) p.set('subcategories', filters.subcategories.join(','));
  if (filters.priceRange[0] > 0) p.set('minPrice', filters.priceRange[0]);
  if (filters.priceRange[1] < 5000) p.set('maxPrice', filters.priceRange[1]);
  if (filters.availability) p.set('availability', filters.availability);
  if (sort !== 'newest') p.set('sort', sort);
  if (page > 1) p.set('page', page);
  return p.toString();
}

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState('grid');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const filters = useMemo(() => parseFiltersFromParams(searchParams), [searchParams]);
  const sortBy = searchParams.get('sort') || 'newest';
  const currentPage = parseInt(searchParams.get('page') || '1');

  // Fetch products and categories
  const { data, isLoading } = useProducts({
    page: currentPage,
    limit: 12,
    sortBy: sortBy,
  });
  const { data: categoriesData } = useCategories();

  const products = data?.data || [];
  const totalPages = data?.pagination?.totalPages || 1;
  const allCategories = categoriesData?.data || [];

  // Memoize subcategory lookup map for O(1) access
  const subcategoryMap = useMemo(() => {
    const map = new Map();
    allCategories.forEach(cat => {
      if (cat.parentId) {
        if (!map.has(cat.parentId)) {
          map.set(cat.parentId, []);
        }
        map.get(cat.parentId).push(cat.id);
      }
    });
    return map;
  }, [allCategories]);

  // Memoize filtered products to avoid recalculation on every render
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const productCategoryId = product.categoryId;

      // Category filter (parent categories)
      if (filters.categories.length > 0) {
        const matchesCategory = filters.categories.some(parentCatId => {
          const subcategoryIds = subcategoryMap.get(parentCatId) || [];
          return productCategoryId === parentCatId || subcategoryIds.includes(productCategoryId);
        });

        if (!matchesCategory) {
          return false;
        }
      }

      // Subcategory filter (specific subcategories)
      if (filters.subcategories.length > 0) {
        if (!filters.subcategories.includes(productCategoryId)) {
          return false;
        }
      }

      // Price range filter
      if (product.price < filters.priceRange[0] || product.price > filters.priceRange[1]) {
        return false;
      }

      // Availability filter
      if (filters.availability === 'in-stock' && product.stockQuantity === 0) {
        return false;
      }
      if (filters.availability === 'on-sale' && !product.isOnSale) {
        return false;
      }

      return true;
    });
  }, [products, filters, subcategoryMap]);

  const pushParams = useCallback((newFilters, newSort, newPage) => {
    const qs = filtersToParams(newFilters, newSort, newPage);
    router.push(`/products${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [router]);

  const handleFilterChange = useCallback((newFilters) => {
    pushParams(newFilters, sortBy, 1);
  }, [pushParams, sortBy]);

  const handleClearFilters = useCallback(() => {
    router.push('/products', { scroll: false });
  }, [router]);

  const openFilterModal = useCallback(() => setIsFilterModalOpen(true), []);
  const closeFilterModal = useCallback(() => setIsFilterModalOpen(false), []);

  const handleSortChange = useCallback((e) => pushParams(filters, e.target.value, 1), [pushParams, filters]);
  const setGridView = useCallback(() => setViewMode('grid'), []);
  const setListView = useCallback(() => setViewMode('list'), []);

  const goToPrevPage = useCallback(() => pushParams(filters, sortBy, Math.max(1, currentPage - 1)), [pushParams, filters, sortBy, currentPage]);
  const goToNextPage = useCallback(() => pushParams(filters, sortBy, Math.min(totalPages, currentPage + 1)), [pushParams, filters, sortBy, currentPage, totalPages]);
  const goToPage = useCallback((page) => pushParams(filters, sortBy, page), [pushParams, filters, sortBy]);

  const activeFiltersCount = useMemo(() => (
    (filters.categories?.length || 0) +
    (filters.subcategories?.length || 0) +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 5000 ? 1 : 0) +
    (filters.availability ? 1 : 0)
  ), [filters]);


  return (
    <MainLayout>
      <div className="products-page">
        <div className="products-container">
          {/* Page Header */}
          <div className="products-header">
            <div className="products-header-left">
              <h1 className="products-title">Our Collection</h1>
              <p className="products-subtitle">Handpicked furniture for every room</p>
            </div>

            <div className="products-header-right">
              {/* Filter Button */}
              <button
                className="filter-toggle-btn"
                onClick={openFilterModal}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="6" x2="20" y2="6"/>
                  <line x1="4" y1="12" x2="20" y2="12"/>
                  <line x1="4" y1="18" x2="20" y2="18"/>
                  <circle cx="7" cy="6" r="2" fill="currentColor"/>
                  <circle cx="14" cy="12" r="2" fill="currentColor"/>
                  <circle cx="17" cy="18" r="2" fill="currentColor"/>
                </svg>
                Filters
                {activeFiltersCount > 0 && (
                  <span className="filter-badge">{activeFiltersCount}</span>
                )}
              </button>

              {/* View Toggle */}
              <div className="view-toggle">
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={setGridView}
                  aria-label="Grid view"
                >
                  ▦
                </button>
                <button
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={setListView}
                  aria-label="List view"
                >
                  ☰
                </button>
              </div>

              {/* Sort Dropdown */}
              <select
                className="sort-select"
                value={sortBy}
                onChange={handleSortChange}
              >
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name: A to Z</option>
              </select>
            </div>
          </div>

          {/* Filter Modal */}
          <FilterModal
            isOpen={isFilterModalOpen}
            onClose={closeFilterModal}
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
          />

          {/* Products Grid/List (No sidebar) */}
          <main className="products-main-full">
              {isLoading ? (
                <ProductsGridSkeleton count={12} />
              ) : filteredProducts.length === 0 ? (
                <div className="products-empty">
                  <p>No products found matching your filters</p>
                  <button 
                    className="clear-filters-btn"
                    onClick={handleClearFilters}
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <>
                  <div className={`products-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
                    {filteredProducts.map((product, index) => (
                      <ProductCard key={product.id} product={product} index={index} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button
                        className="pagination-btn"
                        onClick={goToPrevPage}
                        disabled={currentPage === 1}
                      >
                        ← Previous
                      </button>

                      <div className="pagination-numbers">
                        {[...Array(totalPages)].map((_, idx) => (
                          <button
                            key={idx + 1}
                            className={`pagination-number ${currentPage === idx + 1 ? 'active' : ''}`}
                            onClick={() => goToPage(idx + 1)}
                          >
                            {idx + 1}
                          </button>
                        ))}
                      </div>

                      <button
                        className="pagination-btn"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </main>
        </div>
      </div>
    </MainLayout>
  );
}
export default function ProductsPage() {
  return (
    <Suspense fallback={<MainLayout><div className="products-page"><ProductsGridSkeleton /></div></MainLayout>}>
      <ProductsContent />
    </Suspense>
  );
}
