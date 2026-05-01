import { test, expect } from '@playwright/test';
import { waitForApp, dismissDialogs, prepareE2EStorageBeforeLoad, mergeE2EAppPersist, openSection } from './helpers';
import { getSeedBudgetState } from '../src/app/fixtures/seedBudget';

test.describe('Cache the Coyote (AI Companion)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await prepareE2EStorageBeforeLoad(page);
    await page.goto('/');
    await waitForApp(page);
    await dismissDialogs(page);
  });

  test('Cache the Coyote opens and replies to a message', async ({ page }) => {
    const wheelBtn = page.getByRole('button', { name: 'Wheel layout' });
    if (await wheelBtn.isVisible()) {
      await wheelBtn.click();
      await page.waitForTimeout(200);
    }

    const wheelLayout = page.locator('[data-layout="wheel"]').first();
    await wheelLayout.waitFor({ state: 'visible', timeout: 10000 });

    // Open Settings and enable Cache the Coyote (AI Companion) so the center button appears (avoids relying on persist for optional module)
    await openSection(page, 'Settings');
    await expect(page.getByRole('heading', { name: /Settings & Features|^Settings$/i }).first()).toBeVisible({ timeout: 5000 });
    await dismissDialogs(page);
    await page.getByRole('button', { name: 'Additional features', exact: true }).click();
    await page.waitForTimeout(300);
    const cacheToggle = page.getByTestId('module-cacheAssistant').getByRole('checkbox', { name: /Cache the Coyote/i });
    if ((await cacheToggle.getAttribute('aria-checked')) === 'false') {
      await cacheToggle.click();
      await page.waitForTimeout(300);
    }
    await page.getByRole('button', { name: /Close section/i }).first().click();
    await page.waitForTimeout(300);

    await wheelLayout.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const openAssistantBtn = page.getByTestId('open-ai-assistant').or(page.getByRole('button', { name: /Open Cache the Coyote/i }));
    await openAssistantBtn.first().waitFor({ state: 'attached', timeout: 8000 });
    await openAssistantBtn.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await openAssistantBtn.first().click({ force: true });

    const messageInput = page.getByRole('textbox', { name: /Message/i });
    await expect(messageInput).toBeVisible({ timeout: 5000 });
    await messageInput.fill('How much have I spent?');
    await page.getByRole('button', { name: 'Send' }).click();

    // Scope the reply-content match to the chat log so we don't accidentally
    // match SVG <title> elements or other occurrences of "budget" elsewhere.
    const replyArea = page.getByRole('log', { name: 'Chat messages' });
    await expect(replyArea.getByText(/\$|spent|budget|income|envelope/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('Cache the Coyote shows reply with seeded budget data', async ({ page }) => {
    const seedState = getSeedBudgetState();
    await page.evaluate(
      async (state) => {
        const DB_NAME = 'nvalope-db';
        // Must track budgetIdb.DB_VERSION so the IDB open doesn't fail with
        // VersionError when the app later opens the DB with a newer version.
        const DB_VERSION = 4;
        const STORE_BUDGET = 'budget';
        const STORE_APP_DATA = 'appData';
        const STORE_STATEMENT_TEMPLATES = 'statementTemplates';
        const STORE_ASSIGNMENT_RULES = 'assignmentRules';
        const STORE_BUDGETS = 'budgets';
        const STORE_BUDGETS_META = 'budgetsMeta';
        const BUDGET_KEY = 'state';
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open(DB_NAME, DB_VERSION);
          req.onerror = () => reject(req.error);
          req.onsuccess = () => resolve(req.result);
          req.onupgradeneeded = () => {
            const d = req.result;
            if (!d.objectStoreNames.contains(STORE_BUDGET)) d.createObjectStore(STORE_BUDGET);
            if (!d.objectStoreNames.contains(STORE_APP_DATA)) d.createObjectStore(STORE_APP_DATA);
            if (!d.objectStoreNames.contains(STORE_STATEMENT_TEMPLATES)) {
              d.createObjectStore(STORE_STATEMENT_TEMPLATES, { keyPath: 'id' });
            }
            if (!d.objectStoreNames.contains(STORE_ASSIGNMENT_RULES)) {
              d.createObjectStore(STORE_ASSIGNMENT_RULES, { keyPath: 'id' });
            }
            if (!d.objectStoreNames.contains(STORE_BUDGETS)) d.createObjectStore(STORE_BUDGETS);
            if (!d.objectStoreNames.contains(STORE_BUDGETS_META)) {
              d.createObjectStore(STORE_BUDGETS_META, { keyPath: 'id' });
            }
          };
        });
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(
            [STORE_BUDGET, STORE_BUDGETS, STORE_BUDGETS_META],
            'readwrite'
          );
          // Legacy single-budget store (pre-v4) — kept in sync so older code
          // paths still find data.
          tx.objectStore(STORE_BUDGET).put(state, BUDGET_KEY);
          // Multi-budget store (v4+) is the source of truth for the current
          // app. Without this, the app sees an empty default budget on load.
          tx.objectStore(STORE_BUDGETS).put({ id: 'default', state });
          const now = new Date().toISOString();
          tx.objectStore(STORE_BUDGETS_META).put({
            id: 'default',
            name: 'My Budget',
            createdAt: now,
            lastModifiedAt: now,
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        db.close();
      },
      seedState
    );
    await mergeE2EAppPersist(page, { useCardLayout: false });
    await page.reload();
    await waitForApp(page);
    await dismissDialogs(page);

    const wheelBtn = page.getByRole('button', { name: 'Wheel layout' });
    if (await wheelBtn.isVisible()) {
      await wheelBtn.click();
      await page.waitForTimeout(200);
    }

    const wheelLayout = page.locator('[data-layout="wheel"]').first();
    await wheelLayout.waitFor({ state: 'visible', timeout: 10000 });

    await openSection(page, 'Settings');
    await expect(page.getByRole('heading', { name: /Settings & Features|^Settings$/i }).first()).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Additional features', exact: true }).click();
    await page.waitForTimeout(300);
    const cacheToggle = page.getByTestId('module-cacheAssistant').getByRole('checkbox', { name: /Cache the Coyote/i });
    if ((await cacheToggle.getAttribute('aria-checked')) === 'false') {
      await cacheToggle.click();
      await page.waitForTimeout(300);
    }
    await page.getByRole('button', { name: /Close section/i }).first().click();
    await page.waitForTimeout(300);

    await wheelLayout.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const openAssistantBtn = page.getByTestId('open-ai-assistant').or(page.getByRole('button', { name: /Open Cache the Coyote/i }));
    await openAssistantBtn.first().waitFor({ state: 'attached', timeout: 8000 });
    await openAssistantBtn.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await openAssistantBtn.first().click({ force: true });

    const messageInput = page.getByRole('textbox', { name: /Message/i });
    await expect(messageInput).toBeVisible({ timeout: 5000 });
    await messageInput.fill('What envelopes do I have?');
    await page.getByRole('button', { name: 'Send' }).click();

    const replyArea = page.getByRole('log', { name: 'Chat messages' });
    await expect(replyArea.getByText(/Groceries|Dining|Transport/i).first()).toBeVisible({ timeout: 10000 });
  });
});
