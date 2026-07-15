import { test, expect } from '@playwright/test';

// All tests use the `request` fixture — no browser
const API = () => process.env.API_URL || 'http://localhost:3000/api';

test.describe('Password Reset Flow', () => {
  test('forgot-password returns 200 for unknown email — no account existence leak @medium', async ({ request }) => {
    const res = await request.post(`${API()}/auth/forgot-password`, {
      data: { email: `nonexistent-${Date.now()}@playwright-test.com` },
    });
    // Must not reveal whether the email exists — always returns 200
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/if that email exists/i);
  });

  test('reset-password with invalid token returns 400 @medium', async ({ request }) => {
    // Use a valid-format 64-char hex token that won't match any user in the DB.
    // The schema validates the token format before the controller runs, so a
    // random-looking string that matches the hex format reaches the controller,
    // which then returns 400 "Invalid or expired reset token".
    const fakeHexToken = 'a'.repeat(64);
    const res = await request.post(`${API()}/auth/reset-password`, {
      data: { token: fakeHexToken, password: 'NewPassword123!' },
    });
    expect(res.status()).toBe(400);
  });

  test('reset-password without a token returns 400 @medium', async ({ request }) => {
    const res = await request.post(`${API()}/auth/reset-password`, {
      data: { password: 'NewPassword123!' },
    });
    // Missing required field — validation should reject it
    expect([400, 422]).toContain(res.status());
  });
});
