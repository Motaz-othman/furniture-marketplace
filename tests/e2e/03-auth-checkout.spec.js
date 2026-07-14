import { test, expect } from '@playwright/test';
import { loginViaApi } from '../helpers/api.js';
import { fillShippingStep } from '../helpers/checkout.js';
import { fillStripeCard } from '../helpers/stripe.js';

// @critical
test.describe('Authenticated Checkout', () => {
  test.beforeEach(async ({ page }) => {
    // Auth checkout has a heavy beforeEach (login + cart clear + page nav) and Stripe
    // rendering takes 15-30s on top of that — 60s global timeout is too tight.
    test.setTimeout(120_000);

    const slug = process.env.TEST_PRODUCT_SLUG;
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    const API = process.env.API_URL || 'http://localhost:3000/api';
    test.skip(!slug || !email, 'No product or test user available');

    // Login via API first so we can clear the backend cart before the UI test.
    // Without this, each retry accumulates items (backend cart persists across runs).
    const token = await loginViaApi(page, email, password);
    await page.request.delete(`${API}/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});

    // Navigate to the product page, then wait for the Add to Cart API response
    await page.goto(`/products/${slug}`);
    await page.waitForSelector('.btn-add-to-cart, [class*="add-to-cart"]', { timeout: 15_000 });

    // Register the response watcher AFTER the page has loaded so we don't catch an unrelated request
    const cartResponsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/cart') && r.request().method() !== 'GET',
      { timeout: 10_000 },
    );
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    await cartResponsePromise.catch(() => page.waitForTimeout(1500));
  });

  async function fillCheckoutStep1(page) {
    // Wait for checkout to finish loading before inspecting the form
    await page.waitForSelector('.checkout-steps, #firstName, .saved-address-card', { timeout: 30_000 });

    if (await page.locator('#street').isVisible()) {
      // Guest / no saved address — fill the form manually
      await fillShippingStep(page);
    } else {
      // Auth user with saved address cards. getAddresses() is async, so the
      // auto-selection useEffect may not have set address state yet when the
      // card appears. Clicking the card calls selectSavedAddress() synchronously,
      // ensuring address.street is populated before validateStep1() runs.
      const firstCard = page.locator('.saved-address-card').first();
      if (await firstCard.isVisible()) await firstCard.click();
    }

    // Phone is required by validateStep1 but the test user profile may not have one
    const phoneField = page.locator('#phone');
    if (await phoneField.isVisible()) {
      const current = await phoneField.inputValue();
      if (!current.trim()) await phoneField.fill('4045550123');
    }

    await page.getByRole('button', { name: /continue to delivery/i }).click({ timeout: 15_000 });
  }

  async function fillCheckoutStep2(page) {
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /continue to review/i }).click({ timeout: 15_000 });
  }

  test('logged-in user completes checkout @critical', async ({ page }) => {
    await page.goto('/checkout');
    await fillCheckoutStep1(page);
    await fillCheckoutStep2(page);

    // Step 3 — review
    await expect(page.getByRole('heading', { name: /review your order|order summary/i }).first())
      .toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /continue to payment/i }).click({ timeout: 15_000 });

    // Step 4 — payment
    await fillStripeCard(page);
    await page.getByRole('button', { name: /pay|place order|complete/i }).last().click();

    // Confirmation
    await expect(page.getByText(/order confirmed|thank you|order number/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test('order appears in account after checkout @critical', async ({ page }) => {
    await page.goto('/checkout');
    await fillCheckoutStep1(page);
    await fillCheckoutStep2(page);

    await page.getByRole('button', { name: /continue to payment/i }).click({ timeout: 15_000 });
    await fillStripeCard(page);
    await page.getByRole('button', { name: /pay|place order|complete/i }).last().click();
    await expect(page.getByText(/order confirmed|thank you/i).first()).toBeVisible({ timeout: 30_000 });

    // Navigate to account and check orders tab is populated
    await page.goto('/account');
    // Click the Orders tab so the orders list renders
    await page.getByRole('button', { name: 'Orders' }).first().click();
    await expect(page.locator('.order-card, [data-testid="order-item"], table tbody tr').first())
      .toBeVisible({ timeout: 15_000 });
  });
});
