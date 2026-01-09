'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CategoryDropdown({ category, subcategories }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className="category-dropdown"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <Link href={`/categories/${category.slug}`} className="category-trigger">
        {category.name}
        {subcategories && subcategories.length > 0 && (
          <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
        )}
      </Link>

      {subcategories && subcategories.length > 0 && (
        <div className={`dropdown-panel ${isOpen ? 'open' : ''}`}>
          <div className="dropdown-content">
            {subcategories.map((sub) => (
              <Link 
                key={sub.id}
                href={`/categories/${sub.slug}`}
                className="dropdown-item"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}