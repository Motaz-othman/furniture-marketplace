import { test, expect } from '@playwright/test';
import { fillShippingStep } from '../helpers/checkout.js';
import { fillStripeCard } from '../helpers/stripe.js';

// @critical
test.describe('Guest Checkout', () => {
  test.beforeEach(async ({ page }) => {
    const slug = process.env.TEST_PRODUCT_SLUG;
    test.skip(!slug, 'No published product available');

    // Add product to cart and wait for localStorage to confirm item is stored
    await page.goto(`/products/${slug}`);
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    await page.waitForFunction(
      () => {
        try { return JSON.parse(localStorage.getItem('livipoint_cart') || '[]').length > 0; }
        catch { return false; }
      },
      { timeout: 5000 },
    ).catch(() => {}); // graceful — CheckoutContent now waits for cartLoading
  });

  test('completes guest checkout end-to-end @critical', async ({ page }) => {
    await page.goto('/checkout');

    // ── Step 1: Shipping ────────────────────────────────────────────────────
    const guestEmail = `guest+${Date.now()}@playwright.com`;
    await fillShippingStep(page, { email: guestEmail });
    await page.getByRole('button', { name: /continue|next/i }).first().click();

    // ── Step 2: Delivery method ─────────────────────────────────────────────
    // Select first available delivery option
    const deliveryOption = page.locator('.delivery-option, [data-testid="delivery-option"]').first();
    if (await deliveryOption.isVisible()) {
      await deliveryOption.click();
    }
    await page.getByRole('button', { name: /continue|next/i }).first().click();

    // ── Step 3: Review ──────────────────────────────────────────────────────
    await expect(page.getByText(/review|order summary/i).first()).toBeVisible();
    await page.getByRole('button', { name: /continue to payment|place order|pay/i }).first().click();

    // ── Step 4: Payment ─────────────────────────────────────────────────────
    await fillStripeCard(page);
    await page.getByRole('button', { name: /pay|place order|complete/i }).last().click();

    // ── Confirmation ────────────────────────────────────────────────────────
    await expect(page.getByText(/order confirmed|thank you|order number/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test('shows validation errors when shipping form is empty @critical', async ({ page }) => {
    await page.goto('/checkout');
    await page.getByRole('button', { name: /continue|next/i }).first().click();

    // Should show at least one error
    await expect(page.locator('.error, [class*="error"], [aria-invalid="true"]').first()).toBeVisible();
  });

  test('invalid card shows Stripe error @critical', async ({ page }) => {
    await page.goto('/checkout');
    await fillShippingStep(page, { email: `guest+${Date.now()}@playwright.com` });
    await page.getByRole('button', { name: /continue|next/i }).first().click();

    const deliveryOption = page.locator('.delivery-option, [data-testid="delivery-option"]').first();
    if (await deliveryOption.isVisible()) await deliveryOption.click();
    await page.getByRole('button', { name: /continue|next/i }).first().click();
    await page.getByRole('button', { name: /continue to payment|place order|pay/i }).first().click();

    // Fill with a declined card number
    await fillStripeCard(page, '4000 0000 0000 0002');

    await page.getByRole('button', { name: /pay|place order|complete/i }).last().click();

    // Should show a payment error
    await expect(page.getByText(/declined|card was declined|payment failed/i)).toBeVisible({ timeout: 20_000 });
  });
});
