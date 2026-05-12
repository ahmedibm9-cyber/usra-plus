'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Menu,
  Search,
  LogOut,
  Settings,
  User,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useNotificationStore } from '@/stores/notification-store'
import { useI18n } from '@/i18n/use-translation'
import type { AppPage } from '@/types'
import { NotificationPanel } from './notification-panel'
import { announce } from '@/lib/live-announcer'

const pageTitles: Record<AppPage, keyof import('@/i18n/en').TranslationKeys['nav']> = {
  dashboard: 'dashboard',
  tasks: 'tasks',
  calendar: 'calendar',
  grocery: 'grocery',
  chat: 'chat',
  files: 'files',
  settings: 'settings',
  milestones: 'milestones',
  chores: 'chores',
  'meal-plan': 'mealPlan',
  budget: 'budget',
}

export function AppHeader() {
  const { currentPage, setSidebarOpen, setCommandPaletteOpen, theme, setTheme } = useAppStore()
  const { user, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const { t, language, setLanguage, isRTL } = useI18n()
  const [isMac] = useState(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.platform.toUpperCase().indexOf('MAC') >= 0
    }
    return false
  })

  const pageTitle = t.nav[pageTitles[currentPage]]

  const userInitials = useMemo(() => {
    if (!user) return 'U'
    const first = user.first_name?.[0] || ''
    const last = user.last_name?.[0] || ''
    return (first + last).toUpperCase() || user.email[0].toUpperCase()
  }, [user])

  const displayName = useMemo(() => {
    if (!user) return ''
    if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`
    return user.first_name || user.email
  }, [user])

  const toggleLanguage = useCallback(() => {
    const newLang = language === 'en' ? 'ar' : 'en'
    setLanguage(newLang)
    announce(`Switched to ${newLang === 'ar' ? 'Arabic' : 'English'}`)
  }, [language, setLanguage])

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    announce(`Switched to ${newTheme} mode`)
  }, [theme, setTheme])

  const kbdSymbol = isMac ? '⌘' : 'Ctrl'

  return (
    <header
      role="banner"
      className="
        sticky top-0 z-40
        flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5
        border-b border-[--border-subtle]
        bg-[--bg-primary]/70
        transition-colors duration-200
      "
      style={{
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      }}
    >
      {/* Subtle red top accent line — NothingOS signal */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--accent-primary), transparent)',
        }}
      />

      {/* Mobile Menu Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0 text-[--text-muted] hover:text-[--accent-primary] hover:bg-[--bg-surface-2]"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </Button>

      {/* Breadcrumb Page Title */}
      <Breadcrumb className="hidden sm:flex">
        <BreadcrumbList className="text-sm">
          <BreadcrumbItem>
            <span
              className="text-[--text-muted] font-medium text-xs tracking-widest uppercase font-display"
            >
              USRA
            </span>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-[--text-muted]">
            <ChevronRight className="size-3" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage
              className="text-[--text-primary] font-semibold font-display"
            >
              {pageTitle}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Mobile-only simple page title */}
      <h2
        className="sm:hidden text-base font-semibold text-[--text-primary] shrink-0 truncate font-display"
      >
        {pageTitle}
      </h2>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search - Opens Command Palette */}
      <div data-tour="header-search" className="relative flex items-center">
        {/* Desktop Search Bar (clickable trigger for command palette) */}
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="
            hidden md:flex items-center relative w-56 lg:w-64 h-9
            bg-[--bg-surface-2]/50 border border-[--border-subtle]
            rounded-lg hover:border-[--border-medium]
            focus:border-[--accent-primary]/40 focus:ring-1 focus:ring-[--accent-primary]/20
            transition-all duration-200
          "
          aria-label="Open search"
        >
          <Search className="absolute left-3 size-3.5 text-[--text-muted] pointer-events-none" />
          <span
            className="pl-8 pr-14 text-xs text-[--text-muted] truncate font-display"
          >
            {t.nav.search}
          </span>
          <kbd
            className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-[--text-muted] bg-[--bg-surface-2]/50 border border-[--border-subtle] rounded pointer-events-none font-display shadow-sm"
          >
            <span className="text-[10px] font-semibold">{kbdSymbol}</span>
            <span className="font-semibold">K</span>
          </kbd>
        </button>

        {/* Mobile Search Button (opens command palette) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0 text-[--text-muted] hover:text-[--accent-primary] hover:bg-[--bg-surface-2]"
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Open search"
            >
              <Search className="size-5" />
            </Button>
          </TooltipTrigger>
        </Tooltip>
      </div>

      {/* Theme Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-[--text-muted] hover:text-[--accent-primary] hover:bg-[--bg-surface-2]"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-[--bg-surface-2] border-[--border-subtle] text-[--text-secondary] text-xs">
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </TooltipContent>
      </Tooltip>

      {/* Language Switcher - Flag on mobile, full on desktop */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            data-tour="language-switch"
            variant="ghost"
            size="icon"
            className="shrink-0 text-[--text-muted] hover:text-[--accent-primary] hover:bg-[--bg-surface-2]"
            onClick={toggleLanguage}
            aria-label="Switch language"
          >
            <span className="text-base leading-none">{language === 'en' ? '🇬🇧' : '🇸🇦'}</span>
            <span className="sr-only">
              {language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-[--bg-surface-2] border-[--border-subtle] text-[--text-secondary] text-xs">
          {language === 'en' ? 'العربية' : 'English'}
        </TooltipContent>
      </Tooltip>

      {/* Notification Bell with Count Badge */}
      <div data-tour="header-notifications">
        <NotificationPanel />
      </div>

      {/* User Avatar Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="shrink-0 rounded-full ring-2 ring-[--border-subtle] hover:ring-[--accent-primary]/50 focus-visible:ring-[--accent-primary]/60 transition-all duration-200 hover:shadow-md hover:shadow-[--accent-primary]/10"
            aria-label="User menu"
          >
            <Avatar className="size-8">
              <AvatarImage src={user?.avatar_url || undefined} alt={displayName} />
              <AvatarFallback className="bg-[--accent-primary]/20 text-[--accent-primary] text-xs font-semibold font-display">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 bg-[--bg-surface]/95 border-[--border-subtle] text-[--text-secondary] shadow-xl backdrop-blur-xl"
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-[--text-primary] font-display">{displayName}</p>
              <p className="text-xs text-[--text-muted]">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[--border-subtle]" />
          <DropdownMenuItem className="focus:bg-[--bg-surface-2] focus:text-[--text-primary]">
            <User className="size-4 mr-2" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            className="focus:bg-[--bg-surface-2] focus:text-[--text-primary]"
            onClick={() => useAppStore.getState().setCurrentPage('settings')}
          >
            <Settings className="size-4 mr-2" />
            {t.nav.settings}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[--border-subtle]" />
          <DropdownMenuItem
            onClick={logout}
            className="text-[--accent-primary] focus:text-[--accent-primary] focus:bg-[--accent-primary]/10"
          >
            <LogOut className="size-4 mr-2" />
            {t.auth.logout}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
