'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Heart, ShoppingCart, User } from '@/components/ui/Icons';

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
        <Home size={22} strokeWidth={1.5} />
        <span>Home</span>
      </Link>

      {/* Shop */}
      <Link
        href="/products"
        className={`mobile-nav-item ${isActive('/products') ? 'active' : ''}`}
      >
        <ShoppingBag size={22} strokeWidth={1.5} />
        <span>Shop</span>
      </Link>

      {/* Cart - Center position for prominence */}
      <Link
        href="/cart"
        className={`mobile-nav-item ${isActive('/cart') ? 'active' : ''}`}
      >
        <ShoppingCart size={22} strokeWidth={1.5} />
        <span>Cart</span>
        {cartItemsCount > 0 && (
          <span className="mobile-nav-badge">{cartItemsCount}</span>
        )}
      </Link>

      {/* Wishlist */}
      <Link
        href="/wishlist"
        className={`mobile-nav-item ${isActive('/wishlist') ? 'active' : ''}`}
      >
        <Heart size={22} strokeWidth={1.5} />
        <span>Wishlist</span>
      </Link>

      {/* Account */}
      <Link
        href="/account"
        className={`mobile-nav-item ${isActive('/account') ? 'active' : ''}`}
      >
        <User size={22} strokeWidth={1.5} />
        <span>Account</span>
      </Link>
    </nav>
  );
}