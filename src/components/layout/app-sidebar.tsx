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
  ListSubheader,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Box,
  Typography,
  Tooltip,
  Chip,
  Fab,
  Paper,
  Select,
  SelectChangeEvent,
  alpha,
  useTheme,
} from '@mui/material'
import { Dashboard, CheckBox, CalendarMonth, ShoppingCart, Chat, FolderOpen, Settings, ChevronLeft, ChevronRight, Logout, Group, UnfoldMore, AccountBalanceWallet, Restaurant, Cake, Brush, Add, Lock } from '@mui/icons-material'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useCurrentPage, useCurrentFamily, useSidebarCollapsed, useCurrentUser, useCurrentPlan } from '@/stores/selectors'
import { useI18n } from '@/i18n/use-translation'
import { MuiLayoutProvider } from './mui-layout-provider'
import type { AppPage } from '@/types'

interface NavItem {
  page: AppPage
  icon: ElementType
  labelKey: keyof typeof import('@/i18n/en').en.nav
  section?: string
  pro?: boolean
}

const navItems: NavItem[] = [
  { page: 'dashboard', icon: Dashboard, labelKey: 'dashboard', section: 'main' },
  { page: 'tasks', icon: CheckBox, labelKey: 'tasks', section: 'organize' },
  { page: 'calendar', icon: CalendarMonth, labelKey: 'calendar', section: 'organize' },
  { page: 'milestones', icon: Cake, labelKey: 'milestones', section: 'organize' },
  { page: 'chores', icon: Brush, labelKey: 'chores', section: 'organize' },
  { page: 'grocery', icon: ShoppingCart, labelKey: 'grocery', section: 'plan' },
  { page: 'meal-plan', icon: Restaurant, labelKey: 'mealPlan', section: 'plan', pro: true },
  { page: 'budget', icon: AccountBalanceWallet, labelKey: 'budget', section: 'plan', pro: true },
  { page: 'chat', icon: Chat, labelKey: 'chat', section: 'connect' },
  { page: 'files', icon: FolderOpen, labelKey: 'files', section: 'connect' },
  { page: 'settings', icon: Settings, labelKey: 'settings', section: 'bottom' },
]

const SECTION_LABELS: Record<string, { en: string; ar: string }> = {
  main: { en: 'Home', ar: 'الرئيسية' },
  organize: { en: 'Organize', ar: 'تنظيم' },
  plan: { en: 'Plan', ar: 'تخطيط' },
  connect: { en: 'Connect', ar: 'تواصل' },
  bottom: { en: '', ar: '' },
}

// ─── Plan Badge (MUI Chip) ──────────────────────────────────────

function PlanBadge() {
  const plan = useCurrentPlan()
  const config: Record<string, { label: string; color: 'default' | 'primary' | 'secondary'; variant: 'filled' | 'outlined' }> = {
    free: { label: 'Free', color: 'default', variant: 'outlined' },
    pro: { label: 'Pro', color: 'secondary', variant: 'filled' },
    family_plus: { label: 'Family+', color: 'secondary', variant: 'filled' },
  }
  const { label, color, variant } = config[plan] || config.free
  return <Chip label={label} size="small" color={color} variant={variant} sx={{ height: 18, fontSize: '0.625rem', fontWeight: 700 }} />
}

// ─── Nav Item Button ────────────────────────────────────────────

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
  const theme = useTheme()
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
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            bgcolor: isActive ? 'primary.light' : alpha(theme.palette.primary.main, 0.04),
            '& .MuiListItemIcon-root .MuiSvgIcon-root': {
              transform: 'scale(1.1)',
            },
          },
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
            '& .MuiSvgIcon-root': { fontSize: 18, transition: 'transform 0.2s ease' },
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
            style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                },
              }}
            />
            {item.pro && !isActive && (
              <Chip
                size="small"
                icon={<Lock sx={{ fontSize: 8 }} />}
                label="PRO"
                variant="outlined"
                sx={{
                  height: 16,
                  fontSize: '0.5rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  ml: 'auto',
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  borderColor: alpha(theme.palette.primary.main, 0.15),
                  color: 'primary.main',
                  '& .MuiChip-icon': { color: 'primary.main' },
                  '& .MuiChip-label': { px: 0.5 },
                }}
              />
            )}
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

