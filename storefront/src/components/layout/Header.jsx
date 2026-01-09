'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParentCategories } from '@/lib/hooks';
import { getSubcategories } from '@/lib/fake-data';
import MegaMenu from './MegaMenu';
import MobileCategoryAccordion from './MobileCategoryAccordion';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch parent categories
  const { data: categoriesData, isLoading } = useParentCategories();
  const categories = categoriesData?.data || [];

  // Category icons mapping
  const categoryIcons = {
    'living-room': '🛋️',
    'bedroom': '🛏️',
    'dining-room': '🍽️',
    'office': '💼',
    'outdoor': '🌳',
    'lighting': '💡'
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <>
      {/* Main Header */}
      <header className="header-container">
        {/* Hamburger Menu Icon - Mobile Only */}
        <button 
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <span className="hamburger-icon">☰</span>
        </button>

        {/* Logo - CLICKABLE - Goes to Homepage */}
        <Link href="/" className="logo-link">
          <div className="logo">Furnivo</div>
        </Link>
        
        {/* Search Box - FRIENDLY PLACEHOLDER + ICON */}
        <form className="search-box" onSubmit={handleSearch}>
          <input 
            type="text" 
            placeholder="Find your perfect furniture..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" aria-label="Search">
            {/* Search Icon */}
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
        </form>
        
        {/* Header Actions - Using Link components */}
        <div className="header-actions">
          <Link href="/account" className="action-link">Account</Link>
          <Link href="/wishlist" className="action-link">Wishlist</Link>
          <Link href="/cart" className="action-link">Cart (0)</Link>
        </div>
      </header>

      {/* Desktop Navigation with Mega Menu */}
      <nav className="main-nav">
        <div className="nav-container">
          <ul className="nav-list">
            {isLoading ? (
              <li className="nav-loading">Loading...</li>
            ) : (
              <>
                {categories.map((category) => {
                  const subcategories = getSubcategories(category.id);
                  return (
                    <li key={category.id}>
                      <MegaMenu 
                        category={category}
                        subcategories={subcategories}
                      />
                    </li>
                  );
                })}
                <li>
                  <Link href="/sale" className="nav-link sale-link">
                    Sale
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </nav>

      {/* Mobile Slide-out Menu with Accordions */}
      <div 
        className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <div 
          className={`mobile-menu-panel ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Menu Header */}
          <div className="mobile-menu-header">
            {/* Logo in mobile menu - also clickable */}
            <Link href="/" className="logo-link" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="logo">Furnivo</div>
            </Link>
            <button 
              className="mobile-menu-close"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          {/* Menu Content */}
          <div className="mobile-menu-content">
            {/* Categories Section with Accordions */}
            <div className="mobile-menu-section">
              <h3 className="mobile-menu-section-title">Shop by Category</h3>
              <div className="mobile-categories-list">
                {isLoading ? (
                  <div className="mobile-loading">Loading categories...</div>
                ) : (
                  categories.map((category) => {
                    const subcategories = getSubcategories(category.id);
                    const icon = categoryIcons[category.slug] || '📦';
                    
                    return (
                      <MobileCategoryAccordion
                        key={category.id}
                        category={category}
                        subcategories={subcategories}
                        icon={icon}
                      />
                    );
                  })
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="mobile-menu-divider"></div>

            {/* Special Links */}
            <div className="mobile-menu-section">
              <nav className="mobile-menu-nav">
                <Link 
                  href="/sale" 
                  className="mobile-menu-link special"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mobile-menu-icon">🔥</span>
                  <span>Sale</span>
                  <span className="mobile-menu-badge">New</span>
                </Link>
                <Link 
                  href="/new-arrivals" 
                  className="mobile-menu-link"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mobile-menu-icon">✨</span>
                  <span>New Arrivals</span>
                </Link>
              </nav>
            </div>

            {/* Divider */}
            <div className="mobile-menu-divider"></div>

            {/* Account Links */}
            <div className="mobile-menu-section">
              <h3 className="mobile-menu-section-title">My Account</h3>
              <nav className="mobile-menu-nav">
                <Link 
                  href="/account" 
                  className="mobile-menu-link"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mobile-menu-icon">👤</span>
                  <span>Account</span>
                </Link>
                <Link 
                  href="/wishlist" 
                  className="mobile-menu-link"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mobile-menu-icon">❤️</span>
                  <span>Wishlist</span>
                </Link>
                <Link 
                  href="/orders" 
                  className="mobile-menu-link"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mobile-menu-icon">📦</span>
                  <span>Orders</span>
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}