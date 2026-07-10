import { post } from './client';

export async function guestCheckout(data) {
  return post('/checkout/guest', data, { timeout: 30000 });
}

export async function validateCoupon(code, subtotal) {
  return post('/checkout/validate-coupon', { code, subtotal });
}

export async function trackOrder(orderNumber, email) {
  return post(`/checkout/track/${orderNumber}`, { email });
}
