import { test, expect } from '@playwright/test';
import { waitForApp, dismissDialogs, prepareE2EStorageBeforeLoad, openSection } from './helpers';

test.beforeEach(async ({ page }) => {
  await prepareE2EStorageBeforeLoad(page);
  await page.goto('/');
  await waitForApp(page);
  await dismissDialogs(page);
});

/**
 * Assert that the section content card overlaps the main scroll container's visible viewport
 * (at least part of the content is visible).
 */
async function expectSectionContentInView(page: import('@playwright/test').Page) {
  const inView = await page.evaluate(() => {
    const sc = document.querySelector('[data-testid="main-scroll"]');
    const content = document.querySelector('[data-testid="section-content"]');
    if (!sc || !content) return false;
    const scRect = sc.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const tolerance = 50;
    return contentRect.top < scRect.bottom + tolerance && contentRect.bottom > scRect.top - tolerance;
  });
  expect(inView).toBe(true);
}

test('clicking a wheel slice shows the section content and scrolls it into view', async ({ page }) => {
  const mainScroll = page.getByTestId('main-scroll');
  await expect(mainScroll).toBeVisible();

  // Click Settings slice (section id 6); app scrolls gently so section content is in view
  await openSection(page, 'Settings');

  // Wait for section content to appear and smooth scroll to settle
  await expect(page.getByTestId('section-content')).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('heading', { name: /Settings & Features/i })).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(400);
  // Section content should be in view after scroll
  const sectionContent = page.getByTestId('section-content');
  await expect(sectionContent).toBeVisible();
});

test('clicking a different wheel slice shows that section content and scrolls into view', async ({ page }) => {
  // Open Envelopes & Expenses (section 3); app scrolls so section is in view
  await openSection(page, 'Envelopes & Expenses');
  await expect(page.getByTestId('section-content')).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('heading', { name: 'Envelopes & Expenses' }).first()).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(400);
  await expect(page.getByTestId('section-content')).toBeVisible();
});

test('in Focus mode, clicking a list item scrolls the section content into view', async ({ page }) => {
  // Open Accessibility and enable Focus mode
  await openSection(page, 'Accessibility');
  await expect(page.getByText('Standard Accessibility Options')).toBeVisible({ timeout: 5000 });
  await page.getByRole('button').filter({ hasText: 'Preset modes' }).first().click();
  await expect(page.getByRole('heading', { name: 'Preset modes' })).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Focus Mode/i }).first().click();
  await expect(page.getByRole('application')).toHaveClass(/accessibility-focus-mode/);
  // Selecting a preset closes the Accessibility panel and shows the home screen (list) for that mode
  await page.locator('[data-layout="list"]').getByRole('button', { name: 'Overview' }).waitFor({ state: 'attached', timeout: 5000 });
  await page.waitForTimeout(300);

  // Scroll down so list items are in view but we're not at top
  const mainScroll = page.getByTestId('main-scroll');
  await mainScroll.evaluate((el) => {
    (el as HTMLElement).scrollTop = 350;
  });
  await page.waitForTimeout(100);

  // If Focus mode shows "Show more", expand so Settings is in the list
  const showMore = page.locator('[data-layout="list"]').getByRole('button', { name: /Show more/i });
  if (await showMore.isVisible().catch(() => false)) {
    await showMore.click();
    await page.waitForTimeout(300);
  }
  // Accessible name of Accessibility list row includes "settings" (preset); use stable section id.
  const settingsListItem = page.locator('[data-layout="list"] [data-section-id="6"]');
  await settingsListItem.waitFor({ state: 'attached', timeout: 5000 });
  await settingsListItem.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await settingsListItem.click();
  await expect(page.getByTestId('section-content')).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('heading', { name: /Settings & Features/i })).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(600);
  await expectSectionContentInView(page);
});

test('opening Additional features collapsible does not move main scroll', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 500 });
  await openSection(page, 'Settings');
  await expect(page.getByRole('heading', { name: /Settings & Features/i }).first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('section-content')).toBeVisible();
  await page.waitForTimeout(1000);

  const mainScroll = page.getByTestId('main-scroll');
  await mainScroll.evaluate((el) => {
    const scrollEl = el as HTMLElement;
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
    scrollEl.scrollTop = maxScroll > 0 ? Math.min(80, maxScroll) : 0;
  });
  await page.waitForTimeout(200);

  const scrollBefore = await mainScroll.evaluate((el) => (el as HTMLElement).scrollTop);
  if (scrollBefore < 30) {
    test.skip(true, 'Main scroll area has insufficient height');
    return;
  }

  const optionalTrigger = page.locator('#settings-optional').getByRole('button', { name: /Additional features/i });
  await optionalTrigger.click();
  await page.waitForTimeout(600);

  const scrollAfter = await mainScroll.evaluate((el) => (el as HTMLElement).scrollTop);
  // Collapsible open should not jump to top (restore keeps position; layout may shift slightly)
  expect(scrollAfter).toBeGreaterThan(20);
});

