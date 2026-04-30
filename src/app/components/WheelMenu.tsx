import { useState, memo, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { useAppStore } from '@/app/store/appStore';
import { clampScrollbarSize } from '@/app/constants/accessibility';
import { BrandCoyoteMark, brandCoyoteLabelSuffix } from '@/app/components/BrandCoyoteMark';

interface WheelSection {
  id: number;
  icon: LucideIcon;
  title: string;
  description: string;
  content: React.ReactNode;
  color: string;
}

interface WheelMenuProps {
  sections: WheelSection[];
  showCacheAnimation?: boolean;
  accessibilityMode?: string;
  /** Controlled selected section (e.g. from App) so selection persists when sections content updates. */
  selectedSection?: number | null;
  onSelectedSectionChange?: (id: number | null) => void;
  /** Ref to attach to the expanded section content (used by App for scroll restore on layout changes only). */
  sectionContentRef?: React.Ref<HTMLDivElement>;
  /** Called when user selects or deselects a section (first meaningful action). */
  onUserAction?: () => void;
  /** Called when user clicks the center (Cache the Coyote, AI Companion) icon. */
  onOpenAssistant?: () => void;
  /** When true, do not render the expanded content card here (parent renders it in the main flow to avoid clipping). */
  expandContentOutside?: boolean;
  /**
   * 'full' = centered hero wheel; 'dock' = compact persistent minimap variant.
   * The dock hides the in-SVG label pill (relies on native <title> + aria-label)
   * and shrinks strokes/hover-lift so a small wheel doesn't look clogged.
   */
  variant?: 'full' | 'dock';
  /**
   * When false, the wheel is purely decorative: wedges are not tabbable, do
   * not respond to clicks/keys, and the center button is inert. Used by the
   * dock where a single outer button owns all interaction (click = expand).
   * Defaults to true.
   */
  interactive?: boolean;
}

function WheelMenuComponent({
  sections,
  showCacheAnimation = false,
  accessibilityMode: _accessibilityMode = 'standard',
  selectedSection: controlledSelected,
  onSelectedSectionChange,
  sectionContentRef,
  onUserAction,
  onOpenAssistant,
  expandContentOutside = false,
  variant = 'full',
  interactive = true,
}: WheelMenuProps) {
  const [hoveredSection, setHoveredSection] = useState<number | null>(null);
  const [focusedSection, setFocusedSection] = useState<number | null>(null);
  const [uncontrolledSelected, setUncontrolledSelected] = useState<number | null>(null);
  const selectedSection = controlledSelected !== undefined ? controlledSelected : uncontrolledSelected;
  const setSelectedSection = onSelectedSectionChange ?? setUncontrolledSelected;

  const scrollbarSize = useAppStore((s) => s.scrollbarSize);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const motionTransition = reducedMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 300, damping: 35 };
  const strokeBase = useMemo(() => {
    const chonk = clampScrollbarSize(scrollbarSize);
    return chonk <= 10 ? 1 : chonk <= 15 ? 2 : 3;
  }, [scrollbarSize]);

  const centerX = 300;
  const centerY = 300;
  const baseRadius = 180;
  // Pop-out offsets, in SVG user units. Applied as a radial translate on the
  // wedge group rather than as a path-d change, so the motion is smooth and
  // the path definition stays stable. Selected is visibly larger than hover
  // so a picked slice reads as "picked", not just "hovered".
  const hoverPop = variant === 'dock' ? 6 : 16;
  const selectedPop = variant === 'dock' ? 14 : 30;
  const anglePerSection = (2 * Math.PI) / sections.length;

  const isCacheEnabled = !!onOpenAssistant;

  // Roving tabindex: exactly one wedge owns tabIndex={0} at a time. The owner
  // follows (a) the currently focused wedge, else (b) the selected wedge, else
  // (c) the first wedge. This collapses the former N tab stops into 1.
  const rovingOwnerId = focusedSection ?? selectedSection ?? sections[0]?.id ?? null;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const wedgeRefs = useRef<Record<number, SVGGElement | null>>({});
  const setWedgeRef = useCallback((id: number, el: SVGGElement | null) => {
    wedgeRefs.current[id] = el;
  }, []);

  const handleSectionClick = useCallback(
    (sectionId: number) => {
      onUserAction?.();
      if (selectedSection === sectionId) {
        setSelectedSection(null);
      } else {
        setSelectedSection(sectionId);
      }
    },
    [onUserAction, selectedSection, setSelectedSection],
  );

  const focusWedge = useCallback((id: number) => {
    setFocusedSection(id);
    const el = wedgeRefs.current[id];
    if (el && typeof el.focus === 'function') el.focus();
  }, []);

  const handleWedgeKeyDown = (e: React.KeyboardEvent<SVGGElement>, section: WheelSection) => {
    const currentIdx = sections.indexOf(section);
    if (currentIdx < 0) return;
    const n = sections.length;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        e.preventDefault();
        const next = sections[(currentIdx + 1) % n];
        if (next) focusWedge(next.id);
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        e.preventDefault();
        const prev = sections[(currentIdx - 1 + n) % n];
        if (prev) focusWedge(prev.id);
        break;
      }
      case 'Home': {
        e.preventDefault();
        const first = sections[0];
        if (first) focusWedge(first.id);
        break;
      }
      case 'End': {
        e.preventDefault();
        const last = sections[n - 1];
        if (last) focusWedge(last.id);
        break;
      }
      case 'Enter':
      case ' ':
      case 'Spacebar': {
        e.preventDefault();
        handleSectionClick(section.id);
        break;
      }
      case 'Escape': {
        if (selectedSection != null) {
          e.preventDefault();
          setSelectedSection(null);
        }
        break;
      }
      default:
        break;
    }
  };

  const handleWedgeBlur = (e: React.FocusEvent<SVGGElement>) => {
    // Only clear focused state when focus actually leaves the whole wheel —
    // moving between wedges should keep the label pill visible.
    const related = e.relatedTarget as Node | null;
    if (!related || !svgRef.current?.contains(related)) {
      setFocusedSection(null);
    }
  };

  // Static wedge path — always drawn at baseRadius. "Pop" is applied as a
  // radial translate on the wrapping <motion.g>, which animates smoothly
  // unlike SVG path-d interpolation.
  const createSectionPath = (index: number) => {
    const startAngle = index * anglePerSection - Math.PI / 2;
    const endAngle = (index + 1) * anglePerSection - Math.PI / 2;
    const radius = baseRadius;
    // Fixed donut geometry so toggling Cache does not change wedge paths or cause reflow
    const innerRadius = 40;

    const x1 = centerX + Math.cos(startAngle) * innerRadius;
    const y1 = centerY + Math.sin(startAngle) * innerRadius;
    const x2 = centerX + Math.cos(endAngle) * innerRadius;
    const y2 = centerY + Math.sin(endAngle) * innerRadius;
    const x3 = centerX + Math.cos(endAngle) * radius;
    const y3 = centerY + Math.sin(endAngle) * radius;
    const x4 = centerX + Math.cos(startAngle) * radius;
    const y4 = centerY + Math.sin(startAngle) * radius;

    return `M ${x1},${y1} L ${x4},${y4} A ${radius},${radius} 0 0,1 ${x3},${y3} L ${x2},${y2} A ${innerRadius},${innerRadius} 0 0,0 ${x1},${y1} Z`;
  };

  // Unit-direction vector pointing radially outward through the wedge's
  // centerline. Used to build the "pop" translate for a given state.
  const getPopDelta = (index: number, lifted: boolean, isSelected: boolean) => {
    const centerAngle = (index + 0.5) * anglePerSection - Math.PI / 2;
    const offset = isSelected ? selectedPop : lifted ? hoverPop : 0;
    return {
      x: Math.cos(centerAngle) * offset,
      y: Math.sin(centerAngle) * offset,
    };
  };

  const getIconPosition = (index: number) => {
    const angle = (index + 0.5) * anglePerSection - Math.PI / 2;
    const iconRadius = baseRadius * 0.7;
    return {
      x: centerX + Math.cos(angle) * iconRadius,
      y: centerY + Math.sin(angle) * iconRadius,
    };
  };

  const getLabelPosition = (index: number) => {
    const angle = (index + 0.5) * anglePerSection - Math.PI / 2;
    // Anchor point on the slice (same as icon radius) so label sits over the slice
    const labelAnchorRadius = baseRadius * 0.7;
    const x = centerX + Math.cos(angle) * labelAnchorRadius;
    const y = centerY + Math.sin(angle) * labelAnchorRadius;
    return { x, y };
  };

  const selectedSectionData = sections.find((s) => s.id === selectedSection);

  // Which section's title should the label pill show? Hover beats focus.
  const labelForId = hoveredSection ?? focusedSection;
  const shouldShowLabelPill = variant === 'full' && labelForId != null;

  // The donut sits at centre (300,300) with radius 180 plus a ~30px selected
  // pop-out, so the actual drawn content only occupies y ≈ [90,510] out of a
  // 600×600 canvas. The full variant uses a tight viewBox that trims the empty
  // vertical margins so the wheel sits where it looks like it sits — no CSS
  // crop hacks needed, and popped wedges/labels can never get clipped. The
  // dock variant keeps the square viewBox so the minimap reads as a circle in
  // its chip.
  const viewBox = variant === 'dock' ? '0 0 600 600' : '0 80 600 440';

  return (
    <div className="flex w-full max-w-full min-w-0 flex-col items-center gap-0">
      {/* SVG Wheel — responsive so narrow viewports don’t overflow horizontally */}
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="h-auto w-full max-w-full min-w-0 block select-none drop-shadow-lg pointer-events-none"
        preserveAspectRatio="xMidYMid meet"
        role="radiogroup"
        aria-label="App sections"
      >
        {/* Wedges. The wheel no longer rotates on select — each slice just
            "pops" outward along its own radial direction. Selected pops
            more than hover, so you can always tell which is which. */}
        {[
          ...sections.filter((s) => s.id !== selectedSection),
          ...(selectedSection != null ? sections.filter((s) => s.id === selectedSection) : []),
        ].map((section, orderIndex) => {
          const index = sections.indexOf(section);
          const IconComponent = section.icon;
          const iconPos = getIconPosition(index);
          const isHovered = hoveredSection === section.id;
          const isFocused = focusedSection === section.id;
          const isSelected = selectedSection === section.id;
          const isLifted = isHovered || isFocused;
          const isRovingOwner = section.id === rovingOwnerId;
          const pop = getPopDelta(index, isLifted, isSelected);
          return (
            <motion.g
              key={`slice-${section.id}`}
              ref={(el) => setWedgeRef(section.id, el)}
              data-section-id={section.id}
              role="radio"
              aria-checked={isSelected}
              aria-label={section.title}
              tabIndex={interactive && isRovingOwner ? 0 : -1}
              aria-hidden={!interactive}
              className={interactive ? 'pointer-events-auto focus:outline-none' : 'pointer-events-none focus:outline-none'}
              onKeyDown={interactive ? (e) => handleWedgeKeyDown(e, section) : undefined}
              onFocus={interactive ? () => setFocusedSection(section.id) : undefined}
              onBlur={interactive ? handleWedgeBlur : undefined}
              onPointerDown={interactive ? () => setFocusedSection(section.id) : undefined}
              onMouseEnter={interactive ? () => setHoveredSection(section.id) : undefined}
              onMouseLeave={interactive ? () => setHoveredSection(null) : undefined}
              onClick={interactive ? () => handleSectionClick(section.id) : undefined}
              animate={{ x: pop.x, y: pop.y }}
              transition={motionTransition}
            >
              <title>{section.description}</title>
              <motion.path
                d={createSectionPath(index)}
                fill={isSelected ? section.color : isLifted ? `${section.color}cc` : `${section.color}99`}
                stroke="var(--primary)"
                strokeWidth={isSelected ? strokeBase + 2 : isLifted ? strokeBase + 1 : strokeBase}
                vectorEffect="non-scaling-stroke"
                className="cursor-pointer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={reducedMotion ? { duration: 0 } : { duration: 0.3, delay: orderIndex * 0.05 }}
              />
              <foreignObject
                x={iconPos.x - 16}
                y={iconPos.y - 16}
                width={32}
                height={32}
                className="pointer-events-none"
              >
                <div className="flex items-center justify-center w-full h-full">
                  <IconComponent
                    className="w-7 h-7"
                    style={{
                      color: isSelected || isLifted ? 'var(--primary-foreground)' : 'var(--foreground)',
                      filter: isSelected || isLifted
                        ? 'drop-shadow(0 0 6px var(--primary)) drop-shadow(0 2px 4px rgba(0,0,0,0.4))'
                        : 'none',
                      transition: reducedMotion ? 'none' : 'filter 0.2s ease',
                    }}
                  />
                </div>
              </foreignObject>
            </motion.g>
          );
        })}

        {/* Hover/focus/selected label pill. Floats just above the wedge's
            centerline; translates along with the wedge's pop-out so it stays
            anchored to the slice. */}
        <g className="pointer-events-none" aria-hidden>
          <AnimatePresence>
            {shouldShowLabelPill && (() => {
              const section = sections.find((s) => s.id === labelForId);
              if (!section) return null;
              const index = sections.indexOf(section);
              const labelPos = getLabelPosition(index);
              const labelWidth = 220;
              const labelHeight = 40;
              const gapAboveSlice = 8;
              const isSelectedLabel = selectedSection === section.id;
              const isLiftedLabel = hoveredSection === section.id || focusedSection === section.id;
              const labelPop = getPopDelta(index, isLiftedLabel, isSelectedLabel);
              return (
                <motion.g
                  key={labelForId}
                  initial={{ opacity: 0, scale: 0.8, x: labelPop.x, y: labelPop.y }}
                  animate={{ opacity: 1, scale: 1, x: labelPop.x, y: labelPop.y }}
                  exit={{ opacity: 0, scale: 0.8, x: labelPop.x, y: labelPop.y }}
                  transition={motionTransition}
                  style={{ transformOrigin: `${labelPos.x}px ${labelPos.y}px` }}
                >
                  <foreignObject
                    x={labelPos.x - labelWidth / 2}
                    y={labelPos.y - labelHeight - gapAboveSlice}
                    width={labelWidth}
                    height={labelHeight}
                  >
                    <div className="flex items-center justify-center w-full h-full px-2">
                      <span
                        className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap max-w-[200px] truncate text-foreground"
                        style={{
                          background: 'color-mix(in srgb, var(--card) 85%, transparent)',
                          backdropFilter: 'blur(10px)',
                          WebkitBackdropFilter: 'blur(10px)',
                          border: '1px solid color-mix(in srgb, var(--primary) 50%, transparent)',
                          boxShadow: '0 2px 12px -2px rgba(0,0,0,0.3), 0 0 0 1px color-mix(in srgb, var(--primary) 15%, transparent)',
                        }}
                        title={section.title}
                      >
                        {section.title}
                      </span>
                    </div>
                  </foreignObject>
                </motion.g>
              );
            })()}
          </AnimatePresence>
        </g>

        {/* Center circle - Cache the Coyote, AI Companion. Sits above the wedges so
            it never moves; visually anchors the wheel's axis. Pointer/keyboard
            interaction is gated on `interactive` so decorative wheel variants
            (e.g. the dock mini-wheel behind an outer expand button) don't
            swallow clicks intended for their wrapper. */}
        {isCacheEnabled && (
          <g
            data-testid="open-ai-assistant"
            className={interactive ? 'pointer-events-auto' : 'pointer-events-none'}
            onClick={interactive ? onOpenAssistant : undefined}
            onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenAssistant?.(); } } : undefined}
            role="button"
            tabIndex={interactive ? 0 : -1}
            aria-hidden={!interactive}
            aria-label={`Open Cache the Coyote, AI Companion${brandCoyoteLabelSuffix()}`}
            style={{ cursor: interactive ? 'pointer' : undefined }}
          >
            <title>{`Open Cache the Coyote, AI Companion${brandCoyoteLabelSuffix()}`}</title>
            <motion.circle
              cx={centerX}
              cy={centerY}
              r="40"
              fill="var(--card)"
              stroke="var(--primary)"
              strokeWidth={strokeBase + 1}
              vectorEffect="non-scaling-stroke"
              style={{ filter: 'drop-shadow(0 0 12px var(--primary)) drop-shadow(0 0 28px color-mix(in srgb, var(--primary) 50%, transparent))' }}
              initial={showCacheAnimation ? { scale: 0, opacity: 0 } : {}}
              animate={{ scale: 1, opacity: 1 }}
              transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 20, duration: 0.6 }}
            />
            {/* Cache the Coyote 🐺 in center (AI Companion) */}
            <foreignObject
              x={centerX - 24}
              y={centerY - 24}
              width={48}
              height={48}
              style={{ pointerEvents: 'none' }}
            >
              <motion.div
                className="flex items-center justify-center w-full h-full text-[2.25rem] leading-none"
                initial={showCacheAnimation ? { scale: 0, rotate: -180 } : {}}
                animate={{ scale: 1, rotate: 0 }}
                transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
                aria-hidden
              >
                <BrandCoyoteMark decorativeOnly />
              </motion.div>
            </foreignObject>
          </g>
        )}
      </svg>

      {/* Expanded content card (skipped when expandContentOutside or dock variant – parent renders it). */}
      {!expandContentOutside && variant === 'full' && (
        <AnimatePresence mode="wait">
          {selectedSectionData && (
            <motion.div
              ref={sectionContentRef}
              data-testid="section-content"
              key={selectedSectionData.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={motionTransition}
              className="mt-1 w-full min-w-0 max-w-[min(42rem,100%)]"
            >
              <Card className="relative w-full min-w-0 overflow-x-auto overflow-y-hidden border-primary/30 bg-card shadow-xl">
                <div className="p-4 sm:p-6 min-w-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-primary mb-1">
                        {selectedSectionData.title}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedSectionData.description}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedSection(null)}
                      className="ml-3 flex items-center gap-1 px-3 py-1 rounded-full bg-muted/60 hover:bg-primary/15 border border-border hover:border-primary/40 text-xs font-medium text-muted-foreground hover:text-foreground transition-all backdrop-blur-sm"
                      aria-label="Close"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
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
                      Close
                    </button>
                  </div>
                  <div className="border-t border-border pt-4">
                    {selectedSectionData.content}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      )}

    </div>
  );
}

export const WheelMenu = memo(WheelMenuComponent);
