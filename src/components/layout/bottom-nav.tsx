'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  ShoppingCart,
  MessageSquare,
  FolderOpen,
  Settings,
  MoreHorizontal,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/stores/app-store'
import { useI18n } from '@/i18n/use-translation'
import type { AppPage } from '@/types'

interface BottomNavItem {
  page: AppPage
  icon: React.ElementType
  labelKey: 'dashboard' | 'tasks' | 'calendar' | 'grocery' | 'chat'
}

const mainNavItems: BottomNavItem[] = [
  { page: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { page: 'tasks', icon: CheckSquare, labelKey: 'tasks' },
  { page: 'calendar', icon: CalendarDays, labelKey: 'calendar' },
  { page: 'grocery', icon: ShoppingCart, labelKey: 'grocery' },
  { page: 'chat', icon: MessageSquare, labelKey: 'chat' },
]

interface MoreNavItem {
  page: AppPage
  icon: React.ElementType
  labelKey: 'files' | 'settings'
}

const moreNavItems: MoreNavItem[] = [
  { page: 'files', icon: FolderOpen, labelKey: 'files' },
  { page: 'settings', icon: Settings, labelKey: 'settings' },
]

export function BottomNav() {
  const { currentPage, setCurrentPage } = useAppStore()
  const { t } = useI18n()

  const handleNavClick = useCallback(
    (page: AppPage) => {
      setCurrentPage(page)
    },
    [setCurrentPage]
  )

  const isMainItemActive = mainNavItems.some((item) => item.page === currentPage)
  const isMoreItemActive = moreNavItems.some((item) => item.page === currentPage)

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-50 md:hidden
        border-t border-white/[0.08]
        backdrop-blur-xl bg-[#0B0B0F]/80
        pb-[env(safe-area-inset-bottom)]
      "
    >
      <div className="flex items-center justify-around px-2 pt-1 pb-1">
        {mainNavItems.map((item) => {
          const isActive = currentPage === item.page
          const Icon = item.icon
          const label = t.nav[item.labelKey]

          return (
            <button
              key={item.page}
              onClick={() => handleNavClick(item.page)}
              className={`
                relative flex flex-col items-center justify-center gap-0.5
                min-w-[48px] min-h-[44px] rounded-xl px-2 py-1.5
                transition-colors duration-200
                ${isActive ? 'text-white' : 'text-gray-500 active:text-gray-300'}
              `}
            >
              {/* Active background glow */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 rounded-xl bg-white/[0.08]"
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
            </button>
          )
        })}

        {/* More Button */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              className={`
                relative flex flex-col items-center justify-center gap-0.5
                min-w-[48px] min-h-[44px] rounded-xl px-2 py-1.5
                transition-colors duration-200
                ${isMoreItemActive ? 'text-white' : 'text-gray-500 active:text-gray-300'}
              `}
            >
              {isMoreItemActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 rounded-xl bg-white/[0.08]"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              <MoreHorizontal
                className={`size-5 relative z-10 transition-colors duration-200 ${
                  isMoreItemActive ? 'text-indigo-400' : ''
                }`}
              />
              <span
                className={`text-[10px] font-medium relative z-10 transition-colors duration-200 ${
                  isMoreItemActive ? 'text-indigo-400' : ''
                }`}
              >
                More
              </span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="bg-[#111117] border-t border-white/[0.08] rounded-t-2xl"
          >
            <SheetTitle className="sr-only">More options</SheetTitle>
            <div className="flex flex-col gap-1 py-2">
              {moreNavItems.map((item) => {
                const isActive = currentPage === item.page
                const Icon = item.icon
                const label = t.nav[item.labelKey]

                return (
                  <button
                    key={item.page}
                    onClick={() => handleNavClick(item.page)}
                    className={`
                      flex items-center gap-3 rounded-xl px-4 py-3
                      text-sm font-medium transition-colors duration-200
                      ${
                        isActive
                          ? 'bg-white/[0.08] text-white'
                          : 'text-gray-400 hover:bg-white/[0.05] hover:text-gray-200'
                      }
                    `}
                  >
                    <Icon
                      className={`size-5 ${
                        isActive ? 'text-indigo-400' : ''
                      }`}
                    />
                    {label}
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
