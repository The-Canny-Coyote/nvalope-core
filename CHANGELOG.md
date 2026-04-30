# Changelog

## Unreleased

### Changed

- Feature Wheel: once a section is open, the wheel now collapses to a small,
  decorative mini-wheel docked at the top-right of the page (rather than
  rotating the active slice out of view). The dock rides scroll with a gentle
  bob animation (respecting `reducedMotion`) and is purely visual — its wedges
  are `aria-hidden` and cannot be focused or clicked slice-by-slice.
- Click the dock to expand the full wheel **inline above the active section
  content** (`role="region"`, aria-label "Feature wheel"), pushing that
  content down rather than floating over it as a modal. Picking a slice
  switches sections without collapsing the wheel; dismiss with **Esc** or
  the small ✕ button above the wheel and the section content returns to
  its original position.
- First time the wheel docks, a brief one-time hint points at its new home. ✕
  (or clicking the dock itself) dismisses it permanently via
  `wheelDockHintDismissed` in the app store.
- Wheel wedges now expose as `role="radio"` inside a `role="radiogroup"`
  ("App sections") for assistive tech, replacing the previous `role="button"`.
- Removed the first-run "Try this" pill above the hero wheel — the wheel is
  already the default desktop layout and the prompt was unnecessary.

### Fixed

- **Mobile (narrow viewports):** switching bottom section tabs no longer leaves
  the full-screen section sheet blank or with missing scroll height on some
  Android Chrome builds (e.g. Pixel). History state is updated with
  `replaceState` when changing sections while the sheet stays open; the
  animated sheet shell remounts per section; and the scroll region gets a
  layout nudge after section changes.

- Toggling **Encrypt backups** no longer resets the scroll position when the
  "Set a password" helper card appears — the checkbox now saves/restores
  scroll the same way the backup collapsibles do.

- AI assistant rebranded to **Cache the Coyote, AI Companion** in user-facing
  copy: chat sheet title and welcome messages, the basic-assistant greeting,
  the wheel centre button (aria-label + tooltip), the Settings module label
  and section card, and the user guide / glossary. The local model's system
  prompt now also identifies itself as "Cache the Coyote." The footer
  trademark notice is updated to `Nvalope™, Cache™, and Cache the Coyote™`;
  the legacy `Cache the AI Assistant™` mark is retained on
  `public/terms.html` and `public/license.html` so the trademark claim isn't
  dropped.

### Docs

- User guide (`public/user-guide.html`) describes the new dock + expanded
  overlay and the one-time hint, and reflects the Cache the Coyote rename.
- Settings references updated from "Data Management" to the split
  "Back up & restore" / "Import data" collapsibles.
- Glossary gains a "Cache the Coyote" entry (in addition to the existing
  Feature Wheel / Feature dock entries from the prior release).

## [1.1.0] — 2026-03-31

### Changed

- Public license and trademark pages were added so users can inspect the
  project terms from inside the app. See LICENSE for the current repository
  license.
