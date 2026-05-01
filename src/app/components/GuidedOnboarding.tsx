import { useCallback, useEffect, useMemo, useState } from 'react';
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

type OnboardingStatus = 'started' | 'completed' | 'skipped';

interface TourStep {
  id: string;
  title: string;
  body: string;
  sectionId: number | null;
  target: string;
  actionLabel: string;
  doneLabel: string;
}

const steps: TourStep[] = [
  {
    id: 'navigation',
    title: 'Start with the section picker',
    body: 'The wheel or card bar is your map. Open Income first so you can see where money coming in belongs.',
    sectionId: INCOME_SECTION_ID,
    target: '[data-onboarding-target="feature-navigation"]',
    actionLabel: 'Open Income',
    doneLabel: 'I found Income',
  },
  {
    id: 'income',
    title: 'Income powers the budget',
    body: 'Income is where paychecks, side work, and other inflows go. Once you have opened it, confirm and we will move on.',
    sectionId: INCOME_SECTION_ID,
    target: '[data-onboarding-target="section-content"]',
    actionLabel: 'Open Income',
    doneLabel: 'I understand Income',
  },
  {
    id: 'envelopes',
    title: 'Envelopes organize spending',
    body: 'Open Envelopes & Expenses. This is where categories, limits, and day-to-day expenses live.',
    sectionId: ENVELOPES_SECTION_ID,
    target: '[data-onboarding-target="feature-navigation"]',
    actionLabel: 'Open Envelopes',
    doneLabel: 'I found Envelopes',
  },
  {
    id: 'overview',
    title: 'Overview shows the big picture',
    body: 'Open Overview to see totals, remaining money, and the health of the current budget period.',
    sectionId: OVERVIEW_SECTION_ID,
    target: '[data-onboarding-target="feature-navigation"]',
    actionLabel: 'Open Overview',
    doneLabel: 'I checked Overview',
  },
  {
    id: 'accessibility',
    title: 'Accessibility is built in',
    body: 'Open Accessibility to see text, motion, contrast, and layout controls you can tune anytime.',
    sectionId: ACCESSIBILITY_SECTION_ID,
    target: '[data-onboarding-target="feature-navigation"]',
    actionLabel: 'Open Accessibility',
    doneLabel: 'I found Accessibility',
  },
  {
    id: 'settings',
    title: 'Settings holds data and preferences',
    body: 'Open Settings to find backups, sample data, appearance, and the opt-in feature switches.',
    sectionId: SETTINGS_SECTION_ID,
    target: '[data-onboarding-target="feature-navigation"]',
    actionLabel: 'Open Settings',
    doneLabel: 'I found Settings',
  },
  {
    id: 'additional-features',
    title: 'Additional features are opt-in',
    body: 'Transactions, Receipt Scanner, Calendar, Analytics, Cache the Coyote, and Glossary can be turned on in Settings when you want them.',
    sectionId: SETTINGS_SECTION_ID,
    target: '[data-onboarding-target="section-content"]',
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

function readSessionTourState(): { active: boolean; stepIndex: number } {
  if (typeof window === 'undefined') return { active: false, stepIndex: 0 };
  try {
    const active = sessionStorage.getItem(SESSION_STORAGE_KEYS.ONBOARDING_TOUR_ACTIVE) === 'true';
    const rawStep = Number.parseInt(sessionStorage.getItem(SESSION_STORAGE_KEYS.ONBOARDING_TOUR_STEP) ?? '0', 10);
    const stepIndex = Number.isFinite(rawStep) ? Math.min(Math.max(rawStep, 0), steps.length - 1) : 0;
    return { active, stepIndex };
  } catch {
    return { active: false, stepIndex: 0 };
  }
}

function writeSessionTourState(active: boolean, stepIndex: number): void {
  try {
    if (!active) {
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.ONBOARDING_TOUR_ACTIVE);
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.ONBOARDING_TOUR_STEP);
      return;
    }
    sessionStorage.setItem(SESSION_STORAGE_KEYS.ONBOARDING_TOUR_ACTIVE, 'true');
    sessionStorage.setItem(SESSION_STORAGE_KEYS.ONBOARDING_TOUR_STEP, String(stepIndex));
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
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const step = steps[stepIndex];
  const taskComplete = step.sectionId == null || selectedSection === step.sectionId;

  useEffect(() => {
    const sessionTour = readSessionTourState();
    if (sessionTour.active) {
      setStepIndex(sessionTour.stepIndex);
      setTourActive(true);
      setShowIntro(false);
      return;
    }
    setShowIntro(!readOnboardingHandled());
  }, []);

  useEffect(() => {
    if (tourActive) writeSessionTourState(true, stepIndex);
  }, [stepIndex, tourActive]);

  const updateTargetRect = useCallback(() => {
    if (!tourActive || !step) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (!el) {
      setTargetRect(null);
      return;
    }
    setTargetRect(el.getBoundingClientRect());
  }, [step, tourActive]);

  useEffect(() => {
    updateTargetRect();
    if (!tourActive) return;
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);
    const timer = window.setInterval(updateTargetRect, 500);
    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
      window.clearInterval(timer);
    };
  }, [tourActive, updateTargetRect, selectedSection]);

  const finish = useCallback(
    (status: OnboardingStatus) => {
      writeOnboardingStatus(status);
      writeSessionTourState(false, 0);
      setShowIntro(false);
      setTourActive(false);
      setStepIndex(0);
      onHandled(status);
    },
    [onHandled]
  );

  const startTour = () => {
    setShowIntro(false);
    setTourActive(true);
    setStepIndex(0);
    writeOnboardingStatus('started');
    writeSessionTourState(true, 0);
    onSelectSection(null);
  };

  const skipTour = () => {
    finish('skipped');
  };

  const goToStepTarget = () => {
    if (step.sectionId != null) onSelectSection(step.sectionId);
  };

  const advance = () => {
    if (!taskComplete) return;
    if (stepIndex >= steps.length - 1) {
      finish('completed');
      return;
    }
    setStepIndex((current) => current + 1);
  };

  const panelPosition = useMemo(() => {
    if (!targetRect) return 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2';
    const roomBelow = window.innerHeight - targetRect.bottom;
    const roomRight = window.innerWidth - targetRect.right;
    if (roomRight > 360) return 'right-6 top-1/2 -translate-y-1/2';
    if (roomBelow > 220) return 'left-1/2 bottom-6 -translate-x-1/2';
    return 'left-1/2 top-6 -translate-x-1/2';
  }, [targetRect]);

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

      {tourActive && step && (
        <div className="fixed inset-0 z-[120] pointer-events-none" aria-live="polite">
          <div className="absolute inset-0 bg-background/25 backdrop-blur-[1px]" />
          {targetRect && (
            <div
              className="absolute rounded-2xl border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.45),0_0_32px_rgba(45,122,63,0.45)] transition-all"
              style={{
                left: Math.max(8, targetRect.left - 8),
                top: Math.max(8, targetRect.top - 8),
                width: Math.min(window.innerWidth - 16, targetRect.width + 16),
                height: Math.min(window.innerHeight - 16, targetRect.height + 16),
              }}
            />
          )}
          <div
            className={`pointer-events-auto fixed z-[121] w-[min(calc(100vw-2rem),22rem)] rounded-2xl border border-primary/25 bg-card p-4 text-left shadow-2xl ${panelPosition}`}
            role="dialog"
            aria-modal="false"
            aria-labelledby="guided-onboarding-title"
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
                onClick={skipTour}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Skip guided tour"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={goToStepTarget}>
                {step.actionLabel}
              </Button>
              <Button type="button" onClick={advance} disabled={!taskComplete}>
                {taskComplete && <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />}
                {step.doneLabel}
              </Button>
            </div>
            {!taskComplete && (
              <p className="mt-2 text-xs text-muted-foreground">
                Open the highlighted area first, then confirm when you are ready.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
