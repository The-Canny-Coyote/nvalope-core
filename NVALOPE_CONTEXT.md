# Nvalope Context Pack
_Generated: 2026-05-01T00:00:00Z_
_Branch: `public-core-snapshot` | Version: `1.2.0`_

## Stack
- React 18, TypeScript, Vite 6, Tailwind 4, Radix UI.
- Zustand handles UI state; IndexedDB handles budgets and app preferences.
- Static PWA hosting only. Core budgeting works offline after first load.
- Public core repo is MIT-licensed under The Canny Coyote LLC ownership. Premium, private, or separately distributed code is outside this repo and outside this license.

## Architecture Rules
- Budget data stays in `budgetIdb.ts`; app preferences stay in `appDataIdb.ts`.
- UI state belongs in `appStore.ts`.
- Period-aware UI totals must use `getBudgetSummaryForCurrentPeriod()`, not raw `envelope.spent`.
- Dates and rounding come from `src/app/utils/date.ts` and `src/app/utils/format.ts`.
- Receipt allocation uses `allocateTotalProportionally`.
- User-facing toasts should go through `delayedToast`, except paired loading/dismiss flows.
- Storage keys live in `src/app/constants/storageKeys.ts` and use kebab-case.
- Every network call needs a privacy reason; budget data must not leave the device.

## Key File Map
```text
src/app/
  App.tsx                          root, routing, top-level orchestration
  store/appStore.ts                Zustand UI state
  store/BudgetContext.tsx          budget summary and period totals
  services/budgetIdb.ts            budget persistence
  services/appDataIdb.ts           preferences/settings persistence
  services/delayedToast.ts         toast utility
  services/receiptAllocation.ts    receipt allocation logic
  services/webLLMAssistant.ts      on-device AI helper
  utils/date.ts                    todayISO and period helpers
  utils/format.ts                  money, date, and rounding helpers
  constants/storageKeys.ts         storage/session/history key catalog
  components/WheelMenu.tsx         section wheel and expanded dock overlay
  components/settings/             Settings panels and additional modules
public/_headers                    CSP lives here
```

## Audit Focus
- Keep budget and preference data local-first.
- Preserve keyboard and screen-reader access when touching navigation or settings.
- Keep additional modules discoverable without implying paid tiers in this public core app.
- Watch for duplicated date/rounding helpers, raw `fetch()` calls, and storage keys outside the catalog.

## Useful Commands
```bash
npm run build
npm run test:run
npm run lint
bash scripts/sovereignty-check.sh
bash scripts/context-pack.sh
```
