'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Search,
  Bell,
  BarChart3,
  Moon,
  Zap,
  Sun,
  Globe,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTourStore } from '@/stores/tour-store'
import { useI18n } from '@/i18n/use-translation'

// ─── Tour Step Definition ─────────────────────────────────────────

interface TourStep {
  target: string
  titleKey: string
  descKey: string
  icon: React.ElementType
}

const tourSteps: TourStep[] = [
  { target: '[data-tour="sidebar"]', titleKey: 'sidebarTitle', descKey: 'sidebarDesc', icon: LayoutDashboard },
  { target: '[data-tour="header-search"]', titleKey: 'searchTitle', descKey: 'searchDesc', icon: Search },
  { target: '[data-tour="header-notifications"]', titleKey: 'notifTitle', descKey: 'notifDesc', icon: Bell },
  { target: '[data-tour="dashboard-stats"]', titleKey: 'statsTitle', descKey: 'statsDesc', icon: BarChart3 },
  { target: '[data-tour="dashboard-prayer"]', titleKey: 'prayerTitle', descKey: 'prayerDesc', icon: Moon },
  { target: '[data-tour="quick-actions"]', titleKey: 'actionsTitle', descKey: 'actionsDesc', icon: Zap },
  { target: '[data-tour="theme-toggle"]', titleKey: 'themeTitle', descKey: 'themeDesc', icon: Sun },
  { target: '[data-tour="language-switch"]', titleKey: 'langTitle', descKey: 'langDesc', icon: Globe },
]

// ─── Spotlight Cutout Position ────────────────────────────────────

interface SpotlightRect {
  top: number
  left: number
  width: number
  height: number
}

function getSpotlightRect(el: HTMLElement, padding = 8): SpotlightRect {
  const rect = el.getBoundingClientRect()
  return {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  }
}

// ─── Tooltip Positioning ──────────────────────────────────────────

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

interface TooltipPosition {
  placement: TooltipPlacement
  top: number
  left: number
  arrowTop: number
  arrowLeft: number
}

function computeTooltipPosition(
  spotlight: SpotlightRect,
  tooltipWidth: number,
  tooltipHeight: number,
  isRTL: boolean
): TooltipPosition {
  const gap = 16
  const arrowSize = 8
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Candidate positions in preference order
  const candidates: { placement: TooltipPlacement; top: number; left: number }[] = [
    // Bottom
    {
      placement: 'bottom',
      top: spotlight.top + spotlight.height + gap,
      left: spotlight.left + spotlight.width / 2 - tooltipWidth / 2,
    },
    // Top
    {
      placement: 'top',
      top: spotlight.top - tooltipHeight - gap,
      left: spotlight.left + spotlight.width / 2 - tooltipWidth / 2,
    },
    // Right (or Left in RTL)
    {
      placement: isRTL ? 'left' : 'right',
      top: spotlight.top + spotlight.height / 2 - tooltipHeight / 2,
      left: isRTL
        ? spotlight.left - tooltipWidth - gap
        : spotlight.left + spotlight.width + gap,
    },
    // Left (or Right in RTL)
    {
      placement: isRTL ? 'right' : 'left',
      top: spotlight.top + spotlight.height / 2 - tooltipHeight / 2,
      left: isRTL
        ? spotlight.left + spotlight.width + gap
        : spotlight.left - tooltipWidth - gap,
    },
  ]

  // Pick the first candidate that fits on screen
  for (const c of candidates) {
    const clampedLeft = Math.max(12, Math.min(vw - tooltipWidth - 12, c.left))
    const clampedTop = Math.max(12, Math.min(vh - tooltipHeight - 12, c.top))
    if (
      clampedTop + tooltipHeight < vh - 12 &&
      clampedTop > 12 &&
      clampedLeft + tooltipWidth < vw - 12 &&
      clampedLeft > 12
    ) {
      // Compute arrow position relative to the spotlight center
      const centerX = spotlight.left + spotlight.width / 2
      const centerY = spotlight.top + spotlight.height / 2
      let arrowTop = 0
      let arrowLeft = 0

      if (c.placement === 'bottom' || c.placement === 'top') {
        arrowLeft = centerX - clampedLeft
        arrowTop = c.placement === 'bottom' ? -arrowSize : tooltipHeight
      } else {
        arrowTop = centerY - clampedTop
        arrowLeft = c.placement === 'right' ? -arrowSize : tooltipWidth
      }

      return { placement: c.placement, top: clampedTop, left: clampedLeft, arrowTop, arrowLeft }
    }
  }

  // Fallback: bottom center with clamping
  const fallbackTop = Math.min(spotlight.top + spotlight.height + gap, vh - tooltipHeight - 16)
  const fallbackLeft = Math.max(16, Math.min(vw - tooltipWidth - 16, spotlight.left + spotlight.width / 2 - tooltipWidth / 2))
  return {
    placement: 'bottom',
    top: fallbackTop,
    left: fallbackLeft,
    arrowTop: -arrowSize,
    arrowLeft: spotlight.left + spotlight.width / 2 - fallbackLeft,
  }
}

