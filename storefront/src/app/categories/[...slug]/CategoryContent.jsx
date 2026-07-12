'use client';

import { use, useState, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { SlidersHorizontal, X } from '@/components/ui/Icons';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/products/ProductCard';
import { ProductsGridSkeleton, SubcategoriesGridSkeleton } from '@/components/products/ProductCardSkeleton';
import { useInfiniteProducts, useCategoryBySlug } from '@/lib/hooks';
import { formatPrice } from '@/lib/utils';

const PAGE_SIZE = 24;

// Filter Panel Component
function FilterPanel({ filters, setFilters, onClose, isMobile }) {
  const [localPriceRange, setLocalPriceRange] = useState(filters.priceRange);

  const handlePriceApply = () => setFilters(prev => ({ ...prev, priceRange: localPriceRange }));
  const handleCheckboxChange = (key) => setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  const clearAllFilters = () => {
    const reset = { priceRange: [0, 10000], inStock: false, onSale: false, isNew: false };
    setFilters(reset);
    setLocalPriceRange([0, 10000]);
  };
  const removeFilter = (key) => {
    if (key === 'priceRange') { setFilters(prev => ({ ...prev, priceRange: [0, 10000] })); setLocalPriceRange([0, 10000]); }
    else setFilters(prev => ({ ...prev, [key]: false }));
  };

  const hasPriceFilter = filters.priceRange[0] > 0 || filters.priceRange[1] < 10000;
  const activeFilterCount = [filters.inStock, filters.onSale, filters.isNew, hasPriceFilter].filter(Boolean).length;
  const activeFilterTags = [
    hasPriceFilter && { key: 'priceRange', label: `${formatPrice(filters.priceRange[0])} – ${formatPrice(filters.priceRange[1])}` },
    filters.inStock && { key: 'inStock', label: 'In Stock' },
    filters.onSale && { key: 'onSale', label: 'On Sale' },
    filters.isNew && { key: 'isNew', label: 'New Arrivals' },
  ].filter(Boolean);

  return (
    <div className={`filters-sidebar ${isMobile ? 'mobile-filters' : ''}`}>
      <div className="filters-header">
        <h3 className="filters-title">
          Filters
          {activeFilterCount > 0 && <span className="filters-count">{activeFilterCount}</span>}
        </h3>
        {isMobile ? (
          <button className="filters-close-btn" onClick={onClose} aria-label="Close filters"><X size={20} /></button>
        ) : (
          activeFilterCount > 0 && <button className="filters-clear" onClick={clearAllFilters}>Clear All</button>
        )}
      </div>

      {activeFilterTags.length > 0 && (
        <div className="active-filters">
          {activeFilterTags.map((tag) => (
            <span key={tag.key} className="filter-tag">
              {tag.label}
              <button className="filter-tag-remove" onClick={() => removeFilter(tag.key)} aria-label={`Remove ${tag.label}`}><X size={14} /></button>
            </span>
          ))}
        </div>
      )}

      <div className="filter-section">
        <h4 className="filter-section-title">Price Range</h4>
        <div className="price-range-display">
          <span className="price-range-value">{formatPrice(localPriceRange[0])}</span>
          <span className="price-range-separator">—</span>
          <span className="price-range-value">{formatPrice(localPriceRange[1])}</span>
        </div>
        <div className="price-range-inputs">
          <div className="price-input-group">
            <label className="price-input-label">Min Price</label>
            <input type="range" className="price-range-slider" min={0} max={10000} value={localPriceRange[0]}
              onChange={(e) => setLocalPriceRange([parseInt(e.target.value), localPriceRange[1]])} />
          </div>
          <div className="price-input-group">
            <label className="price-input-label">Max Price</label>
            <input type="range" className="price-range-slider" min={0} max={10000} value={localPriceRange[1]}
              onChange={(e) => setLocalPriceRange([localPriceRange[0], parseInt(e.target.value)])} />
          </div>
        </div>
        <button className="price-apply-btn" onClick={handlePriceApply}>Apply Price</button>
      </div>

      <div className="filter-section">
        <h4 className="filter-section-title">Availability</h4>
        <div className="filter-options">
          <label className="filter-checkbox-label">
            <input type="checkbox" className="filter-checkbox" checked={filters.inStock} onChange={() => handleCheckboxChange('inStock')} />
            <span className="filter-checkbox-custom"></span>
            <span className="filter-label-text">In Stock Only</span>
          </label>
        </div>
      </div>

      <div className="filter-section">
        <h4 className="filter-section-title">Product Status</h4>
        <div className="filter-options">
          <label className="filter-checkbox-label">
            <input type="checkbox" className="filter-checkbox" checked={filters.onSale} onChange={() => handleCheckboxChange('onSale')} />
            <span className="filter-checkbox-custom"></span>
            <span className="filter-label-text">On Sale</span>
          </label>
          <label className="filter-checkbox-label">
            <input type="checkbox" className="filter-checkbox" checked={filters.isNew} onChange={() => handleCheckboxChange('isNew')} />
            <span className="filter-checkbox-custom"></span>
            <span className="filter-label-text">New Arrivals</span>
          </label>
        </div>
      </div>

      {isMobile && (
        <div className="mobile-filter-actions">
          <button className="mobile-filter-clear" onClick={clearAllFilters}>Clear All</button>
          <button className="mobile-filter-apply" onClick={onClose}>Show Results</button>
        </div>
      )}
    </div>
  );
}

function Breadcrumbs({ category, subcategory, onSubcategoryClick }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        <li className="breadcrumb-item">
          <Link href="/" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-separator">/</span>
        </li>
        {subcategory ? (
          <>
            <li className="breadcrumb-item">
              <button onClick={() => onSubcategoryClick(null)} className="breadcrumb-link breadcrumb-btn">{category.name}</button>
              <span className="breadcrumb-separator">/</span>
            </li>
            <li className="breadcrumb-item current"><span className="breadcrumb-current">{subcategory.name}</span></li>
          </>
        ) : (
          <li className="breadcrumb-item current"><span className="breadcrumb-current">{category.name}</span></li>
        )}
      </ol>
    </nav>
  );
}

