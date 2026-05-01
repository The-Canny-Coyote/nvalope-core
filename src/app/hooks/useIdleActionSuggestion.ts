import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { STORAGE_KEYS } from '@/app/constants/storageKeys';

export const IDLE_ACTION_SUGGESTION_DELAY_MS = 20_000;

type Suggestion = {
  message: string;
  description: string;
  actionLabel?: string;
  actionSectionId?: number;
};

const OVERVIEW_SECTION_ID = 1;
const INCOME_SECTION_ID = 2;
const ENVELOPES_SECTION_ID = 3;
const TRANSACTIONS_SECTION_ID = 4;
const ACCESSIBILITY_SECTION_ID = 5;
const SETTINGS_SECTION_ID = 6;

const SUGGESTIONS: Record<number, Suggestion> = {
  [OVERVIEW_SECTION_ID]: {
    message: 'Ready to build your budget?',
    description: 'Add income first, then make envelopes for where that money should go.',
    actionLabel: 'Open Income',
    actionSectionId: INCOME_SECTION_ID,
  },
  [INCOME_SECTION_ID]: {
    message: 'Next, give your money a job.',
    description: 'Create envelopes so each dollar has a place before expenses happen.',
    actionLabel: 'Open Envelopes',
    actionSectionId: ENVELOPES_SECTION_ID,
  },
  [ENVELOPES_SECTION_ID]: {
    message: 'You can record spending here.',
    description: 'Add an expense to an envelope, or review the full list in Transactions.',
    actionLabel: 'Open Transactions',
    actionSectionId: TRANSACTIONS_SECTION_ID,
  },
  [TRANSACTIONS_SECTION_ID]: {
    message: 'Keep history tidy as you go.',
    description: 'Search, edit, or split transactions when a purchase spans more than one envelope.',
  },
  [ACCESSIBILITY_SECTION_ID]: {
    message: 'Make the app comfortable.',
    description: 'Try a preset or adjust text, motion, contrast, and layout controls here.',
  },
  [SETTINGS_SECTION_ID]: {
    message: 'A backup is a good next step.',
    description: 'Download a backup before importing, restoring, or experimenting with sample data.',
  },
};

function onboardingHandled(): boolean {
  try {
    const status = localStorage.getItem(STORAGE_KEYS.ONBOARDING_STATUS);
    return status === 'completed' || status === 'skipped';
  } catch {
    return true;
  }
}

export interface UseIdleActionSuggestionOptions {
  selectedSectionId: number | null;
  availableSectionIds: number[];
  onSelectSection: (sectionId: number) => void;
  disabled?: boolean;
  delayMs?: number;
}

export function useIdleActionSuggestion({
  selectedSectionId,
  availableSectionIds,
  onSelectSection,
  disabled = false,
  delayMs = IDLE_ACTION_SUGGESTION_DELAY_MS,
}: UseIdleActionSuggestionOptions): void {
  const shownSectionsRef = useRef(new Set<number>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousSectionRef = useRef<number | null>(selectedSectionId);
  const availableSectionIdsKey = useMemo(
    () => [...availableSectionIds].sort((a, b) => a - b).join(','),
    [availableSectionIds]
  );

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (disabled || selectedSectionId == null) {
      previousSectionRef.current = selectedSectionId;
      return;
    }

    const availableIds = new Set(
      availableSectionIdsKey
        .split(',')
        .filter(Boolean)
        .map((id) => Number.parseInt(id, 10))
    );
    const scheduleSuggestion = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (!onboardingHandled()) return;
        if (shownSectionsRef.current.has(selectedSectionId)) return;
        const suggestion = SUGGESTIONS[selectedSectionId];
        if (!suggestion) return;
        if (suggestion.actionSectionId != null && !availableIds.has(suggestion.actionSectionId)) return;

        shownSectionsRef.current.add(selectedSectionId);
        toast.info(suggestion.message, {
          id: `idle-action-suggestion-${selectedSectionId}`,
          description: suggestion.description,
          duration: 8000,
          action:
            suggestion.actionLabel && suggestion.actionSectionId != null
              ? {
                  label: suggestion.actionLabel,
                  onClick: () => onSelectSection(suggestion.actionSectionId!),
                }
              : undefined,
        });
      }, delayMs);
    };

    const sectionChanged = previousSectionRef.current !== selectedSectionId;
    previousSectionRef.current = selectedSectionId;
    if (sectionChanged) scheduleSuggestion();

    const onUserActivity = () => {
      if (!shownSectionsRef.current.has(selectedSectionId)) scheduleSuggestion();
    };

    window.addEventListener('pointerdown', onUserActivity, { passive: true });
    window.addEventListener('keydown', onUserActivity);
    window.addEventListener('input', onUserActivity);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      window.removeEventListener('pointerdown', onUserActivity);
      window.removeEventListener('keydown', onUserActivity);
      window.removeEventListener('input', onUserActivity);
    };
  }, [availableSectionIdsKey, delayMs, disabled, onSelectSection, selectedSectionId]);
}