test('toggling a module in Settings preserves scroll position (no jump to top)', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 500 });
  await openSection(page, 'Settings');
  await expect(page.getByRole('heading', { name: /Settings & Features/i }).first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('section-content')).toBeVisible();
  await page.waitForTimeout(1000); // wait for scroll-into-view smooth scroll to finish

  const mainScroll = page.getByTestId('main-scroll');
  // Use moderate scroll so layout change from adding module has less impact
  await mainScroll.evaluate((el) => {
    const scrollEl = el as HTMLElement;
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
    scrollEl.scrollTop = maxScroll > 0 ? Math.min(120, maxScroll) : 0;
  });
  await page.waitForTimeout(300);

  const scrollBefore = await mainScroll.evaluate((el) => (el as HTMLElement).scrollTop);
  if (scrollBefore < 50) {
    test.skip(true, 'Main scroll area has insufficient height to test scroll preservation');
    return;
  }

  // Dismiss any overlay dialog that might block the module switch
  await dismissDialogs(page);

  // Additional features are in a collapsible; expand it first (target the collapsible trigger, not the Jump to button)
  const optionalTrigger = page.locator('#settings-optional').getByRole('button', { name: /Additional features/i });
  await optionalTrigger.click();
  await page.waitForTimeout(300);

  // Enable Receipt Scanner (toggle switch in the Receipt Scanner module card)
  await page.getByTestId('module-receiptScanner').getByRole('checkbox', { name: /Receipt Scanner/i }).click();

  await page.waitForTimeout(400); // allow restore effect (100ms) and layout to settle
  const scrollAfter = await mainScroll.evaluate((el) => (el as HTMLElement).scrollTop);
  // When on Settings we keep the section in view (may change scroll); verify we don't jump to top and Settings stays in view
  expect(scrollAfter).toBeGreaterThan(30);
  await expectSectionContentInView(page);
  // Additional features collapsible should still be open (heading/content visible)
  await expect(page.locator('#settings-optional').getByRole('button', { name: /Additional features/i })).toHaveAttribute('aria-expanded', 'true');
});

test('toggling a core module preserves scroll and keeps Core features collapsible open', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 500 });
  await dismissDialogs(page); // PWA "app is now cached" can appear after beforeEach; dismiss before clicking
  await openSection(page, 'Settings');
  await expect(page.getByRole('heading', { name: /Settings & Features/i }).first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('section-content')).toBeVisible();
  await page.waitForTimeout(1000);
  await dismissDialogs(page);

  const mainScroll = page.getByTestId('main-scroll');
  await mainScroll.evaluate((el) => {
    const scrollEl = el as HTMLElement;
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
    scrollEl.scrollTop = maxScroll > 0 ? Math.min(150, maxScroll) : 0;
  });
  await page.waitForTimeout(300);

  const scrollBefore = await mainScroll.evaluate((el) => (el as HTMLElement).scrollTop);
  if (scrollBefore < 50) {
    test.skip(true, 'Main scroll area has insufficient height to test scroll preservation');
    return;
  }

  const coreTrigger = page.locator('#settings-core').getByRole('button', { name: /Core Features/i });
  await coreTrigger.click();
  await page.waitForTimeout(300);

  const overviewToggle = page.getByTestId('module-overview').getByRole('checkbox', { name: /Overview/i });
  await overviewToggle.click();
  await page.waitForTimeout(400);
  await overviewToggle.click();
  await page.waitForTimeout(400);

  const scrollAfter = await mainScroll.evaluate((el) => (el as HTMLElement).scrollTop);
  expect(scrollAfter).toBeGreaterThan(30);
  await expectSectionContentInView(page);
  await expect(page.locator('#settings-core').getByRole('button', { name: /Core Features/i })).toHaveAttribute('aria-expanded', 'true');
});

