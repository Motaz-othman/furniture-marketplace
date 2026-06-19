'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { User, Heart, ShoppingCart, ArrowLeft, Menu, X, Search, Flame, Sparkles, Package, Sofa, BedDouble, UtensilsCrossed, Briefcase, TreeDeciduous, Lamp } from '@/components/ui/Icons';
import { useParentCategories, useAuth, useCart, useWishlist, useSearchKeywords } from '@/lib/hooks';
import { matchKeywords } from '@/lib/utils';
import MegaMenu from './MegaMenu';
import MobileCategoryAccordion from './MobileCategoryAccordion';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Auth state
  const { user, isAuthenticated } = useAuth();
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();

  // Check if we're on a subpage (not homepage)
  const isSubpage = pathname !== '/';

  // Keep the search box in sync with the URL's search param.
  // Header remounts on page navigation (it's rendered inside each page's
  // MainLayout), which resets local state - restore it from the URL here.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearchQuery(params.get('search') || '');
  }, [pathname]);

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

  // Generic keyword vocabulary, fetched once and matched client-side for
  // instant suggestions with no per-keystroke request
  const { data: keywordsData } = useSearchKeywords();
  const keywords = keywordsData?.keywords || [];
  const suggestions = useMemo(
    () => matchKeywords(searchQuery, keywords),
    [searchQuery, keywords]
  );

  // Handle search
  const handleSearch = (e, term = searchQuery) => {
    e.preventDefault();
    if (term.trim()) {
      setShowSuggestions(false);
      router.push(`/products?search=${encodeURIComponent(term.trim())}`);
    }
  };

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSuggestions(value.trim().length >= 1);
  };

  const handleSearchFocus = () => {
    if (searchQuery.trim().length >= 1) setShowSuggestions(true);
  };

  const handleSearchBlur = () => {
    // Delay so a click on a suggestion can register first
    setTimeout(() => setShowSuggestions(false), 150);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    router.push(`/products?search=${encodeURIComponent(suggestion)}`);
  };

  const renderSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) return null;

    return (
      <div className="search-suggestions">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="search-suggestion-item"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleSuggestionClick(suggestion)}
          >
            <Search size={14} strokeWidth={1.5} className="search-suggestion-icon" />
            <span className="search-suggestion-text">{suggestion}</span>
          </button>
        ))}
      </div>
    );
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
            onChange={handleSearchInputChange}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />
          {renderSuggestions()}
        </form>

        {/* Mobile Cart Icon - Visible only on mobile */}
        <Link href="/cart" className="mobile-header-cart" aria-label="Shopping Cart">
          <ShoppingCart size={22} strokeWidth={1.5} />
          {itemCount > 0 && <span className="mobile-cart-count">{itemCount}</span>}
        </Link>

        {/* Desktop Search Box - Hidden on mobile */}
        <form className="search-box" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Find your perfect furniture..."
            value={searchQuery}
            onChange={handleSearchInputChange}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
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
          {renderSuggestions()}
        </form>

        {/* Desktop Header Actions - Hidden on mobile */}
        <div className="header-actions">
          {isAuthenticated ? (
            <Link href="/account" className="action-link" aria-label="Account">
              <span className="user-avatar-initial">
                {user?.firstName?.[0]?.toUpperCase() || 'U'}
              </span>
            </Link>
          ) : (
            <Link href="/auth/login" className="action-link" aria-label="Sign In">
              <User size={20} />
            </Link>
          )}
          <Link href="/wishlist" className="action-link cart-link" aria-label="Wishlist">
            <Heart size={20} />
            {wishlistCount > 0 && <span className="cart-count">{wishlistCount}</span>}
          </Link>
          <Link href="/cart" className="action-link cart-link" aria-label="Shopping Cart">
            <ShoppingCart size={20} />
            {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
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
                  const subcategories = category.children || [];
                  return (
                    <li key={category.id}>
                      <MegaMenu
                        category={category}
                        subcategories={subcategories}
                      />
                    </li>
                  );
                })}
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
                    const subcategories = category.children || [];
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
                  href="/clearance"
                  className="mobile-menu-link special"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mobile-menu-icon">
                    <Flame size={22} strokeWidth={1.5} />
                  </span>
                  <span>Clearance</span>
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
                {isAuthenticated ? (
                  <>
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
                  </>
                ) : (
                  <Link
                    href="/auth/login"
                    className="mobile-menu-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="mobile-menu-icon">
                      <User size={22} strokeWidth={1.5} />
                    </span>
                    <span>Sign In</span>
                  </Link>
                )}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}