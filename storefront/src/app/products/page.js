'use client';

import { useState, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import FilterModal from '@/components/products/FilterModal';
import ProductCard from '@/components/products/ProductCard';
import { ProductsGridSkeleton } from '@/components/products/ProductCardSkeleton';
import { useInfiniteProducts, useCategories } from '@/lib/hooks';

const PAGE_SIZE = 24;

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

function filtersToParams(filters, sort, search) {
  const p = new URLSearchParams();
  if (search) p.set('search', search);
  if (filters.categories.length) p.set('categories', filters.categories.join(','));
  if (filters.subcategories.length) p.set('subcategories', filters.subcategories.join(','));
  if (filters.priceRange[0] > 0) p.set('minPrice', filters.priceRange[0]);
  if (filters.priceRange[1] < 5000) p.set('maxPrice', filters.priceRange[1]);
  if (filters.availability) p.set('availability', filters.availability);
  if (sort !== 'newest') p.set('sort', sort);
  return p.toString();
}

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState('grid');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const filters = useMemo(() => parseFiltersFromParams(searchParams), [searchParams]);
  const sortBy = searchParams.get('sort') || 'newest';
  const searchQuery = searchParams.get('search') || '';

  const { data: categoriesData } = useCategories();
  const allCategories = categoriesData?.data || [];

  const subcategoryMap = useMemo(() => {
    const map = new Map();
    allCategories.forEach(cat => {
      if (cat.parentId) {
        if (!map.has(cat.parentId)) map.set(cat.parentId, []);
        map.get(cat.parentId).push(cat.id);
      }
    });
    return map;
  }, [allCategories]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteProducts({
    limit: PAGE_SIZE,
    sortBy,
    search: searchQuery || undefined,
  });

  const allProducts = useMemo(
    () => (data?.pages ?? []).flatMap(p => p.data ?? []),
    [data]
  );

  const totalHits = data?.pages?.[0]?.pagination?.total ?? 0;

  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      const productCategoryId = product.categoryId;

      if (filters.categories.length > 0) {
        const matchesCategory = filters.categories.some(parentCatId => {
          const subcategoryIds = subcategoryMap.get(parentCatId) || [];
          return productCategoryId === parentCatId || subcategoryIds.includes(productCategoryId);
        });
        if (!matchesCategory) return false;
      }

      if (filters.subcategories.length > 0) {
        if (!filters.subcategories.includes(productCategoryId)) return false;
      }

      if (product.price < filters.priceRange[0] || product.price > filters.priceRange[1]) return false;

      if (filters.availability === 'in-stock' && product.stockQuantity === 0) return false;
      if (filters.availability === 'on-sale' && !product.isOnSale) return false;

      return true;
    });
  }, [allProducts, filters, subcategoryMap]);

  const pushParams = useCallback((newFilters, newSort) => {
    const qs = filtersToParams(newFilters, newSort, searchQuery);
    router.push(`/products${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [router, searchQuery]);

  const handleFilterChange = useCallback((newFilters) => {
    pushParams(newFilters, sortBy);
  }, [pushParams, sortBy]);

  const handleClearFilters = useCallback(() => {
    router.push('/products', { scroll: false });
  }, [router]);

  const handleSortChange = useCallback((e) => pushParams(filters, e.target.value), [pushParams, filters]);
  const setGridView = useCallback(() => setViewMode('grid'), []);
  const setListView = useCallback(() => setViewMode('list'), []);

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
          <div className="products-header">
            <div className="products-header-left">
              <h1 className="products-title">
                {searchQuery ? `Results for "${searchQuery}"` : 'Our Collection'}
              </h1>
              <p className="products-subtitle">
                {searchQuery
                  ? `${totalHits} product${totalHits === 1 ? '' : 's'} found`
                  : 'Handpicked furniture for every room'}
              </p>
            </div>

            <div className="products-header-right">
              <button className="filter-toggle-btn" onClick={() => setIsFilterModalOpen(true)}>
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

              <div className="view-toggle">
                <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={setGridView} aria-label="Grid view">▦</button>
                <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={setListView} aria-label="List view">☰</button>
              </div>

              <select className="sort-select" value={sortBy} onChange={handleSortChange}>
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name: A to Z</option>
              </select>
            </div>
          </div>

          <FilterModal
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
          />

          <main className="products-main-full">
            {isLoading ? (
              <ProductsGridSkeleton count={PAGE_SIZE} />
            ) : filteredProducts.length === 0 ? (
              <div className="products-empty">
                <p>No products found matching your filters</p>
                <button className="clear-filters-btn" onClick={handleClearFilters}>
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

                {hasNextPage && (
                  <div className="load-more-container">
                    <button
                      className="load-more-btn"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}

                {isFetchingNextPage && (
                  <div className="load-more-skeleton">
                    <ProductsGridSkeleton count={PAGE_SIZE} />
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
