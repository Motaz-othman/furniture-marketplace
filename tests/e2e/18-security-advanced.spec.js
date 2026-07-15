import { test, expect } from '@playwright/test';

// All tests use the `request` fixture — no browser overhead
const API = () => process.env.API_URL || 'http://localhost:3000/api';

async function loginAsCustomer(request) {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  const res = await request.post(`${API()}/auth/login`, {
    data: { email, password },
  });
  expect(res.status()).toBe(200);
  const { token } = await res.json();
  return token;
}

test.describe('Security Advanced', () => {
  // ── JWT hardening ─────────────────────────────────────────────────────────

  test('malformed JWT string returns 401 on a protected endpoint @critical', async ({ request }) => {
    const res = await request.get(`${API()}/auth/me`, {
      headers: { Authorization: 'Bearer this.is.not.a.valid.jwt' },
    });
    expect(res.status()).toBe(401);
  });

  test('completely absent Authorization header returns 401 on protected endpoint @critical', async ({ request }) => {
    const res = await request.get(`${API()}/orders/customer`);
    expect(res.status()).toBe(401);
  });

  // ── RBAC ─────────────────────────────────────────────────────────────────

  test('customer token is rejected on admin endpoint with 403 @critical', async ({ request }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    test.skip(!email || !password, 'No test user configured');

    const customerToken = await loginAsCustomer(request);

    const res = await request.get(`${API()}/admin/stats`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    // Admin middleware returns 403 for authenticated non-admin users
    expect(res.status()).toBe(403);
  });

  // ── Injection safety ──────────────────────────────────────────────────────

  test('search endpoint returns 200 for SQL injection payload — no 500 @medium', async ({ request }) => {
    // These chars are harmless to Prisma/parameterized queries but would break raw SQL
    const malicious = `' OR 1=1 --`;
    const res = await request.get(`${API()}/search?q=${encodeURIComponent(malicious)}`);
    // Must not 500 — safe parameterized query handles this transparently
    expect(res.status()).not.toBe(500);
    expect([200, 400, 404]).toContain(res.status());
  });

  test('search endpoint returns 200 for XSS payload in query — no 500 @medium', async ({ request }) => {
    const xss = `<script>alert('xss')</script>`;
    const res = await request.get(`${API()}/search?q=${encodeURIComponent(xss)}`);
    expect(res.status()).not.toBe(500);
    expect([200, 400, 404]).toContain(res.status());
    // Response must be JSON — not raw HTML that would reflect the script tag
    const ct = res.headers()['content-type'] ?? '';
    expect(ct).toContain('application/json');
  });
});
