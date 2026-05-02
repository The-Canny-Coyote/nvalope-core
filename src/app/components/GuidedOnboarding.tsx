import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { SESSION_STORAGE_KEYS, STORAGE_KEYS } from '@/app/constants/storageKeys';
import { SETTINGS_SECTION_ID } from '@/app/sections/appSections';

const OVERVIEW_SECTION_ID = 1;
const INCOME_SECTION_ID = 2;
const ENVELOPES_SECTION_ID = 3;
const ACCESSIBILITY_SECTION_ID = 5;
const TOUR_VIEWPORT_GAP_PX = 12;

type OnboardingStatus = 'started' | 'completed' | 'skipped';
type TourPanelMode = 'instruction' | 'waiting' | 'hidden';

interface TourStep {
  id: string;
  title: string;
  body: string;
  actionLabel?: string;
  actionSectionId?: number;
}

const steps: TourStep[] = [
  {
    id: 'navigation',
    title: 'Start with the section picker',
    body: 'The wheel or card bar is your map for moving through Nvalope. Start by opening Income so you can see where money coming in belongs before you assign it to envelopes.',
    actionLabel: 'Open Income',
    actionSectionId: INCOME_SECTION_ID,
  },
  {
    id: 'income',
    title: 'Income powers the budget',
    body: 'Use Income for paychecks, side work, refunds, or any money that increases what you can budget. The totals here feed the rest of the app, so your envelope limits and Overview make more sense after income is recorded.',
    actionLabel: 'Open Envelopes',
    actionSectionId: ENVELOPES_SECTION_ID,
  },
  {
    id: 'envelopes',
    title: 'Envelopes organize spending',
    body: 'Envelopes & Expenses is where you create spending categories, set limits, and track day-to-day expenses against those limits. Each envelope shows what has been spent and what remains for the current budget period.',
    actionLabel: 'Open Overview',
    actionSectionId: OVERVIEW_SECTION_ID,
  },
  {
    id: 'overview',
    title: 'Overview shows the big picture',
    body: 'Overview summarizes the current period: income and budgeted money at the top, then spending and remaining money below. Budget Health shows how quickly spending is using the available plan.',
    actionLabel: 'Open Accessibility',
    actionSectionId: ACCESSIBILITY_SECTION_ID,
  },
  {
    id: 'accessibility',
    title: 'Accessibility is built in',
    body: 'Accessibility gives you control over text size, motion, contrast, and layout comfort. These settings are there so the app can fit how you read, navigate, and focus.',
    actionLabel: 'Open Settings',
    actionSectionId: SETTINGS_SECTION_ID,
  },
  {
    id: 'settings',
    title: 'Settings holds data and preferences',
    body: 'Settings is where you manage preferences, backups, sample data, storage information, appearance, and feature switches. It is also where you can review options that affect how the app behaves on this device.',
    actionLabel: 'Review additional features',
  },
  {
    id: 'additional-features',
    title: 'Additional features are opt-in',
    body: 'Additional features stay off until you choose them. Transactions, Receipt Scanner, Calendar, Analytics, Cache the Coyote, and Glossary can be turned on in Settings when they are useful, without changing the core envelope workflow.',
  },
];

function readOnboardingHandled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(STORAGE_KEYS.ONBOARDING_STATUS) != null;
  } catch {
    return false;
  }
}

function writeOnboardingStatus(status: OnboardingStatus): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_STATUS, status);
  } catch {
    // Private browsing or storage failures should not block the user.
  }
}

function isTourPanelMode(value: string | null): value is TourPanelMode {
  return value === 'instruction' || value === 'waiting' || value === 'hidden';
}

function readSessionTourState(): { active: boolean; stepIndex: number; panelMode: TourPanelMode } {
  if (typeof window === 'undefined') return { active: false, stepIndex: 0, panelMode: 'instruction' };
  try {
    const active = sessionStorage.getItem(SESSION_STORAGE_KEYS.ONBOARDING_TOUR_ACTIVE) === 'true';
    const rawStep = Number.parseInt(sessionStorage.getItem(SESSION_STORAGE_KEYS.ONBOARDING_TOUR_STEP) ?? '0', 10);
    const stepIndex = Number.isFinite(rawStep) ? Math.min(Math.max(rawStep, 0), steps.length - 1) : 0;
    const storedMode = sessionStorage.getItem(SESSION_STORAGE_KEYS.ONBOARDING_TOUR_PANEL_MODE);
    const panelMode = isTourPanelMode(storedMode) ? storedMode : 'instruction';
    return { active, stepIndex, panelMode };
  } catch {
    return { active: false, stepIndex: 0, panelMode: 'instruction' };
  }
}

