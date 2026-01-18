'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSubcategories } from '@/lib/hooks';

export default function MegaMenu({ category }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(0);
  const timeoutRef = useRef(null);
  const wrapperRef = useRef(null);

  const { data: subcategoriesData } = useSubcategories(category.id);
  const subcategories = subcategoriesData?.data || [];

  // Handle mouse enter - open immediately
  const handleMouseEnter = () => {
    // Clear any pending close timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Calculate position of dropdown below the nav bar
    if (wrapperRef.current) {
      const nav = wrapperRef.current.closest('.main-nav');
      if (nav) {
        const navRect = nav.getBoundingClientRect();
        setDropdownTop(navRect.bottom);
      }
    }

    setIsOpen(true);
  };

  // Handle mouse leave - close with 200ms delay
  const handleMouseLeave = () => {
    // Set a timeout to close after 200ms
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200); // 200ms delay prevents accidental closing
  };

  // Close dropdown on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsOpen(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    if (isOpen) {
      window.addEventListener('scroll', handleScroll);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isOpen]);

  // If no subcategories, just show link
  if (!subcategories || subcategories.length === 0) {
    return (
      <Link href={`/categories/${category.slug}`} className="nav-link">
        {category.name}
      </Link>
    );
  }

  return (
    <div
      className="mega-menu-wrapper"
      ref={wrapperRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Category Link/Trigger */}
      <Link
        href={`/categories/${category.slug}`}
        className="mega-menu-trigger"
      >
        {category.name}
      </Link>

      {/* Dropdown - shown when isOpen is true */}
      {isOpen && (
        <div
          className="mega-menu-dropdown"
          style={{ top: `${dropdownTop}px` }}
        >
          <div className="mega-menu-container">
            <div className="mega-menu-content">
              {/* Single column of subcategories */}
              <div className="mega-menu-column">
                <h4 className="mega-menu-title">{category.name}</h4>
                <ul className="mega-menu-list">
                  {subcategories.map((subcat) => (
                    <li key={subcat.id}>
                      <Link
                        href={`/categories/${category.slug}/${subcat.slug}`}
                        className="mega-menu-link"
                      >
                        {subcat.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/categories/${category.slug}`}
                  className="mega-menu-view-all"
                >
                  View All {category.name} →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}