// ─── Arrow Component ──────────────────────────────────────────────

function TooltipArrow({ placement, top, left }: { placement: TooltipPlacement; top: number; left: number }) {
  const size = 8
  const baseClass = 'absolute z-50'

  const rotations: Record<TooltipPlacement, string> = {
    top: 'rotate-180',
    bottom: 'rotate-0',
    left: 'rotate-90',
    right: '-rotate-90',
  }

  return (
    <div
      className={baseClass}
      style={{ top, left }}
    >
      <div
        className={`${rotations[placement]} bg-[--bg-surface] border-[--border-subtle]`}
        style={{
          width: 0,
          height: 0,
          borderLeft: `${size}px solid transparent`,
          borderRight: `${size}px solid transparent`,
          borderBottom: `${size}px solid var(--border-subtle)`,
        }}
      />
      <div
        className={`${rotations[placement]} bg-[--bg-surface]`}
        style={{
          width: 0,
          height: 0,
          borderLeft: `${size - 1}px solid transparent`,
          borderRight: `${size - 1}px solid transparent`,
          borderBottom: `${size - 1}px solid var(--bg-surface)`,
          position: 'absolute',
          top: placement === 'bottom' ? 1 : -1,
          left: placement === 'left' || placement === 'right' ? 0 : 0,
        }}
      />
    </div>
  )
}

// ─── Main GuidedTour Component ────────────────────────────────────

