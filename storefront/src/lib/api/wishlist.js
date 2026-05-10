import { get, post, del } from './client';

export async function getWishlist() {
  return get('/wishlist');
}

export async function addToWishlist(productId) {
  return post('/wishlist', { productId });
}

export async function removeFromWishlist(id) {
  return del(`/wishlist/${id}`);
}
