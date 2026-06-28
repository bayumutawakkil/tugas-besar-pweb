
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  
  await expect(page).toHaveTitle(/Penelitian FTI/);
});

test('homepage shows login and register links', async ({ page }) => {
  await page.goto('/');

  
  await expect(page.getByRole('link', { name: /Daftar Akun Baru/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Login ke Akun/i })).toBeVisible();
});

test('navigate to login page', async ({ page }) => {
  await page.goto('/');

  
  await page.getByRole('link', { name: /Login ke Akun/i }).click();
  await expect(page).toHaveURL(/\/auth\/login/);
});

test('navigate to register page', async ({ page }) => {
  await page.goto('/');

  
  await page.getByRole('link', { name: /Daftar Akun Baru/i }).click();
  await expect(page).toHaveURL(/\/auth\/register/);
});
