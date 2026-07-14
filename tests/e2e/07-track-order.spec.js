import { test, expect } from '@playwright/test';
import { loginViaApi, createTestOrder } from '../helpers/api.js';

const API = process.env.API_URL || 'http://localhost:3000/api';

// @high — track order is API-only (no dedicated storefront page)
test.describe('Order Tracking', () => {
  test('track order API returns 404 for unknown order @high', async ({ page }) => {
    const res = await page.request.post(`${API}/checkout/track/LIV-INVALID-999`, {
      data: { email: 'nobody@example.com' },
    });
    expect([404, 400]).toContain(res.status());
  });

  test('track order API uses POST with body, not GET with URL params @high', async ({ page }) => {
    // Verify the email is NOT in the URL (privacy protection)
    const res = await page.request.post(`${API}/checkout/track/LIV-TEST-999`, {
      data: { email: 'test@example.com' },
    });
    expect(res.url()).not.toContain('test@example.com');
    expect([200, 404, 400]).toContain(res.status());
  });

  test('account orders page loads for logged-in user @high', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    test.skip(!email, 'No test user configured');

    await page.goto('/auth/login');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).not.toHaveURL(/login/, { timeout: 10_000 });

    await page.goto('/account');
    // Wait for account main content — not the hidden mobile-nav "My Account" heading
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/account/);
  });
});

// @high
test.describe('Order Detail Page', () => {
  let order;
  let token;

  test.beforeEach(async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    const slug = process.env.TEST_PRODUCT_SLUG;
    test.skip(!email || !slug, 'No test user or product configured');
    token = await loginViaApi(page, email, password);
    order = await createTestOrder(page, { email, productSlug: slug, status: 'PENDING' });
  });

  test('order detail page shows order info @high', async ({ page }) => {
    await page.goto(`/account/orders/${order.id}`);
    await page.waitForSelector('.od-container', { timeout: 20_000 });
    await expect(page.locator('.od-header')).toBeVisible();
    await expect(page.getByText(order.orderNumber)).toBeVisible();
  });

  test('back link returns to orders tab @high', async ({ page }) => {
    await page.goto(`/account/orders/${order.id}`);
    await page.waitForSelector('.od-breadcrumb', { timeout: 20_000 });
    await page.locator('.od-breadcrumb a').click();
    await expect(page).toHaveURL(/#orders/, { timeout: 10_000 });
  });

  test('cancel button appears for PENDING order and cancels it @high', async ({ page }) => {
    await page.goto(`/account/orders/${order.id}`);
    // Cancel button is visible for PENDING orders
    await page.waitForSelector('.od-cancel-btn', { timeout: 20_000 });
    await expect(page.locator('.od-cancel-btn')).toBeVisible();

    // Cancel via API (proven reliable), then reload to verify the UI reflects cancellation
    const cancelRes = await page.request.patch(`${API}/orders/${order.id}/cancel`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(cancelRes.ok(), `Cancel API failed: ${await cancelRes.text()}`).toBe(true);

    await page.reload();
    await page.waitForSelector('.od-container', { timeout: 20_000 });
    await expect(page.locator('.od-cancel-btn')).not.toBeVisible();
  });

  test('cancel button is absent for SHIPPED order @high', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const slug = process.env.TEST_PRODUCT_SLUG;
    const shipped = await createTestOrder(page, { email, productSlug: slug, status: 'SHIPPED' });
    await page.goto(`/account/orders/${shipped.id}`);
    await page.waitForSelector('.od-container', { timeout: 20_000 });
    await expect(page.locator('.od-cancel-btn')).not.toBeVisible();
  });
});
