'use client';

import { createContext, useState, useEffect, useCallback } from 'react';

export const CartContext = createContext(null);

const CART_KEY = 'livipoint_cart';

function readStorage() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStorage(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function computeTotals(items) {
  const itemCount = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const rawTotal = items.reduce((sum, i) => sum + (Number(i._price) || 0) * (Number(i.quantity) || 0), 0);
  const total = isFinite(rawTotal) ? Math.round(rawTotal * 100) / 100 : 0;
  return { itemCount, total };
}

// Store minimal product data needed for cart page display
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
  return {
    id: variant.id,
    name: variant.variantName || variant.name,
    price: variant.price,
  };
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [itemCount, setItemCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refreshCart = useCallback(() => {
    const stored = readStorage();
    const { itemCount: count, total: t } = computeTotals(stored);
    setItems(stored);
    setItemCount(count);
    setTotal(t);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addItem = useCallback(({ productId, variantId, quantity, product, variant }) => {
    const stored = readStorage();
    const vid = variantId || null;
    const existing = stored.find(
      (i) => i.productId === productId && i.variantId === vid
    );

    // Determine price for this item
    const price =
      variant?.price?.retailPrice ??
      (typeof variant?.price === 'number' ? variant.price : null) ??
      product?.price ??
      product?.minPrice ??
      0;

    if (existing) {
      existing.quantity += quantity;
      existing._price = price;
      if (product) existing.product = buildProductSnapshot(product);
      if (variant) existing.variant = buildVariantSnapshot(variant);
    } else {
      stored.push({
        id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        productId,
        variantId: vid,
        quantity,
        _price: price,
        product: product ? buildProductSnapshot(product) : null,
        variant: variant ? buildVariantSnapshot(variant) : null,
        addedAt: new Date().toISOString(),
      });
    }

    writeStorage(stored);
    refreshCart();
  }, [refreshCart]);

  const updateItem = useCallback((id, quantity) => {
    const stored = readStorage();
    const item = stored.find((i) => i.id === id);
    if (item) {
      item.quantity = quantity;
      writeStorage(stored);
    }
    refreshCart();
  }, [refreshCart]);

  const removeItem = useCallback((id) => {
    const stored = readStorage().filter((i) => i.id !== id);
    writeStorage(stored);
    refreshCart();
  }, [refreshCart]);

  const clearAll = useCallback(() => {
    writeStorage([]);
    setItems([]);
    setItemCount(0);
    setTotal(0);
  }, []);

  const value = {
    items,
    itemCount,
    total,
    isLoading,
    addItem,
    updateItem,
    removeItem,
    clearAll,
    refreshCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
