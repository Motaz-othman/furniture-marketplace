import { test, expect } from '@playwright/test';
import { loginViaApi } from '../helpers/api.js';

// @high
test.describe('Auth Flows', () => {
  test('user can register a new account @high', async ({ page }) => {
    await page.goto('/auth/register');

    const unique = Date.now();
    await page.locator('#firstName').fill('Test');
    await page.locator('#lastName').fill('User');
    await page.locator('#email').fill(`newuser+${unique}@playwright.com`);
    await page.locator('#password').fill('TestPassword123!');
    await page.locator('#confirmPassword').fill('TestPassword123!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).not.toHaveURL(/register/, { timeout: 10_000 });
  });

  test('user can log in with valid credentials @high', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    test.skip(!email, 'No test user configured');

    await page.goto('/auth/login');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).not.toHaveURL(/login/, { timeout: 10_000 });
  });

  test('login fails with wrong password @high', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('#email').fill('fake@example.com');
    await page.locator('#password').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid email or password|please fill in|failed/i)).toBeVisible({ timeout: 10_000 });
  });

  test('forgot password form accepts email @high', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await page.locator('#email').fill('test@example.com');
    await page.getByRole('button', { name: /send|reset|submit/i }).click();
    await expect(page.getByText(/sent|check your email|if that email|instructions/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('email verification banner shows after registration @high', async ({ page }) => {
    const unique = Date.now();
    await page.goto('/auth/register');

    await page.locator('#firstName').fill('Verify');
    await page.locator('#lastName').fill('Test');
    await page.locator('#email').fill(`verify+${unique}@playwright.com`);
    await page.locator('#password').fill('TestPassword123!');
    await page.locator('#confirmPassword').fill('TestPassword123!');
    await page.getByRole('button', { name: /create account/i }).click();

    await page.waitForTimeout(1000);
    await expect(page.getByText(/verify your email|please verify|verification/i)).toBeVisible({ timeout: 15_000 });
  });
});

// @high
test.describe('Account Page', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    test.skip(!email, 'No test user configured');
    await loginViaApi(page, email, password);
  });

  test('profile tab shows user info @high', async ({ page }) => {
    await page.goto('/account');
    // Wait for auth guard to pass — sidebar appears once isAuthenticated=true
    await page.waitForSelector('.account-sidebar', { timeout: 15_000 });
    await expect(page.locator('.profile-label').first()).toBeVisible();
  });

  test('can update display name from profile tab @high', async ({ page }) => {
    await page.goto('/account');
    await page.waitForSelector('.account-sidebar', { timeout: 15_000 });
    // Click Edit on the profile info card
    await page.locator('.profile-edit-btn').click();
    await page.locator('#firstName').fill('PlaywrightE2E');
    const saveRes = page.waitForResponse(
      (res) => res.url().includes('/api/') && res.request().method() === 'PUT',
      { timeout: 10_000 },
    );
    await page.getByRole('button', { name: /save/i }).click();
    await saveRes;
    await expect(page.locator('.profile-value').first()).toContainText('PlaywrightE2E', { timeout: 5_000 });
  });

  test('addresses tab loads shipping addresses section @high', async ({ page }) => {
    await page.goto('/account#addresses');
    await page.waitForSelector('.account-sidebar', { timeout: 15_000 });
    // The hash makes the addresses tab active on mount
    await expect(page.locator('.account-main').getByText(/address|shipping/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('change password rejects wrong current password @high', async ({ page }) => {
    await page.goto('/account#settings');
    await page.waitForSelector('.account-sidebar', { timeout: 15_000 });
    await page.locator('#currentPassword').fill('definitely-wrong-password-123!');
    await page.locator('#newPassword').fill('NewValidPass99!');
    await page.locator('#confirmNewPassword').fill('NewValidPass99!');
    await page.getByRole('button', { name: /change password/i }).click();
    await expect(page.locator('.auth-error')).toBeVisible({ timeout: 10_000 });
  });
});
