'use client';

import { use, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { SlidersHorizontal, X } from '@/components/ui/Icons';
import MainLayout from '@/components/layout/MainLayout';
import VirtualProductGrid from '@/components/products/VirtualProductGrid';
import { useResponsiveColumns, useCategoryBySlug, useProducts } from '@/lib/hooks';
import { formatPrice } from '@/lib/utils';
import { ProductsGridSkeleton, SubcategoriesGridSkeleton } from '@/components/products/ProductCardSkeleton';

// Inline sort utility (replaces imported sortProducts from fake-data)
function sortProducts(products, sortBy) {
  const sorted = [...products];
  switch (sortBy) {
    case 'price-asc':
      sorted.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      sorted.sort((a, b) => b.price - a.price);
      break;
    case 'name-asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      sorted.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'newest':
    default:
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
  }
  return sorted;
}

// Filter Panel Component
function FilterPanel({ filters, setFilters, priceRange, onClose, isMobile }) {
  const [localPriceRange, setLocalPriceRange] = useState(filters.priceRange);

  const handlePriceApply = () => {
    setFilters(prev => ({ ...prev, priceRange: localPriceRange }));
  };

  const handleCheckboxChange = (filterKey) => {
    setFilters(prev => ({ ...prev, [filterKey]: !prev[filterKey] }));
  };

  const clearAllFilters = () => {
    setFilters({
      priceRange: [priceRange.min, priceRange.max],
      inStock: false,
      onSale: false,
      isNew: false
    });
    setLocalPriceRange([priceRange.min, priceRange.max]);
  };

  const removeFilter = (filterKey) => {
    if (filterKey === 'priceRange') {
      setFilters(prev => ({ ...prev, priceRange: [priceRange.min, priceRange.max] }));
      setLocalPriceRange([priceRange.min, priceRange.max]);
    } else {
      setFilters(prev => ({ ...prev, [filterKey]: false }));
    }
  };

  const hasPriceFilter = filters.priceRange[0] > priceRange.min || filters.priceRange[1] < priceRange.max;

  const activeFilterCount = [
    filters.inStock,
    filters.onSale,
    filters.isNew,
    hasPriceFilter
  ].filter(Boolean).length;

  // Build active filter tags
  const activeFilterTags = [];
  if (hasPriceFilter) {
    activeFilterTags.push({ key: 'priceRange', label: `${formatPrice(filters.priceRange[0])} - ${formatPrice(filters.priceRange[1])}` });
  }
  if (filters.inStock) {
    activeFilterTags.push({ key: 'inStock', label: 'In Stock' });
  }
  if (filters.onSale) {
    activeFilterTags.push({ key: 'onSale', label: 'On Sale' });
  }
  if (filters.isNew) {
    activeFilterTags.push({ key: 'isNew', label: 'New Arrivals' });
  }

  return (
    <div className={`filters-sidebar ${isMobile ? 'mobile-filters' : ''}`}>
      <div className="filters-header">
        <h3 className="filters-title">
          Filters
          {activeFilterCount > 0 && (
            <span className="filters-count">{activeFilterCount}</span>
          )}
        </h3>
        {isMobile ? (
          <button className="filters-close-btn" onClick={onClose} aria-label="Close filters">
            <X size={20} />
          </button>
        ) : (
          activeFilterCount > 0 && (
            <button className="filters-clear" onClick={clearAllFilters}>
              Clear All
            </button>
          )
        )}
      </div>

      {/* Active Filter Tags */}
      {activeFilterTags.length > 0 && (
        <div className="active-filters">
          {activeFilterTags.map((tag) => (
            <span key={tag.key} className="filter-tag">
              {tag.label}
              <button
                className="filter-tag-remove"
                onClick={() => removeFilter(tag.key)}
                aria-label={`Remove ${tag.label} filter`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Price Range */}
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
            <input
              type="range"
              className="price-range-slider"
              min={priceRange.min}
              max={priceRange.max}
              value={localPriceRange[0]}
              onChange={(e) => setLocalPriceRange([parseInt(e.target.value), localPriceRange[1]])}
            />
          </div>
          <div className="price-input-group">
            <label className="price-input-label">Max Price</label>
            <input
              type="range"
              className="price-range-slider"
              min={priceRange.min}
              max={priceRange.max}
              value={localPriceRange[1]}
              onChange={(e) => setLocalPriceRange([localPriceRange[0], parseInt(e.target.value)])}
            />
          </div>
        </div>
        <button className="price-apply-btn" onClick={handlePriceApply}>
          Apply Price
        </button>
      </div>

      {/* Availability */}
      <div className="filter-section">
        <h4 className="filter-section-title">Availability</h4>
        <div className="filter-options">
          <label className="filter-checkbox-label">
            <input
              type="checkbox"
              className="filter-checkbox"
              checked={filters.inStock}
              onChange={() => handleCheckboxChange('inStock')}
            />
            <span className="filter-checkbox-custom"></span>
            <span className="filter-label-text">In Stock Only</span>
          </label>
        </div>
      </div>

      {/* Product Status */}
      <div className="filter-section">
        <h4 className="filter-section-title">Product Status</h4>
        <div className="filter-options">
          <label className="filter-checkbox-label">
            <input
              type="checkbox"
              className="filter-checkbox"
              checked={filters.onSale}
              onChange={() => handleCheckboxChange('onSale')}
            />
            <span className="filter-checkbox-custom"></span>
            <span className="filter-label-text">On Sale</span>
          </label>
          <label className="filter-checkbox-label">
            <input
              type="checkbox"
              className="filter-checkbox"
              checked={filters.isNew}
              onChange={() => handleCheckboxChange('isNew')}
            />
            <span className="filter-checkbox-custom"></span>
            <span className="filter-label-text">New Arrivals</span>
          </label>
        </div>
      </div>

      {/* Mobile: Clear & Apply buttons */}
      {isMobile && (
        <div className="mobile-filter-actions">
          <button className="mobile-filter-clear" onClick={clearAllFilters}>
            Clear All
          </button>
          <button className="mobile-filter-apply" onClick={onClose}>
            Show Results
          </button>
        </div>
      )}
    </div>
  );
}

// Breadcrumb Component
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
              <button
                onClick={() => onSubcategoryClick(null)}
                className="breadcrumb-link breadcrumb-btn"
              >
                {category.name}
              </button>
              <span className="breadcrumb-separator">/</span>
            </li>
            <li className="breadcrumb-item current">
              <span className="breadcrumb-current">{subcategory.name}</span>
            </li>
          </>
        ) : (
          <li className="breadcrumb-item current">
            <span className="breadcrumb-current">{category.name}</span>
          </li>
        )}
      </ol>
    </nav>
  );
}

export default function CategoryPage({ params }) {
  const columns = useResponsiveColumns();

  // Next.js 15: params is a Promise, unwrap it with use()
  const { slug } = use(params);

  // Parse the slug array to determine if we're viewing a parent or subcategory
  const slugArray = Array.isArray(slug) ? slug : [slug];
  const parentSlug = slugArray[0];
  const initialSubcategorySlug = slugArray[1] || null;

  // Fetch parent category from API (includes children array)
  const { data: categoryData, isLoading: isCategoryLoading } = useCategoryBySlug(parentSlug);
  const parentCategory = categoryData?.data || null;

  // Subcategories come from the parent category's children
  const subcategories = parentCategory?.children || [];

  // Find initial subcategory from children array
  const initialSubcategory = initialSubcategorySlug
    ? subcategories.find(c => c.slug === initialSubcategorySlug) || null
    : null;

  // Local state for selected subcategory (enables instant filtering without page reload)
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // Sync initial subcategory once category data loads
  const hasSetInitial = useRef(false);
  if (initialSubcategory && !hasSetInitial.current) {
    hasSetInitial.current = true;
    // Will be picked up on next render
  }
  const activeSubcategory = hasSetInitial.current && selectedSubcategory === null && initialSubcategory
    ? initialSubcategory
    : selectedSubcategory;

  // Build the set of all category IDs to filter products by (parent + all children)
  const categoryIds = useMemo(() => {
    if (!parentCategory) return new Set();
    const ids = new Set([parentCategory.id]);
    for (const child of subcategories) {
      ids.add(child.id);
    }
    return ids;
  }, [parentCategory, subcategories]);

  // Fetch all products (high limit) — we filter client-side by category IDs
  // because the backend only supports exact categoryId match
  const { data: productsData, isLoading: isProductsLoading } = useProducts(
    { limit: 200 },
    { enabled: categoryIds.size > 0 }
  );

  // Filter products to only those belonging to this category tree
  const allProducts = useMemo(() => {
    const products = productsData?.data || [];
    return products.filter(p => categoryIds.has(p.categoryId));
  }, [productsData, categoryIds]);

  const isLoading = isCategoryLoading || isProductsLoading;

  // Calculate price range from all products
  const priceRange = useMemo(() => {
    if (allProducts.length === 0) return { min: 0, max: 10000 };
    const prices = allProducts.map(p => p.price);
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices))
    };
  }, [allProducts]);

  // Filter and Sort state
  const [filters, setFilters] = useState({
    priceRange: [0, 10000],
    inStock: false,
    onSale: false,
    isNew: false
  });
  const [sortBy, setSortBy] = useState('newest');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Filter products based on selected subcategory and filters
  const filteredProducts = useMemo(() => {
    let result = activeSubcategory
      ? allProducts.filter(product => product.categoryId === activeSubcategory.id)
      : allProducts;

    // Apply price filter (only if user has changed from defaults)
    if (filters.priceRange[0] > priceRange.min || filters.priceRange[1] < priceRange.max) {
      result = result.filter(product =>
        product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1]
      );
    }

    // Apply stock filter
    if (filters.inStock) {
      result = result.filter(product => product.stockQuantity > 0);
    }

    // Apply sale filter
    if (filters.onSale) {
      result = result.filter(product => product.isOnSale);
    }

    // Apply new filter
    if (filters.isNew) {
      result = result.filter(product => product.isNew);
    }

    // Apply sorting
    return sortProducts(result, sortBy);
  }, [allProducts, activeSubcategory, filters, sortBy, priceRange]);

  // Count active filters
  const activeFilterCount = [
    filters.inStock,
    filters.onSale,
    filters.isNew,
    filters.priceRange[0] > priceRange.min || filters.priceRange[1] < priceRange.max
  ].filter(Boolean).length;

  // Get product counts for each subcategory
  const getSubcategoryProductCount = (subcatId) => {
    return allProducts.filter(product => product.categoryId === subcatId).length;
  };

  // Handle subcategory selection (filter-based, no page reload)
  const handleSubcategorySelect = (subcat) => {
    setSelectedSubcategory(subcat);
    hasSetInitial.current = false;

    // Update URL without page reload for bookmarkability
    const newUrl = subcat
      ? `/categories/${parentSlug}/${subcat.slug}`
      : `/categories/${parentSlug}`;
    window.history.replaceState(null, '', newUrl);
  };

  // Ref for subcategories container
  const subcategoriesRef = useRef(null);

  // Loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="category-page">
          <div className="container">
            <SubcategoriesGridSkeleton count={5} />
          </div>
          <div className="category-products">
            <div className="container">
              <ProductsGridSkeleton count={8} />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // If category not found, show 404
  if (!parentCategory) {
    return (
      <MainLayout>
        <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
          <h1>Category Not Found</h1>
          <p>The category you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>
            Go back home
          </Link>
        </div>
      </MainLayout>
    );
  }

  // If initial subcategory slug provided but not found, show 404
  if (initialSubcategorySlug && !initialSubcategory) {
    return (
      <MainLayout>
        <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
          <h1>Subcategory Not Found</h1>
          <p>The subcategory you&apos;re looking for doesn&apos;t exist.</p>
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
        {/* Breadcrumbs */}
        <div className="container">
          <Breadcrumbs
            category={parentCategory}
            subcategory={activeSubcategory}
            onSubcategoryClick={handleSubcategorySelect}
          />
        </div>

        {/* Subcategory pill tabs */}
        {subcategories.length > 0 && (
          <div className="subcategory-pills-bar">
            <div className="subcategory-pills-scroll">
              <button
                type="button"
                className={`subcategory-pill ${!activeSubcategory ? 'active' : ''}`}
                onClick={() => handleSubcategorySelect(null)}
              >
                All
              </button>
              {subcategories.map((subcat) => (
                <button
                  key={subcat.id}
                  type="button"
                  className={`subcategory-pill ${activeSubcategory?.id === subcat.id ? 'active' : ''}`}
                  onClick={() => handleSubcategorySelect(subcat)}
                >
                  {subcat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Products Section with Filters */}
        <div className="category-products">
          <div className="container">
            {/* Products Header with Filter Toggle and Sort */}
            <div className="category-products-header">
              <div className="products-header-right">
                {/* Filter Toggle Button */}
                <button
                  className="filter-toggle-btn"
                  onClick={() => setIsFilterPanelOpen(true)}
                >
                  <SlidersHorizontal size={18} />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="filter-badge">{activeFilterCount}</span>
                  )}
                </button>

                {/* Sort Dropdown */}
                <select
                  className="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                  <option value="name-desc">Name: Z to A</option>
                </select>
              </div>
            </div>


            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="products-empty">
                <p>No products found matching your filters.</p>
                <button
                  className="clear-filters-btn"
                  onClick={() => setFilters({
                    priceRange: [priceRange.min, priceRange.max],
                    inStock: false,
                    onSale: false,
                    isNew: false
                  })}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <VirtualProductGrid
                products={filteredProducts}
                columns={columns}
                rowHeight={420}
                gap={24}
              />
            )}
          </div>
        </div>

        {/* Mobile Filter Panel Overlay */}
        <div
          className={`filter-overlay ${isFilterPanelOpen ? 'active' : ''}`}
          onClick={() => setIsFilterPanelOpen(false)}
        />

        {/* Mobile Filter Panel */}
        <div className={`filter-panel-mobile ${isFilterPanelOpen ? 'active' : ''}`}>
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            priceRange={priceRange}
            onClose={() => setIsFilterPanelOpen(false)}
            isMobile={true}
          />
        </div>

      </div>
    </MainLayout>
  );
}
