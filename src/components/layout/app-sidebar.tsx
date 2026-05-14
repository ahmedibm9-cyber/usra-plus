'use client'

import { useCallback, useMemo, useState, type ElementType } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Box,
  Typography,
  Tooltip,
  ButtonBase,
} from '@mui/material'
import {
  Dashboard,
  CheckBox,
  CalendarMonth,
  ShoppingCart,
  Chat,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Logout,
  Group,
  UnfoldMore,
  AccountBalanceWallet,
  Restaurant,
  Cake,
  Brush,
} from '@mui/icons-material'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useSubscriptionStore } from '@/stores/subscription-store'
import { useI18n } from '@/i18n/use-translation'
import { MuiLayoutProvider } from './mui-layout-provider'
import type { AppPage } from '@/types'

interface NavItem {
  page: AppPage
  icon: ElementType
  labelKey: keyof typeof import('@/i18n/en').en.nav
}

const navItems: NavItem[] = [
  { page: 'dashboard', icon: Dashboard, labelKey: 'dashboard' },
  { page: 'tasks', icon: CheckBox, labelKey: 'tasks' },
  { page: 'calendar', icon: CalendarMonth, labelKey: 'calendar' },
  { page: 'milestones', icon: Cake, labelKey: 'milestones' },
  { page: 'chores', icon: Brush, labelKey: 'chores' },
  { page: 'grocery', icon: ShoppingCart, labelKey: 'grocery' },
  { page: 'meal-plan', icon: Restaurant, labelKey: 'mealPlan' },
  { page: 'chat', icon: Chat, labelKey: 'chat' },
  { page: 'files', icon: FolderOpen, labelKey: 'files' },
  { page: 'budget', icon: AccountBalanceWallet, labelKey: 'budget' },
  { page: 'settings', icon: Settings, labelKey: 'settings' },
]