function writeSessionTourState(active: boolean, stepIndex: number, panelMode: TourPanelMode = 'instruction'): void {
  try {
    if (!active) {
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.ONBOARDING_TOUR_ACTIVE);
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.ONBOARDING_TOUR_STEP);
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.ONBOARDING_TOUR_PANEL_MODE);
      return;
    }
    sessionStorage.setItem(SESSION_STORAGE_KEYS.ONBOARDING_TOUR_ACTIVE, 'true');
    sessionStorage.setItem(SESSION_STORAGE_KEYS.ONBOARDING_TOUR_STEP, String(stepIndex));
    sessionStorage.setItem(SESSION_STORAGE_KEYS.ONBOARDING_TOUR_PANEL_MODE, panelMode);
  } catch {
    // Session storage is only used to survive app remounts during the tour.
  }
}

export interface GuidedOnboardingProps {
  selectedSection: number | null;
  onSelectSection: (sectionId: number | null) => void;
  onHandled: (status: Exclude<OnboardingStatus, 'started'>) => void;
  isMobile?: boolean;
}

export function GuidedOnboarding({
  selectedSection,
  onSelectSection,
  onHandled,
  isMobile = false,
}: GuidedOnboardingProps) {
  const [showIntro, setShowIntro] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [panelMode, setPanelMode] = useState<TourPanelMode>('instruction');
  const [coachInsets, setCoachInsets] = useState({ bottom: 16, left: 12, right: 12 });
  const [coachAnchor, setCoachAnchor] = useState<HTMLElement | null>(null);
  const step = steps[stepIndex];
  const waitingTargetReached = step.actionSectionId != null && selectedSection === step.actionSectionId;
  const showActionButton = Boolean(step.actionLabel);
  const progressPercent = Math.round(((stepIndex + 1) / steps.length) * 100);

  useEffect(() => {
    const sessionTour = readSessionTourState();
    if (sessionTour.active) {
      setStepIndex(sessionTour.stepIndex);
      setPanelMode(sessionTour.panelMode);
      setTourActive(true);
      setShowIntro(false);
      return;
    }
    setShowIntro(!readOnboardingHandled());
  }, []);

  useEffect(() => {
    if (tourActive) writeSessionTourState(true, stepIndex, panelMode);
  }, [panelMode, stepIndex, tourActive]);

  const finish = useCallback(
    (status: OnboardingStatus) => {
      writeOnboardingStatus(status);
      writeSessionTourState(false, 0);
      setShowIntro(false);
      setTourActive(false);
      setStepIndex(0);
      setPanelMode('instruction');
      onHandled(status);
    },
    [onHandled]
  );

  const startTour = () => {
    setShowIntro(false);
    setTourActive(true);
    setStepIndex(0);
    setPanelMode('instruction');
    writeOnboardingStatus('started');
    writeSessionTourState(true, 0, 'instruction');
    onSelectSection(null);
  };

  const skipTour = () => {
    finish('skipped');
  };

  const goToStepTarget = () => {
    if (step.actionSectionId != null && selectedSection !== step.actionSectionId) {
      onSelectSection(step.actionSectionId);
      setPanelMode('waiting');
      return;
    }
    advance();
  };

  const advance = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      finish('completed');
      return;
    }
    setPanelMode('instruction');
    setStepIndex((current) => current + 1);
  }, [finish, stepIndex]);

  useEffect(() => {
    if (tourActive && panelMode === 'waiting' && waitingTargetReached) {
      advance();
    }
  }, [advance, panelMode, tourActive, waitingTargetReached]);

  const hidePromptTemporarily = () => {
    setPanelMode(showActionButton ? 'waiting' : 'hidden');
  };

  const updateCoachInsets = useCallback(() => {
    if (typeof window === 'undefined') return;

    let bottom = 16;
    let left = 12;
    let right = 12;

    document.querySelectorAll<HTMLElement>('[data-tour-avoid]').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      if (rect.bottom >= window.innerHeight - 2) {
        bottom = Math.max(bottom, window.innerHeight - rect.top + TOUR_VIEWPORT_GAP_PX);
      }
      if (rect.left <= 2) {
        left = Math.max(left, rect.right + TOUR_VIEWPORT_GAP_PX);
      }
      if (rect.right >= window.innerWidth - 2) {
        right = Math.max(right, window.innerWidth - rect.left + TOUR_VIEWPORT_GAP_PX);
      }
    });

    setCoachInsets((current) =>
      current.bottom === bottom && current.left === left && current.right === right
        ? current
        : { bottom, left, right }
    );
  }, []);

  useLayoutEffect(() => {
    if (!tourActive || (!isMobile && coachAnchor)) return;

    updateCoachInsets();
    window.addEventListener('resize', updateCoachInsets);
    window.addEventListener('scroll', updateCoachInsets, true);
    const timer = window.setInterval(updateCoachInsets, 500);

    return () => {
      window.removeEventListener('resize', updateCoachInsets);
      window.removeEventListener('scroll', updateCoachInsets, true);
      window.clearInterval(timer);
    };
  }, [coachAnchor, isMobile, tourActive, updateCoachInsets]);

  useLayoutEffect(() => {
    if (!tourActive) {
      setCoachAnchor(null);
      return;
    }
    if (isMobile) {
      setCoachAnchor(null);
      return;
    }
    setCoachAnchor(document.querySelector<HTMLElement>('[data-guided-onboarding-anchor]'));
  }, [isMobile, tourActive]);

  const coachBar = panelMode === 'waiting' || panelMode === 'hidden' ? (
    <div
      className="pointer-events-auto mx-auto flex w-full max-w-[38rem] flex-col gap-3 rounded-2xl border border-primary/20 bg-card/95 p-3 text-left shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between"
      role="status"
      aria-label="Guided tour step in progress"
    >
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Tour step in progress
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Open the section and the tour will move forward automatically.
        </p>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPanelMode('instruction')}
        >
          Show guide
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={skipTour}>
          Skip tour
        </Button>
      </div>
    </div>
  ) : (
    <div
      className="pointer-events-auto mx-auto w-full max-w-[38rem] rounded-2xl border border-primary/20 bg-card/95 p-4 text-left shadow-xl backdrop-blur"
      role="dialog"
      aria-modal="false"
      aria-labelledby="guided-onboarding-title"
      aria-describedby="guided-onboarding-description"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Step {stepIndex + 1} of {steps.length}
          </p>
          <h2 id="guided-onboarding-title" className="mt-1 text-base font-semibold text-foreground">
            {step.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={hidePromptTemporarily}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Hide guided tour prompt"
          title="Hide this prompt while you try the task"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-primary/15" aria-hidden>
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p id="guided-onboarding-description" className="text-sm leading-relaxed text-muted-foreground">
        {step.body}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        {showActionButton && (
          <Button type="button" variant="outline" onClick={goToStepTarget}>
            {step.actionLabel}
          </Button>
        )}
        {!showActionButton && (
          <Button type="button" onClick={advance}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />
            Finish tour
          </Button>
        )}
      </div>
      <div className="mt-3 flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={skipTour}>
          Skip tour
        </Button>
      </div>
      {step.actionSectionId != null && selectedSection !== step.actionSectionId && (
        <p className="mt-2 text-xs text-muted-foreground">
          Open this section and the tour will move to the next guide automatically.
        </p>
      )}
    </div>
  );

  const coachHost = tourActive && step
    ? coachAnchor
      ? createPortal(
          <div className="w-full" aria-live="polite">
            {coachBar}
          </div>,
          coachAnchor
        )
      : (
          <div
            className="pointer-events-none fixed z-[120]"
            style={{
              left: coachInsets.left,
              right: coachInsets.right,
              bottom: `calc(${coachInsets.bottom}px + env(safe-area-inset-bottom, 0px))`,
            }}
            aria-live="polite"
          >
            {coachBar}
          </div>
        )
    : null;

  return (
    <>
      <Dialog open={showIntro} onOpenChange={(open) => !open && skipTour()}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Want a guided tour of Nvalope?</DialogTitle>
            <DialogDescription>
              We can walk through the core features one at a time. You stay in control: open each section when prompted, and the tour moves forward automatically.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={skipTour}>
              Skip
            </Button>
            <Button type="button" onClick={startTour}>
              Start guided tour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {coachHost}
    </>
  );
}
