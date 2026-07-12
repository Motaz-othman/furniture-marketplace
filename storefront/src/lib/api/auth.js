/**
 * Auth API - Authentication endpoints
 * Always calls real backend API (never fake data)
 */

import { post, get, put, del } from './client';

/**
 * Extract a human-readable error message from backend error responses.
 * Backend format: { error: 'message' } or { error: 'Validation failed', details: [{ field, message }] }
 */
export function getAuthError(err, fallback = 'Something went wrong') {
  const data = err.response?.data;
  if (!data) return fallback;

  // Validation errors with field-level details
  if (data.details && data.details.length > 0) {
    return data.details.map(d => d.message).join('. ');
  }

  return data.error || fallback;
}

export async function loginUser({ email, password }) {
  return post('/auth/login', { email, password });
}

export async function registerUser({ email, password, firstName, lastName }) {
  return post('/auth/register', { email, password, firstName, lastName, claimGuestOrders: true });
}

export async function getMe() {
  return get('/auth/me');
}

export async function updateProfile(data) {
  return put('/auth/profile', data);
}

export async function changePassword({ currentPassword, newPassword }) {
  return put('/auth/change-password', { currentPassword, newPassword });
}

export async function forgotPassword({ email }) {
  return post('/auth/forgot-password', { email });
}

export async function resetPassword({ token, newPassword }) {
  return post('/auth/reset-password', { token, newPassword });
}

export async function deleteAccount() {
  return del('/auth/account');
}

export async function verifyEmail(token) {
  return get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
}

export async function resendVerification() {
  return post('/auth/resend-verification', {});
}
