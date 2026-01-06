'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, User, ShoppingBag, Menu } from 'lucide-react';
import MobileMenu from './MobileMenu';

export default function Header({ transparent = false }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cartItemsCount = 0;

  return (
    <>
      {/* Announcement Bar */}
      <div className={`${transparent ? 'absolute top-0 left-0 right-0 z-50' : ''}`}>
        <div className="bg-header-dark text-white text-center py-2.5 px-4 text-xs tracking-wide">
          <span>Free White Glove Delivery on Orders Over $500 | </span>
          <span className="underline cursor-pointer hover:opacity-80">
            Summer Sale Ends Soon. Shop Now
          </span>
        </div>
        
        <header className={`${transparent ? 'bg-transparent' : 'bg-cream border-b border-border-light'}`}>
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className={`flex items-center justify-between h-14 ${transparent ? 'text-white' : 'text-charcoal'}`}>
              {/* Logo */}
              <Link href="/" className="font-serif text-xl font-medium tracking-wide">
                Furnivo
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-8">
                {['Living', 'Dining', 'Bedroom', 'Workspace', 'Decor', 'The Studio'].map((item) => (
                  <Link
                    key={item}
                    href={`/products?room=${item.toLowerCase()}`}
                    className="text-[13px] font-medium hover:opacity-70 transition"
                  >
                    {item}
                  </Link>
                ))}
              </nav>

              {/* Icons */}
              <div className="flex items-center gap-5">
                <Link href="/search" className="hover:opacity-70 transition">
                  <Search size={18} strokeWidth={1.5} />
                </Link>
                <Link href="/account" className="hover:opacity-70 transition">
                  <User size={18} strokeWidth={1.5} />
                </Link>
                <Link href="/cart" className="hover:opacity-70 transition relative">
                  <ShoppingBag size={18} strokeWidth={1.5} />
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-accent text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                      {cartItemsCount}
                    </span>
                  )}
                </Link>
                
                <button
                  className="lg:hidden hover:opacity-70 transition"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu size={20} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        </header>
      </div>

      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
}