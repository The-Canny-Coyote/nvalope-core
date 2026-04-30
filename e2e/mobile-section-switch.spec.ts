/**
 * Mobile: switching bottom tabs must keep MobileSectionSheet content visible
 * (non-zero scroll area height) — guards Pixel / Chrome regressions.
 */
import { test, expect } from '@playwright/test';
import { waitForApp, dismissDialogs, prepareE2EStorageBeforeLoad } from './helpers';

test.describe('Mobile section sheet tab switch', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('switching tabs keeps section content visible with non-zero height', async ({ page }) => {
    await prepareE2EStorageBeforeLoad(page);
    await page.goto('/');
    await waitForApp(page);
    await dismissDialogs(page);

    await page.getByRole('tab', { name: /^Overview$/i }).click();
    await expect(page.getByTestId('mobile-section-sheet')).toBeVisible({ timeout: 10_000 });

    const content = page.getByTestId('section-content');
    await expect(content).toBeVisible();
    const h1 = await content.evaluate((el) => el.getBoundingClientRect().height);
    expect(h1).toBeGreaterThan(80);

    await page.getByRole('tab', { name: /^Income$/i }).click();
    await expect(page.getByTestId('mobile-section-sheet')).toBeVisible({ timeout: 10_000 });
    const h2 = await content.evaluate((el) => el.getBoundingClientRect().height);
    expect(h2).toBeGreaterThan(80);

    await expect(page.getByRole('heading', { name: /Income/i }).first()).toBeVisible({ timeout: 10_000 });
  });
});
