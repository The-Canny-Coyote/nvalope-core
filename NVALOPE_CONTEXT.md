# Nvalope Context Pack
_Generated: 2026-04-20T00:00:00Z_
_Branch: `main` | Version: `1.1.0`_
_Last commit: 7c31bfa feat(budgets): internal budget experiment_
_Last manual audit: 2026-04-20 — confirmed prior "Known Issues" list is resolved; see section below._

---

## Stack
- **React 18 + TypeScript + Vite 6** — SPA, no SSR
- **Zustand 5** — UI state only (localStorage-backed via appStore.ts)
- **Radix UI + Tailwind 4** — component primitives + utility CSS
- **IndexedDB** — ALL budget data (budgetIdb.ts + appDataIdb.ts)
- **Static PWA hosting** — app updates only; no budget data leaves the device
- **PWA** — fully offline after first load is a hard requirement

---

## Architecture Rules (non-negotiable)

| Rule | Detail |
|------|--------|
| Budget data | → `budgetIdb.ts` only |
| App prefs | → `appDataIdb.ts` only |
| UI state | → `appStore.ts` (Zustand/localStorage) |
| Period spending | Use `getBudgetSummaryForCurrentPeriod()` from BudgetContext. **NEVER** read `envelope.spent` in UI |
| Rounding | `roundTo2` canonical: `src/app/utils/format.ts` |
| Dates | `todayISO()` canonical: `src/app/utils/date.ts` |
| Allocation | `allocateTotalProportionally` canonical: `src/app/services/receiptAllocation.ts` |
| Toasts | Use `delayedToast` (not raw sonner), except loading/dismiss pairs |
| Storage keys | kebab-case: `nvalope-my-key` (not camelCase) |
| Network | Every `fetch()` needs justification. No financial data leaves device |

---

## Key File Map

```
src/app/
  App.tsx                          — root, routing
  store/
    appStore.ts                    — Zustand UI state
    BudgetContext.tsx              — getBudgetSummaryForCurrentPeriod()
    budgetStore.ts                 — budget data store
  services/
    budgetIdb.ts                   — ALL budget read/write
    appDataIdb.ts                  — preferences/settings
    delayedToast.ts                — toast utility (use this, not sonner directly)
    receiptAllocation.ts           — allocateTotalProportionally
    webLLMAssistant.ts             — on-device AI (WebLLM)
  utils/
    format.ts                      — roundTo2, formatMoney, formatDate (canonical)
    date.ts                        — todayISO(), period helpers (canonical)
    classNames.ts                  — shared input className helper
  constants/storageKeys.ts         — STORAGE_KEYS, SESSION_STORAGE_KEYS, HISTORY_STATE_KEYS (CHAT_OPEN, SECTION_OPEN)
  components/
    EnvelopesExpensesContent.tsx   — envelopes + SavingsGoalsSection (top-level)
    CalendarContent.tsx            — calendar view
    OverviewContent.tsx            — Budget Health card
    WheelMenu.tsx                  — wheel menu (isCacheEnabled derived from onOpenAssistant); desktop-only since 2026-04-20. Wedges use `role="radio"` inside a `role="radiogroup"` (aria-label "App sections"); the decorative dock variant sets `interactive={false}` + `aria-hidden` on its wedges so screen readers and query-by-role selectors see only the expanded/idle wheel. Dock lives to the right of the title card and bobs with scroll (framer-motion velocity spring; respects `reducedMotion`). Clicking the dock flips `wheelExpanded=true` (see `appStore`), overlaying the full wheel with a role="dialog" + aria-label "Feature wheel"; ESC or the small ✕ above it collapses back to the dock. Slice clicks in the expanded overlay switch `selectedWheelSection` but keep the overlay open. First-time dock-hint popover (aria-live polite) appears when `wheelDockHintVisible && !wheelDockHintDismissed`; ✕ or a dock click dismisses it permanently via `wheelDockHintDismissed` (persisted).
    MobileSectionSheet.tsx         — fullscreen section sheet for mobile (popstate-aware, scroll-locked)
    FeatureDiscoveryHint.tsx       — dismissable home-screen hint surfacing optional features in Settings
  hooks/useAnalyticsData.ts        — analytics chart data (period-aware)
public/_headers                    — CSP lives here (not vite.config.ts)
```

