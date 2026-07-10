'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getWishlist, addToWishlist, removeFromWishlist } from '@/lib/api/wishlist';
import { AuthContext } from './AuthContext';

export const WishlistContext = createContext(null);

const GUEST_KEY = 'livipoint_wishlist';

function readGuestWishlist() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeGuestWishlist(items) {
  localStorage.setItem(GUEST_KEY, JSON.stringify(items));
}

export function WishlistProvider({ children }) {
  const { isAuthenticated, isLoading: authLoading } = useContext(AuthContext);
  const [items, setItems] = useState([]); // { id, productId, product }
  const [isLoading, setIsLoading] = useState(true);

  // Load wishlist — from backend if logged in, localStorage if guest
  const loadWishlist = useCallback(async () => {
    if (authLoading) return;
    setIsLoading(true);
    try {
      if (isAuthenticated) {
        const data = await getWishlist();
        setItems(Array.isArray(data) ? data : []);
      } else {
        setItems(readGuestWishlist());
      }
    } catch {
      setItems(isAuthenticated ? [] : readGuestWishlist());
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  // Merge guest wishlist to backend on login
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const guestItems = readGuestWishlist();
    if (!guestItems.length) return;

    Promise.all(guestItems.map((item) => addToWishlist(item.productId).catch(() => null)))
      .then(() => {
        localStorage.removeItem(GUEST_KEY);
        return getWishlist();
      })
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [isAuthenticated, authLoading]);

  // Clear guest wishlist on logout
  useEffect(() => {
    const handleLogout = () => {
      localStorage.removeItem(GUEST_KEY);
      setItems([]);
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const isWishlisted = useCallback(
    (productId) => items.some((i) => i.productId === productId || i.id === productId),
    [items]
  );

  const toggle = useCallback(async (product) => {
    const productId = product.id;
    const existing = items.find((i) => i.productId === productId || i.id === productId);

    if (isAuthenticated) {
      if (existing) {
        await removeFromWishlist(existing.id);
        setItems((prev) => prev.filter((i) => i.id !== existing.id));
      } else {
        const res = await addToWishlist(productId);
        setItems((prev) => [...prev, res.wishlistItem || { id: productId, productId, product }]);
      }
    } else {
      // Guest — localStorage only
      if (existing) {
        const updated = items.filter((i) => i.productId !== productId);
        writeGuestWishlist(updated);
        setItems(updated);
      } else {
        const newItem = { id: productId, productId, product };
        const updated = [...items, newItem];
        writeGuestWishlist(updated);
        setItems(updated);
      }
    }
  }, [isAuthenticated, items]);

  return (
    <WishlistContext.Provider value={{ items, isLoading, isWishlisted, toggle, count: items.length }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
