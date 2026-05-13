'use client'

import { useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  ShoppingCart,
  MessageSquare,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Users,
  ChevronsUpDown,
  Wallet,
  UtensilsCrossed,
  Cake,
  Brush,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useSubscriptionStore } from '@/stores/subscription-store'
import { PlanBadge } from '@/components/shared/plan-badge'
import { useI18n } from '@/i18n/use-translation'
import type { AppPage } from '@/types'

interface NavItem {
  page: AppPage
  icon: React.ElementType
  labelKey: keyof typeof import('@/i18n/en').en.nav
}

const navItems: NavItem[] = [
  { page: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { page: 'tasks', icon: CheckSquare, labelKey: 'tasks' },
  { page: 'calendar', icon: CalendarDays, labelKey: 'calendar' },
  { page: 'milestones', icon: Cake, labelKey: 'milestones' },
  { page: 'chores', icon: Brush, labelKey: 'chores' },
  { page: 'grocery', icon: ShoppingCart, labelKey: 'grocery' },
  { page: 'meal-plan', icon: UtensilsCrossed, labelKey: 'mealPlan' },
  { page: 'chat', icon: MessageSquare, labelKey: 'chat' },
  { page: 'files', icon: FolderOpen, labelKey: 'files' },
  { page: 'budget', icon: Wallet, labelKey: 'budget' },
  { page: 'settings', icon: Settings, labelKey: 'settings' },
]

function NavItemButton({
  item,
  isActive,
  collapsed,
  onClick,
}: {
  item: NavItem
  isActive: boolean
  collapsed: boolean
  onClick: () => void
}) {
  const { t } = useI18n()
  const label = t.nav[item.labelKey]
  const Icon = item.icon

  const button = (
    <button
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={`
        group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5
        text-sm font-medium transition-all duration-150
        ${isActive
          ? 'bg-primary/10 text-primary'
          : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-primary/5'
        }
        ${collapsed ? 'justify-center px-2' : ''}
      `}
    >
      {/* Active left border indicator */}
      {isActive && (
        <motion.div
          layoutId="sidebar-active-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-gradient-to-b from-primary to-[#B8860B]"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}

      <Icon
        className={`size-[18px] shrink-0 transition-colors duration-150 ${
          isActive ? 'text-primary' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70'
        }`}
      />

      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="truncate overflow-hidden whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return button
}

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { currentPage, setCurrentPage, currentFamily, families, setCurrentFamily } = useAppStore()
  const { user, logout } = useAuthStore()
  const { plan } = useSubscriptionStore()
  const { t } = useI18n()

  const handleNavClick = useCallback(
    (page: AppPage) => {
      setCurrentPage(page)
      onNavigate?.()
    },
    [setCurrentPage, onNavigate]
  )

  const handleFamilySwitch = useCallback(
    (familyId: string) => {
      const family = families.find((f) => f.id === familyId)
      if (family) setCurrentFamily(family)
    },
    [families, setCurrentFamily]
  )

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

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Logo & Family Selector */}
      <div className={`flex flex-col gap-2 ${collapsed ? 'px-2' : 'px-4'} pt-5 pb-2`}>
        {/* Logo */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} mb-2`}>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#047857]">
            <span className="text-sm font-bold text-primary-foreground">U+</span>
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight whitespace-nowrap">
                  USRA PLUS
                </h1>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Family Selector */}
        {!collapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted">
                <div className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-primary/15 to-[#B8860B]/10">
                  <Users className="size-3.5 text-primary" />
                </div>
                <span className="flex-1 truncate text-sidebar-foreground/70">
                  {currentFamily?.name || t.nav.dashboard}
                </span>
                <ChevronsUpDown className="size-3.5 text-sidebar-foreground/30" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-56"
            >
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                {t.settings.family}
              </DropdownMenuLabel>
              {families.map((family) => (
                <DropdownMenuItem
                  key={family.id}
                  onClick={() => handleFamilySwitch(family.id)}
                  className={currentFamily?.id === family.id ? 'bg-primary/10 text-primary' : ''}
                >
                  <Users className="size-4 mr-2" />
                  {family.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Separator className="mx-3" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-3">
        <nav role="navigation" aria-label="Main navigation" data-tour="sidebar" className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavItemButton
              key={item.page}
              item={item}
              isActive={currentPage === item.page}
              collapsed={collapsed}
              onClick={() => handleNavClick(item.page)}
            />
          ))}
        </nav>
      </ScrollArea>

      <Separator className="mx-3" />

      {/* User Profile */}
      <div className={`p-3 ${collapsed ? 'px-2' : ''}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="User menu"
              className={`
                flex w-full items-center gap-3 rounded-lg px-2.5 py-2
                transition-colors hover:bg-muted
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <Avatar className="size-8 ring-2 ring-sidebar-border">
                <AvatarImage src={user?.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="bg-gradient-to-br from-primary/15 to-[#B8860B]/10 text-primary text-xs font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 overflow-hidden text-left"
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-sidebar-foreground">{displayName}</p>
                      <PlanBadge />
                    </div>
                    <p className="truncate text-xs text-sidebar-foreground/40">{user?.email}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56"
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-foreground">{displayName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleNavClick('settings')}>
              <Settings className="size-4 mr-2" />
              {t.nav.settings}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="size-4 mr-2" />
              {t.auth.logout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export function AppSidebar() {
  const { sidebarCollapsed, sidebarOpen, setSidebarCollapsed, setSidebarOpen, toggleSidebar } = useAppStore()
  const { t } = useI18n()

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        className="hidden md:flex relative h-screen border-r border-sidebar-border bg-sidebar z-30"
        animate={{ width: sidebarCollapsed ? 72 : 256 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <SidebarContent collapsed={sidebarCollapsed} />

        {/* Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-7 z-40 flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-all hover:bg-[#B8860B]/10 hover:text-[#B8860B] hover:border-[#B8860B]/30"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="size-3" />
          ) : (
            <ChevronLeft className="size-3" />
          )}
        </button>
      </motion.aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="w-72 border-r border-sidebar-border bg-sidebar p-0"
        >
          <SheetTitle className="sr-only">{t.app.name}</SheetTitle>
          <SidebarContent
            collapsed={false}
            onNavigate={() => setSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
