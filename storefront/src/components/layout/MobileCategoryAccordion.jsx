'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

export default function MobileCategoryAccordion({ category, subcategories, icon, onLinkClick }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasSubcategories = subcategories && subcategories.length > 0;

  if (!hasSubcategories) {
    // No subcategories - just a simple link
    return (
      <div className="mobile-category-item">
        <Link
          href={`/categories/${category.slug}`}
          className="mobile-category-link"
          onClick={onLinkClick}
        >
          <span className="mobile-category-icon">{icon}</span>
          <span className="mobile-category-name">{category.name}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mobile-category-item">
      {/* Parent Category - Clickable to expand */}
      <button
        className="mobile-category-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="mobile-category-icon">{icon}</span>
        <span className="mobile-category-name">{category.name}</span>
        <span className={`mobile-category-arrow ${isExpanded ? 'expanded' : ''}`}>
          <ChevronDown size={16} strokeWidth={2} />
        </span>
      </button>

      {/* Subcategories - Expandable */}
      <div className={`mobile-subcategories ${isExpanded ? 'expanded' : ''}`}>
        <div className="mobile-subcategories-content">
          {subcategories.map((sub) => (
            <Link
              key={sub.id}
              href={`/categories/${category.slug}/${sub.slug}`}
              className="mobile-subcategory-link"
              onClick={onLinkClick}
            >
              {sub.name}
            </Link>
          ))}

          {/* View All Link */}
          <Link
            href={`/categories/${category.slug}`}
            className="mobile-view-all-link"
            onClick={onLinkClick}
          >
            View All {category.name} →
          </Link>
        </div>
      </div>
    </div>
  );
}
