// @ts-check
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Cek judul halaman mengandung nama aplikasi
  await expect(page).toHaveTitle(/Penelitian FTI/);
});

test('homepage shows login and register links', async ({ page }) => {
  await page.goto('/');

  // Halaman utama harus menampilkan link Daftar dan Login
  await expect(page.getByRole('link', { name: /Daftar Akun Baru/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Login ke Akun/i })).toBeVisible();
});

test('navigate to login page', async ({ page }) => {
  await page.goto('/');

  // Klik tombol login dan pastikan berpindah ke halaman login
  await page.getByRole('link', { name: /Login ke Akun/i }).click();
  await expect(page).toHaveURL(/\/auth\/login/);
});

test('navigate to register page', async ({ page }) => {
  await page.goto('/');

  // Klik tombol daftar dan pastikan berpindah ke halaman register
  await page.getByRole('link', { name: /Daftar Akun Baru/i }).click();
  await expect(page).toHaveURL(/\/auth\/register/);
});
