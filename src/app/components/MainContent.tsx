/**
 * Main scrollable content: grid background, title card, wheel/list, footer.
 * Used by App to keep the main layout in a single place.
 */

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Maximize2, X } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { WheelMenu } from '@/app/components/WheelMenu';
import { SimpleListView } from '@/app/components/SimpleListView';
import { MobileSectionSheet } from '@/app/components/MobileSectionSheet';
import { FeatureDiscoveryHint } from '@/app/components/FeatureDiscoveryHint';
import { GridBackground } from '@/app/components/GridBackground';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import { StorageUsage } from '@/app/components/StorageUsage';
import {
  BottomNavBar,
  BOTTOM_NAV_BAR_ROW_HEIGHT_PX,
  BOTTOM_NAV_BAR_ROW_SELECTOR_STRIP_PX,
} from '@/app/components/BottomNavBar';
import {
  CARD_BAR_SIDE_CELL_WIDTH_PX,
  CARD_BAR_MINIMIZED_STRIP_PX,
  clampWheelScale,
} from '@/app/constants/accessibility';
import { CACHE_ASSISTANT_SECTION_ID, SETTINGS_SECTION_ID, type AppSection } from '@/app/sections/appSections';
import { motion, AnimatePresence, useScroll, useVelocity, useSpring, useTransform } from 'motion/react';
import { useAppStore } from '@/app/store/appStore';

/** Brown card color used for Accessibility, Glossary, Settings. */
const BROWN_CARD_COLOR = '#8b6944';
/** In card layout, brown sections appear last in this order: Accessibility, Glossary, Settings. */
const CARD_LAYOUT_BROWN_ORDER = [5, 105, 6];

function sectionsForCardLayout(sections: AppSection[]): AppSection[] {
  const brown = sections.filter((s) => s.color === BROWN_CARD_COLOR);
  const green = sections.filter((s) => s.color !== BROWN_CARD_COLOR);
  const brownOrdered = [...CARD_LAYOUT_BROWN_ORDER].filter((id) => brown.some((s) => s.id === id)).map((id) => brown.find((s) => s.id === id)!);
  return [...green, ...brownOrdered];
}

/** Apply user's custom section order; append any sections not in the order list. */
function applyCardBarOrder(sections: AppSection[], order: number[] | null): AppSection[] {
  if (!order || order.length === 0) return sections;
  const byId = new Map(sections.map((s) => [s.id, s]));
  const ordered: AppSection[] = [];
  for (const id of order) {
    const sec = byId.get(id);
    if (sec) ordered.push(sec);
  }
  for (const s of sections) {
    if (!order.includes(s.id)) ordered.push(s);
  }
  return ordered;
}

export interface MainContentProps {
  mainScrollRef: React.RefObject<HTMLDivElement | null>;
  sectionContentRef: React.RefObject<HTMLDivElement | null>;
  allSections: AppSection[];
  selectedMode: string;
  selectedWheelSection: number | null;
  setSelectedWheelSection: (id: number | null) => void;
  /** Called when the user clicks Close on a section card; closes the section without scrolling. */
  onCloseSection?: () => void;
  saveScrollForRestore: () => void;
  wheelScale: number;
  enabledModules: string[];
  showCacheAnimation: boolean;
  setAssistantOpen: (open: boolean) => void;
  useCardLayout: boolean;
  setUseCardLayout: (v: boolean) => void;
  isMobile: boolean;
}

