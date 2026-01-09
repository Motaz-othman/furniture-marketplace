'use client';

import { useState } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import FiltersSidebar from '@/components/products/FiltersSidebar';
import { useProducts } from '@/lib/hooks';
import { formatPrice } from '@/lib/utils';

export default function ProductsPage() {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    categories: [],
    priceRange: [0, 5000],
  });

  // Fetch products
  const { data, isLoading } = useProducts({
    page: currentPage,
    limit: 12,
    sortBy: sortBy,
  });

  const products = data?.data || [];
  const totalPages = data?.pagination?.totalPages || 1;

  // Filter products based on selected filters
  const filteredProducts = products.filter(product => {
    // Category filter
    if (filters.categories.length > 0) {
      const productCategoryId = typeof product.category === 'object' 
        ? product.category.id 
        : product.categoryId;
      if (!filters.categories.includes(productCategoryId)) {
        return false;
      }
    }

    // Price range filter
    if (product.price < filters.priceRange[0] || product.price > filters.priceRange[1]) {
      return false;
    }

    return true;
  });

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilters({
      categories: [],
      priceRange: [0, 5000],
    });
    setCurrentPage(1);
  };

  return (
    <MainLayout>
      <div className="products-page">
        <div className="products-container">
          {/* Page Header */}
          <div className="products-header">
            <div className="products-header-left">
              <h1 className="products-title">All Products</h1>
              <p className="products-count">
                {isLoading ? 'Loading...' : `${filteredProducts.length} products`}
              </p>
            </div>
            
            <div className="products-header-right">
              {/* View Toggle */}
              <div className="view-toggle">
                <button 
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  ▦
                </button>
                <button 
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  ☰
                </button>
              </div>

              {/* Sort Dropdown */}
              <select 
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name: A to Z</option>
              </select>
            </div>
          </div>

          <div className="products-layout">
            {/* Filters Sidebar */}
            <aside className="products-sidebar">
              <FiltersSidebar 
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
              />
            </aside>

            {/* Products Grid/List */}
            <main className="products-main">
              {isLoading ? (
                <div className="products-loading">
                  <p>Loading products...</p>
                </div>
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
                    {filteredProducts.map((product) => (
                      <Link 
                        key={product.id} 
                        href={`/products/${product.slug}`}
                        className="product-card-wrapper"
                      >
                        {/* Product Card */}
                        <div className="product-card-listing">
                          {/* Image */}
                          <div className="product-image-listing">
                            <img 
                              src={product.images[0]?.imageUrl} 
                              alt={product.name}
                            />
                            
                            {/* Badge */}
                            {(product.isNew || product.isOnSale) && (
                              <span className={`badge-listing ${product.isOnSale ? 'sale' : ''}`}>
                                {product.isNew ? 'New' : product.isOnSale ? 'Sale' : ''}
                              </span>
                            )}

                            {/* Add to Cart Overlay - Grid View Only */}
                            {viewMode === 'grid' && (
                              <div className="add-to-cart-overlay">
                                <button className="add-to-cart-btn-grid">
                                  Add to Cart
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="product-info-listing">
                            <h3 className="product-name-listing">{product.name}</h3>
                            <p className="product-category-listing">
                              {typeof product.category === 'string' ? product.category : product.category?.name || ''}
                            </p>
                            
                            {/* Price */}
                            <div className="product-price-listing">
                              {product.compareAtPrice && (
                                <span className="price-old">{formatPrice(product.compareAtPrice)}</span>
                              )}
                              <span className="price-current">{formatPrice(product.price)}</span>
                            </div>

                            {/* Quick Add Button (list view only) */}
                            {viewMode === 'list' && (
                              <button className="quick-add-btn">
                                Add to Cart
                              </button>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button 
                        className="pagination-btn"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        ← Previous
                      </button>
                      
                      <div className="pagination-numbers">
                        {[...Array(totalPages)].map((_, idx) => (
                          <button
                            key={idx + 1}
                            className={`pagination-number ${currentPage === idx + 1 ? 'active' : ''}`}
                            onClick={() => setCurrentPage(idx + 1)}
                          >
                            {idx + 1}
                          </button>
                        ))}
                      </div>

                      <button 
                        className="pagination-btn"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
      </div>
    </MainLayout>
  );
}