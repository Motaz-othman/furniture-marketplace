'use client';

import { X } from 'lucide-react';
import Link from 'next/link';

export default function MobileMenu({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div className="absolute top-0 right-0 w-72 h-full bg-white shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-light">
          <span className="font-serif text-xl font-semibold">Menu</span>
          <button onClick={onClose} className="hover:opacity-70 transition">
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-5">
          <ul className="space-y-4">
            <li>
              <Link
                href="/products?room=living-room"
                className="block py-2 font-medium hover:text-accent transition"
                onClick={onClose}
              >
                Living Room
              </Link>
            </li>
            <li>
              <Link
                href="/products?room=bedroom"
                className="block py-2 font-medium hover:text-accent transition"
                onClick={onClose}
              >
                Bedroom
              </Link>
            </li>
            <li>
              <Link
                href="/products?room=dining"
                className="block py-2 font-medium hover:text-accent transition"
                onClick={onClose}
              >
                Dining
              </Link>
            </li>
            <li>
              <Link
                href="/products?room=office"
                className="block py-2 font-medium hover:text-accent transition"
                onClick={onClose}
              >
                Office
              </Link>
            </li>
          </ul>

          <hr className="my-6 border-border-light" />

          <ul className="space-y-4">
            <li>
              <Link
                href="/account"
                className="block py-2 font-medium hover:text-accent transition"
                onClick={onClose}
              >
                My Account
              </Link>
            </li>
            <li>
              <Link
                href="/account/orders"
                className="block py-2 font-medium hover:text-accent transition"
                onClick={onClose}
              >
                Orders
              </Link>
            </li>
            <li>
              <Link
                href="/account/wishlist"
                className="block py-2 font-medium hover:text-accent transition"
                onClick={onClose}
              >
                Wishlist
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}