function PlanBadgeMUI() {
  const { plan } = useSubscriptionStore()

  const config: Record<string, { label: string; color: string; bgcolor: string }> = {
    free: { label: 'Free', color: 'text.disabled', bgcolor: 'action.hover' },
    pro: { label: 'Pro', color: 'secondary.main', bgcolor: 'secondary.light' },
    family_plus: { label: 'Family+', color: 'secondary.main', bgcolor: 'secondary.light' },
  }

  const { label, color, bgcolor } = config[plan] || config.free

  return (
    <Box
      sx={{
        px: 1,
        py: 0,
        height: 20,
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 1,
        fontSize: '0.625rem',
        fontWeight: 600,
        color,
        bgcolor,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {label}
    </Box>
  )
}

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
  const { t, isRTL: isRTLActive } = useI18n()
  const label = t.nav[item.labelKey]
  const Icon = item.icon

  const button = (
    <ListItem disablePadding sx={{ display: 'block' }}>
      <ListItemButton
        onClick={onClick}
        selected={isActive}
        sx={{
          minHeight: 40,
          justifyContent: collapsed ? 'center' : 'initial',
          px: collapsed ? 1.5 : 2,
          borderRadius: 3,
          mx: 0.5,
          mb: 0.25,
          '&.Mui-selected': {
            bgcolor: 'primary.light',
            color: 'primary.dark',
            '&:hover': { bgcolor: 'primary.light' },
            '& .MuiListItemIcon-root': { color: 'primary.main' },
          },
          '&.Mui-selected::before': isActive && !collapsed ? {
            content: '""',
            position: 'absolute',
            left: isRTLActive ? 'auto' : -4,
            right: isRTLActive ? -4 : 'auto',
            top: '50%',
            transform: 'translateY(-50%)',
            width: 3,
            height: 32,
            borderRadius: isRTLActive ? '4px 0 0 4px' : '0 4px 4px 0',
            bgcolor: 'primary.main',
          } : {},
          position: 'relative',
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: collapsed ? 0 : 36,
            justifyContent: 'center',
            color: isActive ? 'primary.main' : 'text.secondary',
            '& .MuiSvgIcon-root': { fontSize: 18 },
          }}
        >
          <Icon />
        </ListItemIcon>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
          <ListItemText
            primary={label}
            sx={{
              opacity: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              '& .MuiListItemText-primary': {
                fontSize: '0.8125rem',
                fontWeight: isActive ? 600 : 500,
              },
            }}
          />
          </motion.div>
        )}
      </ListItemButton>
    </ListItem>
  )

  if (collapsed) {
    return (
      <Tooltip title={label} placement={isRTLActive ? 'left' : 'right'} arrow>
        {button}
      </Tooltip>
    )
  }

  return button
}

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { currentPage, setCurrentPage, currentFamily, families, setCurrentFamily } = useAppStore()
  const { user, logout } = useAuthStore()
  const { t } = useI18n()
  const [familyMenuAnchor, setFamilyMenuAnchor] = useState<HTMLElement | null>(null)
  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLElement | null>(null)

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
      setFamilyMenuAnchor(null)
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
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      {/* Logo & Family Selector */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, px: collapsed ? 1.5 : 2, pt: 2.5, pb: 1.5 }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: collapsed ? 'center' : 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 1.5, mb: 1 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 3,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              flexShrink: 0,
            }}
          >
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, lineHeight: 1 }}>U+</Typography>
          </Box>
          {!collapsed && (
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                fontSize: '1rem',
              }}
            >
              USRA PLUS
            </Typography>
          )}
        </Box>

        {/* Family Selector */}
        {!collapsed && (
          <>
            <ButtonBase
              onClick={(e) => setFamilyMenuAnchor(e.currentTarget)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                borderRadius: 2,
                px: 1.5,
                py: 0.75,
                textAlign: 'left',
                '&:hover': { bgcolor: 'action.hover' },
                transition: 'background-color 0.15s',
                width: '100%',
              }}
            >
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1.5,
                  bgcolor: 'primary.light',
                }}
              >
                <Group sx={{ fontSize: 12, color: 'primary.dark' }} />
              </Box>
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: 'text.secondary',
                }}
              >
                {currentFamily?.name || t.nav.dashboard}
              </Typography>
              <UnfoldMore sx={{ fontSize: 12, color: 'text.disabled' }} />
            </ButtonBase>

            <Menu
              anchorEl={familyMenuAnchor}
              open={Boolean(familyMenuAnchor)}
              onClose={() => setFamilyMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              slotProps={{
                paper: {
                  sx: {
                    width: 224,
                    mt: 0.5,
                    borderRadius: 3,
                    bgcolor: 'background.paper',
                    backgroundImage: 'none',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                    border: '1px solid',
                    borderColor: 'divider',
                    overflow: 'hidden',
                  },
                },
              }}
            >
              <Typography variant="caption" sx={{ px: 2, py: 0.75, display: 'block', color: 'text.disabled', fontWeight: 600 }}>
                {t.settings.family}
              </Typography>
              {families.map((family) => (
                <MenuItem
                  key={family.id}
                  onClick={() => handleFamilySwitch(family.id)}
                  selected={currentFamily?.id === family.id}
                  sx={{
                    borderRadius: 1.5,
                    mx: 0.5,
                    '&.Mui-selected': {
                      bgcolor: 'primary.light',
                      color: 'primary.dark',
                      '&:hover': { bgcolor: 'primary.light' },
                    },
                  }}
                >
                  <Group sx={{ fontSize: 16, ml: isRTL ? 1.5 : 0, mr: isRTL ? 0 : 1.5, color: 'inherit' }} />
                  {family.name}
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
      </Box>

      <Divider sx={{ mx: 1.5 }} />

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1.5, px: 0.5 }}>
        <nav role="navigation" aria-label="Main navigation" data-tour="sidebar">
          <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            {navItems.map((item) => (
              <NavItemButton
                key={item.page}
                item={item}
                isActive={currentPage === item.page}
                collapsed={collapsed}
                onClick={() => handleNavClick(item.page)}
              />
            ))}
          </List>
        </nav>
      </Box>

      <Divider sx={{ mx: 1.5 }} />

      {/* User Profile */}
      <Box sx={{ p: 1.5 }}>
        <Box
          onClick={(e) => setUserMenuAnchor(e.currentTarget)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            borderRadius: 3,
            px: 1.5,
            py: 1,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
            transition: 'background-color 0.15s',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          <Avatar
            src={user?.avatar_url || undefined}
            alt={displayName}
            sx={{
              width: 32,
              height: 32,
              fontSize: '0.6875rem',
              fontWeight: 600,
              bgcolor: 'primary.light',
              color: 'primary.dark',
              border: '2px solid',
              borderColor: 'divider',
            }}
          >
            {userInitials}
          </Avatar>
          {!collapsed && (
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: 'text.primary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '0.8125rem',
                  }}
                >
                  {displayName}
                </Typography>
                <PlanBadgeMUI />
              </Box>
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {user?.email}
              </Typography>
            </Box>
          )}
        </Box>

        {/* User Menu */}
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={() => setUserMenuAnchor(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          slotProps={{
            paper: {
              sx: {
                width: 224,
                mb: 1,
                borderRadius: 3,
                bgcolor: 'background.paper',
                backgroundImage: 'none',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
              },
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
              {displayName}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {user?.email}
            </Typography>
          </Box>
          <Divider />
          <MenuItem
            onClick={() => { handleNavClick('settings'); setUserMenuAnchor(null) }}
            sx={{ borderRadius: 1.5, mx: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
          >
            <Settings sx={{ fontSize: 16, ml: isRTL ? 1.5 : 0, mr: isRTL ? 0 : 1.5, color: 'text.secondary' }} />
            {t.nav.settings}
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => { logout(); setUserMenuAnchor(null) }}
            sx={{ borderRadius: 1.5, mx: 0.5, color: 'error.main', '&:hover': { bgcolor: 'error.light' } }}
          >
            <Logout sx={{ fontSize: 16, ml: isRTL ? 1.5 : 0, mr: isRTL ? 0 : 1.5 }} />
            {t.auth.logout}
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  )
}

function AppSidebarInner() {
  const { sidebarCollapsed, sidebarOpen, setSidebarOpen, toggleSidebar } = useAppStore()
  const { t, isRTL } = useI18n()

  const drawerWidth = sidebarCollapsed ? 72 : 256

  return (
    <>
      {/* Desktop Sidebar — FIXED position */}
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          position: 'fixed',
          left: isRTL ? 'auto' : 0,
          right: isRTL ? 0 : 'auto',
          top: 0,
          bottom: 0,
          width: drawerWidth,
          borderRight: isRTL ? 'none' : '1px solid',
          borderLeft: isRTL ? '1px solid' : 'none',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          zIndex: (theme) => theme.zIndex.drawer,
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
        }}
      >
        <SidebarContent collapsed={sidebarCollapsed} />

        {/* Collapse Toggle */}
        <IconButton
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          sx={{
            position: 'absolute',
            right: isRTL ? 'auto' : -13,
            left: isRTL ? -13 : 'auto',
            top: 28,
            width: 26,
            height: 26,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.08)',
            zIndex: 1300,
            '&:hover': {
              bgcolor: 'primary.light',
              color: 'primary.dark',
              borderColor: 'primary.main',
            },
            transition: 'all 0.2s',
          }}
        >
          {(sidebarCollapsed && !isRTL) ? <ChevronRight sx={{ fontSize: 14, transition: 'transform 0.2s' }} /> : (sidebarCollapsed && isRTL) ? <ChevronLeft sx={{ fontSize: 14, transition: 'transform 0.2s' }} /> : (!sidebarCollapsed && !isRTL) ? <ChevronLeft sx={{ fontSize: 14, transition: 'transform 0.2s' }} /> : <ChevronRight sx={{ fontSize: 14, transition: 'transform 0.2s' }} />}
        </IconButton>
      </Box>

      {/* Mobile Sidebar (Drawer) */}
      <Drawer
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        anchor={isRTL ? 'right' : 'left'}
        slotProps={{
          paper: {
            sx: {
              width: 288,
              bgcolor: 'background.paper',
              backgroundImage: 'none',
              borderRight: isRTL ? 'none' : '1px solid',
              borderLeft: isRTL ? '1px solid' : 'none',
              borderColor: 'divider',
            },
          },
        }}
      >
        <Box sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          <Typography variant="caption" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>{t.app?.name || 'USRA PLUS'}</Typography>
        </Box>
        <SidebarContent
          collapsed={false}
          onNavigate={() => setSidebarOpen(false)}
        />
      </Drawer>
    </>
  )
}

export function AppSidebar() {
  return (
    <MuiLayoutProvider>
      <AppSidebarInner />
    </MuiLayoutProvider>
  )
}
