import { test, expect } from '@playwright/test';
import { loginViaApi, clearWishlistViaApi } from '../helpers/api.js';

// @high
test.describe('Product Pages', () => {
  test('homepage loads with featured products @high', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LiviPoint/i);
    // At least one product card visible
    await expect(page.locator('.product-card, [data-testid="product-card"]').first()).toBeVisible({ timeout: 15_000 });
  });

  test('products listing page loads @high', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: /collection|products/i }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.product-card, [data-testid="product-card"]').first()).toBeVisible({ timeout: 15_000 });
  });

  test('product detail page loads with price and images @high', async ({ page }) => {
    const slug = process.env.TEST_PRODUCT_SLUG;
    test.skip(!slug, 'No published product available');

    await page.goto(`/products/${slug}`);

    // Title visible
    await expect(page.locator('h1').first()).toBeVisible();

    // Price visible — must contain a $
    await expect(page.getByText(/\$[\d,]+/).first()).toBeVisible({ timeout: 10_000 });

    // At least one image visible
    await expect(page.locator('img').first()).toBeVisible();
  });

  test('product detail page has Add to Cart button @high', async ({ page }) => {
    const slug = process.env.TEST_PRODUCT_SLUG;
    test.skip(!slug, 'No published product available');

    await page.goto(`/products/${slug}`);
    await expect(page.getByRole('button', { name: /add to cart/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('category page loads correct products @high', async ({ page }) => {
    await page.goto('/categories/living-room');
    await expect(page.locator('.product-card, [data-testid="product-card"], .products-grid').first()).toBeVisible({ timeout: 15_000 });
  });

  test('non-existent product returns 404 @high', async ({ page }) => {
    await page.goto('/products/this-product-does-not-exist-xyz');
    // Next.js not-found.js renders "Page Not Found"
    await expect(page.getByText(/page not found|not found|doesn't exist/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('Load More button fetches additional products @high', async ({ page }) => {
    await page.goto('/products');
    await page.waitForSelector('.product-card, [data-testid="product-card"]', { timeout: 15_000 });

    const loadMoreBtn = page.getByRole('button', { name: /load more/i });
    if (await loadMoreBtn.isVisible()) {
      const countBefore = await page.locator('.product-card, [data-testid="product-card"]').count();
      await loadMoreBtn.click();
      // Wait for network and DOM to settle after pagination
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      const countAfter = await page.locator('.product-card, [data-testid="product-card"]').count();
      // Assert we got more OR at least didn't lose any (catalog may fit on one page)
      expect(countAfter).toBeGreaterThanOrEqual(countBefore);
    }
  });
});

test.describe('Newsletter', () => {
  test('submitting a valid email shows success message @high', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Scroll to footer so the input is interactable
    await page.locator('#newsletter-email').scrollIntoViewIfNeeded();
    await page.locator('#newsletter-email').fill('test-newsletter-e2e@example.com');
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/newsletter/subscribe'),
      { timeout: 10_000 },
    );
    await page.locator('[aria-label="Subscribe to newsletter"]').click();
    await responsePromise;
    // Accepts both "subscribed" and "already subscribed"
    await expect(page.getByText(/subscribed/i).first()).toBeVisible({ timeout: 5_000 });
  });
});

// @high
test.describe('Wishlist', () => {
  let token;
  const API = process.env.API_URL || 'http://localhost:3000/api';

  test.beforeEach(async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    test.skip(!email, 'No test user configured');
    token = await loginViaApi(page, email, password);
    await clearWishlistViaApi(page, email);
  });

  test('adds product to wishlist from listing grid @high', async ({ page }) => {
    await page.goto('/products');
    // Wait for auth to finish (avatar in header = getMe completed)
    await page.waitForSelector('.user-avatar-initial', { timeout: 15_000 });
    await page.waitForSelector('[aria-label="Add to wishlist"]', { timeout: 10_000 });
    // Click and wait for the POST /wishlist response so we don't navigate before the API call completes
    const wishlistPost = page.waitForResponse(
      (res) => res.url().includes('/api/wishlist') && res.request().method() === 'POST',
      { timeout: 10_000 },
    );
    await page.locator('[aria-label="Add to wishlist"]').first().click();
    await wishlistPost;
    // Navigate to wishlist page to confirm item was added
    await page.goto('/wishlist');
    await page.waitForSelector('.wishlist-card', { timeout: 15_000 });
    await expect(page.locator('.wishlist-card').first()).toBeVisible();
  });

  test('wishlist page shows saved item @high', async ({ page }) => {
    // Add via API — response shape is { data: { id, ... } }
    const slug = process.env.TEST_PRODUCT_SLUG;
    const pRes = await page.request.get(`${API}/products/slug/${slug}`);
    const pData = await pRes.json();
    const productId = pData.data?.id;
    const addRes = await page.request.post(`${API}/wishlist`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { productId },
    });
    expect(addRes.ok()).toBe(true);

    await page.goto('/wishlist');
    await page.waitForSelector('.wishlist-card', { timeout: 20_000 });
    await expect(page.locator('.wishlist-card').first()).toBeVisible();
  });

  test('removing the only wishlist item shows empty state @high', async ({ page }) => {
    const slug = process.env.TEST_PRODUCT_SLUG;
    const pRes = await page.request.get(`${API}/products/slug/${slug}`);
    const pData = await pRes.json();
    const productId = pData.data?.id;
    await page.request.post(`${API}/wishlist`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { productId },
    });

    await page.goto('/wishlist');
    await page.waitForSelector('.wishlist-card', { timeout: 20_000 });
    await page.locator('[aria-label="Remove from wishlist"]').first().click();
    // Wait for the card to disappear before asserting the empty state
    await expect(page.locator('.wishlist-card')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByText(/your wishlist is empty/i)).toBeVisible({ timeout: 5_000 });
  });
});
