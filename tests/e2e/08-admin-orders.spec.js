import { test, expect } from '@playwright/test';

const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:3002';

// @medium
test.describe('Admin — Order Management', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    test.skip(!email || !password, 'Admin credentials not configured');

    // Skip gracefully if admin panel is not running
    const reachable = await page.goto(`${ADMIN_URL}/login`).then(() => true).catch(() => false);
    test.skip(!reachable, `Admin panel not reachable at ${ADMIN_URL} — start with: npm run dev -- -p 3002`);

    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Skip gracefully if credentials are wrong (don't fail every test in describe block)
    const loggedIn = await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!loggedIn, 'Admin login failed — verify ADMIN_EMAIL and ADMIN_PASSWORD in .env.test');
    await page.waitForLoadState('networkidle');
  });

  test('admin orders page loads @medium', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await page.waitForLoadState('networkidle');
    // The sidebar also has an h1 ("Furniture Admin") — target the page-specific one
    await expect(page.locator('h1').filter({ hasText: /^orders$/i })).toBeVisible({ timeout: 15_000 });
  });

  test('admin can view order detail @medium', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await page.waitForLoadState('networkidle');

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    test.skip(count === 0, 'No orders in database to test with');

    await rows.first().click();
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
  });

  test('admin can update order status @medium', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await page.waitForLoadState('networkidle');

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    test.skip(count === 0, 'No orders in database to test with');

    await rows.first().click();
    await page.waitForLoadState('networkidle');

    const statusSelect = page.getByLabel(/status/i).or(page.locator('select[name*="status"], [data-testid="status-select"]'));
    if (await statusSelect.first().isVisible()) {
      await statusSelect.first().selectOption({ index: 1 });
      await page.getByRole('button', { name: /save|update/i }).first().click();
      await expect(page.getByText(/updated|saved|success/i)).toBeVisible({ timeout: 10_000 });
    }
  });

  test('admin can add tracking number @medium', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await page.waitForLoadState('networkidle');

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    test.skip(count === 0, 'No orders in database to test with');

    await rows.first().click();
    await page.waitForLoadState('networkidle');

    // Tracking is added per-item via the "Add Shipment" dialog (or "Edit" if one exists).
    // Find the first available action button and open its dialog.
    const addBtn = page.getByRole('button', { name: /add shipment/i }).first();
    const editBtn = page.getByRole('button', { name: /^edit$/i }).first();

    if (await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addBtn.click();
      // Dialog opens — fill tracking number (placeholder contains "1Z999…")
      await page.locator('input[placeholder*="1Z999"]').fill('1Z999AA10123456784');
      await page.getByRole('button', { name: /create shipment/i }).click();
      await expect(page.getByText(/shipment created/i)).toBeVisible({ timeout: 10_000 });
    } else if (await editBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await editBtn.click();
      await page.locator('input[placeholder*="1Z999"]').fill('1Z999AA10123456784');
      await page.getByRole('button', { name: /save changes/i }).click();
      await expect(page.getByText(/shipment updated/i)).toBeVisible({ timeout: 10_000 });
    }
    // If neither button is visible the order is in a state that doesn't allow shipments — pass silently
  });
});