// ─── Sidebar Content ────────────────────────────────────────────

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const theme = useTheme()
  const currentPage = useCurrentPage()
  const setCurrentPage = useAppStore((state) => state.setCurrentPage)
  const currentFamily = useCurrentFamily()
  const families = useAppStore((state) => state.families)
  const setCurrentFamily = useAppStore((state) => state.setCurrentFamily)
  const user = useCurrentUser()
  const logout = useAuthStore((state) => state.logout)
  const { t, isRTL } = useI18n()
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

  const groupedNavItems = useMemo(() => {
    const groups: { section: string; items: NavItem[] }[] = []
    let currentSection = ''
    for (const item of navItems) {
      if (item.section !== currentSection) {
        currentSection = item.section || ''
        groups.push({ section: currentSection, items: [item] })
      } else {
        groups[groups.length - 1].items.push(item)
      }
    }
    return groups
  }, [])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.paper',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Subtle gradient accent at top */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 120,
        background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.06)}, transparent)`,
        pointerEvents: 'none',
      }} />

      {/* Logo & Family Selector */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, px: collapsed ? 1.5 : 2, pt: 2.5, pb: 1.5, position: 'relative' }}>
        {/* Logo */}
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: collapsed ? 'center' : 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 1.5,
            mb: 1,
            bgcolor: 'transparent',
          }}
        >
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
              boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.3)}`,
              transition: 'box-shadow 0.3s ease',
              '&:hover': {
                boxShadow: `0 0 28px ${alpha(theme.palette.primary.main, 0.4)}`,
              },
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
        </Paper>

        {/* Family Selector (MUI Select) */}
        {!collapsed && (
          <>
            <Select
              value={currentFamily?.id || ''}
              onChange={(e: SelectChangeEvent) => handleFamilySwitch(e.target.value)}
              size="small"
              displayEmpty
              renderValue={() => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'text.secondary',
                    }}
                  >
                    {currentFamily?.name || t.nav.dashboard}
                  </Typography>
                </Box>
              )}
              sx={{
                borderRadius: 2,
                '& .MuiSelect-select': { py: 0.75, px: 1.5, display: 'flex', alignItems: 'center' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(theme.palette.primary.main, 0.3) },
              }}
            >
              {families.map((family) => (
                <MenuItem
                  key={family.id}
                  value={family.id}
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
            </Select>
          </>
        )}
      </Box>

      <Divider sx={{ mx: 1.5 }} />

      {/* Navigation with section labels (ListSubheader) */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1.5, px: 0.5 }}>
        <nav role="navigation" aria-label="Main navigation" data-tour="sidebar">
          <List
            disablePadding
            subheader={<Box />}
            sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}
          >
            {groupedNavItems.map((group, groupIdx) => (
              <Box key={group.section}>
                {/* Section label using ListSubheader */}
                {!collapsed && group.section && group.section !== 'main' && group.section !== 'bottom' && (
                  <ListSubheader
                    sx={{
                      px: 2,
                      pt: groupIdx > 1 ? 1.5 : 0,
                      pb: 0.5,
                      color: 'text.disabled',
                      fontWeight: 600,
                      fontSize: '0.625rem',
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      bgcolor: 'transparent',
                      lineHeight: 'inherit',
                    }}
                  >
                    {isRTL ? SECTION_LABELS[group.section]?.ar : SECTION_LABELS[group.section]?.en}
                  </ListSubheader>
                )}
                {group.items.map((item) => (
                  <NavItemButton
                    key={item.page}
                    item={item}
                    isActive={currentPage === item.page}
                    collapsed={collapsed}
                    onClick={() => handleNavClick(item.page)}
                  />
                ))}
              </Box>
            ))}
          </List>
        </nav>
      </Box>

      <Divider sx={{ mx: 1.5 }} />

      {/* Quick Add FAB */}
      {!collapsed && (
        <Box sx={{ px: 2, py: 1 }}>
          <Fab
            variant="extended"
            size="medium"
            sx={{ color: 'primary.main' }}
            onClick={() => setCurrentPage('tasks')}
            sx={{
              width: '100%',
              borderRadius: 3,
              justifyContent: 'center',
              gap: 1,
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
              '&:hover': {
                boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
              },
            }}
          >
            <Add sx={{ fontSize: 16 }} />
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>Quick Add</Typography>
          </Fab>
        </Box>
      )}

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
                <PlanBadge />
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

        {/* User menu */}
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

// ─── App Sidebar Inner ──────────────────────────────────────────

function AppSidebarInner() {
  const theme = useTheme()
  const sidebarCollapsed = useSidebarCollapsed()
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
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
          zIndex: (t) => t.zIndex.drawer,
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
