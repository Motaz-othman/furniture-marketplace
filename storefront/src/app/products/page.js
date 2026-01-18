'use client';

import { useState } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import FilterModal from '@/components/products/FilterModal';
import ProductCard from '@/components/products/ProductCard';
import { useProducts, useCategories } from '@/lib/hooks';
import { formatPrice } from '@/lib/utils';

export default function ProductsPage() {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    categories: [],
    subcategories: [],
    priceRange: [0, 5000],
    availability: null
  });

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

  // Helper function to get all subcategory IDs for a parent category
  const getSubcategoryIds = (parentCategoryId) => {
    return allCategories
      .filter(cat => cat.parentId === parentCategoryId)
      .map(cat => cat.id);
  };

  // Filter products based on selected filters
  const filteredProducts = products.filter(product => {
    const productCategoryId = product.categoryId;

    // Category filter (parent categories)
    if (filters.categories.length > 0) {
      // For each selected parent category, check if product belongs to it or any of its subcategories
      const matchesCategory = filters.categories.some(parentCatId => {
        const subcategoryIds = getSubcategoryIds(parentCatId);
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

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilters({
      categories: [],
      subcategories: [],
      priceRange: [0, 5000],
      availability: null
    });
    setCurrentPage(1);
  };

  const activeFiltersCount =
    (filters.categories?.length || 0) +
    (filters.subcategories?.length || 0) +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 5000 ? 1 : 0) +
    (filters.availability ? 1 : 0);

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
                onClick={() => setIsFilterModalOpen(true)}
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

          {/* Filter Modal */}
          <FilterModal
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
          />

          {/* Products Grid/List (No sidebar) */}
          <main className="products-main-full">
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
                    {filteredProducts.map((product, index) => (
                      <ProductCard key={product.id} product={product} index={index} />
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
    </MainLayout>
  );
}