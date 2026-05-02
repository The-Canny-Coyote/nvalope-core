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
type TourPanelMode = 'instruction' | 'waiting' | 'confirm';

interface TourStep {
  id: string;
  title: string;
  body: string;
  sectionId: number | null;
  actionLabel: string;
  doneLabel: string;
}

const steps: TourStep[] = [
  {
    id: 'navigation',
    title: 'Start with the section picker',
    body: 'The wheel or card bar is your map. Open Income first so you can see where money coming in belongs.',
    sectionId: INCOME_SECTION_ID,
    actionLabel: 'Open Income',
    doneLabel: 'I found Income',
  },
  {
    id: 'income',
    title: 'Income powers the budget',
    body: 'Income is where paychecks, side work, and other inflows go. Once you have opened it, confirm and we will move on.',
    sectionId: INCOME_SECTION_ID,
    actionLabel: 'Open Income',
    doneLabel: 'I understand Income',
  },
  {
    id: 'envelopes',
    title: 'Envelopes organize spending',
    body: 'Open Envelopes & Expenses. This is where categories, limits, and day-to-day expenses live.',
    sectionId: ENVELOPES_SECTION_ID,
    actionLabel: 'Open Envelopes',
    doneLabel: 'I found Envelopes',
  },
  {
    id: 'overview',
    title: 'Overview shows the big picture',
    body: 'Open Overview to see totals, remaining money, and the health of the current budget period.',
    sectionId: OVERVIEW_SECTION_ID,
    actionLabel: 'Open Overview',
    doneLabel: 'I checked Overview',
  },
  {
    id: 'accessibility',
    title: 'Accessibility is built in',
    body: 'Open Accessibility to see text, motion, contrast, and layout controls you can tune anytime.',
    sectionId: ACCESSIBILITY_SECTION_ID,
    actionLabel: 'Open Accessibility',
    doneLabel: 'I found Accessibility',
  },
  {
    id: 'settings',
    title: 'Settings holds data and preferences',
    body: 'Open Settings to find backups, sample data, appearance, and the opt-in feature switches.',
    sectionId: SETTINGS_SECTION_ID,
    actionLabel: 'Open Settings',
    doneLabel: 'I found Settings',
  },
  {
    id: 'additional-features',
    title: 'Additional features are opt-in',
    body: 'Transactions, Receipt Scanner, Calendar, Analytics, Cache the Coyote, and Glossary can be turned on in Settings when you want them.',
    sectionId: SETTINGS_SECTION_ID,
    actionLabel: 'Open Settings',
    doneLabel: 'Finish tour',
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
  return value === 'instruction' || value === 'waiting' || value === 'confirm';
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
}

export function GuidedOnboarding({
  selectedSection,
  onSelectSection,
  onHandled,
}: GuidedOnboardingProps) {
  const [showIntro, setShowIntro] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [panelMode, setPanelMode] = useState<TourPanelMode>('instruction');
  const [coachInsets, setCoachInsets] = useState({ bottom: 16, left: 12, right: 12 });
  const [coachAnchor, setCoachAnchor] = useState<HTMLElement | null>(null);
  const step = steps[stepIndex];
  const taskComplete = step.sectionId == null || selectedSection === step.sectionId;
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

  useEffect(() => {
    if (tourActive && panelMode === 'waiting' && taskComplete) {
      setPanelMode('confirm');
    }
  }, [panelMode, taskComplete, tourActive]);

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
    if (step.sectionId != null && selectedSection !== step.sectionId) {
      onSelectSection(step.sectionId);
      setPanelMode('waiting');
      return;
    }
    setPanelMode('confirm');
  };

  const advance = () => {
    if (!taskComplete) return;
    if (stepIndex >= steps.length - 1) {
      finish('completed');
      return;
    }
    setPanelMode('instruction');
    setStepIndex((current) => current + 1);
  };

  const hidePromptTemporarily = () => {
    setPanelMode('waiting');
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
    if (!tourActive || coachAnchor) return;

    updateCoachInsets();
    window.addEventListener('resize', updateCoachInsets);
    window.addEventListener('scroll', updateCoachInsets, true);
    const timer = window.setInterval(updateCoachInsets, 500);

    return () => {
      window.removeEventListener('resize', updateCoachInsets);
      window.removeEventListener('scroll', updateCoachInsets, true);
      window.clearInterval(timer);
    };
  }, [coachAnchor, tourActive, updateCoachInsets]);

  useLayoutEffect(() => {
    if (!tourActive) {
      setCoachAnchor(null);
      return;
    }
    setCoachAnchor(document.querySelector<HTMLElement>('[data-guided-onboarding-anchor]'));
  }, [tourActive]);

  const coachBar = panelMode === 'waiting' ? (
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
          Open the section, then continue when you&apos;re ready.
        </p>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPanelMode(taskComplete ? 'confirm' : 'instruction')}
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
      {panelMode === 'confirm' && (
        <p className="mt-2 text-xs font-medium text-primary">
          You&apos;re in the right section. Continue when you&apos;re ready.
        </p>
      )}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={goToStepTarget}>
          {step.actionLabel}
        </Button>
        <Button type="button" onClick={advance} disabled={!taskComplete}>
          {taskComplete && <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />}
          {step.doneLabel}
        </Button>
      </div>
      <div className="mt-3 flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={skipTour}>
          Skip tour
        </Button>
      </div>
      {!taskComplete && (
        <p className="mt-2 text-xs text-muted-foreground">
          Open this section, then continue when you are ready.
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
              We can walk through the core features one at a time. You stay in control: each step waits for you to do the task and confirm when you are ready.
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
