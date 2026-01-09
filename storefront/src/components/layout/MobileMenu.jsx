'use client';

export default function MobileMenu({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="mobile-menu-overlay" onClick={onClose}>
      <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="mobile-menu-close">✕</button>
        <nav>
          <a href="/products?category=living-room">Living Room</a>
          <a href="/products?category=bedroom">Bedroom</a>
          <a href="/products?category=dining-room">Dining Room</a>
          <a href="/products?category=office">Office</a>
          <a href="/products?category=outdoor">Outdoor</a>
          <a href="/products">Shop All</a>
        </nav>
      </div>
    </div>
  );
}