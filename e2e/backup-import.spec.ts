import { test, expect } from '@playwright/test';
import { waitForApp, dismissDialogs, prepareE2EStorageBeforeLoad, openSection } from './helpers';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.beforeEach(async ({ page }) => {
  await prepareE2EStorageBeforeLoad(page);
  await page.goto('/');
  await waitForApp(page);
  await dismissDialogs(page);
});

test('Import backup file restores envelope data', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openSection(page, 'Settings');
  await expect(page.getByRole('heading', { name: /Settings & Features/i })).toBeVisible({ timeout: 5000 });
  // Backup JSON import lives under "Import data" (formerly Data Management).
  const importBtn = page.locator('#settings-data').getByRole('button', { name: /^Import data/i });
  await importBtn.click();
  await page.waitForTimeout(300);
  const backupPath = path.join(__dirname, 'fixtures', 'backup.json');
  await page.locator('input[type="file"][accept=".json,application/json"]').setInputFiles(backupPath);
  // The import now shows a "Replace your budget data?" confirmation before
  // writing anything. Click the confirm button to actually run the import.
  const confirmBtn = page
    .getByRole('alertdialog')
    .getByRole('button', { name: /Yes, replace my data/i });
  await confirmBtn.waitFor({ state: 'visible', timeout: 10000 });
  await confirmBtn.click();
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: /Close section/i }).first().click().catch(() => {});
  await page.waitForTimeout(400);
  await openSection(page, 'Envelopes & Expenses');
  await expect(page.getByText('E2E Import Envelope').first()).toBeVisible({ timeout: 8000 });
});
