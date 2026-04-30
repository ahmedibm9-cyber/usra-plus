'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  Search,
  Bell,
  X,
  Globe,
  LogOut,
  Settings,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
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
  const { t, language, setLanguage } = useI18n()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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

  return (
    <header
      className="
        sticky top-0 z-40
        flex items-center gap-3 px-4 py-3
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

      {/* Page Title */}
      <h2 className="text-lg font-semibold text-white shrink-0">{pageTitle}</h2>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative flex items-center">
        {/* Desktop Search */}
        <div className="hidden md:flex items-center relative">
          <Search className="absolute left-3 size-4 text-gray-500 pointer-events-none" />
          <Input
            placeholder={t.nav.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-56 pl-9 h-9 bg-white/[0.05] border-white/[0.08] text-gray-200 placeholder:text-gray-500 rounded-xl focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20"
          />
        </div>

        {/* Mobile Search Toggle */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 md:hidden flex items-center"
            >
              <Input
                autoFocus
                placeholder={t.nav.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-44 h-9 bg-white/[0.05] border-white/[0.08] text-gray-200 placeholder:text-gray-500 rounded-xl focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20"
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
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0 text-gray-400 hover:text-white hover:bg-white/[0.05]"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-5" />
          </Button>
        )}
      </div>

      {/* Language Switcher */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-gray-400 hover:text-white hover:bg-white/[0.05]"
        onClick={toggleLanguage}
        aria-label="Switch language"
      >
        <Globe className="size-5" />
      </Button>

      {/* Notification Bell */}
      <NotificationPanel />

      {/* User Avatar Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="shrink-0 rounded-full ring-2 ring-white/10 hover:ring-white/20 transition-all">
            <Avatar className="size-8">
              <AvatarImage src={user?.avatar_url || undefined} alt={displayName} />
              <AvatarFallback className="bg-indigo-500/20 text-indigo-400 text-xs font-semibold">
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
          <DropdownMenuItem>
            <User className="size-4 mr-2" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
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
