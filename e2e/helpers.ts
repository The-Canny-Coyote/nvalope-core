import type { Page } from '@playwright/test';

/**
 * Set localStorage before the app bundle runs (via addInitScript) so Zustand persist
 * does not overwrite tests with default `useCardLayout: true` on first paint.
 */
export async function prepareE2EStorageBeforeLoad(page: Page, persistPartial: Record<string, unknown> = {}): Promise<void> {
  const serialized = JSON.stringify(persistPartial);
  await page.addInitScript((s) => {
    const partial = JSON.parse(s as string) as Record<string, unknown>;
    try {
      localStorage.setItem('nvalope-backup-prompt-seen', 'true');
    } catch {
      // ignore
    }
    // Suppress the "Buy me a coffee" toast that App.tsx schedules 4s after
    // load. Under full-suite load the toast render can race with
    // layout-sensitive assertions (e.g. scroll-preservation checks) and
    // produce flaky failures. Tests that need to verify the toast can
    // clear this session key explicitly.
    try {
      sessionStorage.setItem('nvalope-bmc-toast-shown', 'true');
    } catch {
      // ignore
    }
    const key = 'nvalope-app-persist';
    let state: Record<string, unknown> = {};
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as { state?: Record<string, unknown> } | Record<string, unknown>;
        state =
          'state' in parsed && parsed.state && typeof parsed.state === 'object'
            ? { ...parsed.state }
            : { ...(parsed as Record<string, unknown>) };
      }
    } catch {
      // ignore
    }
    // Default e2e specs to:
    //   - Wheel layout (useCardLayout: false) so wheel selectors work.
    //   - Dock hint pre-dismissed so the one-time "Wheel lives here" popover
    //     doesn't float over assertions. Tests that specifically verify the
    //     hint opt back in via partial override.
    //   - "Try this" arrow pre-dismissed so the intro ribbon doesn't cover
    //     wheel wedges during scrollIntoView.
    const defaults = {
      useCardLayout: false,
      wheelDockHintDismissed: true,
      wheelTryDismissed: true,
    };
    const next = { ...state, ...defaults, ...partial };
    localStorage.setItem(key, JSON.stringify({ state: next, version: 0 }));
  }, serialized);
}

/**
 * Merge keys into Zustand persist after navigation (e.g. mid-test). Prefer prepareE2EStorageBeforeLoad for first load.
 */
export async function mergeE2EAppPersist(page: Page, partial: Record<string, unknown>): Promise<void> {
  const serialized = JSON.stringify(partial);
  await page.evaluate((s) => {
    const key = 'nvalope-app-persist';
    const partial = JSON.parse(s) as Record<string, unknown>;
    try {
      const raw = localStorage.getItem(key);
      let state: Record<string, unknown> = {};
      if (raw) {
        const parsed = JSON.parse(raw) as { state?: Record<string, unknown> } | Record<string, unknown>;
        state =
          'state' in parsed && parsed.state && typeof parsed.state === 'object'
            ? { ...parsed.state }
            : { ...(parsed as Record<string, unknown>) };
      }
      const next = { ...state, ...partial };
      localStorage.setItem(key, JSON.stringify({ state: next, version: 0 }));
    } catch {
      localStorage.setItem(key, JSON.stringify({ state: { ...partial }, version: 0 }));
    }
  }, serialized);
}

/** Navigate to app with backup prompt dismissed, then wait for app and dismiss any dialogs. */
export async function gotoAppWithOnboardingDone(page: Page, persistPartial: Record<string, unknown> = {}): Promise<void> {
  await prepareE2EStorageBeforeLoad(page, persistPartial);
  await page.goto('/');
  await waitForApp(page);
  // PWA "offline ready" may mount shortly after first paint
  await page.waitForTimeout(600);
  await dismissDialogs(page);
}

/** Wait for the app root (data-testid="app") to be in the DOM. Use after goto/reload in e2e. */
export async function waitForApp(page: Page, timeout = 25_000): Promise<void> {
  await page.getByTestId('app').waitFor({ state: 'attached', timeout });
}

/**
 * Click a section on whichever layout is currently visible.
 *
 * - Wheel layout: wedges have `role="radio"` (radiogroup pattern); click by aria-label.
 * - Cards layout: cards are buttons. When a section is already open, the bottom
 *   nav / card bar is used.
 * - List (focus mode): rows are `<button>` elements with matching names.
 *
 * The legacy e2e helper clicked `role="button"` which only worked back when
 * wheel wedges were plain `<g role="button">`. After the wheel was promoted to
 * a proper radiogroup, tests need to target `role="radio"` for wheel slices.
 * This helper hides that concern from individual specs — they just say "open
 * Overview" and the helper picks the correct locator for the active layout.
 */
