import { test, expect } from '@playwright/test';
import { fillShippingStep } from '../helpers/checkout.js';

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
});
