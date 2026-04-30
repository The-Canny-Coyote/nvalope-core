/**
 * E2E coverage for the dock-mini-wheel rework.
 *
 * These tests protect the load-bearing behaviors that changed when the wheel
 * moved from "always expanded hero" to "hero wheel while idle → small dock
 * while a section is open → click to re-expand inline above the section":
 *
 *   1. Opening a section from the hero wheel swaps the hero for the dock and
 *      does NOT auto-expand it.
 *   2. Clicking the dock expands the wheel inline above the section content
 *      (not as a fixed-position modal), the expanded wheel exposes the
 *      wedges as proper `role="radio"` controls, and Escape / the close
 *      button both dismiss it back to the dock.
 *   3. The one-time "Wheel lives here" hint appears the first time a section
 *      is opened, dismisses via the ✕ button, and sets `wheelDockHintDismissed`
 *      so it never returns.
 *   4. The dock itself is decorative — its inner SVG wedges are marked
 *      `aria-hidden` / non-interactive so screen readers and keyboard users
 *      don't encounter duplicate radio controls.
 */
import { test, expect } from '@playwright/test';
import {
  waitForApp,
  dismissDialogs,
  prepareE2EStorageBeforeLoad,
  openSection,
  closeOpenSection,
} from './helpers';

test.describe('Wheel dock + inline expansion', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('opening a section shows the decorative dock (not the expanded wheel)', async ({
    page,
  }) => {
    // Default helpers pre-dismiss the dock hint so this test sees the steady state.
    await prepareE2EStorageBeforeLoad(page);
    await page.goto('/');
    await waitForApp(page);
    await dismissDialogs(page);

    // Hero wheel visible → open a section.
    await openSection(page, 'Overview');
    await expect(page.getByRole('heading', { name: /Budget Overview/i })).toBeVisible({
      timeout: 10000,
    });

    // Dock is present and labelled; expanded-wheel region is NOT rendered.
    const dockBtn = page.getByRole('button', { name: 'Open feature wheel' });
    await expect(dockBtn).toBeVisible();
    await expect(page.getByRole('region', { name: /Feature wheel/i })).toHaveCount(0);

    // Hero radiogroup is gone (replaced by the dock).
    const heroWheel = page.locator('[data-layout="wheel"]').getByRole('radiogroup').first();
    await expect(heroWheel).toHaveCount(0);
  });

  test('dock is decorative: wedges are not exposed as radios', async ({ page }) => {
    await prepareE2EStorageBeforeLoad(page);
    await page.goto('/');
    await waitForApp(page);
    await dismissDialogs(page);

    await openSection(page, 'Overview');

    // The hero wheel had role=radiogroup with radio wedges. When the dock
    // replaces it, the mini-wheel is rendered with `interactive={false}` so
    // no radiogroup/radios should be exposed at all.
    const dockBtn = page.getByRole('button', { name: 'Open feature wheel' });
    await expect(dockBtn).toBeVisible();

    // No radiogroup anywhere on the page while the dock is the only wheel
    // visible (inline expansion isn't open → expect 0 radios).
    const radios = page.getByRole('radio');
    await expect(radios).toHaveCount(0);
  });

  test('clicking the dock expands the wheel inline and radios become available', async ({
    page,
  }) => {
    await prepareE2EStorageBeforeLoad(page);
    await page.goto('/');
    await waitForApp(page);
    await dismissDialogs(page);

    await openSection(page, 'Overview');
    await page.getByRole('button', { name: 'Open feature wheel' }).click();

    const expanded = page.getByRole('region', { name: /Feature wheel/i });
    await expect(expanded).toBeVisible({ timeout: 5000 });

    // Expanded wheel exposes the wedges as a radiogroup (accessibility guarantee).
    await expect(expanded.getByRole('radiogroup')).toBeVisible();
    await expect(expanded.getByRole('radio', { name: 'Settings' })).toBeVisible();

    // Crucially, it's in flow — the section content card stays mounted
    // below it rather than being covered by a fixed overlay.
    await expect(page.getByRole('heading', { name: /Budget Overview/i })).toBeVisible();
  });

  test('Escape closes the expanded wheel', async ({ page }) => {
    await prepareE2EStorageBeforeLoad(page);
    await page.goto('/');
    await waitForApp(page);
    await dismissDialogs(page);

    await openSection(page, 'Overview');
    await page.getByRole('button', { name: 'Open feature wheel' }).click();
    const expanded = page.getByRole('region', { name: /Feature wheel/i });
    await expect(expanded).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');
    await expect(expanded).toBeHidden({ timeout: 5000 });

    // Dock still present — we only collapsed the wheel; the section is still open.
    await expect(page.getByRole('button', { name: 'Open feature wheel' })).toBeVisible();
  });

  test('close button (×) dismisses the expanded wheel', async ({ page }) => {
    await prepareE2EStorageBeforeLoad(page);
    await page.goto('/');
    await waitForApp(page);
    await dismissDialogs(page);

    await openSection(page, 'Overview');
    await page.getByRole('button', { name: 'Open feature wheel' }).click();
    const expanded = page.getByRole('region', { name: /Feature wheel/i });
    await expect(expanded).toBeVisible({ timeout: 5000 });

    await expanded.getByRole('button', { name: /Close feature wheel \(Esc\)/ }).click();
    await expect(expanded).toBeHidden({ timeout: 5000 });
  });

  test('selecting a slice in the expanded wheel switches the section but keeps the wheel open', async ({
    page,
  }) => {
    await prepareE2EStorageBeforeLoad(page);
    await page.goto('/');
    await waitForApp(page);
    await dismissDialogs(page);

    await openSection(page, 'Overview');
    await page.getByRole('button', { name: 'Open feature wheel' }).click();
    const expanded = page.getByRole('region', { name: /Feature wheel/i });
    await expect(expanded).toBeVisible({ timeout: 5000 });

    await expanded.getByRole('radio', { name: 'Settings' }).click();

    // Expanded wheel stays up (user can keep navigating), but the section
    // content below it changed.
    await expect(expanded).toBeVisible();

    // Dismiss and confirm Settings is the active section.
    await page.keyboard.press('Escape');
    await expect(expanded).toBeHidden({ timeout: 5000 });
    await expect(
      page.getByRole('heading', { name: /Settings & Features/i }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('first-time dock hint appears and ✕ dismisses it persistently', async ({ page }) => {
    // Opt back IN to the hint — our default helper pre-dismisses it, but this
    // test is specifically verifying the hint itself.
    await prepareE2EStorageBeforeLoad(page, {
      wheelDockHintDismissed: false,
    });
    await page.goto('/');
    await waitForApp(page);
    await dismissDialogs(page);

    await openSection(page, 'Overview');

    const hint = page.getByRole('status').filter({ hasText: /Wheel lives here/i });
    await expect(hint).toBeVisible({ timeout: 5000 });
    await expect(hint.getByText(/Click the mini-wheel to expand it again/i)).toBeVisible();

    await hint.getByRole('button', { name: /Dismiss wheel hint/i }).click();
    await expect(hint).toBeHidden({ timeout: 3000 });

    // Persist flag was set → reopening a different section must not show it again.
    await closeOpenSection(page);
    await openSection(page, 'Settings');
    await expect(
      page.getByRole('status').filter({ hasText: /Wheel lives here/i })
    ).toHaveCount(0);
  });

  test('clicking the dock dismisses the hint (even without using ✕)', async ({ page }) => {
    await prepareE2EStorageBeforeLoad(page, {
      wheelDockHintDismissed: false,
    });
    await page.goto('/');
    await waitForApp(page);
    await dismissDialogs(page);

    await openSection(page, 'Overview');

    const hint = page.getByRole('status').filter({ hasText: /Wheel lives here/i });
    await expect(hint).toBeVisible({ timeout: 5000 });

    // Click the dock → expands AND persists dismissed flag.
    await page.getByRole('button', { name: 'Open feature wheel' }).click();
    const expanded = page.getByRole('region', { name: /Feature wheel/i });
    await expect(expanded).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
    await expect(expanded).toBeHidden({ timeout: 5000 });

    // Hint gone and won't come back.
    await expect(hint).toHaveCount(0);

    await closeOpenSection(page);
    await openSection(page, 'Settings');
    await expect(
      page.getByRole('status').filter({ hasText: /Wheel lives here/i })
    ).toHaveCount(0);
  });
});
