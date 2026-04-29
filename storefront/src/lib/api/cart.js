/**
 * Cart API
 * Handles cart operations with real API or fake data fallback
 */

import { handleApiCall, get, post, patch, del } from './client';
import {
  getLocalCart,
  addToLocalCart,
  updateLocalCartItem,
  removeFromLocalCart,
  clearLocalCart,
} from '@/lib/fake-data/cart';

export async function getCart() {
  return handleApiCall(
    async () => get('/cart'),
    () => getLocalCart()
  );
}

export async function addToCart({ productId, variantId, quantity }) {
  return handleApiCall(
    async () => post('/cart', { productId, variantId, quantity }),
    () => addToLocalCart({ productId, variantId, quantity })
  );
}

export async function updateCartItem(id, { quantity }) {
  return handleApiCall(
    async () => patch(`/cart/${id}`, { quantity }),
    () => updateLocalCartItem(id, { quantity })
  );
}

export async function removeCartItem(id) {
  return handleApiCall(
    async () => del(`/cart/${id}`),
    () => removeFromLocalCart(id)
  );
}

export async function clearCart() {
  return handleApiCall(
    async () => del('/cart'),
    () => clearLocalCart()
  );
}
