import { test, expect } from '@playwright/test';
import { gotoAppWithOnboardingDone, openSection } from './helpers';

test.beforeEach(async ({ page }) => {
  await gotoAppWithOnboardingDone(page);
});

test('open Settings and Check for updates button is present', async ({ page }) => {
  await openSection(page, 'Settings');
  await expect(page.getByRole('heading', { name: /Settings & Features/i })).toBeVisible({ timeout: 5000 });
  // Settings now splits the old "Data Management" accordion into two: "Back up
  // & restore" (download, auto-backup, encryption, update check) and "Import
  // data" (backup restore + bank statement import). Check-for-updates lives in
  // Back up & restore.
  await page.locator('#settings-data').getByRole('button', { name: /Back up & restore/i }).click();
  await expect(page.getByRole('button', { name: /Check for updates/i })).toBeVisible();
});

test('Back up & restore section has Choose backup folder', async ({ page }) => {
  await openSection(page, 'Settings');
  await expect(page.getByRole('heading', { name: /Settings & Features/i })).toBeVisible({ timeout: 5000 });
  await page.locator('#settings-data').getByRole('button', { name: /Back up & restore/i }).click();
  await expect(page.locator('#settings-data').getByText(/Choose backup folder/i)).toBeVisible({ timeout: 5000 });
});

test('Back up & restore has Encrypt backups and Import data has restore/export actions', async ({ page }) => {
  await openSection(page, 'Settings');
  await expect(page.getByRole('heading', { name: /Settings & Features/i })).toBeVisible({ timeout: 5000 });

  await page.locator('#settings-data').getByRole('button', { name: /Back up & restore/i }).click();
  await expect(page.getByText(/Encrypt backups/i)).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('checkbox', { name: /Encrypt backup files with a password/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Export budget only/i })).toBeVisible();

  await page.locator('#settings-data').getByRole('button', { name: /^Import data/i }).click();
  await expect(
    page.locator('#settings-data').getByRole('button', { name: /Restore from backup file/i })
  ).toBeVisible({ timeout: 5000 });
});
