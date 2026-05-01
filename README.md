# Nvalope

A **free, privacy-focused, offline-capable envelope budgeting PWA.** No ads or tracking. All data stays on your device. Works offline after first load.

**Live app:** [nvalope.app](https://nvalope.app) · **Website:** [https://nvalope.app](https://nvalope.app)

*Suggested GitHub topics:* `pwa` `budgeting` `privacy` `react` `typescript` `vite`

## Features

- **Core budgeting** — Overview, Income, Envelopes & Expenses
- **Accessibility** — Text size, spacing, reduced motion, high contrast, screen reader support, preset modes (focus, calm, readability, low vision)
- **Additional features** — Transactions, receipt scanner, receipt archive, calendar, analytics, **Cache the Coyote** (our on-device AI companion, when enabled), glossary
- **Backup** — Export/import; optional autobackup to a folder you choose (File System Access API)
- **Manual bank statement import** — Import CSV, PDF, OFX/QFX, and QIF files with preview + duplicate-safe append
- **PWA** — Installable; offline after first load; “Check for updates” in Settings

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run test:run` | Unit tests |
| `npm run test:e2e` | Playwright E2E (run `npx playwright install` once) |
| `npm run test:predeploy` | Unit tests + E2E (run before deploy) |
| `npm run test:coverage` | Unit tests with coverage |
| `npm run lint` | Lint source |
| `npm run audit` | Dependency vulnerability check |
| `npm run deploy:pages` | Build and deploy to Cloudflare Pages (add `-- --branch=main` for production) |

## Pre-deploy checklist

Before deploying, run the full test suite to confirm nothing is broken:

```bash
npm run test:predeploy
```

Optionally run `npm run test:coverage` to check coverage. Tests are additive and do not remove or revert features; they only fail if something breaks.

## License

This repository contains the MIT-licensed public core app. Premium, private, or separately distributed features, services, modules, trademarks, and branding are not part of this repository or this license.

## Support

Nvalope is free to use. Voluntary support: [Buy Me a Coffee — TheCannyCoyote](https://www.buymeacoffee.com/thecannycoyote). Donations do not create a contract for features or support.

## Privacy and terms

Privacy Policy and Terms of Use apply worldwide. In the app: **Settings → Legal & support**, or [privacy](https://nvalope.app/privacy.html) and [terms](https://nvalope.app/terms.html).

## Trademark

**Nvalope**, **The Canny Coyote LLC**, **Cache**, **Cache the Coyote**, **Cache the Coyote, AI Companion**, and related names and logos are reserved to The Canny Coyote LLC and contributors. The MIT License grants rights to the public core software only; it does not grant rights to premium/private features, services, names, marks, or branding for derivative works or your own products without permission. See in-app Terms of Use for the full trademark section.

## Versioning

Nvalope public core releases use Semantic Versioning. See [docs/versioning.md](docs/versioning.md) for the release checklist, changelog rules, and tag format.
