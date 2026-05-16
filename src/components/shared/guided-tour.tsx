'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
 ChevronLeft,
 ChevronRight,
 Sparkles,
 X,
 CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTourStore } from '@/stores/tour-store'
import { useI18n } from '@/i18n/use-translation'
import { usraPlusTour, type TourConfig, type TourStepConfig } from '@/lib/tour-config'

// ─── Props ────────────────────────────────────────────────────────

interface GuidedTourProps {
 config?: TourConfig
}

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

function buildClipPathPolygon(r: SpotlightRect): string {
 return `polygon(
  0% 0%,
  0% 100%,
  ${r.left}px 100%,
  ${r.left}px ${r.top}px,
  ${r.left + r.width}px ${r.top}px,
  ${r.left + r.width}px ${r.top + r.height}px,
  ${r.left}px ${r.top + r.height}px,
  ${r.left}px 100%,
  100% 100%,
  100% 0%
 )`
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
 isRTL: boolean,
 preferredPlacement?: TooltipPlacement
): TooltipPosition {
 const gap = 16
 const arrowSize = 8
 const vw = window.innerWidth
 const vh = window.innerHeight

 // Build candidate positions — preferred first if provided
 const standardCandidates: { placement: TooltipPlacement; top: number; left: number }[] = [
  { placement: 'bottom', top: spotlight.top + spotlight.height + gap, left: spotlight.left + spotlight.width / 2 - tooltipWidth / 2 },
  { placement: 'top', top: spotlight.top - tooltipHeight - gap, left: spotlight.left + spotlight.width / 2 - tooltipWidth / 2 },
  {
   placement: isRTL ? 'left' : 'right',
   top: spotlight.top + spotlight.height / 2 - tooltipHeight / 2,
   left: isRTL ? spotlight.left - tooltipWidth - gap : spotlight.left + spotlight.width + gap,
  },
  {
   placement: isRTL ? 'right' : 'left',
   top: spotlight.top + spotlight.height / 2 - tooltipHeight / 2,
   left: isRTL ? spotlight.left + spotlight.width + gap : spotlight.left - tooltipWidth - gap,
  },
 ]

 // If a preferred placement is specified, try it first
 const candidates = preferredPlacement
  ? [standardCandidates.find((c) => c.placement === preferredPlacement)!, ...standardCandidates.filter((c) => c.placement !== preferredPlacement)]
  : standardCandidates

 for (const c of candidates) {
  if (!c) continue
  const clampedLeft = Math.max(12, Math.min(vw - tooltipWidth - 12, c.left))
  const clampedTop = Math.max(12, Math.min(vh - tooltipHeight - 12, c.top))
  if (
   clampedTop + tooltipHeight < vh - 12 &&
   clampedTop > 12 &&
   clampedLeft + tooltipWidth < vw - 12 &&
   clampedLeft > 12
  ) {
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

 const rotations: Record<TooltipPlacement, string> = {
  top: 'rotate-180',
  bottom: 'rotate-0',
  left: 'rotate-90',
  right: '-rotate-90',
 }

 return (
  <div className="absolute z-50" style={{ top, left }}>
   <div
    className={`${rotations[placement]} border-[var(--border)]`}
    style={{
     width: 0,
     height: 0,
     borderLeft: `${size}px solid transparent`,
     borderRight: `${size}px solid transparent`,
     borderBottom: `${size}px solid var(--border)`,
    }}
   />
   <div
    className={`${rotations[placement]}`}
    style={{
     width: 0,
     height: 0,
     borderLeft: `${size - 1}px solid transparent`,
     borderRight: `${size - 1}px solid transparent`,
     borderBottom: `${size - 1}px solid var(--card)`,
     position: 'absolute',
     top: placement === 'bottom' ? 1 : -1,
     left: 0,
    }}
   />
  </div>
 )
}

// ─── Celebration Confetti Particles (CSS-only) ────────────────────

function CelebrationConfetti() {
 const particles = useMemo(() => {
  const colors = [
   'var(--primary)',
   'var(--accent)',
   '#22C55E',
   'var(--accent)',
   '#EF4444',
   'var(--accent)',
  ]
  return Array.from({ length: 24 }).map((_, i) => {
   const xVal = (Math.random() - 0.5) * 60
   return {
    id: i,
    color: colors[i % colors.length],
    left: `${10 + Math.random() * 80}%`,
    delay: `${Math.random() * 0.6}s`,
    duration: `${1.2 + Math.random() * 0.8}s`,
    size: `${4 + Math.random() * 5}px`,
    confettiX: `${xVal}px`,
   }
  })
 }, [])

 return (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
   {particles.map((p) => (
    <div
     key={p.id}
     className="absolute rounded-full"
     style={{
      width: p.size,
      height: p.size,
      background: p.color,
      left: p.left,
      bottom: '40%',
      '--confetti-x': p.confettiX,
      animation: `confetti-rise ${p.duration} ${p.delay} ease-out forwards`,
      opacity: 0,
     } as React.CSSProperties}
    />
   ))}
  </div>
 )
}

// ─── Feature Preview Icons for Welcome Screen ─────────────────────

function FeaturePreviewGrid({ steps }: { steps: TourStepConfig[] }) {
 // Show up to 4 icons from the tour steps as a preview
 const previewSteps = steps.slice(0, 4)

 return (
  <div className="grid grid-cols-4 gap-3 my-6">
   {previewSteps.map((step, i) => (
    <motion.div
     key={step.titleKey}
     initial={{ opacity: 0, y: 8 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
     className="flex flex-col items-center gap-1.5"
    >
     <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--primary)]/15">
      <step.icon className="size-4 text-[var(--primary)]" />
     </div>
     <span className="text-[10px] text-[var(--muted-foreground)] leading-tight text-center">
      {/* Use first word of title as mini label */}
     </span>
    </motion.div>
   ))}
  </div>
 )
}

// ─── Main GuidedTour Component ────────────────────────────────────

export function GuidedTour({ config }: GuidedTourProps) {
 const tourConfig = config ?? usraPlusTour
 const {
  isActive,
  currentStep,
  welcomeDismissed,
  isCompleting,
  nextStep,
  prevStep,
  endTour,
  skipTour,
  dismissWelcome,
  setCompleting,
 } = useTourStore()
 const { t, isRTL } = useI18n()
 const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null)
 const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null)
 const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

 const steps = tourConfig.steps
 const totalSteps = steps.length
 const step = steps[currentStep]

 const showWelcome = isActive && currentStep === 0 && !welcomeDismissed && !isCompleting
 const showCelebration = isActive && isCompleting

 // Build i18n accessor with type safety
 const tourT = t.tour
 const getStepTitle = useCallback(
  (key: string) => (tourT as Record<string, string>)[key] ?? key,
  [tourT]
 )

 // ─── Celebration auto-dismiss ─────────────────────────────────
 useEffect(() => {
  if (showCelebration) {
   celebrationTimerRef.current = setTimeout(() => {
    setCompleting(false)
   }, 2500)
  }
  return () => {
   if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current)
  }
 }, [showCelebration, setCompleting])

 // ─── Scroll target into view and compute positions ────────────
 const updatePositions = useCallback(() => {
  if (!isActive || !step || showWelcome || isCompleting) return

  const targetEl = document.querySelector(step.target)
  if (!targetEl) return

  targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })

  setTimeout(() => {
   const rect = getSpotlightRect(targetEl as HTMLElement)
   setSpotlightRect(rect)

   const estimatedWidth = Math.min(340, window.innerWidth - 32)
   const estimatedHeight = 260
   const pos = computeTooltipPosition(rect, estimatedWidth, estimatedHeight, isRTL, step.placement)
   setTooltipPos(pos)
  }, 300)
 }, [isActive, currentStep, step, isRTL, showWelcome, isCompleting])

 useEffect(() => {
  updatePositions()
 }, [updatePositions])

 // Recompute on resize/scroll
 useEffect(() => {
  if (!isActive || showWelcome || isCompleting) return
  const handleUpdate = () => updatePositions()
  window.addEventListener('resize', handleUpdate)
  window.addEventListener('scroll', handleUpdate, true)
  return () => {
   window.removeEventListener('resize', handleUpdate)
   window.removeEventListener('scroll', handleUpdate, true)
  }
 }, [isActive, showWelcome, isCompleting, updatePositions])

 // ─── Keyboard navigation ──────────────────────────────────────
 useEffect(() => {
  if (!isActive || isCompleting) return
  const handleKeyDown = (e: KeyboardEvent) => {
   if (e.key === 'Escape') {
    skipTour()
   } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
    // In RTL, ArrowRight = previous, ArrowLeft = next
    if (isRTL) {
     prevStep()
    } else if (currentStep < totalSteps - 1) {
     nextStep()
    } else {
     endTour()
    }
   } else if (e.key === 'ArrowLeft') {
    if (isRTL) {
     if (currentStep < totalSteps - 1) nextStep()
     else endTour()
    } else {
     prevStep()
    }
   }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
 }, [isActive, isCompleting, currentStep, totalSteps, nextStep, prevStep, endTour, skipTour, isRTL])

 // ─── Dismiss welcome and show first step ──────────────────────
 const handleWelcomeContinue = useCallback(() => {
  dismissWelcome()
 }, [dismissWelcome])

 // ─── Compute animated clip path ───────────────────────────────
 const currentClipPath = useMemo(() => {
  if (spotlightRect && !showWelcome && !showCelebration) {
   return buildClipPathPolygon(spotlightRect)
  }
  return ''
 }, [spotlightRect, showWelcome, showCelebration])

 // ─── Render guard ─────────────────────────────────────────────
 if (!isActive) return null

 const isLastStep = currentStep === totalSteps - 1
 const isFirstStep = currentStep === 0
 const progressPercent = totalSteps > 1 ? ((currentStep + 1) / totalSteps) * 100 : 100

 // ─── Spring configs ───────────────────────────────────────────
 const smoothSpring = { type: 'spring' as const, stiffness: 300, damping: 25 }
 const spotlightSpring = { type: 'spring' as const, stiffness: 260, damping: 28 }

 return (
  <AnimatePresence>
   <div className="fixed inset-0 z-[100]" role="dialog" aria-label="Guided tour" dir={isRTL ? 'rtl' : 'ltr'}>
    {/* ═══ Dark overlay with animated spotlight cutout ═══ */}
    {spotlightRect && !showWelcome && !showCelebration && (
     <motion.div
      key="spotlight-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={skipTour}
     >
      <motion.div
       className="absolute inset-0"
       animate={{ clipPath: currentClipPath }}
       transition={spotlightSpring}
       style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      />
     </motion.div>
    )}

    {/* ═══ Full overlay for welcome & celebration ═══ */}
    {(showWelcome || showCelebration) && (
     <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/60"
      onClick={showCelebration ? undefined : skipTour}
     />
    )}

    {/* ═══ Spotlight border glow with smooth position animation ═══ */}
    {spotlightRect && !showWelcome && !showCelebration && (
     <motion.div
      initial={false}
      animate={{
       top: spotlightRect.top - 3,
       left: spotlightRect.left - 3,
       width: spotlightRect.width + 6,
       height: spotlightRect.height + 6,
      }}
      transition={spotlightSpring}
      className="absolute rounded-xl border-2 border-[var(--primary)]/60 pointer-events-none"
      style={{
       boxShadow: '0 0 20px 6px color-mix(in srgb, var(--primary) 15%, transparent)',
      }}
     >
      {/* Pulsing ring animation around spotlight */}
      <motion.div
       className="absolute -inset-2 rounded-xl border-2 border-[var(--primary)]/30"
       animate={{
        opacity: [0.3, 0.7, 0.3],
        scale: [1, 1.02, 1],
       }}
       transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
       }}
      />
     </motion.div>
    )}

    {/* ═══ Welcome Screen ═══ */}
    {showWelcome && (
     <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm"
      onClick={(e) => e.stopPropagation()}
     >
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden relative">
       {/* Ambient glow blobs */}
       <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full blur-3xl pointer-events-none" style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }} />
       <div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none" style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)' }} />

       {/* Subtle CSS-only particles behind the card */}
       <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {[...Array(6)].map((_, i) => (
         <div
          key={i}
          className="absolute rounded-full"
          style={{
           width: `${3 + i * 2}px`,
           height: `${3 + i * 2}px`,
           background: i % 2 === 0 ? 'var(--primary)' : 'var(--accent)',
           left: `${15 + i * 14}%`,
           top: `${20 + (i % 3) * 25}%`,
           opacity: 0.2,
           animation: `confetti-float ${3 + i * 0.5}s ${i * 0.3}s ease-in-out infinite`,
          }}
         />
        ))}
       </div>

       <div className="relative p-8 text-center">
        {/* Icon */}
        <motion.div
         initial={{ scale: 0.8, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 25 }}
         className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl shadow-lg"
         style={{
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          boxShadow: '0 8px 24px color-mix(in srgb, var(--primary) 30%, transparent)',
         }}
        >
         <Sparkles className="size-8 text-white" />
        </motion.div>

        <motion.h2
         initial={{ opacity: 0, y: 6 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.15 }}
         className="text-xl font-bold text-[var(--foreground)] mb-2"
        >
         {getStepTitle(tourConfig.welcomeTitleKey)}
        </motion.h2>

        <motion.p
         initial={{ opacity: 0, y: 6 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.2 }}
         className="text-sm text-[var(--muted-foreground)] mb-4 leading-relaxed"
        >
         {getStepTitle(tourConfig.welcomeDescKey)}
        </motion.p>

        {/* Feature preview grid */}
        <FeaturePreviewGrid steps={steps} />

        <motion.div
         initial={{ opacity: 0, y: 6 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.35 }}
         className="flex items-center gap-3 justify-center"
        >
         <Button
          variant="ghost"
          size="sm"
          onClick={skipTour}
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
         >
          {tourT.skip}
         </Button>
         <Button
          onClick={handleWelcomeContinue}
          className="rounded-xl px-6 text-white"
          style={{ background: 'var(--primary)' }}
         >
          {tourT.startTour}
          {isRTL ? <ChevronLeft className="size-4 ml-1" /> : <ChevronRight className="size-4 ml-1" />}
         </Button>
        </motion.div>
       </div>
      </div>
     </motion.div>
    )}

    {/* ═══ Step Tooltip ═══ */}
    {tooltipPos && spotlightRect && !showWelcome && !showCelebration && step && (
     <motion.div
      key={`tooltip-${currentStep}`}
      initial={{
       opacity: 0,
       scale: 0.98,
       y: tooltipPos.placement === 'bottom' ? 8 : tooltipPos.placement === 'top' ? -8 : 0,
       x: tooltipPos.placement === 'right' ? (isRTL ? -8 : 8) : tooltipPos.placement === 'left' ? (isRTL ? 8 : -8) : 0,
      }}
      animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={smoothSpring}
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

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden relative">
       {/* Ambient glow */}
       <div
        className="absolute -top-16 -left-16 w-32 h-32 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'color-mix(in srgb, var(--primary) 8%, transparent)' }}
       />

       <div className="relative p-5" aria-live="assertive">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
         <div className="flex items-center gap-2.5">
          {/* Step icon with subtle continuous glow */}
          <motion.div
           className="relative flex size-8 items-center justify-center rounded-lg"
           style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}
           animate={{
            boxShadow: [
             '0 0 0 0 color-mix(in srgb, var(--primary) 0%, transparent)',
             '0 0 8px 2px color-mix(in srgb, var(--primary) 15%, transparent)',
             '0 0 0 0 color-mix(in srgb, var(--primary) 0%, transparent)',
            ],
           }}
           transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
           <step.icon className="size-4" style={{ color: 'var(--primary)' }} />
          </motion.div>
          <span className="text-xs font-medium text-[var(--muted-foreground)]">
           {tourT.progressLabel
            .replace('{current}', String(currentStep + 1))
            .replace('{total}', String(totalSteps))}
          </span>
         </div>
         <button
          onClick={skipTour}
          className="flex size-6 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          aria-label={tourT.skip}
         >
          <X className="size-3.5" />
         </button>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-[var(--foreground)] mb-1.5">
         {getStepTitle(step.titleKey)}
        </h3>

        {/* Description */}
        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed mb-4">
         {getStepTitle(step.descKey)}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
         <div className="flex items-center gap-1">
          {!isFirstStep ? (
           <Button
            variant="ghost"
            size="sm"
            onClick={prevStep}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] h-8 px-2.5 text-xs"
           >
            {isRTL ? <ChevronRight className="size-3.5 mr-1" /> : <ChevronLeft className="size-3.5 mr-1" />}
            {tourT.previous}
           </Button>
          ) : (
           <Button
            variant="ghost"
            size="sm"
            onClick={skipTour}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] h-8 px-2.5 text-xs"
           >
            {tourT.skip}
           </Button>
          )}
         </div>

         <Button
          onClick={isLastStep ? endTour : nextStep}
          className="rounded-xl h-8 px-4 text-xs text-white"
          style={{ background: 'var(--primary)' }}
         >
          {isLastStep ? tourT.getStarted : tourT.next}
          {!isLastStep && (isRTL ? <ChevronLeft className="size-3.5 ml-1" /> : <ChevronRight className="size-3.5 ml-1" />)}
         </Button>
        </div>

        {/* Slim progress bar */}
        <div className="mt-4 h-1 w-full rounded-full bg-[var(--muted)] overflow-hidden">
         <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--primary)' }}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
         />
        </div>

        {/* Keyboard hints */}
        <p className="mt-2 text-[10px] text-[var(--muted-foreground)]/60 text-center select-none">
         {tourT.keyboardHints}
        </p>
       </div>
      </div>
     </motion.div>
    )}

    {/* ═══ Finish Celebration ═══ */}
    {showCelebration && (
     <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm"
      onClick={(e) => e.stopPropagation()}
     >
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden relative">
       {/* Confetti particles */}
       <CelebrationConfetti />

       <div className="relative p-10 text-center">
        {/* Checkmark icon with scale-in animation */}
        <motion.div
         initial={{ scale: 0, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         transition={{
          delay: 0.15,
          type: 'spring',
          stiffness: 400,
          damping: 15,
         }}
         className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full"
         style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 15%, transparent), color-mix(in srgb, var(--accent) 15%, transparent))',
         }}
        >
         <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 500, damping: 12 }}
         >
          <CheckCircle2 className="size-10" style={{ color: 'var(--primary)' }} />
         </motion.div>
        </motion.div>

        <motion.h2
         initial={{ opacity: 0, y: 8 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.35 }}
         className="text-xl font-bold text-[var(--foreground)] mb-2"
        >
         {getStepTitle(tourConfig.completionTitleKey)}
        </motion.h2>

        <motion.p
         initial={{ opacity: 0, y: 8 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.45 }}
         className="text-sm text-[var(--muted-foreground)] leading-relaxed"
        >
         {getStepTitle(tourConfig.completionDescKey)}
        </motion.p>
       </div>
      </div>
     </motion.div>
    )}
   </div>
  </AnimatePresence>
 )
}