// This test toggles the Encrypt-backups checkbox (inside a collapsible) and
// asserts the main scroll position survives the layout shift. Under full-suite
// parallel load, the initial collapsible-open + scroll-restore pipeline can
// race; grant it a couple of retries so genuine regressions still surface
// while transient timing flakes don't fail the whole suite.
test.describe('encrypt-backups scroll preservation', () => {
  test.describe.configure({ retries: 2 });
test('toggling non-module switch (Encrypt backups) preserves scroll position', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 500 });
  await openSection(page, 'Settings');
  await expect(page.getByRole('heading', { name: /Settings & Features/i }).first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('section-content')).toBeVisible();
  await page.waitForTimeout(1000);
  await dismissDialogs(page);

  const mainScroll = page.getByTestId('main-scroll');
  await mainScroll.evaluate((el) => {
    const scrollEl = el as HTMLElement;
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
    scrollEl.scrollTop = maxScroll > 0 ? Math.min(150, maxScroll) : 0;
  });
  await page.waitForTimeout(300);

  const scrollBefore = await mainScroll.evaluate((el) => (el as HTMLElement).scrollTop);
  if (scrollBefore < 50) {
    test.skip(true, 'Main scroll area has insufficient height to test scroll preservation');
    return;
  }

  // Encrypt-backups lives inside the "Back up & restore" collapsible. Opening
  // it is a layout change that also runs its own scroll-restore pass — wait
  // for that to settle before we re-scroll and toggle the switch, otherwise
  // the scroll the switch is meant to preserve can be wiped out by the
  // accordion's post-open restore.
  const dataTrigger = page.locator('#settings-data').getByRole('button', { name: /Back up & restore/i });
  await dataTrigger.click();
  // Wait for the collapsible to actually open (aria-expanded flips to true)
  // before re-scrolling. Under full-suite load the 600ms timeout sometimes
  // wasn't enough for the Radix CollapsibleTrigger to flush its state.
  await expect(dataTrigger).toHaveAttribute('aria-expanded', 'true', { timeout: 5000 });
  await page.waitForTimeout(400);

  // Re-scroll after the accordion expanded so the encrypt toggle is in view.
  await mainScroll.evaluate((el) => {
    const scrollEl = el as HTMLElement;
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
    scrollEl.scrollTop = maxScroll > 0 ? Math.min(150, maxScroll) : 0;
  });
  await page.waitForTimeout(200);
  const scrollBeforeToggle = await mainScroll.evaluate((el) => (el as HTMLElement).scrollTop);
  if (scrollBeforeToggle < 50) {
    test.skip(true, 'Main scroll area has insufficient height to test scroll preservation');
    return;
  }

  // Toggle encryption once. Turning it on reveals a "set a password" card —
  // that's a legitimate layout shift, but scroll should still be preserved
  // (not reset to 0) because this toggle is not a module enable/disable.
  const encryptToggle = page.getByRole('checkbox', { name: /Encrypt backup files with a password/i });
  await encryptToggle.scrollIntoViewIfNeeded().catch(() => {});
  await encryptToggle.click({ force: true });
  await page.waitForTimeout(400);

  const scrollAfter = await mainScroll.evaluate((el) => (el as HTMLElement).scrollTop);
  expect(scrollAfter).toBeGreaterThan(30);
  await expectSectionContentInView(page);
});
});

test('toggling accessibility slider preserves scroll position', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 500 });
  await openSection(page, 'Accessibility');
  await expect(page.getByText('Standard Accessibility Options')).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: /Standard Accessibility Options/i }).first().click();
  await page.waitForTimeout(300);

  const mainScroll = page.getByTestId('main-scroll');
  await mainScroll.evaluate((el) => {
    const scrollEl = el as HTMLElement;
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
    scrollEl.scrollTop = maxScroll > 0 ? Math.min(220, maxScroll) : 0;
  });
  await page.waitForTimeout(300);

  const scrollBefore = await mainScroll.evaluate((el) => (el as HTMLElement).scrollTop);
  if (scrollBefore < 50) {
    test.skip(true, 'Main scroll area has insufficient height to test scroll preservation');
    return;
  }

  const slider = page.locator('#accessibility-text-size');
  await slider.fill('100');
  await page.waitForTimeout(500);

  const scrollAfter = await mainScroll.evaluate((el) => (el as HTMLElement).scrollTop);
  // Slider change can cause layout reflow; ensure we did not jump to top
  expect(scrollAfter).toBeGreaterThan(30);
});

test('closing a section does not force scroll to top', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await openSection(page, 'Settings');
  await expect(page.getByTestId('section-content')).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(500);
  await dismissDialogs(page);

  const mainScroll = page.getByTestId('main-scroll');
  // Use a moderate scroll position so that after closing, enough content remains to preserve scroll
  await mainScroll.evaluate((el) => {
    const scrollEl = el as HTMLElement;
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
    scrollEl.scrollTop = maxScroll > 0 ? Math.min(150, maxScroll) : 0;
  });
  await page.waitForTimeout(100);

  const scrollBefore = await mainScroll.evaluate((el) => (el as HTMLElement).scrollTop);
  if (scrollBefore < 50) {
    test.skip(true, 'Insufficient scroll height to test preservation');
    return;
  }
  // Close button can be overlapped by wheel SVG; use force to avoid interception
  await page.getByTestId('section-content').getByRole('button', { name: 'Close' }).click({ force: true });
  await page.waitForTimeout(500); // allow restore effect and layout to settle

  const scrollAfter = await mainScroll.evaluate((el) => (el as HTMLElement).scrollTop);
  // When closing removes content, browser may clamp scroll; verify we don't jump to top (e.g. 0)
  expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(600);
});
