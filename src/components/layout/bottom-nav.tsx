'use client'

import { useCallback, useState, type ElementType } from 'react'
import {
  Drawer,
  IconButton,
  Box,
  Typography,
  Paper,
  ButtonBase,
  Divider,
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
  const { currentPage, setCurrentPage } = useAppStore()
  const { t, isRTL } = useI18n()
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false)

  const handleNavClick = useCallback(
    (page: AppPage) => {
      setCurrentPage(page)
    },
    [setCurrentPage]
  )

  const isMoreItemActive = moreNavItems.some((item) => item.page === currentPage)

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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', px: 0.5, pt: 1, pb: 0.5, width: '100%' }}>
          {mainNavItems.map((item) => {
            const isActive = currentPage === item.page
            const Icon = item.icon
            const label = t.nav[item.labelKey]

            return (
              <ButtonBase
                key={item.page}
                onClick={() => handleNavClick(item.page)}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.25,
                  minWidth: 56,
                  minHeight: 44,
                  borderRadius: 3,
                  px: 1.5,
                  py: 0.75,
                  position: 'relative',
                  color: isActive ? 'primary.dark' : 'text.secondary',
                  '&:hover': { bgcolor: isActive ? 'transparent' : 'action.hover' },
                  transition: 'color 0.15s',
                }}
              >
                {/* Active Pill Background */}
                {isActive && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 2,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 56,
                      height: 32,
                      borderRadius: 3,
                      bgcolor: 'primary.light',
                      zIndex: 0,
                    }}
                  />
                )}

                <Icon sx={{ fontSize: 20, position: 'relative', zIndex: 1, transition: 'color 0.15s' }} />

                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.625rem',
                    fontWeight: 500,
                    position: 'relative',
                    zIndex: 1,
                    transition: 'color 0.15s',
                    lineHeight: 1,
                  }}
                >
                  {label}
                </Typography>
              </ButtonBase>
            )
          })}

          {/* More Button */}
          <ButtonBase
            onClick={() => setMoreDrawerOpen(true)}
            aria-label={isRTL ? 'المزيد' : 'More'}
            aria-current={isMoreItemActive ? 'page' : undefined}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.25,
              minWidth: 56,
              minHeight: 44,
              borderRadius: 3,
              px: 1.5,
              py: 0.75,
              position: 'relative',
              color: isMoreItemActive ? 'primary.dark' : 'text.secondary',
              '&:hover': { bgcolor: isMoreItemActive ? 'transparent' : 'action.hover' },
              transition: 'color 0.15s',
            }}
          >
            {/* Active Pill for More */}
            {isMoreItemActive && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 2,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 56,
                  height: 32,
                  borderRadius: 3,
                  bgcolor: 'primary.light',
                  zIndex: 0,
                }}
              />
            )}

            <MoreHoriz sx={{ fontSize: 20, position: 'relative', zIndex: 1, transition: 'color 0.15s' }} />

            <Typography
              variant="caption"
              sx={{
                fontSize: '0.625rem',
                fontWeight: 500,
                position: 'relative',
                zIndex: 1,
                transition: 'color 0.15s',
                lineHeight: 1,
              }}
            >
              {isRTL ? 'المزيد' : 'More'}
            </Typography>
          </ButtonBase>
        </Box>
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
              <ButtonBase
                key={item.page}
                onClick={() => {
                  handleNavClick(item.page)
                  setMoreDrawerOpen(false)
                }}
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
                  '&:hover': { bgcolor: isActive ? 'primary.light' : 'action.hover' },
                  transition: 'all 0.15s',
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
              </ButtonBase>
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
