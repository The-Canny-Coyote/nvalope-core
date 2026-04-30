import React from 'react';
import { Accessibility } from 'lucide-react';

export interface AppearanceSettingsProps {
  useCardLayout?: boolean;
  setUseCardLayout?: (v: boolean) => void;
  isMobile?: boolean;
  /** Navigate to the Accessibility section. Accessibility was removed from
   *  the mobile card bar (#15), so this is the primary shortcut for mobile
   *  users. Desktop users can also click this instead of hunting in the wheel. */
  onOpenAccessibility?: () => void;
}

export function AppearanceSettings({
  useCardLayout = false,
  setUseCardLayout,
  isMobile = false,
  onOpenAccessibility,
}: AppearanceSettingsProps) {
  // The wheel/cards toggle is desktop-only (mobile is cards-only). The
  // Accessibility shortcut is rendered on both but is especially important
  // on mobile where Accessibility no longer lives in the bottom nav.
  const showLayoutToggle = !isMobile && !!setUseCardLayout;
  const showA11yShortcut = !!onOpenAccessibility;

  if (!showLayoutToggle && !showA11yShortcut) return null;

  return (
    <div className="space-y-3">
      {showA11yShortcut ? (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Accessibility className="h-4 w-4 text-primary shrink-0" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Text size, motion, contrast and preset modes live in Accessibility.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAccessibility}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Open Accessibility
          </button>
        </div>
      ) : null}
      {showLayoutToggle ? (
        useCardLayout ? (
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Using card layout. Switch back to the Feature Wheel to see all sections in a wheel.
            </p>
            <button
              type="button"
              onClick={() => setUseCardLayout!(false)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Use Feature Wheel
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Using the Feature Wheel. Switch to cards to see sections as a card bar.
            </p>
            <button
              type="button"
              onClick={() => setUseCardLayout!(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Switch to cards (Or not.)"
            >
              Or not.
            </button>
          </div>
        )
      ) : null}
    </div>
  );
}