export default function CategoryContent({ params }) {
  const { slug } = use(params);
  const slugArray = Array.isArray(slug) ? slug : [slug];
  const parentSlug = slugArray[0];
  const initialSubcategorySlug = slugArray[1] || null;

  const { data: categoryData, isLoading: isCategoryLoading } = useCategoryBySlug(parentSlug);
  const parentCategory = categoryData?.data || null;
  const subcategories = parentCategory?.children || [];
  const initialSubcategory = initialSubcategorySlug
    ? subcategories.find(c => c.slug === initialSubcategorySlug) || null
    : null;

  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const hasSetInitial = useRef(false);
  if (initialSubcategory && !hasSetInitial.current) hasSetInitial.current = true;
  const activeSubcategory = hasSetInitial.current && selectedSubcategory === null && initialSubcategory
    ? initialSubcategory : selectedSubcategory;

  const [filters, setFilters] = useState({ priceRange: [0, 10000], inStock: false, onSale: false, isNew: false });
  const [sortBy, setSortBy] = useState('newest');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Build categoryIds to pass to backend — active subcategory or all (parent + children)
  const categoryIds = useMemo(() => {
    if (!parentCategory) return null;
    if (activeSubcategory) return activeSubcategory.id;
    const ids = [parentCategory.id, ...subcategories.map(c => c.id)];
    return ids.join(',');
  }, [parentCategory, subcategories, activeSubcategory]);

  const {
    data,
    isLoading: isProductsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteProducts(
    {
      categoryIds,
      limit: PAGE_SIZE,
      sortBy,
      ...(filters.inStock && { inStock: 'true' }),
      ...(filters.onSale && { sale: 'true' }),
      ...(filters.isNew && { new: 'true' }),
      ...(filters.priceRange[0] > 0 && { minPrice: filters.priceRange[0] }),
      ...(filters.priceRange[1] < 10000 && { maxPrice: filters.priceRange[1] }),
    },
    { enabled: !!categoryIds }
  );

  const products = useMemo(
    () => (data?.pages ?? []).flatMap(p => p.data ?? []),
    [data]
  );
  const totalCount = data?.pages?.[0]?.pagination?.total ?? 0;

  const isLoading = isCategoryLoading || isProductsLoading;

  const activeFilterCount = [
    filters.inStock, filters.onSale, filters.isNew,
    filters.priceRange[0] > 0 || filters.priceRange[1] < 10000,
  ].filter(Boolean).length;

  const handleSubcategorySelect = useCallback((subcat) => {
    setSelectedSubcategory(subcat);
    hasSetInitial.current = false;
    const newUrl = subcat ? `/categories/${parentSlug}/${subcat.slug}` : `/categories/${parentSlug}`;
    window.history.replaceState(null, '', newUrl);
  }, [parentSlug]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="category-page">
          <div className="container"><SubcategoriesGridSkeleton count={5} /></div>
          <div className="category-products"><div className="container"><ProductsGridSkeleton count={PAGE_SIZE} /></div></div>
        </div>
      </MainLayout>
    );
  }

  if (!parentCategory) {
    return (
      <MainLayout>
        <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
          <h1>Category Not Found</h1>
          <p>The category you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>Go back home</Link>
        </div>
      </MainLayout>
    );
  }

  if (initialSubcategorySlug && !initialSubcategory) {
    return (
      <MainLayout>
        <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
          <h1>Subcategory Not Found</h1>
          <Link href={`/categories/${parentSlug}`} style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>
            View all {parentCategory.name}
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="category-page">
        <div className="container">
          <Breadcrumbs category={parentCategory} subcategory={activeSubcategory} onSubcategoryClick={handleSubcategorySelect} />
        </div>

        {subcategories.length > 0 && (
          <div className="subcategory-pills-bar">
            <div className="subcategory-pills-scroll">
              <button type="button" className={`subcategory-pill ${!activeSubcategory ? 'active' : ''}`} onClick={() => handleSubcategorySelect(null)}>
                All
              </button>
              {subcategories.map((subcat) => (
                <button key={subcat.id} type="button"
                  className={`subcategory-pill ${activeSubcategory?.id === subcat.id ? 'active' : ''}`}
                  onClick={() => handleSubcategorySelect(subcat)}>
                  {subcat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="category-products">
          <div className="container">
            <div className="category-products-header">
              <p className="category-product-count">{totalCount} product{totalCount !== 1 ? 's' : ''}</p>
              <div className="products-header-right">
                <button className="filter-toggle-btn" onClick={() => setIsFilterPanelOpen(true)}>
                  <SlidersHorizontal size={18} />
                  <span>Filters</span>
                  {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
                </button>
                <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name">Name: A to Z</option>
                </select>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="products-empty">
                <p>No products found matching your filters.</p>
                <button className="clear-filters-btn"
                  onClick={() => setFilters({ priceRange: [0, 10000], inStock: false, onSale: false, isNew: false })}>
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="products-grid">
                  {products.map((product, index) => (
                    <ProductCard key={product.id} product={product} index={index} />
                  ))}
                </div>

                {hasNextPage && (
                  <div className="load-more-container">
                    <button className="load-more-btn" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                      {isFetchingNextPage ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}

                {isFetchingNextPage && <div className="load-more-skeleton"><ProductsGridSkeleton count={PAGE_SIZE} /></div>}
              </>
            )}
          </div>
        </div>

        <div className={`filter-overlay ${isFilterPanelOpen ? 'active' : ''}`} onClick={() => setIsFilterPanelOpen(false)} />
        <div className={`filter-panel-mobile ${isFilterPanelOpen ? 'active' : ''}`}>
          <FilterPanel filters={filters} setFilters={setFilters} onClose={() => setIsFilterPanelOpen(false)} isMobile={true} />
        </div>
      </div>
    </MainLayout>
  );
}
