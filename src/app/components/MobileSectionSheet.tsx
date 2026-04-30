// Full-screen section overlay on small viewports: history + back button, body scroll lock.

import { useEffect, useLayoutEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useAppStore } from '@/app/store/appStore';
import { HISTORY_STATE_KEYS } from '@/app/constants/storageKeys';
import type { AppSection } from '@/app/sections/appSections';

export interface MobileSectionSheetProps {
  section: AppSection;
  /** Px height reserved for the BottomNavBar underneath (may be undefined when bar is at left/right). */
  bottomNavPaddingPx?: string;
  onClose: () => void;
}

export function MobileSectionSheet({ section, bottomNavPaddingPx, onClose }: MobileSectionSheetProps) {
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocusedRef.current = (document.activeElement as HTMLElement | null) ?? null;
    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevBodyOverflow;
      const prev = previouslyFocusedRef.current;
      if (prev && typeof prev.focus === 'function') {
        try {
          prev.focus();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Stable close handler: history effect is [] — if `onClose` were in deps,
  // stale history entries would stack and the sheet wouldn't close cleanly.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /** Ignore popstate briefly after we replaceState (Chrome/Android edge cases). */
  const ignorePopStateCloseUntilMs = useRef(0);

  // First open: pushState. Tab switch while sheet stays open: replaceState only
  // (no extra stack entries, no popstate) — reduces spurious closes on Pixel.
  useEffect(() => {
    const stateKey = HISTORY_STATE_KEYS.SECTION_OPEN;
    const next = { [stateKey]: true, sectionId: section.id } as Record<string, unknown>;
    const cur = window.history.state;
    const curOurs =
      cur && typeof cur === 'object' && (cur as Record<string, unknown>)[stateKey] === true;
    if (curOurs) {
      ignorePopStateCloseUntilMs.current = Date.now() + 50;
      window.history.replaceState(next, '');
    } else {
      window.history.pushState(next, '');
    }
  }, [section.id]);

  useEffect(() => {
    const stateKey = HISTORY_STATE_KEYS.SECTION_OPEN;
    const onPopState = (e: PopStateEvent) => {
      if (Date.now() < ignorePopStateCloseUntilMs.current) return;
      const st = e.state;
      const isOurState =
        st &&
        typeof st === 'object' &&
        (st as Record<string, unknown>)[stateKey] === true;
      if (!isOurState) onCloseRef.current();
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      if (
        window.history.state &&
        typeof window.history.state === 'object' &&
        (window.history.state as Record<string, unknown>)[stateKey] === true
      ) {
        window.history.back();
      }
    };
  }, []);

  // New tab = new section id: reset scroll and nudge layout (Pixel / Chrome flex-1 scroll).
  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo(0, 0);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void el.clientHeight;
        void el.offsetHeight;
      });
    });
  }, [section.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    const stateKey = HISTORY_STATE_KEYS.SECTION_OPEN;
    if (
      window.history.state &&
      typeof window.history.state === 'object' &&
      (window.history.state as Record<string, unknown>)[stateKey] === true
    ) {
      window.history.back();
    } else {
      onClose();
    }
  };

  const transition = reducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 320, damping: 34 };

  return (
    <motion.div
      key={section.id}
      role="dialog"
      aria-modal="true"
      aria-label={section.title}
      data-testid="mobile-section-sheet"
      initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={transition}
      className="fixed inset-x-0 top-0 z-40 flex min-h-0 flex-col overflow-hidden bg-background"
      style={{
        bottom: bottomNavPaddingPx ?? 0,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div
        className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px -6px rgba(0,0,0,0.08)' }}
      >
        <div
          aria-hidden
          style={{ height: 4, backgroundColor: section.color || 'var(--primary)' }}
        />
        <div className="flex items-start justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 className="mb-0.5 break-words text-lg font-semibold text-primary">
              {section.title}
            </h2>
            <p className="break-words text-xs text-muted-foreground">{section.description}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClose();
            }}
            className="ml-2 flex items-center justify-center size-9 rounded-full bg-muted/60 hover:bg-primary/15 border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all backdrop-blur-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Close section"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      {/* min-h-0: flex-1 column children need it or the scroll region can compute
          to 0px height after switching sections (seen on Pixel / Chrome). */}
      <div
        ref={scrollContainerRef}
        data-testid="section-content"
        className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 sm:px-6"
      >
        <div key={section.id} className="min-h-0 min-w-0">
          {section.content}
        </div>
      </div>
    </motion.div>
  );
}
