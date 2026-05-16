'use client'

import { useCallback, useState, type ElementType } from 'react'
import {
  BottomNavigation,
  BottomNavigationAction,
  Drawer,
  IconButton,
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  alpha,
  useTheme,
} from '@mui/material'
import {
  Dashboard,
  CheckBox,
  CalendarMonth,
  Chat,
  MoreHoriz,
  AccountBalanceWallet,
  Restaurant,
  Cake,
  Brush,
  FolderOpen,
  Settings,
  ShoppingCart,
} from '@mui/icons-material'
import { useAppStore } from '@/stores/app-store'
import { useCurrentPage } from '@/stores/selectors'
import { useI18n } from '@/i18n/use-translation'
import { MuiLayoutProvider } from './mui-layout-provider'
import type { AppPage } from '@/types'

interface BottomNavItem {
  page: AppPage
  icon: ElementType
  labelKey: 'dashboard' | 'tasks' | 'chat' | 'calendar' | 'budget'
}

const mainNavItems: BottomNavItem[] = [
  { page: 'dashboard', icon: Dashboard, labelKey: 'dashboard' },
  { page: 'tasks', icon: CheckBox, labelKey: 'tasks' },
  { page: 'chat', icon: Chat, labelKey: 'chat' },
  { page: 'calendar', icon: CalendarMonth, labelKey: 'calendar' },
  { page: 'budget', icon: AccountBalanceWallet, labelKey: 'budget' },
]

interface MoreNavItem {
  page: AppPage
  icon: ElementType
  labelKey: 'grocery' | 'files' | 'settings' | 'mealPlan' | 'milestones' | 'chores'
}

const moreNavItems: MoreNavItem[] = [
  { page: 'milestones', icon: Cake, labelKey: 'milestones' },
  { page: 'chores', icon: Brush, labelKey: 'chores' },
  { page: 'grocery', icon: ShoppingCart, labelKey: 'grocery' },
  { page: 'meal-plan', icon: Restaurant, labelKey: 'mealPlan' },
  { page: 'files', icon: FolderOpen, labelKey: 'files' },
  { page: 'settings', icon: Settings, labelKey: 'settings' },
]

function BottomNavInner() {
  const theme = useTheme()
  const currentPage = useCurrentPage()
  const setCurrentPage = useAppStore((state) => state.setCurrentPage)
  const { t, isRTL } = useI18n()
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false)

  const handleNavClick = useCallback(
    (page: AppPage) => {
      setCurrentPage(page)
    },
    [setCurrentPage]
  )

  const isMoreItemActive = moreNavItems.some((item) => item.page === currentPage)

  // Determine the "value" for BottomNavigation — use index of matching mainNavItems,
  // or -1 if current page is in "more" list (then we show the More tab as selected)
  const currentValue = mainNavItems.findIndex((item) => item.page === currentPage)
  // If it's a "more" item, value = mainNavItems.length (the More tab)
  const bottomNavValue = isMoreItemActive ? mainNavItems.length : currentValue

  return (
    <>
      <Paper
        component="nav"
        aria-label="Mobile navigation"
        elevation={0}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1300,
          display: { xs: 'flex', md: 'none' },
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          pb: 'max(env(safe-area-inset-bottom), 8px)',
        }}
      >
        <BottomNavigation
          value={bottomNavValue >= 0 ? bottomNavValue : 0}
          onChange={(_event, newValue: number) => {
            if (newValue === mainNavItems.length) {
              setMoreDrawerOpen(true)
            } else if (mainNavItems[newValue]) {
              handleNavClick(mainNavItems[newValue].page)
            }
          }}
          showLabels
          sx={{
            width: '100%',
            bgcolor: 'transparent',
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              maxWidth: 'none',
              py: 0.5,
              color: 'text.secondary',
              transition: 'color 0.15s',
              '&.Mui-selected': {
                color: 'primary.dark',
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.5625rem',
                '&.Mui-selected': {
                  fontSize: '0.5625rem',
                },
              },
            },
          }}
        >
          {mainNavItems.map((item) => {
            const Icon = item.icon
            const label = t.nav[item.labelKey]
            return (
              <BottomNavigationAction
                key={item.page}
                icon={<Icon sx={{ fontSize: 20 }} />}
                label={label}
                aria-label={label}
              />
            )
          })}
          {/* More tab */}
          <BottomNavigationAction
            icon={<MoreHoriz sx={{ fontSize: 20 }} />}
            label={isRTL ? 'المزيد' : 'More'}
            aria-label={isRTL ? 'المزيد' : 'More'}
          />
        </BottomNavigation>
      </Paper>

      {/* More Menu Drawer */}
      <Drawer
        anchor="bottom"
        open={moreDrawerOpen}
        onClose={() => setMoreDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              bgcolor: 'background.paper',
              backgroundImage: 'none',
              borderTop: '1px solid',
              borderColor: 'divider',
              pb: 'max(env(safe-area-inset-bottom), 16px)',
            },
          },
        }}
      >
        {/* Screen reader title */}
        <Box sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          {isRTL ? 'المزيد من الخيارات' : 'More options'}
        </Box>

        {/* Drag handle */}
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5, pb: 0.5 }}>
          <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'action.selected' }} />
        </Box>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2.5, pt: 1.5, pb: 1.5 }}>
          <Box sx={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, bgcolor: 'primary.light' }}>
            <MoreHoriz sx={{ fontSize: 14, color: 'primary.dark' }} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {isRTL ? 'المزيد' : 'More'}
          </Typography>
        </Box>

        <Divider />

        {/* Navigation items - 2 column grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, px: 2, py: 1.5, maxWidth: '100%', overflow: 'hidden' }}>
          {moreNavItems.map((item) => {
            const isActive = currentPage === item.page
            const Icon = item.icon
            const label = (t.nav as Record<string, string>)[item.labelKey] || item.labelKey

            return (
              <Paper
                key={item.page}
                component="button"
                elevation={0}
                onClick={() => {
                  handleNavClick(item.page)
                  setMoreDrawerOpen(false)
                }}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.75,
                  borderRadius: 3,
                  px: 1.5,
                  py: 1.5,
                  fontSize: '0.6875rem',
                  fontWeight: 500,
                  color: isActive ? 'primary.dark' : 'text.secondary',
                  bgcolor: isActive ? 'primary.light' : 'transparent',
                  border: '1px solid',
                  borderColor: isActive ? alpha(theme.palette.primary.main, 0.15) : 'transparent',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: isActive ? 'primary.light' : 'action.hover' },
                  transition: 'all 0.15s',
                  textAlign: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 3,
                    bgcolor: isActive ? 'primary.main' : 'action.hover',
                    color: isActive ? 'primary.contrastText' : 'text.secondary',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon sx={{ fontSize: 20 }} />
                </Box>
                <Typography variant="caption" sx={{ fontSize: '0.6875rem', fontWeight: 500, color: 'inherit' }}>
                  {label}
                </Typography>
              </Paper>
            )
          })}
        </Box>
      </Drawer>
    </>
  )
}

export function BottomNav() {
  return (
    <MuiLayoutProvider>
      <BottomNavInner />
    </MuiLayoutProvider>
  )
}
