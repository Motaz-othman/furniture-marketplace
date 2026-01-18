'use client';

import { useState } from 'react';
import { useCategories } from '@/lib/hooks';
import { formatPrice } from '@/lib/utils';

export default function FiltersSidebar({ filters, onFilterChange, onClearFilters }) {
  const { data: categoriesData } = useCategories();
  const allCategories = categoriesData?.data || [];

  // Separate parent categories and subcategories
  const parentCategories = allCategories.filter(cat => cat.parentId === null || !cat.parentId);
  const subCategories = allCategories.filter(cat => cat.parentId !== null && cat.parentId);

  const [priceRange, setPriceRange] = useState(filters.priceRange || [0, 5000]);
  const [expandedSections, setExpandedSections] = useState({
    categories: false,
    subcategories: false,
    price: false,
    availability: false
  });

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleCategoryToggle = (categoryId) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId];

    onFilterChange({ ...filters, categories: newCategories });
  };

  const handlePricePreset = (min, max) => {
    const newRange = [min, max];
    setPriceRange(newRange);
    onFilterChange({ ...filters, priceRange: newRange });
  };

  const handlePriceChange = (index, value) => {
    const newRange = [...priceRange];
    newRange[index] = parseInt(value);
    setPriceRange(newRange);
  };

  const handlePriceApply = () => {
    onFilterChange({ ...filters, priceRange });
  };

  const handleAvailabilityChange = (availability) => {
    onFilterChange({ ...filters, availability });
  };

  const handleSubcategoryToggle = (subcategoryId) => {
    const currentSubcategories = filters.subcategories || [];
    const newSubcategories = currentSubcategories.includes(subcategoryId)
      ? currentSubcategories.filter(id => id !== subcategoryId)
      : [...currentSubcategories, subcategoryId];

    onFilterChange({ ...filters, subcategories: newSubcategories });
  };

  const activeFiltersCount =
    (filters.categories?.length || 0) +
    (filters.subcategories?.length || 0) +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 5000 ? 1 : 0) +
    (filters.availability ? 1 : 0);

  // Price presets
  const pricePresets = [
    { label: 'Under $500', min: 0, max: 500 },
    { label: '$500 - $1,000', min: 500, max: 1000 },
    { label: '$1,000 - $2,500', min: 1000, max: 2500 },
    { label: '$2,500+', min: 2500, max: 5000 }
  ];

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
            const category = parentCategories.find(c => c.id === catId);
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
          {filters.subcategories?.map(subId => {
            const subcategory = subCategories.find(c => c.id === subId);
            return subcategory ? (
              <span key={subId} className="filter-tag">
                {subcategory.name}
                <button
                  className="filter-tag-remove"
                  onClick={() => handleSubcategoryToggle(subId)}
                  aria-label={`Remove ${subcategory.name} filter`}
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
          {filters.availability && (
            <span className="filter-tag">
              {filters.availability === 'in-stock' ? 'In Stock' : 'On Sale'}
              <button
                className="filter-tag-remove"
                onClick={() => onFilterChange({ ...filters, availability: null })}
                aria-label="Remove availability filter"
              >
                ✕
              </button>
            </span>
          )}
        </div>
      )}

      {/* Category Filters - Collapsible */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection('categories')}
          aria-expanded={expandedSections.categories}
        >
          <h4 className="filter-section-title">Categories</h4>
          <span className={`filter-toggle-icon ${expandedSections.categories ? 'expanded' : ''}`}>
            ▼
          </span>
        </button>
        {expandedSections.categories && (
          <div className="filter-options">
            {parentCategories.map((category) => (
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
        )}
      </div>

      {/* Subcategory Filters - Collapsible */}
      {subCategories.length > 0 && (
        <div className="filter-section">
          <button
            className="filter-section-header"
            onClick={() => toggleSection('subcategories')}
            aria-expanded={expandedSections.subcategories}
          >
            <h4 className="filter-section-title">Subcategories</h4>
            <span className={`filter-toggle-icon ${expandedSections.subcategories ? 'expanded' : ''}`}>
              ▼
            </span>
          </button>
          {expandedSections.subcategories && (
            <div className="filter-options">
              {subCategories.map((subcategory) => (
                <label key={subcategory.id} className="filter-checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.subcategories?.includes(subcategory.id) || false}
                    onChange={() => handleSubcategoryToggle(subcategory.id)}
                    className="filter-checkbox"
                  />
                  <span className="filter-checkbox-custom"></span>
                  <span className="filter-label-text">{subcategory.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Price Range Filter - Collapsible with Presets */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection('price')}
          aria-expanded={expandedSections.price}
        >
          <h4 className="filter-section-title">Price Range</h4>
          <span className={`filter-toggle-icon ${expandedSections.price ? 'expanded' : ''}`}>
            ▼
          </span>
        </button>
        {expandedSections.price && (
          <div className="filter-options">
            {/* Price Presets */}
            <div className="price-presets">
              {pricePresets.map((preset) => (
                <button
                  key={preset.label}
                  className={`price-preset-btn ${
                    priceRange[0] === preset.min && priceRange[1] === preset.max ? 'active' : ''
                  }`}
                  onClick={() => handlePricePreset(preset.min, preset.max)}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Range */}
            <div className="price-custom-range">
              <p className="price-custom-label">Custom Range</p>
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
                Apply Custom Range
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Availability Filter - Collapsible */}
      <div className="filter-section">
        <button
          className="filter-section-header"
          onClick={() => toggleSection('availability')}
          aria-expanded={expandedSections.availability}
        >
          <h4 className="filter-section-title">Availability</h4>
          <span className={`filter-toggle-icon ${expandedSections.availability ? 'expanded' : ''}`}>
            ▼
          </span>
        </button>
        {expandedSections.availability && (
          <div className="filter-options">
            <label className="filter-radio-label">
              <input
                type="radio"
                name="availability"
                checked={!filters.availability}
                onChange={() => handleAvailabilityChange(null)}
                className="filter-radio"
              />
              <span className="filter-radio-custom"></span>
              <span className="filter-label-text">All Products</span>
            </label>
            <label className="filter-radio-label">
              <input
                type="radio"
                name="availability"
                checked={filters.availability === 'in-stock'}
                onChange={() => handleAvailabilityChange('in-stock')}
                className="filter-radio"
              />
              <span className="filter-radio-custom"></span>
              <span className="filter-label-text">In Stock Only</span>
            </label>
            <label className="filter-radio-label">
              <input
                type="radio"
                name="availability"
                checked={filters.availability === 'on-sale'}
                onChange={() => handleAvailabilityChange('on-sale')}
                className="filter-radio"
              />
              <span className="filter-radio-custom"></span>
              <span className="filter-label-text">On Sale</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}