import { test, expect } from '@playwright/test';

// Public endpoint — no auth required
// POST /api/checkout/validate-coupon  { code, subtotal }
const API = () => process.env.API_URL || 'http://localhost:3000/api';

test.describe('Coupon Validation API', () => {
  test('validate-coupon with unknown code returns 404 @medium', async ({ request }) => {
    const res = await request.post(`${API()}/checkout/validate-coupon`, {
      data: { code: 'DOESNOTEXIST999', subtotal: 100 },
    });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('validate-coupon without a code returns 400 @medium', async ({ request }) => {
    const res = await request.post(`${API()}/checkout/validate-coupon`, {
      data: { subtotal: 100 },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('validate-coupon is case-insensitive — lowercase code is accepted @medium', async ({ request }) => {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    test.skip(!email || !password, 'Admin credentials not configured');

    // Login as admin (one call, inside the test — no shared token to expire)
    const loginRes = await request.post(`${API()}/auth/login`, { data: { email, password } });
    test.skip(loginRes.status() !== 200, 'Admin login rate-limited — re-run after limiter resets');
    const { token } = await loginRes.json();

    // Create a test coupon
    const code = `TESTCI${Date.now()}`;
    const createRes = await request.post(`${API()}/admin/coupons`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { code, type: 'PERCENTAGE', value: 10, isActive: true },
    });
    expect(createRes.status()).toBe(201);
    const { data: coupon } = await createRes.json();

    try {
      // Validate with lowercase — backend normalises with toUpperCase()
      const validateRes = await request.post(`${API()}/checkout/validate-coupon`, {
        data: { code: code.toLowerCase(), subtotal: 200 },
      });
      expect(validateRes.status()).toBe(200);
      const body = await validateRes.json();
      expect(body.valid).toBe(true);
      expect(body.code).toBe(code);
      expect(body.discountAmount).toBeGreaterThan(0);
    } finally {
      await request.delete(`${API()}/admin/coupons/${coupon.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});
