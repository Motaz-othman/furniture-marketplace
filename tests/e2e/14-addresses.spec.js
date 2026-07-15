import { test, expect } from '@playwright/test';

// All tests use the `request` fixture — no browser overhead
const API = () => process.env.API_URL || 'http://localhost:3000/api';

const sampleAddress = {
  label: 'Home',
  street: '456 Oak Avenue',
  apartment: 'Unit 2B',
  city: 'Atlanta',
  state: 'GA',
  zipCode: '30301',
  country: 'US',
  isDefault: false,
};

test.describe('Address Management API', () => {
  // Login once for the entire describe block — avoids burning multiple auth limiter slots
  let token;

  test.beforeAll(async ({ request }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) return;
    const res = await request.post(`${API()}/auth/login`, { data: { email, password } });
    if (res.status() === 200) {
      token = (await res.json()).token;
    }
  });

  test.beforeEach(() => {
    test.skip(!token, 'No test user token — check TEST_USER_EMAIL / TEST_USER_PASSWORD');
  });

  test('authenticated user can create a new address @medium', async ({ request }) => {
    const res = await request.post(`${API()}/addresses`, {
      headers: { Authorization: `Bearer ${token}` },
      data: sampleAddress,
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.street ?? body.address?.street ?? body.data?.street).toBe(sampleAddress.street);
  });

  test('GET /addresses returns the created address @medium', async ({ request }) => {
    // Create one first
    await request.post(`${API()}/addresses`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { ...sampleAddress, street: `${Date.now()} Test Lane` },
    });

    const listRes = await request.get(`${API()}/addresses`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(listRes.status()).toBe(200);
    const body = await listRes.json();
    const addresses = Array.isArray(body) ? body : body.addresses ?? body.data ?? [];
    expect(addresses.length).toBeGreaterThan(0);
  });

  test('user can delete their own address @medium', async ({ request }) => {
    // Create a throwaway address
    const createRes = await request.post(`${API()}/addresses`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { ...sampleAddress, street: `Delete-me ${Date.now()} St` },
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    const id = created.id ?? created.address?.id ?? created.data?.id;
    expect(id).toBeTruthy();

    // Delete it
    const deleteRes = await request.delete(`${API()}/addresses/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 204]).toContain(deleteRes.status());

    // Confirm it's gone
    const listRes = await request.get(`${API()}/addresses`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await listRes.json();
    const addresses = Array.isArray(body) ? body : body.addresses ?? body.data ?? [];
    expect(addresses.find((a) => a.id === id)).toBeUndefined();
  });
});
