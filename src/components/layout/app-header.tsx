'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  Search,
  X,
  LogOut,
  Settings,
  User,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

const pageTitles: Record<AppPage, keyof import('@/i18n/en').en.nav> = {
  dashboard: 'dashboard',
  tasks: 'tasks',
  calendar: 'calendar',
  grocery: 'grocery',
  chat: 'chat',
  files: 'files',
  settings: 'settings',
}

export function AppHeader() {
  const { currentPage, setSidebarOpen } = useAppStore()
  const { user, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const { t, language, setLanguage, isRTL } = useI18n()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isMac] = useState(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.platform.toUpperCase().indexOf('MAC') >= 0
    }
    return false
  })

  // Keyboard shortcut: ⌘K / Ctrl+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
    setLanguage(language === 'en' ? 'ar' : 'en')
  }, [language, setLanguage])

  const kbdSymbol = isMac ? '⌘' : 'Ctrl'

  return (
    <header
      className="
        sticky top-0 z-40
        flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3
        border-b border-white/[0.08]
        backdrop-blur-xl bg-[#0B0B0F]/70
      "
    >
      {/* Mobile Menu Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0 text-gray-400 hover:text-white hover:bg-white/[0.05]"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </Button>

      {/* Breadcrumb Page Title */}
      <Breadcrumb className="hidden sm:flex">
        <BreadcrumbList className="text-sm">
          <BreadcrumbItem>
            <span className="text-gray-500 font-medium text-xs tracking-wide uppercase">
              USRA
            </span>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-gray-600">
            <ChevronRight className="size-3" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage className="text-white font-semibold">
              {pageTitle}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Mobile-only simple page title */}
      <h2 className="sm:hidden text-base font-semibold text-white shrink-0 truncate">
        {pageTitle}
      </h2>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative flex items-center">
        {/* Desktop Search with Keyboard Shortcut */}
        <div className="hidden md:flex items-center relative">
          <Search className="absolute left-3 size-4 text-gray-500 pointer-events-none" />
          <Input
            placeholder={t.nav.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-56 lg:w-64 pl-9 pr-14 h-9 bg-white/[0.05] border-white/[0.08] text-gray-200 placeholder:text-gray-500 rounded-xl focus-visible:border-white/20 focus-visible:ring-white/10"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 bg-white/[0.06] border border-white/[0.08] rounded-md pointer-events-none">
            <span className="text-[10px]">{kbdSymbol}</span>
            <span>K</span>
          </kbd>
        </div>

        {/* Mobile Search Overlay */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 md:hidden flex items-center z-50"
            >
              <Input
                autoFocus
                placeholder={t.nav.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-44 sm:w-56 h-9 bg-white/[0.05] border-white/[0.08] text-gray-200 placeholder:text-gray-500 rounded-xl focus-visible:border-white/20 focus-visible:ring-white/10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 ml-1 text-gray-400 hover:text-white"
                onClick={() => {
                  setSearchOpen(false)
                  setSearchQuery('')
                }}
              >
                <X className="size-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {!searchOpen && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden shrink-0 text-gray-400 hover:text-white hover:bg-white/[0.05]"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
              >
                <Search className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-[#1a1a22] border-white/[0.08] text-gray-300 text-xs">
              {kbdSymbol}K
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Language Switcher - Flag on mobile, full on desktop */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-gray-400 hover:text-white hover:bg-white/[0.05]"
            onClick={toggleLanguage}
            aria-label="Switch language"
          >
            <span className="text-base leading-none">{language === 'en' ? '🇬🇧' : '🇸🇦'}</span>
            <span className="sr-only">
              {language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-[#1a1a22] border-white/[0.08] text-gray-300 text-xs">
          {language === 'en' ? 'العربية' : 'English'}
        </TooltipContent>
      </Tooltip>

      {/* Notification Bell with Count Badge */}
      <NotificationPanel />

      {/* User Avatar Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="shrink-0 rounded-full ring-2 ring-white/10 hover:ring-white/20 transition-all">
            <Avatar className="size-8">
              <AvatarImage src={user?.avatar_url || undefined} alt={displayName} />
              <AvatarFallback className="bg-violet-500/20 text-violet-400 text-xs font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 bg-[#111117] border-white/[0.08] text-gray-200"
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-gray-200">{displayName}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/[0.06]" />
          <DropdownMenuItem className="focus:bg-white/[0.05] focus:text-white">
            <User className="size-4 mr-2" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            className="focus:bg-white/[0.05] focus:text-white"
            onClick={() => useAppStore.getState().setCurrentPage('settings')}
          >
            <Settings className="size-4 mr-2" />
            {t.nav.settings}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/[0.06]" />
          <DropdownMenuItem
            onClick={logout}
            className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
          >
            <LogOut className="size-4 mr-2" />
            {t.auth.logout}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
