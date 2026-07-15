import { test, expect } from '@playwright/test';

// @medium — cart quantity controls and clear-cart
test.describe('Cart Advanced', () => {
  test.beforeEach(() => {
    test.setTimeout(120_000);
  });

  // Navigate to the product page and click "Add to Cart".
  // Waits specifically for `.btn-add-to-cart` so we don't resolve on
  // unrelated buttons (mobile menu, header icons, etc.) before hydration.
  async function addProductToCart(page) {
    const slug = process.env.TEST_PRODUCT_SLUG;
    test.skip(!slug, 'No published product available');

    await page.goto(`/products/${slug}`, { waitUntil: 'domcontentloaded' });

    // Wait for the exact PDP add-to-cart button (class set by ProductDetailContent)
    await page.waitForSelector('.btn-add-to-cart', { timeout: 30_000 });
    await page.locator('.btn-add-to-cart').first().click();

    // Cart badge must show at least 1 item
    await expect(
      page.getByTestId('cart-count').or(page.locator('.cart-count, .cart-badge'))
    ).toContainText(/[1-9]/, { timeout: 15_000 });
  }

  // Clear all items via the cart page's own "Clear Cart" button so we start
  // from a known empty state without touching localStorage directly.
  async function emptyCart(page) {
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    const clearBtn = page.locator('.cart-clear-btn');
    if (await clearBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await clearBtn.click();
      await expect(page.getByText(/your cart is empty|no items/i)).toBeVisible({ timeout: 10_000 });
    }
  }

  test('cart quantity + button increments the item count @medium', async ({ page }) => {
    await addProductToCart(page);
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });

    const qtyContainer = page.locator('.cart-item-quantity').first();
    await expect(qtyContainer).toBeVisible({ timeout: 10_000 });

    const qtySpan = qtyContainer.locator('span');
    const before = parseInt(await qtySpan.textContent(), 10);

    await qtyContainer.locator('.qty-btn').last().click();

    await expect(qtySpan).toHaveText(String(before + 1), { timeout: 10_000 });
  });

  test('cart quantity − button is disabled when quantity is 1 @medium', async ({ page }) => {
    // Start fresh so we know qty begins at 1
    await emptyCart(page);
    await addProductToCart(page);
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });

    const qtyContainer = page.locator('.cart-item-quantity').first();
    await expect(qtyContainer).toBeVisible({ timeout: 10_000 });

    const decrementBtn = qtyContainer.locator('.qty-btn').first();
    await expect(decrementBtn).toBeDisabled();

    // Increment to 2 — then − becomes enabled
    await qtyContainer.locator('.qty-btn').last().click();
    await expect(qtyContainer.locator('span')).toHaveText('2', { timeout: 10_000 });
    await expect(decrementBtn).toBeEnabled();
  });

  test('clear cart button empties the cart @medium', async ({ page }) => {
    await addProductToCart(page);
    await page.goto('/cart', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('.cart-item, [data-testid="cart-item"]').first()).toBeVisible({ timeout: 10_000 });

    await page.locator('.cart-clear-btn').click();

    await expect(page.getByText(/your cart is empty|no items/i)).toBeVisible({ timeout: 10_000 });
  });
});
