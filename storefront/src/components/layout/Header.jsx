'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { User, Heart, ShoppingCart, ArrowLeft, Menu, X, Search, Flame, Sparkles, Package, Sofa, BedDouble, UtensilsCrossed, Briefcase, TreeDeciduous, Lamp } from '@/components/ui/Icons';
import { useParentCategories } from '@/lib/hooks';
import { getSubcategories } from '@/lib/fake-data';
import MegaMenu from './MegaMenu';
import MobileCategoryAccordion from './MobileCategoryAccordion';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  // Check if we're on a subpage (not homepage)
  const isSubpage = pathname !== '/';

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  }, [router]);

  // Fetch parent categories
  const { data: categoriesData, isLoading } = useParentCategories();
  const categories = categoriesData?.data || [];

  // Category icons mapping - using Lucide icons
  const categoryIcons = {
    'living-room': <Sofa size={22} strokeWidth={1.5} />,
    'bedroom': <BedDouble size={22} strokeWidth={1.5} />,
    'dining-room': <UtensilsCrossed size={22} strokeWidth={1.5} />,
    'office': <Briefcase size={22} strokeWidth={1.5} />,
    'outdoor': <TreeDeciduous size={22} strokeWidth={1.5} />,
    'lighting': <Lamp size={22} strokeWidth={1.5} />
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
        {/* Left Side - Hamburger Menu (Mobile Only) */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={24} strokeWidth={1.5} />
        </button>

        {/* Logo - CLICKABLE - Goes to Homepage (Hidden on Mobile) */}
        <Link href="/" className="logo-link">
          <div className="logo">LiviPoint</div>
          <span className="logo-badge">Coming Soon</span>
        </Link>

        {/* Mobile Search Box - Visible only on mobile */}
        <form className="mobile-header-search" onSubmit={handleSearch}>
          <Search size={18} strokeWidth={1.5} className="mobile-header-search-icon" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        {/* Mobile Cart Icon - Visible only on mobile */}
        <Link href="/cart" className="mobile-header-cart" aria-label="Shopping Cart">
          <ShoppingCart size={22} strokeWidth={1.5} />
          <span className="mobile-cart-count">0</span>
        </Link>

        {/* Desktop Search Box - Hidden on mobile */}
        <form className="search-box" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Find your perfect furniture..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" aria-label="Search">
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

        {/* Desktop Header Actions - Hidden on mobile */}
        <div className="header-actions">
          <Link href="/account" className="action-link" aria-label="Account">
            <User size={20} />
          </Link>
          <Link href="/wishlist" className="action-link" aria-label="Wishlist">
            <Heart size={20} />
          </Link>
          <Link href="/cart" className="action-link cart-link" aria-label="Shopping Cart">
            <ShoppingCart size={20} />
            <span className="cart-count">0</span>
          </Link>
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
              <div className="logo">LiviPoint</div>
              <span className="logo-badge">Coming Soon</span>
            </Link>
            <button
              className="mobile-menu-close"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X size={24} strokeWidth={1.5} />
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
                    const icon = categoryIcons[category.slug] || <Package size={22} strokeWidth={1.5} />;

                    return (
                      <MobileCategoryAccordion
                        key={category.id}
                        category={category}
                        subcategories={subcategories}
                        icon={icon}
                        onLinkClick={() => setIsMobileMenuOpen(false)}
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
                  <span className="mobile-menu-icon">
                    <Flame size={22} strokeWidth={1.5} />
                  </span>
                  <span>Sale</span>
                  <span className="mobile-menu-badge">New</span>
                </Link>
                <Link
                  href="/new-arrivals"
                  className="mobile-menu-link"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mobile-menu-icon">
                    <Sparkles size={22} strokeWidth={1.5} />
                  </span>
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
                  <span className="mobile-menu-icon">
                    <User size={22} strokeWidth={1.5} />
                  </span>
                  <span>Account</span>
                </Link>
                <Link
                  href="/wishlist"
                  className="mobile-menu-link"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mobile-menu-icon">
                    <Heart size={22} strokeWidth={1.5} />
                  </span>
                  <span>Wishlist</span>
                </Link>
                <Link
                  href="/orders"
                  className="mobile-menu-link"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mobile-menu-icon">
                    <Package size={22} strokeWidth={1.5} />
                  </span>
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