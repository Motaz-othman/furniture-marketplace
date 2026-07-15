import { test, expect } from '@playwright/test';
import { fillShippingStep } from '../helpers/checkout.js';
import { fillStripeCard } from '../helpers/stripe.js';

const API = () => process.env.API_URL || 'http://localhost:3000/api';

// @medium — coupon field is on Step 3 (Review) of the 4-step checkout
test.describe('Coupon Codes', () => {
  test.beforeEach(async ({ page }) => {
    const slug = process.env.TEST_PRODUCT_SLUG;
    test.skip(!slug, 'No published product available');

    await page.goto(`/products/${slug}`);
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    await page.waitForFunction(
      () => {
        try { return JSON.parse(localStorage.getItem('livipoint_cart') || '[]').length > 0; }
        catch { return false; }
      },
      { timeout: 5000 },
    ).catch(() => {});
    await page.goto('/checkout');
    // Wait for checkout step 1 to be ready
    await page.waitForSelector('#firstName', { timeout: 15_000 });
  });

  async function progressToReview(page) {
    await fillShippingStep(page);
    await page.getByRole('button', { name: /continue to delivery/i }).click();

    // Step 2 — pick first delivery option if any, then continue
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /continue to review/i }).click({ timeout: 15_000 });

    // Step 3 should now be visible
    await page.waitForSelector('.checkout-coupon-input, input[placeholder*="coupon" i]', { timeout: 15_000 });
  }

  test('coupon field is present on checkout review step @medium', async ({ page }) => {
    await progressToReview(page);
    const couponField = page.locator('.checkout-coupon-input, input[placeholder*="coupon" i]');
    await expect(couponField.first()).toBeVisible({ timeout: 10_000 });
  });

  test('invalid coupon shows error @medium', async ({ page }) => {
    await progressToReview(page);

    const couponField = page.locator('.checkout-coupon-input, input[placeholder*="coupon" i]');
    if (await couponField.first().isVisible()) {
      await couponField.first().fill('INVALIDCOUPON999');
      await page.locator('.checkout-coupon-btn').click();
      await expect(page.getByText(/invalid|not found|expired/i)).toBeVisible({ timeout: 10_000 });
    }
  });

  test('valid coupon reduces order total and checkout completes @high', async ({ page, request }) => {
    test.setTimeout(180_000);

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    test.skip(!adminEmail || !adminPassword, 'Admin credentials not configured');

    // Create a $10 FIXED coupon via admin API — inline so it can be cleaned up in finally
    const loginRes = await request.post(`${API()}/auth/login`, {
      data: { email: adminEmail, password: adminPassword },
    });
    test.skip(loginRes.status() !== 200, 'Admin login rate-limited — re-run after limiter resets');
    const { token } = await loginRes.json();

    const couponCode = `E2E${Date.now()}`;
    const createRes = await request.post(`${API()}/admin/coupons`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { code: couponCode, type: 'FIXED', value: 10, isActive: true },
    });
    expect(createRes.status()).toBe(201);
    const { data: coupon } = await createRes.json();

    try {
      // beforeEach already navigated to /checkout step 1
      await progressToReview(page);

      // Apply the coupon
      const couponInput = page.locator('.checkout-coupon-input, input[placeholder*="coupon" i]').first();
      await couponInput.fill(couponCode);
      await page.locator('.checkout-coupon-btn').click();

      // Badge shows the code was accepted
      await expect(page.locator('.checkout-coupon-applied')).toBeVisible({ timeout: 10_000 });

      // Savings line shows −$10.00
      await expect(page.locator('.checkout-coupon-saving')).toContainText('10', { timeout: 5_000 });

      // Discount row in the order summary sidebar also shows the deduction
      await expect(
        page.locator('.summary-discount, [class*="summary-discount"]').first()
      ).toBeVisible({ timeout: 5_000 });

      // Complete checkout — coupon code is sent with the order payload
      await page.getByRole('button', { name: /continue to payment/i }).click({ timeout: 15_000 });
      await fillStripeCard(page);
      await page.getByRole('button', { name: /pay|place order|complete/i }).last().click();

      // Confirm the order was created
      await expect(
        page.getByText(/order confirmed|thank you|order number/i).first()
      ).toBeVisible({ timeout: 30_000 });
    } finally {
      // Always remove the fixture coupon regardless of test outcome
      await request.delete(`${API()}/admin/coupons/${coupon.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  });
});
