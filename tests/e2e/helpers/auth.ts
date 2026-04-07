import { expect, type Page } from '@playwright/test';

export async function loginViaUi(page: Page) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  expect(email, 'E2E_EMAIL env var is required for login tests').toBeTruthy();
  expect(password, 'E2E_PASSWORD env var is required for login tests').toBeTruthy();

  await page.goto('/login');
  await page.getByLabel('Email').fill(String(email));
  await page.getByLabel('Password').fill(String(password));
  await page.getByRole('button', { name: /sign in/i }).click();

  // We should land on dashboard by default
  await expect(page).toHaveURL(/\/dashboard/);
}

