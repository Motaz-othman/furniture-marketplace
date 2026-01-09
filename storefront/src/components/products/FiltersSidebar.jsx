'use client';

import { useState } from 'react';
import { useParentCategories } from '@/lib/hooks';
import { formatPrice } from '@/lib/utils';

export default function FiltersSidebar({ filters, onFilterChange, onClearFilters }) {
  const { data: categoriesData } = useParentCategories();
  const categories = categoriesData?.data || [];

  const [priceRange, setPriceRange] = useState(filters.priceRange || [0, 5000]);

  const handleCategoryToggle = (categoryId) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId];
    
    onFilterChange({ ...filters, categories: newCategories });
  };

  const handlePriceChange = (index, value) => {
    const newRange = [...priceRange];
    newRange[index] = parseInt(value);
    setPriceRange(newRange);
  };

  const handlePriceApply = () => {
    onFilterChange({ ...filters, priceRange });
  };

  const activeFiltersCount = 
    (filters.categories?.length || 0) + 
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 5000 ? 1 : 0);

  return (
    <div className="filters-sidebar">
      {/* Header */}
      <div className="filters-header">
        <h3 className="filters-title">
          Filters
          {activeFiltersCount > 0 && (
            <span className="filters-count">{activeFiltersCount}</span>
          )}
        </h3>
        {activeFiltersCount > 0 && (
          <button 
            className="filters-clear"
            onClick={onClearFilters}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="active-filters">
          {filters.categories?.map(catId => {
            const category = categories.find(c => c.id === catId);
            return category ? (
              <span key={catId} className="filter-tag">
                {category.name}
                <button 
                  className="filter-tag-remove"
                  onClick={() => handleCategoryToggle(catId)}
                  aria-label={`Remove ${category.name} filter`}
                >
                  ✕
                </button>
              </span>
            ) : null;
          })}
          {(filters.priceRange[0] > 0 || filters.priceRange[1] < 5000) && (
            <span className="filter-tag">
              {formatPrice(filters.priceRange[0])} - {formatPrice(filters.priceRange[1])}
              <button 
                className="filter-tag-remove"
                onClick={() => onFilterChange({ ...filters, priceRange: [0, 5000] })}
                aria-label="Remove price filter"
              >
                ✕
              </button>
            </span>
          )}
        </div>
      )}

      {/* Category Filters */}
      <div className="filter-section">
        <h4 className="filter-section-title">Categories</h4>
        <div className="filter-options">
          {categories.map((category) => (
            <label key={category.id} className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={filters.categories?.includes(category.id) || false}
                onChange={() => handleCategoryToggle(category.id)}
                className="filter-checkbox"
              />
              <span className="filter-checkbox-custom"></span>
              <span className="filter-label-text">{category.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="filter-section">
        <h4 className="filter-section-title">Price Range</h4>
        
        <div className="price-range-display">
          <span className="price-range-value">{formatPrice(priceRange[0])}</span>
          <span className="price-range-separator">—</span>
          <span className="price-range-value">{formatPrice(priceRange[1])}</span>
        </div>

        <div className="price-range-inputs">
          <div className="price-input-group">
            <label className="price-input-label">Min</label>
            <input
              type="range"
              min="0"
              max="5000"
              step="100"
              value={priceRange[0]}
              onChange={(e) => handlePriceChange(0, e.target.value)}
              className="price-range-slider"
            />
          </div>
          
          <div className="price-input-group">
            <label className="price-input-label">Max</label>
            <input
              type="range"
              min="0"
              max="5000"
              step="100"
              value={priceRange[1]}
              onChange={(e) => handlePriceChange(1, e.target.value)}
              className="price-range-slider"
            />
          </div>
        </div>

        <button 
          className="price-apply-btn"
          onClick={handlePriceApply}
        >
          Apply Price Filter
        </button>
      </div>
    </div>
  );
}