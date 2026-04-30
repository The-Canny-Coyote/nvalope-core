# Accessibility notes (Nvalope)

This file documents user-facing accessibility behavior that is easy to miss when reading code only.

## Mobile card layout (narrow viewports)

On viewports treated as **mobile** (see `useIsMobile` in `src/app/hooks/useIsMobile.ts`), the app uses **card layout** with a fixed **bottom section bar**.

- The bar is **one horizontal row** of section tabs. If many optional features are enabled, the row **scrolls sideways** (`overflow-x: auto`, touch-friendly panning) instead of wrapping to a second row.
- Each tab keeps a **minimum width** so labels and touch targets stay usable (see `BottomNavBar` mobile bottom branch).
- Full-screen section content opens in **`MobileSectionSheet`**, with the reserved bottom inset matching the fixed bar height so content is not hidden behind the tabs.
- **`MobileSectionSheet`** integrates with the browser history stack: the first open adds a history entry; switching to another section **replaces** that entry (same depth, no extra back steps) so Android Chrome does not fire unrelated `popstate` events that could dismiss the sheet. **Browser back** and the sheet’s close control still dismiss the overlay in one step. The scrollable body uses `min-h-0` plus a layout pass after section changes so the flex column does not collapse to zero height on narrow Chrome (e.g. Pixel).

## Desktop

The feature wheel and optional card-bar row/column controls (when not on mobile) follow the same WCAG-minded patterns as the rest of the app: focus rings, `aria-*` on the wheel radiogroup, and keyboard navigation between sections.
