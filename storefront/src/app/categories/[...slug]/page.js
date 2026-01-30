'use client';

import { use, useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { getCategoryBySlug, getProductsByCategorySlug, getSubcategories, getProductsByCategory, getCategoryById, sortProducts } from '@/lib/fake-data';
import { formatPrice } from '@/lib/utils';

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

  const activeFilterCount = [
    filters.inStock,
    filters.onSale,
    filters.isNew,
    filters.priceRange[0] > priceRange.min || filters.priceRange[1] < priceRange.max
  ].filter(Boolean).length;

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

// Helper function to extract color hex from variant
function getColorFromVariant(variant) {
  if (!variant.attributes) return null;
  const colorAttr = variant.attributes.find(attr => attr.attribute === 'color');
  return colorAttr?.normalizedValues?.[0]?.hexValue || null;
}

// Product Card Component
function ProductCard({ product, index }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  // Get images for the selected variant
  const getVariantImages = (variantIndex) => {
    if (!product.variants || !product.variants[variantIndex]) return product.images;

    const variant = product.variants[variantIndex];
    const variantImages = product.images.filter(img =>
      img.variantProductIds && img.variantProductIds.includes(variant.id)
    );

    return variantImages.length > 0 ? variantImages : product.images;
  };

  const currentImages = getVariantImages(selectedVariantIndex);

  const handleAddToCart = (e) => {
    e.preventDefault();
    alert(`Added ${product.name} to cart!`);
  };

  return (
    <Link href={`/products/${product.slug}`} className="product-card">
      <div className="product-image">
        {(product.isNew || product.isOnSale) && (
          <span
            className="badge"
            style={product.isOnSale ? { background: 'var(--sale-color)', color: '#fff' } : {}}
          >
            {product.isNew ? 'New' : 'Sale'}
          </span>
        )}

        {/* Action Buttons */}
        <div className="product-actions">
          <button
            className={`action-btn wishlist-btn ${isWishlisted ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              setIsWishlisted(!isWishlisted);
            }}
            aria-label="Add to wishlist"
            title="Add to Wishlist"
          >
            <span className="action-icon">{isWishlisted ? '❤' : '♡'}</span>
          </button>

          <button
            className="action-btn add-to-cart-btn"
            onClick={handleAddToCart}
            aria-label="Add to cart"
            title="Add to Cart"
          >
            <span className="action-icon">🛒</span>
          </button>
        </div>

        <div className="product-image-wrapper">
          <img
            src={currentImages[currentImageIndex]?.imageUrl || currentImages[0]?.imageUrl}
            alt={product.name}
            className="product-img"
            loading="lazy"
          />
        </div>

        {currentImages && currentImages.length > 1 && (
          <div className="image-dots">
            {currentImages.map((_, idx) => (
              <button
                key={idx}
                className={`image-dot ${idx === currentImageIndex ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentImageIndex(idx);
                }}
                onMouseEnter={() => setCurrentImageIndex(idx)}
                aria-label={`View image ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="product-info">
        <h3>{product.name}</h3>

        {product.variants && product.variants.length > 0 && (
          <div className="color-swatches">
            {product.variants.slice(0, 3).map((variant, idx) => {
              const colorHex = getColorFromVariant(variant);

              return colorHex ? (
                <div
                  key={variant.id}
                  className={`color-swatch ${idx === selectedVariantIndex ? 'active' : ''}`}
                  style={{ background: colorHex }}
                  title={variant.variantName || variant.name}
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedVariantIndex(idx);
                    setCurrentImageIndex(0);
                  }}
                  onMouseEnter={(e) => {
                    e.preventDefault();
                    setSelectedVariantIndex(idx);
                    setCurrentImageIndex(0);
                  }}
                />
              ) : null;
            })}
          </div>
        )}

        {product.stockQuantity === 0 ? (
          <p className="stock-indicator out-of-stock">Out of Stock</p>
        ) : product.stockQuantity <= 5 ? (
          <p className="stock-indicator low-stock">Low Stock</p>
        ) : (
          <p className="stock-indicator in-stock">In Stock</p>
        )}

        <div className={`product-price ${product.compareAtPrice ? 'sale' : ''}`}>
          {product.compareAtPrice && (
            <span className="old-price">{formatPrice(product.compareAtPrice)}</span>
          )}
          {formatPrice(product.price)}
        </div>
      </div>
    </Link>
  );
}

export default function CategoryPage({ params }) {
  const router = useRouter();

  // Next.js 15: params is a Promise, unwrap it with use()
  const { slug } = use(params);

  // Parse the slug array to determine if we're viewing a parent or subcategory
  const slugArray = Array.isArray(slug) ? slug : [slug];
  const parentSlug = slugArray[0];
  const initialSubcategorySlug = slugArray[1] || null;

  // Get parent category
  const parentCategory = getCategoryBySlug(parentSlug);

  // Get subcategories for the parent category
  const subcategories = parentCategory?.parentId === null ? getSubcategories(parentCategory.id) : [];

  // Get initial subcategory from URL
  const initialSubcategory = initialSubcategorySlug ? getCategoryBySlug(initialSubcategorySlug) : null;

  // Local state for selected subcategory (enables instant filtering without page reload)
  const [selectedSubcategory, setSelectedSubcategory] = useState(initialSubcategory);

  // Get ALL products for the parent category (including subcategories)
  const allProducts = getProductsByCategorySlug(parentSlug);

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
    priceRange: [priceRange.min, priceRange.max],
    inStock: false,
    onSale: false,
    isNew: false
  });
  const [sortBy, setSortBy] = useState('newest');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Filter products based on selected subcategory and filters
  const filteredProducts = useMemo(() => {
    let result = selectedSubcategory
      ? allProducts.filter(product => product.categoryId === selectedSubcategory.id)
      : allProducts;

    // Apply price filter
    result = result.filter(product =>
      product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1]
    );

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
  }, [allProducts, selectedSubcategory, filters, sortBy]);

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

    // Update URL without page reload for bookmarkability
    const newUrl = subcat
      ? `/categories/${parentSlug}/${subcat.slug}`
      : `/categories/${parentSlug}`;
    window.history.replaceState(null, '', newUrl);
  };

  // Ref for subcategories container
  const subcategoriesRef = useRef(null);

  // If category not found, show 404
  if (!parentCategory) {
    return (
      <MainLayout>
        <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
          <h1>Category Not Found</h1>
          <p>The category you're looking for doesn't exist.</p>
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
          <p>The subcategory you're looking for doesn't exist.</p>
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
            subcategory={selectedSubcategory}
            onSubcategoryClick={handleSubcategorySelect}
          />
        </div>

        {/* Subcategories (if parent category and not viewing a specific subcategory) */}
        {subcategories.length > 0 && (
          <div className="subcategories-section">
            <div className="container">
              <div className="subcategories-grid" ref={subcategoriesRef}>
                {/* "All" filter card */}
                <button
                  type="button"
                  className={`subcategory-card ${!selectedSubcategory ? 'active' : ''}`}
                  onClick={() => handleSubcategorySelect(null)}
                >
                  <div className="subcategory-image">
                    <img src={parentCategory.imageUrl} alt={parentCategory.name} loading="lazy" />
                  </div>
                  <h3 className="subcategory-name">All {parentCategory.name}</h3>
                  <span className="subcategory-count">{allProducts.length} items</span>
                </button>

                {/* Subcategory cards */}
                {subcategories.map((subcat) => {
                  const productCount = getSubcategoryProductCount(subcat.id);
                  const isActive = selectedSubcategory?.id === subcat.id;
                  return (
                    <button
                      key={subcat.id}
                      type="button"
                      className={`subcategory-card ${isActive ? 'active' : ''}`}
                      onClick={() => handleSubcategorySelect(subcat)}
                    >
                      <div className="subcategory-image">
                        <img src={subcat.imageUrl} alt={subcat.name} loading="lazy" />
                      </div>
                      <h3 className="subcategory-name">{subcat.name}</h3>
                      <span className="subcategory-count">{productCount} items</span>
                    </button>
                  );
                })}
              </div>
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
              <div className="products-grid">
                {filteredProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
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
