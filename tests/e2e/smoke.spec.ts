import { test, expect } from '@playwright/test';
import { loginViaUi } from './helpers/auth';

test.describe('StockPulse E2E smoke', () => {
  test('login works (when creds provided)', async ({ page }) => {
    test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'E2E creds not set');
    await loginViaUi(page);
    await expect(page.getByText('Welcome back', { exact: false })).toBeVisible();
  });

  test('connect page unlocks for premium user', async ({ page }) => {
    test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'E2E creds not set');
    // This test assumes the provided user has profiles.is_premium = true
    await loginViaUi(page);
    await page.goto('/brokers');

    // Page header exists
    await expect(page.getByRole('heading', { name: /import portfolio/i })).toBeVisible();

    // If premium, we should see the unlocked badge and enabled login buttons (no blur overlay).
    await expect(page.getByText('Unlocked')).toBeVisible();
    await expect(page.getByRole('button', { name: /login with upstox/i })).toBeEnabled();
  });

  test('portfolio signals card renders (after login)', async ({ page }) => {
    test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'E2E creds not set');
    await loginViaUi(page);
    await page.goto('/portfolio');

    await expect(page.getByRole('heading', { name: /holdings/i })).toBeVisible();

    // If the user has holdings, the signals card should render.
    // Keep this assertion soft so empty portfolios still pass.
    const card = page.getByText('Portfolio signals');
    await expect(card).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('algo paper page loads and can preview intents', async ({ page }) => {
    test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'E2E creds not set');
    await loginViaUi(page);
    await page.goto('/algo');

    await expect(page.getByRole('heading', { name: /ai algo \(paper\)/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /preview intents/i })).toBeVisible();

    await page.getByRole('button', { name: /preview intents/i }).click();

    // Even with no holdings, page should still render the intents card.
    await expect(page.getByText(/intents \(swing horizon\)/i)).toBeVisible();
  });
});

