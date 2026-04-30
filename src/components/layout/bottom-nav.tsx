'use client'

import { useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  ShoppingCart,
  MessageSquare,
  FolderOpen,
  Settings,
  MoreHorizontal,
  ChevronUp,
  Wallet,
  UtensilsCrossed,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { useAppStore } from '@/stores/app-store'
import { useI18n } from '@/i18n/use-translation'
import type { AppPage } from '@/types'

interface BottomNavItem {
  page: AppPage
  icon: React.ElementType
  labelKey: 'dashboard' | 'tasks' | 'calendar' | 'grocery' | 'budget'
}

const mainNavItems: BottomNavItem[] = [
  { page: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { page: 'tasks', icon: CheckSquare, labelKey: 'tasks' },
  { page: 'calendar', icon: CalendarDays, labelKey: 'calendar' },
  { page: 'grocery', icon: ShoppingCart, labelKey: 'grocery' },
  { page: 'budget', icon: Wallet, labelKey: 'budget' },
]

interface MoreNavItem {
  page: AppPage
  icon: React.ElementType
  labelKey: 'chat' | 'files' | 'settings' | 'mealPlan'
}

const moreNavItems: MoreNavItem[] = [
  { page: 'meal-plan', icon: UtensilsCrossed, labelKey: 'mealPlan' },
  { page: 'chat', icon: MessageSquare, labelKey: 'chat' },
  { page: 'files', icon: FolderOpen, labelKey: 'files' },
  { page: 'settings', icon: Settings, labelKey: 'settings' },
]

// Ripple component for tap feedback
function Ripple({ x, y }: { x: number; y: number }) {
  return (
    <motion.span
      className="pointer-events-none absolute rounded-full bg-[--border-medium]"
      initial={{
        width: 0,
        height: 0,
        x: x,
        y: y,
        opacity: 0.5,
      }}
      animate={{
        width: 80,
        height: 80,
        x: x - 40,
        y: y - 40,
        opacity: 0,
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    />
  )
}

export function BottomNav() {
  const { currentPage, setCurrentPage } = useAppStore()
  const { t, isRTL } = useI18n()
  const [ripples, setRipples] = useState<Record<string, { x: number; y: number; id: number }>>({})
  const rippleIdRef = useRef(0)
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)

  const handleNavClick = useCallback(
    (page: AppPage) => {
      setCurrentPage(page)
    },
    [setCurrentPage]
  )

  const handleTap = useCallback(
    (page: AppPage, key: string, e: React.MouseEvent | React.TouchEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      let clientX: number, clientY: number

      if ('touches' in e) {
        clientX = e.touches[0]?.clientX ?? rect.left + rect.width / 2
        clientY = e.touches[0]?.clientY ?? rect.top + rect.height / 2
      } else {
        clientX = e.clientX
        clientY = e.clientY
      }

      const x = clientX - rect.left
      const y = clientY - rect.top
      const id = ++rippleIdRef.current

      setRipples((prev) => ({ ...prev, [key]: { x, y, id } }))
      setTimeout(() => {
        setRipples((prev) => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      }, 500)

      handleNavClick(page)
    },
    [handleNavClick]
  )

  const isMainItemActive = mainNavItems.some((item) => item.page === currentPage)
  const isMoreItemActive = moreNavItems.some((item) => item.page === currentPage)

  return (
    <nav
      aria-label="Mobile navigation"
      className="
        fixed bottom-0 left-0 right-0 z-50 md:hidden
        border-t border-[--border-subtle]
        bg-[--bg-primary]/90
        pb-[max(env(safe-area-inset-bottom),8px)]
      "
      style={{
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      {/* Top border gradient */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--border-medium), transparent)',
        }}
      />

      <div className="flex items-center justify-around px-1 pt-1.5 pb-1">
        {mainNavItems.map((item) => {
          const isActive = currentPage === item.page
          const Icon = item.icon
          const label = t.nav[item.labelKey]

          return (
            <motion.button
              key={item.page}
              onClick={(e) => handleTap(item.page, item.page, e)}
              whileTap={{ scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`
                relative flex flex-col items-center justify-center gap-0.5
                min-w-[48px] min-h-[44px] rounded-xl px-2 py-1.5
                transition-colors duration-200 overflow-hidden btn-bounce
                ${isActive ? 'text-[--text-primary]' : 'text-[--text-muted] active:text-[--text-secondary]'}
              `}
            >
              {/* Ripple effect */}
              <AnimatePresence>
                {ripples[item.page] && <Ripple x={ripples[item.page].x} y={ripples[item.page].y} />}
              </AnimatePresence>

              {/* Active background glow */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 rounded-xl bg-[--bg-surface-2]"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              {/* Active glowing dot indicator */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-dot"
                  className="absolute -top-0.5 size-1.5 rounded-full bg-indigo-400"
                  style={{ boxShadow: '0 0 6px rgba(99,102,241,0.5)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              <Icon
                className={`size-5 relative z-10 transition-all duration-200 ${
                  isActive ? 'text-indigo-400' : ''
                }`}
                fill={isActive ? 'currentColor' : 'none'}
                fillOpacity={isActive ? 0.2 : 0}
              />

              <span
                className={`text-[10px] font-medium relative z-10 transition-colors duration-200 ${
                  isActive ? 'text-indigo-400' : ''
                }`}
              >
                {label}
              </span>
            </motion.button>
          )
        })}

        {/* More Button */}
        <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
          <SheetTrigger asChild>
            <motion.button
              onClick={(e) => handleTap('files', 'more', e)}
              whileTap={{ scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              aria-label={isRTL ? 'المزيد' : 'More'}
              aria-current={isMoreItemActive ? 'page' : undefined}
              className={`
                relative flex flex-col items-center justify-center gap-0.5
                min-w-[48px] min-h-[44px] rounded-xl px-2 py-1.5
                transition-colors duration-200 overflow-hidden btn-bounce
                ${isMoreItemActive ? 'text-[--text-primary]' : 'text-[--text-muted] active:text-[--text-secondary]'}
              `}
            >
              {/* Ripple effect */}
              <AnimatePresence>
                {ripples['more'] && <Ripple x={ripples['more'].x} y={ripples['more'].y} />}
              </AnimatePresence>

              {isMoreItemActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 rounded-xl bg-[--bg-surface-2]"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              {/* Active glowing dot indicator for More */}
              {isMoreItemActive && (
                <motion.div
                  layoutId="bottom-nav-dot"
                  className="absolute -top-0.5 size-1.5 rounded-full bg-indigo-400"
                  style={{ boxShadow: '0 0 6px rgba(99,102,241,0.5)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              <MoreHorizontal
                className={`size-5 relative z-10 transition-colors duration-200 ${
                  isMoreItemActive ? 'text-indigo-400' : ''
                }`}
              />
              <span
                className={`text-[10px] font-medium relative z-10 transition-colors duration-200 flex items-center gap-0.5 ${
                  isMoreItemActive ? 'text-indigo-400' : ''
                }`}
              >
                {isRTL ? 'المزيد' : 'More'}
                {/* Chevron indicator when a sub-item is active */}
                {isMoreItemActive && (
                  <ChevronUp className="size-2.5 text-indigo-400" />
                )}
              </span>
            </motion.button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="bg-[--bg-surface]/95 border-t border-[--border-subtle] rounded-t-2xl px-0 pt-0 pb-[max(env(safe-area-inset-bottom),16px)]"
            style={{
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            }}
          >
            <SheetTitle className="sr-only">
              {isRTL ? 'المزيد من الخيارات' : 'More options'}
            </SheetTitle>

            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[--border-medium]" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-2 px-5 pt-2 pb-3">
              <div className="flex items-center justify-center size-7 rounded-lg bg-[--bg-surface-2]">
                <MoreHorizontal className="size-4 text-indigo-400" />
              </div>
              <h3 className="text-sm font-semibold text-[--text-primary]">
                {isRTL ? 'المزيد' : 'More'}
              </h3>
            </div>

            {/* Divider */}
            <div className="h-px mx-5 bg-[--border-subtle]" />

            {/* Navigation items - 2 column grid */}
            <div className="grid grid-cols-2 gap-2 px-4 py-3">
              {moreNavItems.map((item) => {
                const isActive = currentPage === item.page
                const Icon = item.icon
                const label = t.nav[item.labelKey as keyof typeof t.nav] || item.labelKey

                return (
                  <motion.button
                    key={item.page}
                    onClick={() => {
                      handleNavClick(item.page)
                      setMoreSheetOpen(false)
                    }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      flex flex-col items-center gap-1.5 rounded-xl px-3 py-3
                      text-xs font-medium transition-all duration-200
                      ${
                        isActive
                          ? 'bg-[--accent-primary]/10 text-[--text-primary] border border-[--accent-primary]/20'
                          : 'text-[--text-muted] hover:bg-[--bg-surface-2] hover:text-[--text-secondary] active:bg-[--bg-surface-2] border border-transparent'
                      }
                    `}
                  >
                    <div className={`
                      flex items-center justify-center size-10 rounded-xl transition-colors duration-200
                      ${isActive ? 'bg-[--accent-primary]/15' : 'bg-[--bg-surface-2]'}
                    `}>
                      <Icon
                        className={`size-5 transition-colors duration-200 ${
                          isActive ? 'text-[--accent-primary]' : ''
                        }`}
                      />
                    </div>
                    <span>{label}</span>
                  </motion.button>
                )
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