export function GuidedTour() {
  const { isActive, currentStep, welcomeDismissed, nextStep, prevStep, endTour, skipTour, dismissWelcome } = useTourStore()
  const { t, isRTL } = useI18n()
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null)
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const totalSteps = tourSteps.length
  const step = tourSteps[currentStep]

  // Show welcome screen on first step when tour starts, until dismissed
  const showWelcome = isActive && currentStep === 0 && !welcomeDismissed

  // Scroll target into view and compute positions
  const updatePositions = useCallback(() => {
    if (!isActive || !step || showWelcome) return

    const targetEl = document.querySelector(step.target)
    if (!targetEl) return

    // Scroll into view
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })

    // Wait a bit for scroll to settle
    setTimeout(() => {
      const rect = getSpotlightRect(targetEl as HTMLElement)
      setSpotlightRect(rect)

      // Estimate tooltip size (max-w-xs ~ 320px, height estimate ~220px)
      const estimatedWidth = Math.min(340, window.innerWidth - 32)
      const estimatedHeight = 220
      const pos = computeTooltipPosition(rect, estimatedWidth, estimatedHeight, isRTL)
      setTooltipPos(pos)
    }, 300)
  }, [isActive, currentStep, step, isRTL, showWelcome])

  useEffect(() => {
    updatePositions()
  }, [updatePositions])

  // Recompute on resize/scroll
  useEffect(() => {
    if (!isActive || showWelcome) return
    const handleUpdate = () => updatePositions()
    window.addEventListener('resize', handleUpdate)
    window.addEventListener('scroll', handleUpdate, true)
    return () => {
      window.removeEventListener('resize', handleUpdate)
      window.removeEventListener('scroll', handleUpdate, true)
    }
  }, [isActive, showWelcome, updatePositions])

  // Handle keyboard
  useEffect(() => {
    if (!isActive) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skipTour()
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStep < totalSteps - 1) {
          nextStep()
        } else {
          endTour()
        }
      } else if (e.key === 'ArrowLeft') {
        prevStep()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, currentStep, totalSteps, nextStep, prevStep, endTour, skipTour])

  // Dismiss welcome and show first step
  const handleWelcomeContinue = useCallback(() => {
    dismissWelcome()
  }, [dismissWelcome])

  if (!isActive) return null

  const stepIndicator = `${currentStep + 1} ${isRTL ? 'من' : 'of'} ${totalSteps}`
  const isLastStep = currentStep === totalSteps - 1
  const isFirstStep = currentStep === 0

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100]">
        {/* Dark overlay with spotlight cutout */}
        {spotlightRect && !showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
            style={{
              backgroundColor: 'rgba(0,0,0,0.6)',
              clipPath: `polygon(
                0% 0%,
                0% 100%,
                ${spotlightRect.left}px 100%,
                ${spotlightRect.left}px ${spotlightRect.top}px,
                ${spotlightRect.left + spotlightRect.width}px ${spotlightRect.top}px,
                ${spotlightRect.left + spotlightRect.width}px ${spotlightRect.top + spotlightRect.height}px,
                ${spotlightRect.left}px ${spotlightRect.top + spotlightRect.height}px,
                ${spotlightRect.left}px 100%,
                100% 100%,
                100% 0%
              )`,
            }}
            onClick={skipTour}
          />
        )}

        {/* Full overlay for welcome screen */}
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
            onClick={skipTour}
          />
        )}

        {/* Spotlight border glow */}
        {spotlightRect && !showWelcome && (
          <motion.div
            initial={false}
            animate={{
              top: spotlightRect.top - 2,
              left: spotlightRect.left - 2,
              width: spotlightRect.width + 4,
              height: spotlightRect.height + 4,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute rounded-xl border-2 border-[#6366F1]/60 pointer-events-none"
            style={{
              boxShadow: '0 0 16px 4px rgba(99,102,241,0.15)',
            }}
          />
        )}

        {/* Welcome Screen */}
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-2xl border border-[--border-subtle] bg-[--bg-surface]/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
              {/* Ambient glow */}
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-[#6366F1]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative p-8 text-center">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 400 }}
                  className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366F1] to-violet-500 shadow-lg shadow-[#6366F1]/30"
                >
                  <Sparkles className="size-8 text-white" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-xl font-bold text-[--text-primary] mb-2"
                >
                  {t.tour.welcomeTitle}
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm text-[--text-muted] mb-8 leading-relaxed"
                >
                  {t.tour.welcomeDesc}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="flex items-center gap-3 justify-center"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={skipTour}
                    className="text-[--text-muted] hover:text-[--text-primary]"
                  >
                    {t.tour.skip}
                  </Button>
                  <Button
                    onClick={handleWelcomeContinue}
                    className="bg-[#6366F1] hover:bg-[#6366F1]/90 text-white rounded-xl px-6"
                  >
                    {t.tour.startTour}
                    {isRTL ? <ChevronLeft className="size-4 ml-1" /> : <ChevronRight className="size-4 ml-1" />}
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step Tooltip */}
        {tooltipPos && spotlightRect && !showWelcome && step && (
          <motion.div
            key={`tooltip-${currentStep}`}
            initial={{ opacity: 0, y: tooltipPos.placement === 'bottom' ? 8 : tooltipPos.placement === 'top' ? -8 : 0, x: tooltipPos.placement === 'right' ? 8 : tooltipPos.placement === 'left' ? -8 : 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            ref={tooltipRef}
            className="absolute w-[90vw] max-w-[340px] pointer-events-auto"
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Arrow */}
            <TooltipArrow
              placement={tooltipPos.placement}
              top={tooltipPos.arrowTop}
              left={tooltipPos.arrowLeft}
            />

            <div className="rounded-2xl border border-[--border-subtle] bg-[--bg-surface]/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
              {/* Ambient glow */}
              <div className="absolute -top-16 -left-16 w-32 h-32 bg-[#6366F1]/8 rounded-full blur-3xl pointer-events-none" />

              <div className="relative p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-[#6366F1]/15">
                      <step.icon className="size-4 text-[#6366F1]" />
                    </div>
                    <span className="text-xs font-medium text-[--text-muted]">
                      {stepIndicator}
                    </span>
                  </div>
                  <button
                    onClick={skipTour}
                    className="flex size-6 items-center justify-center rounded-md text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-surface-2] transition-colors"
                    aria-label={t.tour.skip}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-[--text-primary] mb-1.5">
                  {t.tour[step.titleKey as keyof typeof t.tour] as string}
                </h3>

                {/* Description */}
                <p className="text-sm text-[--text-muted] leading-relaxed mb-5">
                  {t.tour[step.descKey as keyof typeof t.tour] as string}
                </p>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {!isFirstStep ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={prevStep}
                        className="text-[--text-muted] hover:text-[--text-primary] h-8 px-2.5 text-xs"
                      >
                        {isRTL ? <ChevronRight className="size-3.5 mr-1" /> : <ChevronLeft className="size-3.5 mr-1" />}
                        {t.tour.previous}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={skipTour}
                        className="text-[--text-muted] hover:text-[--text-primary] h-8 px-2.5 text-xs"
                      >
                        {t.tour.skip}
                      </Button>
                    )}
                  </div>

                  <Button
                    onClick={isLastStep ? endTour : nextStep}
                    className="bg-[#6366F1] hover:bg-[#6366F1]/90 text-white rounded-xl h-8 px-4 text-xs"
                  >
                    {isLastStep ? t.tour.getStarted : t.tour.next}
                    {!isLastStep && (isRTL ? <ChevronLeft className="size-3.5 ml-1" /> : <ChevronRight className="size-3.5 ml-1" />)}
                  </Button>
                </div>

                {/* Progress dots */}
                <div className="flex items-center justify-center gap-1.5 mt-4">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-full transition-all duration-300 ${
                        i === currentStep
                          ? 'w-5 h-1.5 bg-[#6366F1]'
                          : i < currentStep
                            ? 'w-1.5 h-1.5 bg-[#6366F1]/40'
                            : 'w-1.5 h-1.5 bg-[--border-subtle]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  )
}
