import { test, expect } from '@playwright/test';

// All admin API tests use the `request` fixture — no browser overhead
const API = () => process.env.API_URL || 'http://localhost:3000/api';

test.describe('Admin API', () => {
  // Login once for the entire describe block — avoids burning auth limiter slots
  let adminToken;

  test.beforeAll(async ({ request }) => {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) return;
    const res = await request.post(`${API()}/auth/login`, { data: { email, password } });
    if (res.status() === 200) {
      adminToken = (await res.json()).token;
    }
  });

  test.beforeEach(() => {
    test.skip(
      !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD,
      'Admin credentials not configured',
    );
  });

  test('GET /admin/stats returns 200 for admin credentials @medium', async ({ request }) => {
    test.skip(!adminToken, 'Admin login failed');
    const res = await request.get(`${API()}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body).toBe('object');
  });

  test('GET /admin/stats returns 401 for unauthenticated requests @critical', async ({ request }) => {
    const res = await request.get(`${API()}/admin/stats`);
    expect(res.status()).toBe(401);
  });

  test('GET /admin/orders returns paginated order list @medium', async ({ request }) => {
    test.skip(!adminToken, 'Admin login failed');
    const res = await request.get(`${API()}/admin/orders?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const orders = body.orders ?? body.data ?? body;
    expect(Array.isArray(orders)).toBe(true);
  });

  test('admin can update a return request status @medium', async ({ request }) => {
    test.skip(!adminToken, 'Admin login failed');

    // Fetch the first return request in the system
    const listRes = await request.get(`${API()}/admin/return-requests`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(listRes.status()).toBe(200);
    const body = await listRes.json();
    const requests = body.requests ?? body.data ?? body;

    // Skip gracefully if no return requests exist yet (run 11-returns first)
    test.skip(
      !Array.isArray(requests) || requests.length === 0,
      'No return requests found — run 11-returns tests first',
    );

    const pending = requests.find((r) => r.status === 'PENDING') ?? requests[0];

    const patchRes = await request.patch(`${API()}/admin/return-requests/${pending.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: 'APPROVED' },
    });
    expect([200, 204]).toContain(patchRes.status());
  });
});
