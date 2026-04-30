# E2E tests

Playwright tests for Nvalope.

- **Run all e2e:** `npm run test:e2e`
- The config starts the **built** app (`npm run build && npx vite preview --port 5174`) so the app is ready as soon as the URL responds. Base URL is `http://localhost:5174`.
- If you see "port 5174 is already in use", stop any process on that port (e.g. a previous `vite preview` or e2e run) and try again. With `reuseExistingServer: true` (when `CI` is not set), Playwright will reuse an existing server on 5174 if one is already running.
- Each spec’s `beforeEach` goes to `/`, sets localStorage, reloads, waits for the app (`waitForApp`), then dismisses any blocking dialog (`dismissDialogs`) so tests run against a clean UI.

## Helpers & selectors

- **`openSection(page, name)`** (`e2e/helpers.ts`) — the preferred way to open any section. It works across all three layouts:
  - **Wheel (idle):** targets the `role="radio"` wedge inside `[data-layout="wheel"]` (aria-label set to the section title).
  - **Wheel (section already open):** the dock mini-wheel in the top-right is decorative (`aria-hidden`), so the helper first clicks the **Open feature wheel** button to expand the overlay (`role="dialog"`, aria-label "Feature wheel"), then clicks the slice there.
  - **Cards / list:** falls back to `getByRole('button', { name })`.
  Always prefer this helper over hand-rolled selectors — it also waits for the initial layout container to render, so it survives first-paint races.
- **`prepareE2EStorageBeforeLoad(page, partial)`** seeds `localStorage` before the bundle runs. It defaults `wheelDockHintDismissed: true` and `wheelTryDismissed: true` so one-time hints don't float over assertions; tests that need the hint to appear should pass `{ wheelDockHintDismissed: false }`. It also sets `sessionStorage["nvalope-bmc-toast-shown"] = "true"` to suppress the Buy-Me-A-Coffee toast that fires 4 s after load (which can race with layout-sensitive assertions).
- **New spec:** `e2e/wheel-dock.spec.ts` covers the decorative dock, the expanded overlay, Esc / ✕ dismissal, and the one-time dock hint.
- **Mobile:** `e2e/mobile-card-bar.spec.ts` asserts the bottom section bar is a single horizontal row (`flex` + `nowrap`) at a phone viewport, not a two-row grid.
