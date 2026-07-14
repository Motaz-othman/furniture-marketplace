import { test, expect } from '@playwright/test';

const API = () => process.env.API_URL || 'http://localhost:3000/api';

// Helper — logs in and returns both tokens
async function loginAs(request, email, password) {
  const res = await request.post(`${API()}/auth/login`, {
    data: { email, password },
  });
  expect(res.status()).toBe(200);
  return res.json(); // { token, refreshToken, user }
}

test.describe('Security Regressions', () => {
  // ── JWT ────────────────────────────────────────────────────────────────────

  test('refresh token is rejected when used as an access token @critical', async ({ request }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    test.skip(!email || !password, 'No test user configured');

    const { refreshToken } = await loginAs(request, email, password);

    // Refresh token is signed with JWT_REFRESH_SECRET — must NOT be accepted
    // as an access token (which is verified with JWT_SECRET).
    const res = await request.get(`${API()}/auth/me`, {
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    expect(res.status()).toBe(401);
  });

  test('refresh token is invalidated after logout @critical', async ({ request }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    test.skip(!email || !password, 'No test user configured');

    const { token, refreshToken } = await loginAs(request, email, password);

    // Logout increments tokenVersion in DB, invalidating all issued refresh tokens
    const logoutRes = await request.post(`${API()}/auth/logout`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(logoutRes.status()).toBe(200);

    // The old refresh token should now be rejected
    const refreshRes = await request.post(`${API()}/auth/refresh`, {
      data: { refreshToken },
    });
    expect(refreshRes.status()).toBe(401);
  });

  // ── Account security ───────────────────────────────────────────────────────

  test('account deletion without password is rejected @critical', async ({ request }) => {
    // Use a throwaway account so we never risk deleting the real test user
    const tempEmail = `security-delete-${Date.now()}@playwright-test.com`;
    const tempPassword = 'Playwright123!';

    await request.post(`${API()}/auth/register`, {
      data: { email: tempEmail, password: tempPassword, firstName: 'Sec', lastName: 'Test', claimGuestOrders: false },
    });

    const { token } = await loginAs(request, tempEmail, tempPassword);

    // No password in body — rejected by schema validation (400) before hitting the controller
    const resNoPassword = await request.delete(`${API()}/auth/account`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    });
    expect([400, 401]).toContain(resNoPassword.status());

    // Wrong password — must also be rejected
    const resWrongPassword = await request.delete(`${API()}/auth/account`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { password: 'WrongPassword!' },
    });
    expect(resWrongPassword.status()).toBe(401);

    // Correct password — must succeed (and cleans up the throwaway account)
    const resCorrect = await request.delete(`${API()}/auth/account`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { password: tempPassword },
    });
    expect(resCorrect.status()).toBe(200);
  });

  // ── Stripe webhook ─────────────────────────────────────────────────────────

  test('webhook with missing stripe-signature returns 400 @critical', async ({ request }) => {
    const res = await request.post(`${API()}/payments/webhook`, {
      data: JSON.stringify({ type: 'payment_intent.succeeded', data: {} }),
      headers: { 'Content-Type': 'application/json' },
      // Intentionally no stripe-signature header
    });
    expect(res.status()).toBe(400);
  });

  test('webhook with invalid stripe-signature returns 400 @critical', async ({ request }) => {
    const res = await request.post(`${API()}/payments/webhook`, {
      data: JSON.stringify({ type: 'payment_intent.succeeded', data: {} }),
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=123,v1=invalidsignature',
      },
    });
    expect(res.status()).toBe(400);
  });

  // ── Guest order tracking ───────────────────────────────────────────────────

  test('guest order tracking uses POST body — no GET route exists @medium', async ({ request }) => {
    // GET /checkout/track/:orderNumber must not exist (email would be in URL = logged everywhere)
    const res = await request.get(`${API()}/checkout/track/FAKE-ORDER?email=test@example.com`);
    expect(res.status()).toBe(404);
  });

  test('guest order tracking POST returns 404 for unknown order (not 500) @medium', async ({ request }) => {
    const res = await request.post(`${API()}/checkout/track/NONEXISTENT-ORDER-XYZ`, {
      data: { email: 'nobody@example.com' },
    });
    // 404 = order not found (correct). 400 = validation error. NOT 500 = no server crash.
    expect([400, 404]).toContain(res.status());
  });

  // ── Rate limiting ──────────────────────────────────────────────────────────

  test('GET product endpoint is covered by a rate limiter @medium', async ({ request }) => {
    // Send enough requests to confirm a limiter is configured (we check the header,
    // not that we actually get rate-limited — triggering the limit would slow CI).
    const res = await request.get(`${API()}/products?limit=1`);
    expect(res.status()).toBe(200);
    // express-rate-limit adds RateLimit-* headers when standardHeaders: true
    const remaining = res.headers()['ratelimit-remaining'] ?? res.headers()['x-ratelimit-remaining'];
    expect(remaining).toBeDefined();
  });

  // ── Unauthenticated access to protected endpoints ──────────────────────────

  test('unauthenticated request to customer orders returns 401 @critical', async ({ request }) => {
    const res = await request.get(`${API()}/orders/customer`);
    expect(res.status()).toBe(401);
  });

  test('unauthenticated return request is rejected with 401 @critical', async ({ request }) => {
    const res = await request.post(`${API()}/orders/some-order-id/request-return`, {
      data: { items: [{ orderItemId: 'some-item-id', quantity: 1, reason: 'Damaged' }] },
    });
    expect(res.status()).toBe(401);
  });

  // ── IDOR (Insecure Direct Object Reference) ────────────────────────────────

  test('customer cannot read another user\'s order (IDOR) @critical', async ({ request }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    test.skip(!email || !password, 'No test user configured');

    // Fetch an order ID that belongs to the test user (user A)
    const { token: tokenA } = await loginAs(request, email, password);
    const ordersRes = await request.get(`${API()}/orders/customer`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const { orders } = await ordersRes.json();
    test.skip(!orders?.length, 'Test user has no orders — run checkout tests first');
    const orderIdA = orders[0].id;

    // Register a throwaway user B and get their token
    const emailB = `idor-read-${Date.now()}@playwright-test.com`;
    await request.post(`${API()}/auth/register`, {
      data: { email: emailB, password: 'Playwright123!', firstName: 'IDOR', lastName: 'Read', claimGuestOrders: false },
    });
    const { token: tokenB } = await loginAs(request, emailB, 'Playwright123!');

    // User B must be denied access to user A's order
    const res = await request.get(`${API()}/orders/${orderIdA}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect([403, 404]).toContain(res.status());
  });

  test('customer cannot submit return for another user\'s order (IDOR) @critical', async ({ request }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    test.skip(!email || !password, 'No test user configured');

    // Fetch an order ID that belongs to the test user (user A)
    const { token: tokenA } = await loginAs(request, email, password);
    const ordersRes = await request.get(`${API()}/orders/customer`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const { orders } = await ordersRes.json();
    test.skip(!orders?.length, 'Test user has no orders — run checkout tests first');
    const orderIdA = orders[0].id;

    // Register a throwaway user B and get their token
    const emailB = `idor-return-${Date.now()}@playwright-test.com`;
    await request.post(`${API()}/auth/register`, {
      data: { email: emailB, password: 'Playwright123!', firstName: 'IDOR', lastName: 'Return', claimGuestOrders: false },
    });
    const { token: tokenB } = await loginAs(request, emailB, 'Playwright123!');

    // User B must not be able to submit a return for user A's order
    // returns controller: order.customerId !== customerId → 404
    const res = await request.post(`${API()}/orders/${orderIdA}/request-return`, {
      headers: { Authorization: `Bearer ${tokenB}` },
      data: { items: [{ orderItemId: 'any-item-id', quantity: 1, reason: 'Item arrived damaged or defective' }] },
    });
    expect([403, 404]).toContain(res.status());
  });

  // ── Password security ──────────────────────────────────────────────────────

  test('change-password with wrong current password is rejected @critical', async ({ request }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    test.skip(!email || !password, 'No test user configured');

    const { token } = await loginAs(request, email, password);

    const res = await request.put(`${API()}/auth/change-password`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { currentPassword: 'DefinitelyWrongPassword99!', newPassword: 'NewPassword99!' },
    });
    // Controller returns 400 ("Current password is incorrect") when the hash comparison fails
    expect(res.status()).toBe(400);
  });

  // ── Rate limiting (auth) ───────────────────────────────────────────────────

  test('auth login endpoint is covered by a rate limiter @medium', async ({ request }) => {
    // Send a well-formed request that fails auth so we can inspect the response headers.
    // We check that the limiter is wired up (headers present), not that it fires.
    const res = await request.post(`${API()}/auth/login`, {
      data: { email: 'ratelimit-probe@playwright-test.com', password: 'WrongPassword123!' },
    });
    expect([401, 429]).toContain(res.status());
    const remaining = res.headers()['ratelimit-remaining'] ?? res.headers()['x-ratelimit-remaining'];
    expect(remaining).toBeDefined();
  });
});
