'use client';

import Link from 'next/link';

export default function MobileMenu({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="mobile-menu-overlay" onClick={onClose}>
      <div
        className="mobile-menu"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <button
          onClick={onClose}
          className="mobile-menu-close"
          aria-label="Close menu"
        >
          ✕
        </button>
        <nav aria-label="Main navigation">
          <Link href="/products?category=living-room" onClick={onClose}>Living Room</Link>
          <Link href="/products?category=bedroom" onClick={onClose}>Bedroom</Link>
          <Link href="/products?category=dining-room" onClick={onClose}>Dining Room</Link>
          <Link href="/products?category=office" onClick={onClose}>Office</Link>
          <Link href="/products?category=outdoor" onClick={onClose}>Outdoor</Link>
          <Link href="/products" onClick={onClose}>Shop All</Link>
        </nav>
      </div>
    </div>
  );
}
