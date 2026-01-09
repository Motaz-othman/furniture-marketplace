'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const cartItemsCount = 0; // Will connect to cart store later

  const isActive = (path) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <nav className="mobile-bottom-nav">
      {/* Home */}
      <Link 
        href="/" 
        className={`mobile-nav-item ${isActive('/') && pathname === '/' ? 'active' : ''}`}
      >
        <span className="mobile-nav-icon">🏠</span>
        <span>Home</span>
      </Link>

      {/* Shop */}
      <Link 
        href="/products" 
        className={`mobile-nav-item ${isActive('/products') ? 'active' : ''}`}
      >
        <span className="mobile-nav-icon">🛋️</span>
        <span>Shop</span>
      </Link>

      {/* Search */}
      <Link 
        href="/search" 
        className={`mobile-nav-item ${isActive('/search') ? 'active' : ''}`}
      >
        <span className="mobile-nav-icon">🔍</span>
        <span>Search</span>
      </Link>

      {/* Cart */}
      <Link 
        href="/cart" 
        className={`mobile-nav-item ${isActive('/cart') ? 'active' : ''}`}
      >
        <span className="mobile-nav-icon">🛒</span>
        <span>Cart</span>
        {cartItemsCount > 0 && (
          <span className="mobile-nav-badge">{cartItemsCount}</span>
        )}
      </Link>

      {/* Account */}
      <Link 
        href="/account" 
        className={`mobile-nav-item ${isActive('/account') ? 'active' : ''}`}
      >
        <span className="mobile-nav-icon">👤</span>
        <span>Account</span>
      </Link>
    </nav>
  );
}