export function MainContent({
  mainScrollRef,
  sectionContentRef,
  allSections,
  selectedMode,
  selectedWheelSection,
  setSelectedWheelSection,
  onCloseSection,
  saveScrollForRestore,
  wheelScale,
  enabledModules,
  showCacheAnimation,
  setAssistantOpen,
  useCardLayout,
  setUseCardLayout: _setUseCardLayout,
  isMobile,
}: MainContentProps) {
  const showGridBackground = useAppStore((s) => s.showGridBackground);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const cardBarRows = useAppStore((s) => s.cardBarRows);
  const setCardBarRows = useAppStore((s) => s.setCardBarRows);
  const cardBarColumns = useAppStore((s) => s.cardBarColumns);
  const setCardBarColumns = useAppStore((s) => s.setCardBarColumns);
  const storeCardBarPosition = useAppStore((s) => s.cardBarPosition);
  const setCardBarPosition = useAppStore((s) => s.setCardBarPosition);
  const cardBarPosition: 'bottom' | 'left' | 'right' = isMobile ? 'bottom' : storeCardBarPosition;
  const cardBarMinimized = useAppStore((s) => s.cardBarMinimized);
  const setCardBarMinimized = useAppStore((s) => s.setCardBarMinimized);
  const cardBarLockExpanded = useAppStore((s) => s.cardBarLockExpanded);
  const setCardBarLockExpanded = useAppStore((s) => s.setCardBarLockExpanded);
  const cardBarSectionOrder = useAppStore((s) => s.cardBarSectionOrder);
  const setCardBarSectionOrder = useAppStore((s) => s.setCardBarSectionOrder);
  const showCardBarRowSelector = useAppStore((s) => s.showCardBarRowSelector);
  const cardsSectionWidthPercent = useAppStore((s) => s.cardsSectionWidthPercent);
  const storageBarMinimized = useAppStore((s) => s.storageBarMinimized);
  const setStorageBarMinimized = useAppStore((s) => s.setStorageBarMinimized);
  const listSections = allSections;
  const [narrowViewport, setNarrowViewport] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 640px)').matches : false
  );
  // Whether the dock mini-wheel is "blown up" into a front-and-centre overlay.
  // Only meaningful when a section is already open (i.e. the dock is visible).
  // Closed by the X button (rendered above the wheel inside the overlay) or by
  // the Escape key. Clicking a slice inside the overlay changes the section
  // but keeps the overlay up — matches the user model of "I'm in wheel mode,
  // let me keep steering from here".
  //
  // Lives in the Zustand store (session-only, not persisted) so it survives
  // transient remounts — notably BudgetProvider flipping back to its loading
  // state briefly on save retries, which would otherwise snap the overlay
  // shut on every slice click.
  const wheelExpanded = useAppStore((s) => s.wheelExpanded);
  const setWheelExpanded = useAppStore((s) => s.setWheelExpanded);
  // One-shot hint that tells first-time users where the wheel went when it
  // collapses into the tiny dock. Persisted so it shows exactly once across
  // sessions — any of the dismissal paths (manual ✕, click-to-expand, or
  // the auto-hide timer) flips the flag.
  const wheelDockHintDismissed = useAppStore((s) => s.wheelDockHintDismissed);
  const setWheelDockHintDismissed = useAppStore((s) => s.setWheelDockHintDismissed);
  // Transient "hint is on screen right now" flag. Lifted to the store
  // (session-scoped, not persisted) so the BudgetProvider remount cycle
  // can't reset it mid-show.
  const dockHintVisible = useAppStore((s) => s.wheelDockHintVisible);
  const setDockHintVisible = useAppStore((s) => s.setWheelDockHintVisible);

  // Scroll-linked bob for the sticky dock: as the user scrolls the main
  // content, the dock gives a small velocity-driven nudge before easing
  // back to rest. Adds a touch of liveliness without ever leaving the
  // viewport. Disabled when the user has reduced motion on.
  const { scrollY: mainScrollY } = useScroll({ container: mainScrollRef as React.RefObject<HTMLElement> });
  const rawScrollVelocity = useVelocity(mainScrollY);
  const smoothScrollVelocity = useSpring(rawScrollVelocity, {
    damping: 50,
    stiffness: 300,
    mass: 0.5,
  });
  // Clamp: velocity above ~3000 px/s bottoms out at ±14px of visual bob.
  const dockBobY = useTransform(smoothScrollVelocity, [-3000, 0, 3000], [-14, 0, 14], {
    clamp: true,
  });

  // When the overlay closes (or a section closes out from under it) make sure
  // the wheel collapses back to the dock so the state can't desync.
  useEffect(() => {
    if (selectedWheelSection == null && wheelExpanded) setWheelExpanded(false);
  }, [selectedWheelSection, wheelExpanded]);

  // Show the first-time dock hint whenever the dock is about to appear and
  // the user hasn't dismissed it before. Auto-hides after 7s; any other
  // dismissal path (click-to-expand, manual ✕) both hides the popover AND
  // flips the persisted flag so we never nag again.
  // Show the one-time "wheel lives here" hint the first time the dock is
  // about to appear for a user who hasn't dismissed it yet. All dismissal
  // paths (click-to-expand, manual ✕, the 7s timer below) both hide the
  // popover and flip the persisted flag so we never nag again.
  useEffect(() => {
    if (wheelDockHintDismissed) return;
    if (selectedWheelSection == null || wheelExpanded) return;
    setDockHintVisible(true);
    const t = window.setTimeout(() => {
      setDockHintVisible(false);
      setWheelDockHintDismissed(true);
    }, 7000);
    return () => window.clearTimeout(t);
  }, [selectedWheelSection, wheelExpanded, wheelDockHintDismissed, setDockHintVisible, setWheelDockHintDismissed]);

  // Global ESC handler while the overlay is open. Kept at the component level
  // rather than inside the overlay so it catches ESC even when focus has
  // drifted outside the dialog node (e.g. onto the backdrop).
  useEffect(() => {
    if (!wheelExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setWheelExpanded(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [wheelExpanded]);

  useEffect(() => {
    const m = window.matchMedia('(max-width: 640px)');
    const listener = () => setNarrowViewport(m.matches);
    m.addEventListener('change', listener);
    return () => m.removeEventListener('change', listener);
  }, []);

  const cardLayoutSections = sectionsForCardLayout(allSections);
  // Accessibility (id=5) is still a full section (reachable via the wheel, URL
  // deep-links, and a dedicated shortcut in Settings → Appearance) but it no
  // longer appears as its own card-bar tab. On mobile the 5th tab was crowding
  // the bottom nav, and on desktop most users reach Accessibility from
  // Settings anyway. The filter runs after sectionsForCardLayout so any other
  // brown/green ordering logic remains unchanged.
  const orderedCardBarSections = applyCardBarOrder(
    cardLayoutSections.filter((s) => s.id !== 5),
    cardBarSectionOrder,
  );
  // Mobile: always one bottom row — scroll horizontally when many sections are
  // enabled (see BottomNavBar). Desktop "auto" still uses two rows on narrow
  // viewports; persisted cardBarRows from desktop must not force multi-row on
  // phone (no row selector on mobile).
  const effectiveCardBarRows =
    isMobile && cardBarPosition === 'bottom'
      ? 1
      : cardBarRows === 0
        ? narrowViewport
          ? 2
          : 1
        : Math.max(1, Math.min(3, cardBarRows));
  const effectiveCardBarColumns =
    cardBarColumns === 0 ? (narrowViewport ? 2 : 1) : Math.max(1, Math.min(3, cardBarColumns));
  const cardsSectionWidthScale = Math.min(120, Math.max(60, cardsSectionWidthPercent)) / 100;
  const barActuallyExpanded = !cardBarMinimized || cardBarLockExpanded;
  const cardBarWidthPx =
    !useCardLayout || cardBarPosition === 'bottom'
      ? 0
      : barActuallyExpanded
        ? effectiveCardBarColumns * Math.round(CARD_BAR_SIDE_CELL_WIDTH_PX * cardsSectionWidthScale)
        : CARD_BAR_MINIMIZED_STRIP_PX;
  const bottomPaddingWhenCard =
    cardBarPosition === 'bottom'
      ? (barActuallyExpanded ? effectiveCardBarRows * BOTTOM_NAV_BAR_ROW_HEIGHT_PX + (showCardBarRowSelector ? BOTTOM_NAV_BAR_ROW_SELECTOR_STRIP_PX : 0) : CARD_BAR_MINIMIZED_STRIP_PX) +
        'px'
      : undefined;

  // No auto-scroll on select: the new wheel overlay opens in place (where the
  // wheel was) and card layout renders its section inline, so the viewport
  // stays put. Prior sessions repeatedly pushed back on screen-jumping scroll
  // behavior; the overlay model makes it structurally unnecessary.

  const handleCloseSection = useCallback(() => {
    saveScrollForRestore();
    if (onCloseSection) {
      onCloseSection();
    } else {
      setSelectedWheelSection(null);
    }
  }, [onCloseSection, saveScrollForRestore, setSelectedWheelSection]);

  const noMotion = reducedMotion || selectedMode === 'calm';
  const sectionCardTransition = noMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 300, damping: 35 };
  const renderSectionContentCard = (sectionData: AppSection) => (
    <motion.div
      ref={sectionContentRef as React.Ref<HTMLDivElement>}
      data-testid="section-content"
      key={sectionData.id}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={sectionCardTransition}
      className="w-full mt-4 min-w-0"
    >
      <Card
        className="relative w-full min-w-0 overflow-x-auto overflow-y-hidden border-l-4 border-primary/30 bg-card shadow-xl"
        style={{ borderLeftColor: sectionData.color ?? 'var(--primary)' }}
      >
        <div className="min-w-0 p-4 sm:p-6">
          <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="mb-1 break-words text-xl font-semibold text-primary">{sectionData.title}</h2>
              <p className="break-words text-sm text-muted-foreground">{sectionData.description}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCloseSection();
              }}
              className="ml-3 flex items-center justify-center size-8 rounded-full bg-muted/60 hover:bg-primary/15 border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all backdrop-blur-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Close section"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
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
          <div className="min-w-0 border-t border-border pt-4">{sectionData.content}</div>
        </div>
      </Card>
    </motion.div>
  );

  const selectedSectionData = selectedWheelSection != null ? allSections.find((s) => s.id === selectedWheelSection) : null;
  const sectionAnnouncement = selectedSectionData ? `Opened: ${selectedSectionData.title}` : '';

  return (
    <>
      {showGridBackground && <GridBackground />}
      <div
        id="main-content"
        ref={mainScrollRef as React.Ref<HTMLDivElement>}
        data-testid="main-scroll"
        data-section-open={selectedWheelSection != null ? '' : undefined}
        className="relative z-10 flex-1 min-h-0 min-w-0 px-4 sm:px-6 py-4 overflow-y-auto overflow-x-hidden"
        style={
          useCardLayout
            ? {
                paddingBottom:
                  cardBarPosition === 'bottom'
                    ? `calc(${bottomPaddingWhenCard ?? 0} + env(safe-area-inset-bottom, 0px))`
                    : `calc(1rem + env(safe-area-inset-bottom, 0px))`,
                paddingLeft: cardBarPosition === 'left' ? cardBarWidthPx : undefined,
                paddingRight: cardBarPosition === 'right' ? cardBarWidthPx : undefined,
              }
            : { paddingBottom: `calc(1rem + env(safe-area-inset-bottom, 0px))` }
        }
        tabIndex={-1}
      >
        {/* Screen reader: announce opened section when user selects from wheel or list */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic>
          {sectionAnnouncement}
        </div>
        <div
          data-main-scroll-body
          className="origin-top w-full max-w-full min-w-0 overflow-x-hidden"
          style={{
            transform: 'scale(var(--layout-scale))',
            width: 'calc(100% / var(--layout-scale))',
            minHeight: 'calc(100% / var(--layout-scale))',
          }}
        >
          {/* Full-viewport-width wrapper: the centered 42rem content column
              sits inside, and the dock mini-wheel (rendered further down)
              anchors to the right of it via an absolute sibling rail. The
              rail needs this wrapper so its `inset-y-0` spans the whole
              content height, giving sticky positioning something to stick
              within. */}
          <div className="relative w-full">
          {/* Single centered column: all content shares this max-width so the center line stays consistent. */}
          <div className="mx-auto flex w-full max-w-[42rem] min-w-0 flex-col items-stretch px-0">
          <motion.div
            className="w-full mb-0 min-w-0"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={noMotion ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }}
          >
            <div className="w-full min-w-0 flex flex-col items-stretch">
              <div className="flex items-center justify-start mb-4 w-full">
                <div role="group" aria-label="Theme">
                  <ThemeToggle />
                </div>
              </div>
              <Card className="glass-card relative w-full min-w-0 overflow-hidden">
                <div className="p-4 text-center sm:p-6">
                  <h1
                    className="break-words text-4xl font-bold tracking-tight sm:text-5xl"
                    style={{
                      letterSpacing: '-0.02em',
                      lineHeight: 1.1,
                      textShadow: '0 1px 2px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06), 0 0 24px -4px color-mix(in srgb, var(--primary) 18%, transparent)',
                    }}
                  >
                    <span style={{ color: 'var(--nvalope-brown, #8b6944)' }}>N</span>
                    <span style={{ color: 'var(--nvalope-green, #2d7a3f)' }}>valope</span>
                    <sup className="text-lg sm:text-xl ml-0.5 align-super font-normal opacity-90" style={{ color: 'var(--nvalope-brown, #8b6944)' }} aria-label="trademark">
                      ™
                    </sup>
                  </h1>
                  <p className="text-base text-foreground mt-2 font-medium">
                    Do business like it&apos;s nobody&apos;s business.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Private envelope budgeting that stays on your device.
                  </p>
                </div>
              </Card>
              <div className="mt-3 flex flex-col items-center gap-2 text-center focus-mode-hide">
                <a
                  href="/install-pwa.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                  aria-label="PWA install guide — open full step-by-step instructions in a new tab"
                >
                  Install Nvalope on your device — step-by-step guide
                </a>
                <a
                  href="/user-guide.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                  aria-label="Open the Nvalope user guide (opens in a new tab)"
                >
                  New here? Read the user guide.
                </a>
              </div>
            </div>

          <div className="mt-4 w-full flex flex-col items-center gap-4">
            {selectedMode === 'focus' ? (
              <div key="list" data-layout="list">
              <SimpleListView
                sections={listSections}
                onUserAction={() => {}}
                selectedSection={selectedWheelSection}
                onSelectedSectionChange={(id) => {
                  if (id === null) saveScrollForRestore();
                  setSelectedWheelSection(id);
                }}
                sectionContentRef={sectionContentRef}
                maxVisibleSections={6}
              />
              </div>
            ) : useCardLayout ? (
              <div key="cards" data-layout="cards" className="flex w-full min-w-0 flex-col items-center">
                {selectedWheelSection == null && (
                  <FeatureDiscoveryHint
                    onOpenSettings={() => setSelectedWheelSection(SETTINGS_SECTION_ID)}
                  />
                )}
                {!isMobile && (
                  <div className="w-full min-w-0 mt-4">
                    <AnimatePresence mode="wait">
                      {selectedWheelSection != null && (() => {
                        const sectionData = allSections.find((s) => s.id === selectedWheelSection);
                        return sectionData ? renderSectionContentCard(sectionData) : null;
                      })()}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            ) : (
              <div key="wheel" data-layout="wheel" className="flex w-full flex-col items-center">
                {selectedWheelSection == null ? (
                  // Idle: full hero wheel, centered. The wheel's own SVG uses a
                  // tight viewBox (variant="full") so the donut sits at the
                  // visual centre of its box — no overflow/translate crop trick
                  // needed. When a section opens, the fixed top-right dock
                  // (rendered outside the scroll body) takes over navigation
                  // and the content overlay replaces the wheel inline.
                  <>
                    {/* 1. Optional-features hint sits above the wheel intro so
                        new users see the "turn more on in Settings" invite
                        first — the wheel itself is already the obvious focal
                        point, no need to telegraph it from above. */}
                    <div className="mt-2 flex w-full flex-col items-center px-4">
                      <FeatureDiscoveryHint
                        onOpenSettings={() => setSelectedWheelSection(SETTINGS_SECTION_ID)}
                      />
                    </div>
                    {/* 2. Quiet wheel intro — a plain sentence, no shouty
                        caps-tracking header. The wheel speaks for itself. */}
                    <p className="mt-3 max-w-md px-4 text-center text-sm text-muted-foreground">
                      Click any slice to open that section. To switch sections later, click the mini-wheel in the corner to expand it again.
                    </p>
                    <div className="relative z-10 mt-2 w-full flex justify-center">
                      {(() => {
                        const scaleRatio = clampWheelScale(wheelScale) / 100;
                        return (
                          <div
                            className="mx-auto block w-full max-w-full min-w-0"
                            style={{ maxWidth: `${600 * scaleRatio}px` }}
                          >
                            <WheelMenu
                              sections={allSections.filter((s) => s.id !== CACHE_ASSISTANT_SECTION_ID)}
                              showCacheAnimation={showCacheAnimation}
                              accessibilityMode={selectedMode}
                              onUserAction={() => {}}
                              onOpenAssistant={enabledModules.includes('cacheAssistant') ? () => setAssistantOpen(true) : undefined}
                              selectedSection={selectedWheelSection}
                              onSelectedSectionChange={(id) => {
                                if (id === null) saveScrollForRestore();
                                setSelectedWheelSection(id);
                              }}
                              sectionContentRef={sectionContentRef as React.Ref<HTMLDivElement>}
                              expandContentOutside
                              variant="full"
                            />
                          </div>
                        );
                      })()}
                    </div>
                    <div className="mt-4 flex w-full flex-col items-center justify-center gap-2 px-4">
                      <p className="max-w-md text-center text-xs text-muted-foreground">
                        Keyboard: arrow keys to move between sections, Enter to open, Esc to close. Prefer a list? Switch to cards in Settings → Appearance.
                      </p>
                    </div>
                  </>
                ) : (
                  // Active: the dock takes over navigation (rendered outside
                  // the scroll body). Re-expanding the wheel renders it
                  // inline ABOVE the section content card so the wheel pushes
                  // the content down instead of floating over it as a modal
                  // — dismissing collapses the inline block and the content
                  // card returns to its original position.
                  <div className="w-full min-w-0 mt-2 relative z-0">
                    <AnimatePresence initial={false}>
                      {wheelExpanded && !useCardLayout && !isMobile && (
                        <motion.section
                          key="wheel-inline-expanded"
                          role="region"
                          aria-label="Feature wheel"
                          initial={reducedMotion ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={reducedMotion ? { opacity: 0, height: 0 } : { opacity: 0, height: 0 }}
                          transition={reducedMotion ? { duration: 0 } : { duration: 0.28, ease: 'easeOut' }}
                          className="w-full overflow-hidden"
                        >
                          <div className="mb-2 flex w-full items-center justify-end">
                            <button
                              type="button"
                              onClick={() => setWheelExpanded(false)}
                              aria-label="Close feature wheel (Esc)"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-card/80 text-muted-foreground shadow-md backdrop-blur-sm hover:border-primary/60 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <X className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                          <div className="w-full rounded-3xl border border-primary/20 bg-card/90 p-4 shadow-md backdrop-blur-sm sm:p-6">
                            {(() => {
                              const scaleRatio = clampWheelScale(wheelScale) / 100;
                              return (
                                <div
                                  className="mx-auto block w-full"
                                  style={{ maxWidth: `${600 * scaleRatio}px` }}
                                >
                                  <WheelMenu
                                    sections={allSections.filter((s) => s.id !== CACHE_ASSISTANT_SECTION_ID)}
                                    accessibilityMode={selectedMode}
                                    onUserAction={() => {}}
                                    onOpenAssistant={
                                      enabledModules.includes('cacheAssistant')
                                        ? () => setAssistantOpen(true)
                                        : undefined
                                    }
                                    selectedSection={selectedWheelSection}
                                    onSelectedSectionChange={(id) => {
                                      // Clicking the active slice toggles
                                      // it off (id === null). Keep the
                                      // inline wheel open so the user is
                                      // not ejected back to the dock
                                      // mid-browse — they close explicitly
                                      // via ✕ or Esc.
                                      if (id === null) saveScrollForRestore();
                                      setSelectedWheelSection(id);
                                    }}
                                    expandContentOutside
                                    variant="full"
                                  />
                                </div>
                              );
                            })()}
                            <p className="mt-3 text-center text-xs text-muted-foreground">
                              Click a slice to switch sections. Press Esc or the ✕ above to close.
                            </p>
                          </div>
                          <div className="mt-4" />
                        </motion.section>
                      )}
                    </AnimatePresence>
                    <AnimatePresence mode="wait">
                      {selectedSectionData && renderSectionContentCard(selectedSectionData)}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-full mt-8 focus-mode-hide space-y-4">
            <div className="space-y-4">
              <div className="relative p-4 sm:p-6 glass-card rounded-2xl flex flex-wrap items-center justify-center gap-2">
                {storageBarMinimized ? (
                  <div className="flex items-center justify-center gap-2 w-full">
                    <span className="text-xs text-muted-foreground">Storage capacity</span>
                    <button
                      type="button"
                      onClick={() => setStorageBarMinimized(false)}
                      className="inline-flex items-center justify-center p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shrink-0"
                      aria-expanded={false}
                      aria-label="Expand storage capacity bar"
                    >
                      <ChevronDown className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <>
                    <StorageUsage />
                    <button
                      type="button"
                      onClick={() => setStorageBarMinimized(true)}
                      className="absolute top-2 right-2 inline-flex items-center justify-center p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shrink-0 z-10"
                      aria-expanded={true}
                      aria-label="Minimize storage capacity bar"
                    >
                      <ChevronUp className="w-4 h-4" aria-hidden />
                    </button>
                  </>
                )}
              </div>
            </div>
            {/* Footer: primary row (legal, support, docs, donate) and secondary
                (license, source). Trademark notice lives in Terms of Use. */}
            <footer className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground focus-mode-hide" role="contentinfo" aria-label="Footer links">
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                <a
                  href="/privacy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Privacy
                </a>
                <span aria-hidden="true">·</span>
                <a
                  href="/terms.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Terms
                </a>
                <span aria-hidden="true">·</span>
                <a
                  href="mailto:support@nvalope.com"
                  className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Contact us by email (support@nvalope.com)"
                >
                  Contact
                </a>
                <span aria-hidden="true">·</span>
                <a
                  href="/user-guide.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Nvalope user guide — full documentation (opens in new tab)"
                >
                  User guide
                </a>
                <span aria-hidden="true">·</span>
                <a
                  href="https://www.buymeacoffee.com/thecannycoyote"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Support the project — Buy me a coffee (opens in new tab)"
                >
                  Buy me a coffee ☕
                </a>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                <a
                  href="/license.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  License (MIT)
                </a>
                <span aria-hidden="true">·</span>
                <a
                  href="https://github.com/the-canny-coyote/nvalope"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Nvalope on GitHub (opens in new tab)"
                >
                  GitHub
                </a>
              </div>
            </footer>
          </div>
          </motion.div>
          </div>
          {/* Sticky dock mini-wheel rail.
              Anchors to the right of the centered 42rem content column via
              `left: min(calc(50% + 21rem + 0.75rem), calc(100% - 5.5rem))` —
              on wide viewports it sits just to the right of the title box;
              on narrower (640-1023px) viewports it clamps to the right
              margin, matching the previous fixed-corner placement but now
              still inside the scroll body, so `position: sticky` keeps the
              dock visible as the user scrolls without it ever being true
              fixed chrome. Outer wrapper is `pointer-events-none` so dead
              rail area can't eat clicks; the motion.div child re-enables
              pointer events only on the dock itself.
              Hidden when: no section is open (hero wheel already visible),
              the overlay is open (one wheel at a time), in card or focus
              layouts, or on mobile (handled elsewhere via MobileSectionSheet). */}
          {!useCardLayout && !isMobile && selectedMode !== 'focus' && selectedWheelSection != null && !wheelExpanded && (
            <div
              className="pointer-events-none absolute inset-y-0 top-0 z-30 hidden sm:block"
              style={{
                left: 'min(calc(50% + 21rem + 0.75rem), calc(100% - 5.5rem))',
                width: '4.625rem',
              }}
              aria-hidden={false}
            >
              <motion.div
                className="pointer-events-auto sticky top-4 w-[4.625rem]"
                style={{ y: reducedMotion ? 0 : dockBobY }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setWheelExpanded(true);
                    if (!wheelDockHintDismissed) {
                      setDockHintVisible(false);
                      setWheelDockHintDismissed(true);
                    }
                  }}
                  aria-label="Open feature wheel"
                  className="group relative block w-full rounded-full border border-primary/30 bg-card/70 p-0.5 shadow-xl backdrop-blur-md transition-colors hover:border-primary/60 hover:bg-card/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {/* Purely decorative mock wheel: `interactive={false}` strips
                      tabIndex, pointer events, hover/focus state, and click
                      handlers from every wedge and the centre button — so the
                      mini-wheel is truly a picture. The only functional target
                      is the wrapping <button>, which expands. */}
                  <WheelMenu
                    sections={allSections.filter((s) => s.id !== CACHE_ASSISTANT_SECTION_ID)}
                    accessibilityMode={selectedMode}
                    onUserAction={() => {}}
                    selectedSection={selectedWheelSection}
                    expandContentOutside
                    variant="dock"
                    interactive={false}
                  />
                  {/* Tiny "expand" affordance so first-time users immediately
                      see this thing is clickable. Half-size to match the
                      smaller dock. */}
                  <span
                    aria-hidden
                    className="absolute right-0.5 top-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary/20 text-primary shadow-sm opacity-85 transition-opacity group-hover:opacity-100"
                  >
                    <Maximize2 className="h-2 w-2" strokeWidth={2.5} />
                  </span>
                </button>

                {/* First-time "hey, the wheel lives here" hint. Points at
                    the dock from the left so it never clips the viewport
                    right edge. Dismissed by: ✕ button, clicking the dock
                    (which also expands), or an auto-hide timer. All three
                    set the persisted flag so it never reappears. */}
                <AnimatePresence>
                  {dockHintVisible && !wheelDockHintDismissed && (
                    <motion.div
                      key="dock-hint"
                      className="pointer-events-auto absolute left-1/2 top-full mt-3 w-[12rem] -translate-x-1/2"
                      role="status"
                      aria-live="polite"
                      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                      transition={reducedMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
                    >
                      <div className="relative rounded-lg border border-primary/30 bg-card/95 px-3 py-2 text-left text-xs leading-snug text-foreground shadow-lg backdrop-blur-sm">
                        <p className="pr-5 font-medium">Wheel lives here</p>
                        <p className="pr-5 text-muted-foreground">Click the mini-wheel to expand it again.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setDockHintVisible(false);
                            setWheelDockHintDismissed(true);
                          }}
                          aria-label="Dismiss wheel hint"
                          className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <X className="h-3 w-3" aria-hidden />
                        </button>
                        {/* Arrow tip pointing up at the dock above. */}
                        <span
                          aria-hidden
                          className="absolute left-1/2 top-[-6px] h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-primary/30 bg-card/95"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          )}
          </div>
        </div>
      </div>
      {isMobile && selectedSectionData && (
        <MobileSectionSheet
          section={selectedSectionData}
          bottomNavPaddingPx={bottomPaddingWhenCard}
          onClose={handleCloseSection}
        />
      )}
      {useCardLayout && (
        <BottomNavBar
          sections={orderedCardBarSections}
          selectedSection={selectedWheelSection}
          onSelectedSectionChange={(id) => {
            if (id === null) saveScrollForRestore();
            setSelectedWheelSection(id);
          }}
          scale={wheelScale}
          isMobile={isMobile}
          position={cardBarPosition}
          onCardBarPositionChange={setCardBarPosition}
          rows={effectiveCardBarRows}
          columns={effectiveCardBarColumns}
          cardBarRows={cardBarRows}
          cardBarColumns={cardBarColumns}
          barMinimized={cardBarMinimized}
          onBarMinimizedChange={setCardBarMinimized}
          barLockExpanded={cardBarLockExpanded}
          onBarLockExpandedChange={setCardBarLockExpanded}
          showRowSelectorStrip={showCardBarRowSelector}
          onCardBarRowsChange={showCardBarRowSelector ? setCardBarRows : undefined}
          onCardBarColumnsChange={showCardBarRowSelector ? setCardBarColumns : undefined}
          onSectionOrderChange={(order) => setCardBarSectionOrder(order)}
          onUserAction={() => {}}
          sectionWidthPercent={cardsSectionWidthPercent}
        />
      )}
    </>
  );
}
