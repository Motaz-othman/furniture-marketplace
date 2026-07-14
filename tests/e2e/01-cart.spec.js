import { test, expect } from '@playwright/test';

// @critical
test.describe('Cart', () => {
  test('adds product to cart and cart persists on refresh @critical', async ({ page }) => {
    const slug = process.env.TEST_PRODUCT_SLUG;
    test.skip(!slug, 'No published product available');

    await page.goto(`/products/${slug}`);

    // Add to cart
    await page.getByRole('button', { name: /add to cart/i }).first().click();

    // Cart count should be > 0
    await expect(page.getByTestId('cart-count').or(page.locator('.cart-count, .cart-badge'))).toContainText(/[1-9]/);

    // Reload — cart should persist (localStorage)
    await page.reload();
    await expect(page.getByTestId('cart-count').or(page.locator('.cart-count, .cart-badge'))).toContainText(/[1-9]/);
  });

  test('cart page shows added item @critical', async ({ page }) => {
    const slug = process.env.TEST_PRODUCT_SLUG;
    test.skip(!slug, 'No published product available');

    await page.goto(`/products/${slug}`);
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    await page.goto('/cart');

    await expect(page.locator('.cart-item, [data-testid="cart-item"]').first()).toBeVisible();
  });

  test('removes item from cart @critical', async ({ page }) => {
    const slug = process.env.TEST_PRODUCT_SLUG;
    test.skip(!slug, 'No published product available');

    await page.goto(`/products/${slug}`);
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    await page.goto('/cart');

    await page.getByRole('button', { name: /remove/i }).first().click();
    await expect(page.getByText(/your cart is empty|no items/i)).toBeVisible({ timeout: 10_000 });
  });
});
