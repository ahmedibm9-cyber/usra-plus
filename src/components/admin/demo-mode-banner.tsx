'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, BarChart3, AlertTriangle } from 'lucide-react'

interface DemoModeBannerProps {
  /** Whether the data is currently from demo mode */
  isDemo?: boolean
  /** Optional callback when dismissed */
  onDismiss?: () => void
}

/**
 * A sticky banner that shows at the top of the admin content area when
 * data is from demo mode (Supabase tables don't exist or are empty).
 *
 * - Warning-themed accent via CSS variables
 * - Dismissible with X button
 * - Sticky at top of content area
 */
export function DemoModeBanner({ isDemo, onDismiss }: DemoModeBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (!isDemo || dismissed) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-50 w-full"
      >
        <div className="mx-auto">
          <div
            className="flex items-center gap-3 px-4 py-2.5 border border-[--status-warning-border] rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.06), rgba(245,158,11,0.04))',
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Icon */}
            <div className="w-8 h-8 rounded-lg bg-[--status-warning-bg] flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4 text-[--status-warning]" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[--status-warning]">
                  📊 Demo Mode
                </p>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[--status-warning-bg] text-[--status-warning] border border-[--status-warning-border] uppercase tracking-wide">
                  Simulated
                </span>
              </div>
              <p className="text-xs text-[--status-warning] mt-0.5 leading-relaxed">
                Showing simulated data. Connect Supabase tables for live analytics.
              </p>
            </div>

            {/* Warning badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[--status-warning-bg] border border-[--status-warning-border] shrink-0">
              <AlertTriangle className="w-3 h-3 text-[--status-warning]" />
              <span className="text-[10px] text-[--status-warning] font-medium">No live DB</span>
            </div>

            {/* Dismiss button */}
            <button
              onClick={() => {
                setDismissed(true)
                onDismiss?.()
              }}
              className="p-1.5 rounded-lg hover:bg-[--status-warning-bg] text-[--status-warning] hover:text-[--status-warning] transition-all shrink-0"
              title="Dismiss banner"
              aria-label="Dismiss demo mode banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