---

## Known Issues (as of 2026-04-20 audit)

### Resolved since prior audit
All previously listed dead code, code quality items, and calculation bugs were verified fixed in code:

- `getReceiptCategoryFromWebLLM` / `RECEIPT_CATEGORIES` — removed from `webLLMAssistant.ts`
- `SavingsGoalsSection` — now top-level in `EnvelopesExpensesContent.tsx` (line 145)
- `todayISO()` — all call sites import from `@/app/utils/date`
- `roundTo2` — duplicate removed from `receiptAllocation.ts`; imports from `utils/format`
- `formatDate` UTC off-by-one — fixed; `YYYY-MM-DD` parsed at local noon in `utils/format.ts`
- `nvalopePWAInstalled` — uses `STORAGE_KEYS.PWA_INSTALLED` (kebab-case)
- `isCacheEnabled` — derived from `!!onOpenAssistant` in `WheelMenu.tsx`
- `_screenReaderMode` — removed from `CalendarContent.tsx`
- `constants/storageKeys.ts` — exists with full kebab-case catalog
- Analytics "Spending by Envelope" — uses `periodSummary.envelopes` in `useAnalyticsData.ts`
- Uncategorized transactions — surfaced via `periodSummary.uncategorizedSpent` slice in Analytics
- Budget Health % — pulls from `periodSummary`; `healthDenominator = min(totalBudgeted, totalIncome)` in `OverviewContent.tsx`
- Savings goal cap — both Goals list and Analytics chart use `Math.min(100, …)` consistently
- Lint baseline — `npm run lint` is clean (0 errors, 0 warnings). Cleared pre-existing issues: unescaped JSX quotes in `ScanCard.tsx`, a `prefer-const` in `useReceiptScanner.ts`, and dead imports/vars across `App.tsx`, `GlossaryContent.tsx`, `FeatureToggles.tsx`, `useAnalyticsData.ts`, and `WheelMenu.tsx` (also removed the end-to-end dead `backupSuggestionToast` pathway in `externalBackup.ts` + `useAppBackup.ts`)
- Mobile: Feature Wheel removed on <768px viewports; `useCardLayout` is forced true and `cardBarPosition` is forced to `'bottom'` on mobile (desktop preferences preserved in store), the wheel/cards toggle in Settings → Appearance is replaced with an info banner on mobile, and opened sections render in a fullscreen `MobileSectionSheet` with sticky header, scroll-lock, ESC/close-X/popstate dismissal, and back-button integration (new `HISTORY_STATE_KEYS.SECTION_OPEN`). Bottom nav remains visible so section switching still works.
- Toast cleanup: the two "what's new" QoL update toasts that fired on every first-visit session (colorblind/cache-savings and receipt/transactions/calendar announcements) are removed along with their `QOL_UPDATE_TOASTS_SEEN` flag. The PWA "Update ready" toast and the Buy-Me-A-Coffee donation toast are the only on-load toasts that remain; all in-app action toasts (errors, undos, save confirmations, import progress, OCR results) are unchanged. `Toaster` now positions responsively — `top-center` on mobile (with safe-area-aware offset) and `bottom-right` on desktop — so nothing overlaps the mobile bottom nav or desktop UI.
- Feature discovery: new `FeatureDiscoveryHint` component renders in the home idle state of both the cards layout (below "Tap a section below to get started.") and the wheel layout (below "Hover over sections to see labels…"). It lists the opt-in features by name (Transactions, Receipt Scanner, Calendar, Analytics, Cache the Coyote (AI Companion), Glossary), offers an "Open Settings" shortcut, and can be dismissed permanently via `STORAGE_KEYS.FEATURE_DISCOVERY_HINT_DISMISSED`. The hint also auto-hides once the user has expanded the Optional Features collapsible in Settings (tracked via `STORAGE_KEYS.OPTIONAL_FEATURES_OPENED`, written by a `useEffect` in `App.tsx` watching `settingsOptionalFeaturesOpen`).
- Card bar visual parity with wheel: `BottomNavBar` previously colored tabs with neutral `var(--primary)` / `var(--muted-foreground)`. It now uses each `section.color` (green for core modules, brown for utility modules) so the card bar and the Feature Wheel share one visual language. Icons render at 80% alpha when unselected and full color when selected (matching `WheelMenu`'s 60/80/100 wedge-alpha scheme, bumped slightly for icon-stroke legibility); selected tab background is `color-mix(in srgb, section.color 14%, transparent)`; title text stays at `text-foreground` for WCAG contrast regardless of section.

### Open items

None known. Regression tests guard the four calc fixes:
- `src/app/hooks/useAnalyticsData.test.ts` (period-filtered byEnvelope, Uncategorized slice, savings cap)
- `src/app/store/BudgetContext.test.tsx` (Budget Health denominator shape in `getBudgetSummaryForCurrentPeriod`)
- `src/app/components/EnvelopesExpensesContent.savingsCap.test.tsx` (Goals list cap at 100%)

### Guidelines for future audits

- Every localStorage key MUST appear in `STORAGE_KEYS` in `src/app/constants/storageKeys.ts`. Same for sessionStorage (`SESSION_STORAGE_KEYS`) and history state keys (`HISTORY_STATE_KEYS`).
- Any direct read of `envelope.spent` in UI is a regression — use `getBudgetSummaryForCurrentPeriod()`.
- Any local re-declaration of `todayISO()` or `roundTo2()` is a regression — import from `utils/date` / `utils/format`.

---

## Recent Git Activity (last 10 commits)

```
7c31bfa feat(budgets): internal budget experiments
84c569a feat(budgets): internal backup experiments
f072702 feat(budgets): internal gating experiments
5cedb5c feat(budgets): internal data-layer experiments
e78be1f Merge claude/amazing-shannon: add dev suite scripts
6138329 Merge claude/silly-sinoussi: re-enable AI assistant (WebLLM) + quality fixes
002e349 feat(dev): add dev suite scripts (repo-health, sovereignty, context-pack, wrangler-diff)
76e47ea feat(ux): hero reorder, coffee toast, remove backup reminder, mobile footer fix, scroll restore
b24ddc1 Merge remote-tracking branch 'origin/claude/jolly-albattani'
6c19b53 fix(ux): replace hover-only tooltips with tap-friendly popovers in Data Management
```

---

## Churn Hotspots (last 30 commits)

Files changed most frequently — high churn = higher bug risk:

```
      6 src/app/components/settings/BackupSettings.tsx
      6 src/app/App.tsx
      4 src/app/services/externalBackup.ts
      3 src/app/store/appStore.ts
      3 src/app/constants/storageKeys.ts
      3 src/app/components/MainContent.tsx
      2 src/app/store/BudgetContext.tsx
      2 src/app/hooks/useReceiptScanner.ts
      2 src/app/components/ScanCard.tsx
      2 src/app/components/ReceiptScannerContent.tsx
      1 src/app/utils/receiptPreprocess.ts
      1 src/app/utils/format.ts
      1 src/app/utils/date.ts
      1 src/app/store/budgetTypes.ts
      1 src/app/store/budgetStore.accuracy.test.ts
```

---

## Source File Inventory

```
src/app/App.tsx
src/app/audit/securityPrivacyAudit.test.ts
src/app/components/AIChatSheet.tsx
src/app/components/AboutContent.tsx
src/app/components/AccessibilityContent.tsx
src/app/components/AccessibilityPresets.tsx
src/app/components/AccessibilitySliders.tsx
src/app/components/AccessibilityToggles.tsx
src/app/components/AnalyticsContent.tsx
src/app/components/AppDialogs.tsx
src/app/components/AppErrorBoundary.tsx
src/app/components/BackupFolderPrompt.test.tsx
src/app/components/BackupFolderPrompt.tsx
src/app/components/BackupPasswordDialog.tsx
src/app/components/BillEditForm.tsx
src/app/components/BottomNavBar.tsx
src/app/components/BrandCoyoteMark.tsx
src/app/components/CalendarContent.tsx
src/app/components/CoyoteIcon.tsx
src/app/components/EncryptedBackupNudgeDialog.tsx
src/app/components/EnvelopesExpensesContent.tsx
src/app/components/FeatureCardRow.tsx
src/app/components/FeatureDiscoveryHint.tsx
src/app/components/GlossaryContent.tsx
src/app/components/GridBackground.tsx
src/app/components/HintIcon.tsx
src/app/components/IncomeContent.tsx
src/app/components/IncomeEditForm.tsx
src/app/components/MainContent.tsx
src/app/components/MobileSectionSheet.tsx
src/app/components/OverviewContent.tsx
src/app/components/QuickAddExpenseForm.tsx
src/app/components/QuickAddIncomeForm.tsx
src/app/components/ReceiptArchiveContent.tsx
src/app/components/ReceiptScannerContent.tsx
src/app/components/ScanCard.tsx
src/app/components/SettingsContent.tsx
src/app/components/SimpleListView.tsx
src/app/components/SplitTransactionDialog.tsx
src/app/components/StatementImportPanel.tsx
src/app/components/StorageUsage.test.tsx
src/app/components/StorageUsage.tsx
src/app/components/SystemNotificationDialog.tsx
src/app/components/TactileTouchEffect.tsx
src/app/components/ThemeToggle.tsx
src/app/components/TransactionEditForm.tsx
src/app/components/TransactionsContent.tsx
src/app/components/WheelMenu.tsx
src/app/components/accessibilityMode.ts
src/app/components/analytics/charts/DailySpendingChart.tsx
src/app/components/analytics/charts/EnvelopeUsageChart.tsx
src/app/components/analytics/charts/IncomeBySourceChart.tsx
src/app/components/analytics/charts/IncomeVsExpensesChart.tsx
src/app/components/analytics/charts/SavingsProgressChart.tsx
src/app/components/analytics/charts/SpendingByEnvelopeChart.tsx
src/app/components/analytics/charts/SpendingOverTimeChart.tsx
src/app/components/analytics/charts/TopEnvelopesChart.tsx
src/app/components/analytics/charts/index.ts
src/app/components/analytics/charts/types.ts
src/app/components/analyticsChartTypes.ts
src/app/components/analyticsChartUtils.tsx
src/app/components/settings/AppearanceSettings.tsx
src/app/components/settings/BackupSettings.tsx
src/app/components/settings/FeatureToggles.tsx
src/app/components/ui/ConfirmDialog.tsx
src/app/components/ui/alert-dialog.tsx
src/app/components/ui/alert.tsx
src/app/components/ui/badge.tsx
src/app/components/ui/button.tsx
src/app/components/ui/card.tsx
src/app/components/ui/checkbox.tsx
src/app/components/ui/collapsible.tsx
src/app/components/ui/command.tsx
src/app/components/ui/dialog.tsx
src/app/components/ui/drawer.tsx
src/app/components/ui/dropdown-menu.tsx
src/app/components/ui/form.tsx
src/app/components/ui/input-otp.tsx
src/app/components/ui/input.tsx
src/app/components/ui/label.tsx
src/app/components/ui/pagination.tsx
src/app/components/ui/popover.tsx
src/app/components/ui/progress.tsx
src/app/components/ui/radio-group.tsx
src/app/components/ui/resizable.tsx
src/app/components/ui/scroll-area.tsx
src/app/components/ui/select.tsx
src/app/components/ui/separator.tsx
src/app/components/ui/sheet.tsx
src/app/components/ui/skeleton.tsx
src/app/components/ui/slider.tsx
src/app/components/ui/sonner.tsx
src/app/components/ui/switch.test.tsx
src/app/components/ui/switch.tsx
src/app/components/ui/table.tsx
src/app/components/ui/tabs.tsx
src/app/components/ui/textarea.tsx
src/app/components/ui/tooltip.tsx
src/app/components/ui/utils.ts
src/app/constants/accessibility.test.ts
src/app/constants/accessibility.ts
src/app/constants/assistantCopy.ts
src/app/constants/features.ts
src/app/constants/hints.test.ts
src/app/constants/hints.ts
src/app/constants/modules.ts
src/app/constants/settings.ts
src/app/constants/storageKeys.ts
src/app/constants/timing.ts
src/app/contexts/HintContext.tsx
src/app/contexts/TransactionFilterContext.tsx
src/app/fixtures/seedBudget.ts
src/app/hooks/useAccessibility.ts
src/app/hooks/useAnalyticsData.ts
src/app/hooks/useAppBackup.ts
src/app/hooks/useBackupFolderReminders.ts
src/app/hooks/useCheckUpdatesToast.ts
src/app/hooks/useDebouncedValue.ts
src/app/hooks/useIsMobile.ts
src/app/hooks/useModules.ts
src/app/hooks/useNotificationQueue.ts
src/app/hooks/usePwaUpdate.ts
src/app/hooks/useReceiptScanner.ts
src/app/hooks/useScrollRestore.ts
src/app/sections/appSections.tsx
src/app/services/appDataIdb.test.ts
src/app/services/appDataIdb.ts
src/app/services/basicAssistant.test.ts
src/app/services/basicAssistant.ts
src/app/services/budgetBackupEnrich.ts
src/app/services/budgetIdb.test.ts
src/app/services/budgetIdb.ts
src/app/services/delayedToast.test.ts
src/app/services/delayedToast.ts
src/app/services/externalBackup.test.ts
src/app/services/externalBackup.ts
src/app/services/idb.test.ts
src/app/services/idb.ts
src/app/services/localBackupIdb.ts
src/app/services/protectionDb.ts
src/app/services/receiptAllocation.property.test.ts
src/app/services/receiptAllocation.test.ts
src/app/services/receiptAllocation.ts
src/app/services/receiptCategorization.ts
src/app/services/receiptCategoryPatterns.test.ts
src/app/services/receiptCategoryPatterns.ts
src/app/services/receiptParser.test.ts
src/app/services/receiptParser.ts
src/app/services/statementImport/backupEnrich.ts
src/app/services/statementImport/canonical.ts
src/app/services/statementImport/dedup.test.ts
src/app/services/statementImport/dedup.ts
src/app/services/statementImport/importWorkerClient.ts
src/app/services/statementImport/index.ts
src/app/services/statementImport/looseBankTextFromPdf.test.ts
src/app/services/statementImport/looseBankTextFromPdf.ts
src/app/services/statementImport/normalize.ts
src/app/services/statementImport/normalizePayee.test.ts
src/app/services/statementImport/normalizePayee.ts
src/app/services/statementImport/parsePdfStatement.ts
src/app/services/statementImport/parsers.ts
src/app/services/statementImport/pdfPageText.ts
src/app/services/statementImport/ruleEngine.test.ts
src/app/services/statementImport/ruleEngine.ts
src/app/services/statementImport/statementImport.integration.test.ts
src/app/services/statementImport/statementImport.test.ts
src/app/services/statementImport/statementTemplates.ts
src/app/services/statementImport/suggestEnvelope.test.ts
src/app/services/statementImport/suggestEnvelope.ts
src/app/services/statementImport/types.ts
src/app/services/webLLMAssistant.test.ts
src/app/services/webLLMAssistant.ts
src/app/store/BudgetContext.test.tsx
src/app/store/BudgetContext.tsx
src/app/store/appStore.ts
src/app/store/budgetSchema.ts
src/app/store/budgetStore.accuracy.test.ts
src/app/store/budgetStore.test.ts
src/app/store/budgetStore.ts
src/app/store/budgetTypes.test.ts
src/app/store/budgetTypes.ts
src/app/store/transactionMigration.ts
src/app/utils/analyticsInsight.ts
src/app/utils/backupCrypto.test.ts
src/app/utils/backupCrypto.ts
src/app/utils/classNames.ts
src/app/utils/date.test.ts
src/app/utils/date.ts
src/app/utils/deviceCapabilities.test.ts
src/app/utils/deviceCapabilities.ts
src/app/utils/format.test.ts
src/app/utils/format.ts
src/app/utils/receiptImageCompress.ts
src/app/utils/receiptPreprocess.ts
src/app/utils/storage.ts
src/app/utils/truncate.test.ts
src/app/utils/truncate.ts
src/app/workers/importWorker.ts
src/app/workers/importWorkerProtocol.ts
src/main.tsx
src/test/setup.ts
src/vite-env.d.ts
```

---

## CSP Headers (public/_headers snapshot)

```
# CSP is enforced here (Cloudflare applies _headers after its own script injections, so CF scripts are covered).
# unsafe-inline is retained until Rocket Loader is disabled in the Cloudflare dashboard and Web Analytics
# is switched to an explicit <script defer src="beacon.min.js"> tag in index.html.
# connect-src is scoped to known endpoints; widen only if a new runtime fetch target is added (and update privacy.html).
#
# WebLLM / WASM: only add cross-origin isolation if you confirm the runtime needs it and you can fix CORP for
# every third-party asset (analytics, CDNs). Example (often breaks embeds — use docs/troubleshooting.md first):
#   Cross-Origin-Opener-Policy: same-origin
#   Cross-Origin-Embedder-Policy: credentialless

# Root and index: avoid long cache so users get fresh HTML after deploy (and correct hashed asset URLs)
/
  Cache-Control: no-cache
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://static.cloudflareinsights.com; script-src-elem 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://static.cloudflareinsights.com; worker-src 'self' blob: https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; style-src-elem 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.workers.dev https://cdn.jsdelivr.net https://raw.githubusercontent.com https://static.cloudflareinsights.com https://huggingface.co https://hf.co https://*.hf.co https://*.huggingface.co https://*.huggingfaceusercontent.com https://cas-bridge.xethub.hf.co https://*.xethub.hf.co; manifest-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; frame-ancestors 'none'
/index.html
  Cache-Control: no-cache
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://static.cloudflareinsights.com; script-src-elem 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://static.cloudflareinsights.com; worker-src 'self' blob: https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; style-src-elem 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.workers.dev https://cdn.jsdelivr.net https://raw.githubusercontent.com https://static.cloudflareinsights.com https://huggingface.co https://hf.co https://*.hf.co https://*.huggingface.co https://*.huggingfaceusercontent.com https://cas-bridge.xethub.hf.co https://*.xethub.hf.co; manifest-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; frame-ancestors 'none'
/install-pwa.html
  Cache-Control: no-cache
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://static.cloudflareinsights.com; script-src-elem 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://static.cloudflareinsights.com; worker-src 'self' blob: https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; style-src-elem 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.workers.dev https://cdn.jsdelivr.net https://raw.githubusercontent.com https://static.cloudflareinsights.com https://huggingface.co https://hf.co https://*.hf.co https://*.huggingface.co https://*.huggingfaceusercontent.com https://cas-bridge.xethub.hf.co https://*.xethub.hf.co; manifest-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; frame-ancestors 'none'
/license.html
  Cache-Control: public, max-age=86400
  Content-Security-Policy: frame-ancestors 'none'
/privacy.html
  Cache-Control: public, max-age=86400
  Content-Security-Policy: frame-ancestors 'none'
/terms.html
  Cache-Control: public, max-age=86400
  Content-Security-Policy: frame-ancestors 'none'
/user-guide.html
  Cache-Control: public, max-age=86400
  Content-Security-Policy: frame-ancestors 'none'

# Hashed assets: safe to cache forever; avoids stale HTML pointing at old 404ing assets
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# Ensure OG image is served with correct type for Facebook/crawlers
/og-image.png
  Content-Type: image/png
  Cache-Control: public, max-age=86400
```

---

_Re-generate before each AI session: `bash scripts/context-pack.sh`_
