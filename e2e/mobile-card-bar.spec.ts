/**
 * Mobile viewport: bottom card bar is a single horizontal row (scroll when
 * many sections are enabled), not a two-row auto grid.
 */
import { test, expect } from '@playwright/test';
import { waitForApp, dismissDialogs, prepareE2EStorageBeforeLoad } from './helpers';

test.describe('Mobile card bar (single row)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('bottom section tablist uses flex row with horizontal scroll (not multi-row grid)', async ({
    page,
  }) => {
    await prepareE2EStorageBeforeLoad(page);
    await page.goto('/');
    await waitForApp(page);
    await dismissDialogs(page);

    const tablist = page.getByRole('tablist', { name: 'Sections' });
    await expect(tablist).toBeVisible({ timeout: 15_000 });

    const layout = await tablist.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        display: cs.display,
        flexWrap: cs.flexWrap,
        gridTemplateRows: cs.gridTemplateRows,
      };
    });

    expect(layout.display).toBe('flex');
    expect(layout.flexWrap).toBe('nowrap');
    expect(layout.gridTemplateRows).not.toMatch(/repeat\(2/);

    const tabs = tablist.getByRole('tab');
    const count = await tabs.count();
    expect(count).toBeGreaterThan(1);

    const y0 = await tabs.nth(0).evaluate((el) => el.getBoundingClientRect().top);
    const y1 = await tabs.nth(1).evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(y0 - y1)).toBeLessThan(3);
  });
});
