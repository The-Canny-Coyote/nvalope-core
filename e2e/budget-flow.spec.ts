import { test, expect } from '@playwright/test';
import { waitForApp, dismissDialogs, prepareE2EStorageBeforeLoad, openSection, closeOpenSection } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await prepareE2EStorageBeforeLoad(page);
  await page.goto('/');
  await waitForApp(page);
  await dismissDialogs(page);
});

test('add envelope then expense then see in Transactions', async ({ page }) => {
  // Ensure wheel layout so section slices are in the DOM
  const wheelBtn = page.getByRole('button', { name: 'Wheel layout' });
  if (await wheelBtn.isVisible()) {
    await wheelBtn.click();
    await page.waitForTimeout(400);
  }
  const wheelLayout = page.locator('[data-layout="wheel"]').first();
  await wheelLayout.waitFor({ state: 'visible', timeout: 10000 });

  // Ensure Transactions is enabled: open Settings → Additional features → enable Transactions → Close
  await openSection(page, 'Settings');
  await expect(page.getByRole('heading', { name: 'Settings & Features' })).toBeVisible({ timeout: 5000 });
  const optionalTrigger = page.getByRole('button', { name: /Additional features/i }).first();
  await optionalTrigger.click();
  await page.waitForTimeout(300);
  const transactionsRow = page.locator('[data-testid="module-transactions"]');
  await transactionsRow.waitFor({ state: 'visible', timeout: 3000 });
  const transactionsToggle = transactionsRow.getByRole('checkbox', { name: /Transactions/i });
  const checked = await transactionsToggle.getAttribute('aria-checked');
  if (checked !== 'true') {
    await transactionsToggle.click();
    await page.waitForTimeout(200);
  }
  await closeOpenSection(page);
  await page.waitForTimeout(400);

  await wheelLayout.waitFor({ state: 'visible', timeout: 5000 });

  // Open Envelopes & Expenses. `openSection` picks the right locator for the
  // current layout (hero wheel radio, or dock-expand-then-radio when a section
  // is already open).
  await openSection(page, 'Envelopes & Expenses');
  await expect(page.getByRole('heading', { name: 'Quick Add Expense' })).toBeVisible({ timeout: 10000 });

  // Dismiss any dialog that opened (e.g. PWA offline ready) so it does not block the form
  const overlay = page.locator('[data-slot="dialog-overlay"]');
  if (await overlay.isVisible()) {
    const closeBtn = page.getByRole('dialog').getByRole('button').first();
    await closeBtn.click({ timeout: 2000 }).catch(() => {});
  }
  await page.waitForTimeout(300);

  // Create envelope: name + limit + Create
  await page.getByPlaceholder('New envelope name').fill('E2E Groceries');
  await page.getByLabel('Envelope limit (amount)').fill('400');
  await page.getByRole('button', { name: '+ Create' }).click();
  await expect(page.getByRole('heading', { name: 'Your Envelopes' })).toBeVisible({ timeout: 3000 });
  await page.getByRole('combobox', { name: 'Envelope' }).selectOption({ label: 'E2E Groceries' });

  // Add expense: amount, envelope (E2E Groceries), description, Add Expense
  await page.getByLabel('Amount', { exact: true }).fill('25.50');
  // Label is "Description *" (required asterisk); use non-exact match.
  await page.locator('#exp-desc').fill('E2E test expense');
  await page.getByRole('button', { name: 'Add Expense' }).click();

  // Back to wheel: open Transactions to verify the expense appears. With a
  // section already open the hero wheel is replaced by the dock minimap, so
  // the helper expands the overlay and clicks the Transactions radio inside.
  await openSection(page, 'Transactions');
  await expect(page.getByRole('heading', { name: /Transaction History/i })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('E2E test expense').first()).toBeVisible();
  await expect(page.getByText('25.50').first()).toBeVisible();
});
