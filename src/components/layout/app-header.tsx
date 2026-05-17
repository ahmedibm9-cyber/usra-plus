'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  TextField,
  InputAdornment,
  Divider,
  Box,
  Breadcrumbs,
  Chip,
  alpha,
  useTheme,
} from '@mui/material'
import { Menu as MenuIcon, Search, Logout, Settings, Person, ChevronRight, LightMode, DarkMode } from '@mui/icons-material'
import { keyframes } from '@mui/system'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useCurrentPage, useIsDarkMode, useCurrentUser } from '@/stores/selectors'
import { useI18n } from '@/i18n/use-translation'
import { MuiLayoutProvider } from './mui-layout-provider'
import { NotificationPanel } from './notification-panel'
import type { AppPage } from '@/types'

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

function AppHeaderInner() {
  const theme = useTheme()
  const currentPage = useCurrentPage()
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)
  const setCommandPaletteOpen = useAppStore((state) => state.setCommandPaletteOpen)
  const isDark = useIsDarkMode()
  const setTheme = useAppStore((state) => state.setTheme)
  const user = useCurrentUser()
  const logout = useAuthStore((state) => state.logout)
  const { t, language, setLanguage, isRTL } = useI18n()
  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLElement | null>(null)

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
  }, [language, setLanguage])

  const toggleTheme = useCallback(() => {
    const newTheme = isDark ? 'light' : 'dark'
    setTheme(newTheme)
  }, [isDark, setTheme])

  const kbdSymbol = isMac ? '⌘' : 'Ctrl'

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        top: 0,
        zIndex: (t) => t.zIndex.drawer + 1,
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
        backdropFilter: 'blur(20px)',
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.main, 0.3)}, ${alpha(theme.palette.secondary.light, 0.2)}, transparent)`,
          pointerEvents: 'none',
        },
      }}
    >
      <Toolbar sx={{ gap: 1.5, minHeight: { xs: 52, sm: 56 }, px: { xs: 1.5, sm: 2 } }}>
        {/* Mobile Menu Toggle */}
        <IconButton
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          sx={{
            display: { md: 'none' },
            color: 'text.secondary',
            '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
            borderRadius: 2,
          }}
        >
          <MenuIcon />
        </IconButton>

        {/* Breadcrumb Page Title */}
        <Breadcrumbs
          separator={<ChevronRight sx={{ fontSize: 12, color: 'text.disabled', transform: isRTL ? 'scaleX(-1)' : 'none' }} />}
          sx={{ display: { xs: 'none', sm: 'flex' }, '& .MuiBreadcrumbs-ol': { alignItems: 'center' } }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              fontSize: '0.6875rem',
            }}
          >
            USRA
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {pageTitle}
          </Typography>
        </Breadcrumbs>

        {/* Mobile-only simple page title */}
        <Typography
          variant="body1"
          sx={{
            display: { sm: 'none' },
            fontWeight: 600,
            color: 'text.primary',
            flexShrink: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {pageTitle}
        </Typography>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Search - Opens Command Palette (MUI TextField) */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }} data-tour="header-search">
          <TextField
            readOnly
            placeholder={t.nav.search}
            variant="outlined"
            size="small"
            onClick={() => setCommandPaletteOpen(true)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 14, color: 'text.disabled' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Chip
                    label={
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                        <span style={{ fontWeight: 700 }}>{kbdSymbol}</span>
                        <span style={{ fontWeight: 700 }}>K</span>
                      </Box>
                    }
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.625rem',
                      fontWeight: 500,
                      color: 'text.disabled',
                      bgcolor: 'action.selected',
                      border: '1px solid',
                      borderColor: 'divider',
                      '& .MuiChip-label': { px: 0.5 },
                    }}
                  />
                </InputAdornment>
              ),
              sx: {
                cursor: 'pointer',
                pl: 0.5,
                pr: 0.5,
                fontSize: '0.75rem',
                color: 'text.disabled',
                width: { lg: 256, md: 224 },
                '& input': { cursor: 'pointer', p: 0 },
                '&.MuiOutlinedInput-root': {
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                    },
                  },
                  '&.Mui-focused': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main,
                      boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.08)}`,
                    },
                  },
                },
              },
            }}
            inputProps={{ 'aria-label': 'Open search' }}
            sx={{
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'divider',
              },
            }}
          />
        </Box>

        {/* Mobile Search Button */}
        <Tooltip title={t.nav.search}>
          <IconButton
            onClick={() => setCommandPaletteOpen(true)}
            aria-label="Open search"
            sx={{
              display: { md: 'none' },
              color: 'text.secondary',
              '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
              borderRadius: 2,
            }}
          >
            <Search sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>

        {/* Theme Toggle */}
        <Tooltip title={isDark ? 'Light mode' : 'Dark mode'}>
          <IconButton
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            sx={{
              color: 'text.secondary',
              '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
              borderRadius: 2,
              transition: 'all 0.2s',
            }}
          >
            {isDark ? <LightMode sx={{ fontSize: 18 }} /> : <DarkMode sx={{ fontSize: 18 }} />}
          </IconButton>
        </Tooltip>

        {/* Language Switcher */}
        <Tooltip title={language === 'en' ? 'العربية' : 'English'}>
          <IconButton
            data-tour="language-switch"
            onClick={toggleLanguage}
            aria-label="Switch language"
            sx={{
              color: 'text.secondary',
              '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
              borderRadius: 2,
              fontSize: '1rem',
            }}
          >
            {language === 'en' ? '🇬🇧' : '🇸🇦'}
          </IconButton>
        </Tooltip>

        {/* Notification Bell */}
        <Box data-tour="header-notifications">
          <NotificationPanel />
        </Box>

        {/* User Avatar Dropdown */}
        <IconButton
          onClick={(e) => setUserMenuAnchor(e.currentTarget)}
          aria-label="User menu"
          sx={{
            p: 0,
            borderRadius: '50%',
            border: '2px solid',
            borderColor: 'divider',
            '&:hover': { borderColor: 'primary.main' },
            transition: 'border-color 0.2s',
          }}
        >
          <Avatar
            src={user?.avatar_url || undefined}
            alt={displayName}
            sx={{
              width: 36,
              height: 36,
              fontSize: '0.75rem',
              fontWeight: 600,
              bgcolor: 'primary.light',
              color: 'primary.dark',
            }}
          >
            {userInitials}
          </Avatar>
        </IconButton>

        {/* User Dropdown Menu */}
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={() => setUserMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{
            paper: {
              sx: {
                width: 224,
                mt: 1,
                borderRadius: 3,
                bgcolor: 'background.paper',
                backgroundImage: 'none',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
                '& .MuiList-root': { py: 0.5 },
              },
            },
          }}
        >
          {/* User Info */}
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
            sx={{
              borderRadius: 1.5,
              mx: 0.5,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Person sx={{ fontSize: 16, ml: isRTL ? 1.5 : 0, mr: isRTL ? 0 : 1.5, color: 'text.secondary' }} />
            Profile
          </MenuItem>
          <MenuItem
            onClick={() => {
              useAppStore.getState().setCurrentPage('settings')
              setUserMenuAnchor(null)
            }}
            sx={{
              borderRadius: 1.5,
              mx: 0.5,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Settings sx={{ fontSize: 16, ml: isRTL ? 1.5 : 0, mr: isRTL ? 0 : 1.5, color: 'text.secondary' }} />
            {t.nav.settings}
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              logout()
              setUserMenuAnchor(null)
            }}
            sx={{
              borderRadius: 1.5,
              mx: 0.5,
              color: 'error.main',
              '&:hover': { bgcolor: 'error.light' },
            }}
          >
            <Logout sx={{ fontSize: 16, ml: isRTL ? 1.5 : 0, mr: isRTL ? 0 : 1.5 }} />
            {t.auth.logout}
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}

export function AppHeader() {
  return (
    <MuiLayoutProvider>
      <AppHeaderInner />
    </MuiLayoutProvider>
  )
}
