# Nvalope User Guide

Nvalope is a budgeting app built around one idea: your financial data belongs to you. Everything stays on your device. Nothing is sent to a server. The app works fully offline after you load it the first time.

This guide covers everything from getting started to advanced features.

---

## Table of Contents

1. [The basics](#the-basics)
2. [How Nvalope is laid out](#how-nvalope-is-laid-out)
3. [Core features](#core-features)
   - [Overview](#overview)
   - [Income](#income)
   - [Envelopes & Expenses](#envelopes--expenses)
4. [Optional features](#optional-features)
   - [Transactions](#transactions)
   - [Receipt Scanner](#receipt-scanner)
   - [Calendar View](#calendar-view)
   - [Analytics](#analytics)
   - [Cache the Coyote, AI Companion](#cache-the-ai-assistant)
   - [Glossary](#glossary)
5. [Bank statement import](#bank-statement-import)
6. [Accessibility](#accessibility)
7. [Settings](#settings)
8. [Your data and backups](#your-data-and-backups)
9. [Installing Nvalope](#installing-nvalope)
10. [Privacy](#privacy)

---

## The basics

Nvalope uses **envelope budgeting**. The idea is straightforward: you divide your income into named categories (envelopes), set a spending limit for each, and track your expenses against those limits. When an envelope runs low, you know before you overspend.

A typical flow looks like this:

1. Add your income for the month.
2. Create envelopes — Groceries, Rent, Transport, whatever fits your life.
3. Log expenses as you spend, or import them from your bank.
4. Check your Overview to see where things stand.

That's it. No accounts to link, no subscriptions, no data leaving your device.

---

## How Nvalope is laid out

When you open the app you'll see the **Feature Wheel** — a circular menu where each slice represents a section. Tap a slice to open that section. Tap the centre or press the close button to go back.

Once you open a section, the wheel collapses to a small **dock** in the top-right corner. The dock is a decorative mini-wheel that rides along with your scroll — it shows you which features exist but is not clickable slice-by-slice. Tap the dock to expand the wheel back into the middle of the screen, then pick a different slice without leaving the current section. Press <kbd>Esc</kbd> or tap the small ✕ above the expanded wheel to collapse it back to the dock. The first time the wheel docks you'll see a one-time hint pointing at it; dismiss it with ✕ (or just click the dock) and it won't come back.

If you prefer a more traditional layout, you can switch to **Card Layout** in Settings. In card layout, sections appear as a bar of cards you tap to navigate. You can switch back to the wheel at any time.

The **Settings** button and theme toggle live at the top of the screen. The button to open **Cache the Coyote** (your AI companion, when enabled) appears there too.

---

## Core features

These sections are on by default. You can turn any of them off in Settings if you don't need them.

### Overview

Your budget at a glance. Shows:

- **Total Income** — everything you've logged this period
- **Total Budgeted** — the sum of your envelope limits
- **Total Spent** — expenses logged across all envelopes
- **Remaining** — what's left unspent

Below the numbers is a **Budget Health** bar. It reflects how much of your budget you've used relative to how far through the period you are. Green means you're on track. Red means you're spending ahead of pace.

The period shown depends on your budget period setting — monthly, biweekly, or weekly (configured in Envelopes & Expenses).

---

### Income

Log money coming in. Each income entry has an amount, a source (Salary, Freelance, Side gig — whatever label makes sense to you), and a date.

Your five most recent income entries appear below the form. Tap the edit icon on any entry to change the amount, source, or date. Tap the trash icon to delete it.

Income entries appear in the Calendar view and contribute to the totals in Overview and Analytics.

---

### Envelopes & Expenses

This is the heart of the app. Here you:

- **Create envelopes** — give each one a name and a spending limit
- **Log expenses** — assign them to an envelope, add a description and date
- **Track spending** — each envelope shows a progress bar of spent vs. limit
- **Set bills** — recurring due dates that appear on the Calendar
- **Set savings goals** — optional targets tracked in Analytics

**Budget period** is configured here. You can budget monthly, biweekly, or weekly. Biweekly mode lets you define exactly when each period starts and ends (useful for pay-cycle budgeting). Switching periods is non-destructive — past data keeps its original period labels.

Tapping an envelope opens its detail view, showing recent expenses for that envelope and a link into the full transaction history filtered to that envelope.

The **Quick Add** button at the top lets you log an expense fast without opening an envelope — just pick the envelope from a dropdown.

---

## Optional features

These are off by default. Turn them on in **Settings → Optional features**.

### Transactions

The full history of every expense and income entry, searchable and filterable. You can:

- **Search** by description or envelope name
- **Filter** by envelope, including an Uncategorized filter for expenses without an assigned envelope
- **Edit** any transaction to change the amount, description, date, or envelope
- **Delete** entries you no longer want

When you tap an envelope link in Transactions, it opens the Envelopes view pre-filtered to that envelope. Tapping an entry in the Calendar opens the Transactions view filtered to that date.

---

### Receipt Scanner

Point your camera at a receipt (or upload an image from your device) and Nvalope will read it automatically — extracting the merchant name, total amount, line items, tax, date, and currency.

First time you open the scanner, a **Getting started guide** walks you through the three steps: scan, assign, save. Tap the × to dismiss it once you're comfortable.

From the scan result you can:

- Edit any field the scanner got wrong
- Assign individual line items to different envelopes using the searchable envelope picker — or create a new envelope on the spot
- Tap **Save receipt** to add the line items to your budget as expenses and save the receipt to your archive
- Use **Save all** (appears when two or more unsaved scans are ready) to save them all at once

A confidence indicator appears if the scan quality is low — you can correct any misread values before saving.

Saved receipts go to **Receipt Archive** (accessible from the wheel or card bar), where you can review them later.

**Glossary support:** If your receipts use store abbreviations or codes for item names (common with grocery stores), tap **Advanced options** to load a JSON glossary file that maps those codes to readable names. A sample glossary is available to download from within the scanner. Once loaded, the active glossary is shown as a chip you can clear without reopening the options panel.

**How the scanner works on your device:** The app uses on-device OCR — no image is ever sent to a server. Category suggestions for your line items use a lightweight AI model that also runs locally in your browser. If that model isn't available, the app falls back to pattern matching. Either way, nothing leaves your device.

---

### Calendar View

A monthly and weekly calendar showing all your transactions, income entries, and bill due dates in one place. Tap any day to see what happened. Tap an event to jump to it in Transactions or Income.

You can also add expenses and income directly from the Calendar — tap a day, then use the add buttons that appear.

A search bar at the top filters events across the current month by description, source, or envelope name.

---

### Analytics

Eight charts that show your spending from different angles:

- **Spending by envelope** — where your money went this period, by category
- **Spending over time** — a trend line across the last 3, 6, or 12 months
- **Daily spending** — how much you spent each day over the last 7, 30, or 90 days
- **Income vs. expenses** — side-by-side comparison by period
- **Envelope usage** — how much of each envelope's limit you've used
- **Top envelopes** — your highest-spending categories
- **Income by source** — breakdown of where your income comes from
- **Savings progress** — how close you are to each savings goal

Most charts let you switch between display types — pie, bar, area, or line — depending on what makes the data clearest to you. Tap a slice or bar on envelope charts to jump to that envelope's transactions.

---

### Cache the Coyote, AI Companion

**Cache the Coyote** (the 🐺 in the centre of the Feature Wheel) is your AI companion — a chat assistant that knows your budget. Ask Cache questions in plain language:

- *How much have I spent on groceries this month?*
- *What's left in my Transport envelope?*
- *Which envelope is closest to its limit?*

Cache reads your current budget data to answer — no data is sent anywhere, and no account is required.

**Two modes are available:**

**Standard** uses a fast, rules-based engine that answers common budget questions reliably and works on any device, fully offline.

**Local AI model** (optional, toggled inside the assistant) downloads a small language model directly to your device. Once downloaded, it runs entirely in your browser. This mode can answer more open-ended questions and follow conversation context better. The download is several hundred megabytes — you'll be prompted before it starts. You can delete the downloaded files at any time from within the assistant.

> Note: The local AI model requires a WebGPU-capable browser (recent Chrome or Edge) and a device with at least 4 GB of RAM. If your device doesn't meet these requirements, Standard mode is used automatically.

> As with any AI, verify important numbers against your actual budget data.

---

### Glossary

A reference section covering financial terms (envelope, allocation, balance), privacy terms (what IndexedDB is, what "on-device" means, what a PWA is), and design principles. Useful if you're new to envelope budgeting or want to understand how the app handles your data.

---

## Bank statement import

You can import transactions directly from your bank's export files. Go to **Settings → Import data → Import bank statement**.

Supported formats: **CSV, OFX, QFX, QIF, and PDF**.

The import process:

1. Choose your file. The app detects the format automatically.
2. For CSV files, map your columns to the right fields (date, description, amount) if the app doesn't detect them automatically. Once mapped, the template is saved automatically — next time you import from the same bank, the column mapping is applied without asking.
3. Preview the transactions. Potential duplicates are flagged — you can skip them, keep both, or replace the existing entry.
4. Confirm to add the transactions to your budget.

Credits (incoming amounts) can optionally be imported as income entries rather than expenses. Uncategorized imports land in your transaction history where you can assign envelopes to them manually.

---

## Accessibility

Nvalope has extensive accessibility support, all in the **Accessibility** section of the wheel.

**Preset modes** — five purpose-built profiles you can apply with one tap:

| Mode | What it does |
| --- | --- |
| Focus | Strips decorative elements, increases contrast, reduces visual noise |
| Calm | Soft colours, relaxed spacing, reduced motion |
| Clear | Large text, high legibility |
| Contrast | High contrast throughout for low-vision use |
| Tactile | Larger touch targets, stronger visual feedback on interactions |

**Manual controls** let you go beyond the presets:

- **Text size** — scale all text up or down
- **Line height** — increase spacing between lines
- **Letter spacing** — widen or tighten character spacing
- **Layout scale** — make the entire layout larger or smaller
- **Wheel scale** — resize the feature wheel independently
- **Scrollbar size** — thicker scrollbars for easier grabbing
- **Chonkiness** — increase the visual weight of UI elements
- **Reduced motion** — disables animations throughout the app
- **High contrast** — increases contrast beyond the default theme
- **Screen reader mode** — additional labels and structure for screen readers

All accessibility settings are saved locally and persist across sessions.

---

## Settings

Settings covers three areas:

**Appearance** — switch between the Feature Wheel and Card Layout.

**Optional features** — turn individual sections on or off. Core sections (Overview, Income, Envelopes, Accessibility) can also be hidden if you don't use them. **Cache the Coyote (AI Companion)** and other advanced features are here too.

**Data** — split into two collapsible sections for clarity:

**Back up & restore** contains everything for protecting your data:

- **Status pills** at the top show at a glance whether auto-backup is active, whether encryption is on, and when the last backup ran (e.g. "5 min ago")
- **Encrypt backups** — toggle to password-protect downloaded backups. When encryption is on and no password has been set yet, a prompt appears to guide you through setup. A "Password set for this session" indicator appears once it's ready.
- **Choose backup folder** (Chrome/Edge only) — pick a folder on your device and Nvalope saves a backup automatically after every few changes
- **Download full backup (everything)** — a complete snapshot of your budget, settings, receipts, and chat history as a JSON file
- **Export budget only (no receipts)** — a smaller file with just your envelopes, transactions, and income; useful for sharing or opening in another tool
- **Download transactions as CSV** — exports all transactions as a spreadsheet-compatible CSV file you can open in Excel or Google Sheets
- **Check for updates** — manually check if a newer version is available
- **Load sample data** — load demo envelopes and transactions to explore features without entering real data

**Import data** contains two sub-sections:

- **Restore from backup** — load a Nvalope backup file (.json) to replace your current data. Before replacing, the app shows you what's in the file: the export date and the number of envelopes and transactions, so you can confirm you've got the right file.
- **Bank statement import** — see [Bank statement import](#bank-statement-import). If you've imported a CSV from the same bank before, you'll see "N saved templates — column mapping remembered" next to the import button.

---

## Your data and backups

All of your data lives in your browser's IndexedDB storage — a local database that stays on your device. It is not synced to any server.

**What this means practically:**

- If you clear "cookies and site data" for nvalope.app in your browser settings, your budget data will be deleted. Keep a backup.
- If you use a different browser or device, your data won't be there. Use the export/import feature to move it.
- The app does not have a "forgot password" flow because there's no account — your data is yours alone.

**Backup recommendations:**

The safest approach is to use both options together:

1. Set a **backup folder** (Settings → Data → Back up & restore) so the app saves automatically after changes.
2. Periodically **download a full backup** to keep a copy somewhere safe — a personal cloud drive, an external drive, or both.

Backups can optionally be encrypted with a password. If you encrypt a backup, keep the password — there is no recovery option because the key is never stored anywhere but your own memory.

---

## Installing Nvalope

Nvalope is a Progressive Web App (PWA). You can use it in any modern browser, or install it on your device so it works like a native app.

**On desktop (Chrome or Edge):** Look for the install icon in the address bar, or open the browser menu and choose "Install Nvalope."

**On iPhone/iPad (Safari):** Tap the Share button, then "Add to Home Screen."

**On Android (Chrome):** Tap the three-dot menu, then "Add to Home Screen" or "Install app."

Once installed, Nvalope works fully offline after the first load. If a new version is available, a small notification appears at the bottom of the screen with an "Update now" button — tap it when you're ready. You can dismiss it and update later; your data is never affected by updates.

---

## Privacy

Nvalope was designed with privacy as a constraint, not a feature checkbox.

- **No account required.** You never sign up, log in, or provide an email address.
- **No tracking.** No analytics, no behaviour monitoring, no advertising.
- **No server storage.** Your budget data, receipts, and transaction history never leave your device.
- **Optional features are off by default.** The receipt scanner, Cache the Coyote, and bank import are all opt-in.
- **Cache the Coyote runs on your device.** When the local model is used, it runs in your browser. When the standard assistant is used, it uses your local data with no network calls.
- **Backups are yours.** Downloaded backups go to your device. The app never has access to them after you save them.

The one exception to "nothing leaves your device" is app updates — the app checks for new versions when you ask it to (or on install). No personal data is included in that request.

For the full privacy policy: **Settings → Legal & support**, or [nvalope.app/privacy.html](https://nvalope.app/privacy.html).
