'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { get, post, patch, del } from '@/lib/api/client';

export const CartContext = createContext(null);

const CART_KEY = 'livipoint_cart';

// ─── localStorage helpers ─────────────────────────────────────────────────────

function readStorage() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
}

function writeStorage(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function computeTotals(items) {
  const itemCount = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const rawTotal = items.reduce((sum, i) => sum + (Number(i._price) || 0) * (Number(i.quantity) || 0), 0);
  return { itemCount, total: isFinite(rawTotal) ? Math.round(rawTotal * 100) / 100 : 0 };
}

function buildProductSnapshot(product) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    minPrice: product.minPrice ?? product.price,
    images: product.images?.slice(0, 1).map((img) =>
      typeof img === 'string' ? { imageUrl: img } : img
    ) || [],
  };
}

function buildVariantSnapshot(variant) {
  return { id: variant.id, name: variant.variantName || variant.name, price: variant.price };
}

// Normalize a backend cart item to local shape
function normalizeServerItem(item) {
  const price = item.variant?.price?.retailPrice || item.product?.minPrice || 0;
  return {
    id: item.id,
    productId: item.productId,
    variantId: item.variantId || null,
    quantity: item.quantity,
    _price: price,
    product: item.product ? buildProductSnapshot(item.product) : null,
    variant: item.variant ? buildVariantSnapshot(item.variant) : null,
  };
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function CartProvider({ children }) {
  const { isAuthenticated, isLoading: authLoading } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [itemCount, setItemCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Sync state from an items array
  const syncState = useCallback((newItems) => {
    const { itemCount: count, total: t } = computeTotals(newItems);
    setItems(newItems);
    setItemCount(count);
    setTotal(t);
    setIsLoading(false);
  }, []);

  // ─── Load cart ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated) {
      setIsLoading(true);
      get('/cart')
        .then((res) => {
          const normalized = (res.items || []).map(normalizeServerItem);
          syncState(normalized);
        })
        .catch(() => syncState([]));
    } else {
      syncState(readStorage());
    }
  }, [isAuthenticated, authLoading, syncState]);

  // ─── Merge guest cart into backend on login ─────────────────────────────────

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const guestItems = readStorage();
    if (!guestItems.length) return;

    Promise.all(
      guestItems.map((item) =>
        post('/cart', {
          productId: item.productId,
          variantId: item.variantId || undefined,
          quantity: item.quantity,
        }).then(() => true).catch(() => false)
      )
    ).then((results) => {
      // Only clear localStorage if at least some items were successfully merged
      if (results.some(Boolean)) {
        localStorage.removeItem(CART_KEY);
      }
      return get('/cart');
    }).then((res) => {
      syncState((res.items || []).map(normalizeServerItem));
    }).catch(() => {});
  }, [isAuthenticated, authLoading, syncState]);

  // ─── Clear on logout ────────────────────────────────────────────────────────

  useEffect(() => {
    const handleLogout = () => {
      localStorage.removeItem(CART_KEY);
      localStorage.removeItem('livipoint_cart');
      syncState([]);
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [syncState]);

  // ─── Operations ──────────────────────────────────────────────────────────────

  const addItem = useCallback(async ({ productId, variantId, quantity, product, variant }) => {
    if (isAuthenticated) {
      try {
        await post('/cart', { productId, variantId: variantId || undefined, quantity });
        const res = await get('/cart');
        syncState((res.items || []).map(normalizeServerItem));
      } catch {
        throw new Error('Failed to add to cart');
      }
    } else {
      const stored = readStorage();
      const vid = variantId || null;
      const existing = stored.find((i) => i.productId === productId && i.variantId === vid);
      const price = variant?.price?.retailPrice ?? (typeof variant?.price === 'number' ? variant.price : null) ?? product?.price ?? product?.minPrice ?? 0;

      if (existing) {
        existing.quantity += quantity;
        existing._price = price;
        if (product) existing.product = buildProductSnapshot(product);
        if (variant) existing.variant = buildVariantSnapshot(variant);
      } else {
        stored.push({
          id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          productId, variantId: vid, quantity, _price: price,
          product: product ? buildProductSnapshot(product) : null,
          variant: variant ? buildVariantSnapshot(variant) : null,
          addedAt: new Date().toISOString(),
        });
      }
      writeStorage(stored);
      syncState(stored);
    }
  }, [isAuthenticated, syncState]);

  const updateItem = useCallback(async (id, quantity) => {
    if (isAuthenticated) {
      try {
        await patch(`/cart/${id}`, { quantity });
        const res = await get('/cart');
        syncState((res.items || []).map(normalizeServerItem));
      } catch {
        throw new Error('Failed to update cart');
      }
    } else {
      const stored = readStorage();
      const item = stored.find((i) => i.id === id);
      if (item) { item.quantity = quantity; writeStorage(stored); }
      syncState(stored);
    }
  }, [isAuthenticated, syncState]);

  const removeItem = useCallback(async (id) => {
    if (isAuthenticated) {
      try {
        await del(`/cart/${id}`);
        const res = await get('/cart');
        syncState((res.items || []).map(normalizeServerItem));
      } catch {
        throw new Error('Failed to remove from cart');
      }
    } else {
      const stored = readStorage().filter((i) => i.id !== id);
      writeStorage(stored);
      syncState(stored);
    }
  }, [isAuthenticated, syncState]);

  const clearAll = useCallback(async () => {
    if (isAuthenticated) {
      try { await del('/cart'); } catch {}
    } else {
      writeStorage([]);
    }
    syncState([]);
  }, [isAuthenticated, syncState]);

  const refreshCart = useCallback(async () => {
    if (isAuthenticated) {
      const res = await get('/cart');
      syncState((res.items || []).map(normalizeServerItem));
    } else {
      syncState(readStorage());
    }
  }, [isAuthenticated, syncState]);

  return (
    <CartContext.Provider value={{ items, itemCount, total, isLoading, addItem, updateItem, removeItem, clearAll, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}