export async function openSection(page: Page, name: string | RegExp): Promise<void> {
  const nameMatcher = name;

  // Give the app a brief window to settle on a concrete layout before we probe
  // for one. Without this, a fast `isVisible()` call can race against the first
  // render and every branch reports "not visible" → we fall through to the
  // last-resort `getByRole('button')`, which never matches wheel wedges
  // (they're `role="radio"` now).
  await page
    .locator('[data-layout="wheel"], [data-layout="cards"], [data-layout="list"]')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => {});

  // 1) Wheel layout — idle (hero wheel visible, role=radiogroup with radio wedges).
  //    Scoped to [data-layout="wheel"] so we don't collide with "Settings" substring
  //    matches elsewhere on the page (e.g. FeatureDiscoveryHint's "Open Settings"
  //    button) or the dock's aria-hidden mock wheel.
  const wheel = page.locator('[data-layout="wheel"]').first();
  if (await wheel.isVisible().catch(() => false)) {
    const radio = wheel.getByRole('radio', { name: nameMatcher }).first();
    // Wait up to a short window for the radio to render — the <motion.g>
    // wedges fade in on first mount.
    const radioVisible = await radio
      .waitFor({ state: 'visible', timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    if (radioVisible) {
      await radio.scrollIntoViewIfNeeded().catch(() => {});
      await radio.click({ force: true });
      return;
    }
  }

  // 2) Wheel layout — section already open. Only the dock mini-wheel is
  //    visible, and that's a decorative mock. Expand it into the overlay
  //    (role=dialog, aria-label="Feature wheel"), then click the slice there.
  const dockBtn = page.getByRole('button', { name: 'Open feature wheel' }).first();
  if (await dockBtn.isVisible().catch(() => false)) {
    await dockBtn.click();
    const overlay = page.getByRole('dialog', { name: /Feature wheel/i }).first();
    await overlay.waitFor({ state: 'visible', timeout: 5000 });
    const radio = overlay.getByRole('radio', { name: nameMatcher }).first();
    await radio.waitFor({ state: 'visible', timeout: 5000 });
    await radio.click({ force: true });
    // Dismiss the overlay so subsequent assertions target the section content.
    await page.keyboard.press('Escape').catch(() => {});
    await overlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    return;
  }

  // 3) Cards layout
  const cards = page.locator('[data-layout="cards"]').first();
  if (await cards.isVisible().catch(() => false)) {
    const btn = cards.getByRole('button', { name: nameMatcher }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      return;
    }
  }
  // 4) Focus-mode list
  const list = page.locator('[data-layout="list"]').first();
  if (await list.isVisible().catch(() => false)) {
    const btn = list.getByRole('button', { name: nameMatcher }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      return;
    }
  }
  // 5) Last resort — any top-level button with that name (e.g. BottomNavBar on mobile).
  await page.getByRole('button', { name: nameMatcher }).first().click();
}

/**
 * Close the currently open section (the Close button inside the section content card).
 */
export async function closeOpenSection(page: Page): Promise<void> {
  const closeBtn = page.getByRole('button', { name: /^Close section$/ }).first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click({ force: true });
  }
}

/** Dismiss any blocking dialog (PWA offline ready, backup folder, etc.). Call after waitForApp when needed. */
export async function dismissDialogs(page: Page): Promise<void> {
  const overlay = page.locator('[data-slot="alert-dialog-overlay"]');
  for (let round = 0; round < 10; round++) {
    if (round > 0) await page.waitForTimeout(400);
    const visible = await overlay.isVisible().catch(() => false);
    if (!visible) continue;
    const dialog = page.getByRole('alertdialog').first();
    const okBtn = dialog.getByRole('button', { name: /^(ok|acknowledge|no thanks|later|close|i understand|close and update later)$/i }).first();
    const closeBtn = dialog.getByRole('button', { name: /close and update later/i }).first();
    try {
      await okBtn.click({ timeout: 2000 });
    } catch {
      try {
        await closeBtn.click({ timeout: 2000 });
      } catch {
        await dialog.getByRole('button').first().click({ timeout: 2000 }).catch(() => {});
      }
    }
    await overlay.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  }
}
