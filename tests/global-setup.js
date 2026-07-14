import { config } from 'dotenv';
config({ path: '.env.test' });

const API = process.env.API_URL || 'http://localhost:3000/api';

export default async function globalSetup() {
  console.log('\n[setup] Fetching test product from API...');

  // ── 1. Find a published product to use in tests ──────────────────────────
  try {
    const res = await fetch(`${API}/products?limit=1`);
    const data = await res.json();
    const products = data.data ?? [];
    if (products.length > 0) {
      process.env.TEST_PRODUCT_SLUG = products[0].slug;
      process.env.TEST_PRODUCT_NAME = products[0].name;
      console.log(`[setup] Test product: "${products[0].name}" (${products[0].slug})`);

      // Reset the test product's stock to 100 so checkout tests don't deplete it
      try {
        const resetRes = await fetch(`${API}/test-utils/reset-stock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: products[0].slug, quantity: 100 }),
        });
        const resetData = await resetRes.json();
        if (resetData.ok) {
          console.log(`[setup] Reset stock to 100 for ${products[0].slug} (${resetData.updated} variants)`);
        } else {
          console.warn('[setup] Stock reset skipped:', resetData.error);
        }
      } catch (e) {
        console.warn('[setup] Could not reset product stock:', e.message);
      }
    } else {
      console.warn('[setup] No published products found — product page tests will be skipped');
    }
  } catch (err) {
    console.warn('[setup] Could not fetch products:', err.message);
  }

  // ── 2. Ensure test user exists ────────────────────────────────────────────
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    console.warn('[setup] TEST_USER_EMAIL / TEST_USER_PASSWORD not set — auth tests will fail');
    return;
  }

  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        firstName: 'Playwright',
        lastName: 'Test',
        claimGuestOrders: false,
      }),
    });

    if (res.status === 201) {
      console.log(`[setup] Test user created: ${email}`);
    } else if (res.status === 400) {
      console.log(`[setup] Test user already exists: ${email}`);
    } else {
      const body = await res.json();
      console.warn(`[setup] Register returned ${res.status}:`, body);
    }
  } catch (err) {
    console.warn('[setup] Could not create test user:', err.message);
  }
}
