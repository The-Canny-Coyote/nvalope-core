/**
 * Dismissable hint shown on the home empty state so new users discover that
 * optional features (Transactions, Receipt Scanner, Calendar, Analytics, AI
 * Assistant, Glossary) can be turned on in Settings.
 *
 * Persists its dismissed state in localStorage so the hint never comes back
 * once dismissed. Stays privacy-first: no tracking, no analytics.
 */

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { STORAGE_KEYS } from '@/app/constants/storageKeys';

export interface FeatureDiscoveryHintProps {
  /** Called when the user opens Settings via the hint's "Settings" button. */
  onOpenSettings?: () => void;
}

/**
 * True when the hint should be hidden for any reason: either the user dismissed
 * it explicitly, or they have already expanded the Optional Features collapsible
 * in Settings (which means they've discovered the menu on their own).
 */
function readHidden(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem(STORAGE_KEYS.FEATURE_DISCOVERY_HINT_DISMISSED) === 'true') return true;
    if (localStorage.getItem(STORAGE_KEYS.OPTIONAL_FEATURES_OPENED) === 'true') return true;
    return false;
  } catch {
    return false;
  }
}

export function FeatureDiscoveryHint({ onOpenSettings }: FeatureDiscoveryHintProps) {
  const [dismissed, setDismissed] = useState<boolean>(readHidden);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === STORAGE_KEYS.FEATURE_DISCOVERY_HINT_DISMISSED ||
        e.key === STORAGE_KEYS.OPTIONAL_FEATURES_OPENED
      ) {
        setDismissed(readHidden());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEYS.FEATURE_DISCOVERY_HINT_DISMISSED, 'true');
    } catch {
      /* Storage unavailable (private mode, quota). Hint stays dismissed for the
         current session via local state; that's acceptable. */
    }
  }, []);

  if (dismissed) return null;

  return (
    <div
      role="note"
      aria-label="Tip: more features available in Settings"
      className="mt-3 w-full max-w-md rounded-xl border border-primary/25 bg-primary/5 px-3 py-1.5 text-sm text-foreground"
    >
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-muted-foreground">
          More in{' '}
          {onOpenSettings ? (
            <button
              type="button"
              onClick={onOpenSettings}
              className="font-medium text-foreground underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            >
              Settings
            </button>
          ) : (
            <span className="font-medium text-foreground">Settings</span>
          )}
          : Transactions, Receipts, Calendar, Analytics, AI, Glossary.
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss tip"
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
