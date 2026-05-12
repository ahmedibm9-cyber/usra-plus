'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  MessageSquare,
  MoreHorizontal,
  Wallet,
  UtensilsCrossed,
  Cake,
  Brush,
  FolderOpen,
  Settings,
  ShoppingCart,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { useAppStore } from '@/stores/app-store'
import { useI18n } from '@/i18n/use-translation'
import type { AppPage } from '@/types'

interface BottomNavItem {
  page: AppPage
  icon: React.ElementType
  labelKey: 'dashboard' | 'tasks' | 'chat' | 'calendar' | 'budget'
}

const mainNavItems: BottomNavItem[] = [
  { page: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { page: 'tasks', icon: CheckSquare, labelKey: 'tasks' },
  { page: 'chat', icon: MessageSquare, labelKey: 'chat' },
  { page: 'calendar', icon: CalendarDays, labelKey: 'calendar' },
  { page: 'budget', icon: Wallet, labelKey: 'budget' },
]

interface MoreNavItem {
  page: AppPage
  icon: React.ElementType
  labelKey: 'grocery' | 'files' | 'settings' | 'mealPlan' | 'milestones' | 'chores'
}

const moreNavItems: MoreNavItem[] = [
  { page: 'milestones', icon: Cake, labelKey: 'milestones' },
  { page: 'chores', icon: Brush, labelKey: 'chores' },
  { page: 'grocery', icon: ShoppingCart, labelKey: 'grocery' },
  { page: 'meal-plan', icon: UtensilsCrossed, labelKey: 'mealPlan' },
  { page: 'files', icon: FolderOpen, labelKey: 'files' },
  { page: 'settings', icon: Settings, labelKey: 'settings' },
]

export function BottomNav() {
  const { currentPage, setCurrentPage } = useAppStore()
  const { t, isRTL } = useI18n()

  const handleNavClick = useCallback(
    (page: AppPage) => {
      setCurrentPage(page)
    },
    [setCurrentPage]
  )

  const isMoreItemActive = moreNavItems.some((item) => item.page === currentPage)

  return (
    <nav
      aria-label="Mobile navigation"
      className="
        fixed bottom-0 left-0 right-0 z-50 md:hidden
        border-t border-border bg-background/80 backdrop-blur-xl
        pb-[max(env(safe-area-inset-bottom),8px)]
        shadow-[0_-1px_3px_rgba(0,0,0,0.05)]
      "
    >
      <div className="flex items-center justify-around px-1 pt-1.5 pb-1">
        {mainNavItems.map((item) => {
          const isActive = currentPage === item.page
          const Icon = item.icon
          const label = t.nav[item.labelKey]

          return (
            <button
              key={item.page}
              onClick={() => handleNavClick(item.page)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`
                relative flex flex-col items-center justify-center gap-0.5
                min-w-[48px] min-h-[44px] rounded-lg px-2 py-1.5
                transition-colors duration-150
                ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground active:text-foreground'}
              `}
            >
              {/* Active indicator — small emerald line above icon */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              <Icon
                className={`size-5 relative z-10 transition-colors duration-150 ${
                  isActive ? 'text-primary' : ''
                }`}
                fill={isActive ? 'currentColor' : 'none'}
                fillOpacity={isActive ? 0.15 : 0}
              />

              <span
                className={`text-[10px] font-medium relative z-10 transition-colors duration-150 ${
                  isActive ? 'text-primary' : ''
                }`}
              >
                {label}
              </span>
            </button>
          )
        })}

        {/* More Button */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              onClick={() => {}}
              aria-label={isRTL ? 'المزيد' : 'More'}
              aria-current={isMoreItemActive ? 'page' : undefined}
              className={`
                relative flex flex-col items-center justify-center gap-0.5
                min-w-[48px] min-h-[44px] rounded-lg px-2 py-1.5
                transition-colors duration-150
                ${isMoreItemActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground active:text-foreground'}
              `}
            >
              {/* Active indicator for More */}
              {isMoreItemActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              <MoreHorizontal
                className={`size-5 relative z-10 transition-colors duration-150 ${
                  isMoreItemActive ? 'text-primary' : ''
                }`}
              />
              <span
                className={`text-[10px] font-medium relative z-10 transition-colors duration-150 ${
                  isMoreItemActive ? 'text-primary' : ''
                }`}
              >
                {isRTL ? 'المزيد' : 'More'}
              </span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="bg-card border-t border-border rounded-t-2xl px-0 pt-0 pb-[max(env(safe-area-inset-bottom),16px)]"
          >
            <SheetTitle className="sr-only">
              {isRTL ? 'المزيد من الخيارات' : 'More options'}
            </SheetTitle>

            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-2 px-5 pt-2 pb-3">
              <div className="flex items-center justify-center size-7 rounded-lg bg-primary/10">
                <MoreHorizontal className="size-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                {isRTL ? 'المزيد' : 'More'}
              </h3>
            </div>

            {/* Divider */}
            <div className="h-px mx-5 bg-border" />

            {/* Navigation items - 2 column grid */}
            <div className="grid grid-cols-2 gap-2 px-4 py-3">
              {moreNavItems.map((item) => {
                const isActive = currentPage === item.page
                const Icon = item.icon
                const label = t.nav[item.labelKey as keyof typeof t.nav] || item.labelKey

                return (
                  <button
                    key={item.page}
                    onClick={() => handleNavClick(item.page)}
                    className={`
                      flex flex-col items-center gap-1.5 rounded-xl px-3 py-3
                      text-xs font-medium transition-all duration-150
                      ${
                        isActive
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted border border-transparent'
                      }
                    `}
                  >
                    <div className={`
                      flex items-center justify-center size-10 rounded-xl transition-colors duration-150
                      ${isActive ? 'bg-primary/15' : 'bg-muted'}
                    `}>
                      <Icon
                        className={`size-5 transition-colors duration-150 ${
                          isActive ? 'text-primary' : ''
                        }`}
                      />
                    </div>
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
