/**
 * Local Cart - localStorage-backed cart for fake data mode
 * Returns same response shapes as the backend cart API
 */

import { getProductsApiFormat } from '@/lib/fake-data';

const CART_STORAGE_KEY = 'livipoint_cart';

function readCart() {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

/**
 * Get cart with enriched product data
 * Returns shape matching backend GET /api/cart: { items, itemCount, total }
 */
export function getLocalCart() {
  const items = readCart();
  const products = getProductsApiFormat();

  const enrichedItems = items
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;

      const variant = product.variants?.find((v) => v.id === item.variantId) || null;
      const price = variant?.price ?? product.price ?? 0;

      return {
        ...item,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          images: product.images || [],
          minPrice: product.price,
        },
        variant: variant
          ? {
              id: variant.id,
              name: variant.variantName || variant.name,
              price: variant.price,
            }
          : null,
        _price: price,
      };
    })
    .filter(Boolean);

  const total = enrichedItems.reduce((sum, item) => sum + item._price * item.quantity, 0);

  return {
    items: enrichedItems,
    itemCount: enrichedItems.length,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Add item to cart
 * Returns shape matching backend POST /api/cart: { message, cartItem }
 */
export function addToLocalCart({ productId, variantId, quantity }) {
  const items = readCart();
  const vid = variantId || null;
  const existing = items.find(
    (i) => i.productId === productId && i.variantId === vid
  );

  let cartItem;
  if (existing) {
    existing.quantity += quantity;
    cartItem = existing;
  } else {
    cartItem = {
      id: `local-${Date.now()}`,
      productId,
      variantId: vid,
      quantity,
      addedAt: new Date().toISOString(),
    };
    items.push(cartItem);
  }

  writeCart(items);
  return { message: 'Item added to cart', cartItem };
}

/**
 * Update cart item quantity
 * Returns shape matching backend PATCH /api/cart/:id: { message, cartItem }
 */
export function updateLocalCartItem(id, { quantity }) {
  const items = readCart();
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error('Cart item not found');
  item.quantity = quantity;
  writeCart(items);
  return { message: 'Cart item updated', cartItem: item };
}

/**
 * Remove item from cart
 * Returns shape matching backend DELETE /api/cart/:id: { message }
 */
export function removeFromLocalCart(id) {
  const items = readCart().filter((i) => i.id !== id);
  writeCart(items);
  return { message: 'Item removed from cart' };
}

/**
 * Clear all items from cart
 * Returns shape matching backend DELETE /api/cart: { message }
 */
export function clearLocalCart() {
  writeCart([]);
  return { message: 'Cart cleared' };
}
