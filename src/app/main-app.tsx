'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient, isDemoMode, isDemoUserId } from '@/lib/supabase/client'
import { seedDemoData } from '@/lib/seed-demo-data'
import { useAuthStore } from '@/stores/auth-store'
import { useAppStore } from '@/stores/app-store'
import {
  useCurrentPage, useCurrentFamily, useShowOnboarding,
  useDemoDataReady, useSidebarCollapsed, useCurrentUser,
} from '@/stores/selectors'
import { useI18n } from '@/i18n/use-translation'
import { HexLogo } from '@/components/shared/hex-logo'
import { ChunkLoader } from '@/components/shared/chunk-loader'
import { keyframes } from '@mui/system'
import { alpha } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import LinearProgress from '@mui/material/LinearProgress'
import type { AppPage } from '@/types'

const AppSidebar = dynamic(() => import('@/components/layout/app-sidebar').then(m => ({ default: m.AppSidebar })), { ssr: false })
const AppHeader = dynamic(() => import('@/components/layout/app-header').then(m => ({ default: m.AppHeader })), { ssr: false })
const BottomNav = dynamic(() => import('@/components/layout/bottom-nav').then(m => ({ default: m.BottomNav })), { ssr: false })

const DashboardPage = dynamic(() => import('@/components/dashboard/dashboard-page'), { ssr: false, loading: () => <ChunkLoader /> })
const TasksPage = dynamic(() => import('@/components/tasks/tasks-page'), { ssr: false, loading: () => <ChunkLoader /> })
const CalendarPage = dynamic(() => import('@/components/calendar/calendar-page'), { ssr: false, loading: () => <ChunkLoader /> })
const GroceryPage = dynamic(() => import('@/components/grocery/grocery-page').then(m => ({ default: m.GroceryPage })), { ssr: false, loading: () => <ChunkLoader /> })
const ChatPage = dynamic(() => import('@/components/chat/chat-page').then(m => ({ default: m.ChatPage })), { ssr: false, loading: () => <ChunkLoader /> })
const FilesPage = dynamic(() => import('@/components/files/files-page').then(m => ({ default: m.FilesPage })), { ssr: false, loading: () => <ChunkLoader /> })
const SettingsPage = dynamic(() => import('@/components/settings/settings-page'), { ssr: false, loading: () => <ChunkLoader /> })
const BudgetPage = dynamic(() => import('@/components/budget/budget-page'), { ssr: false, loading: () => <ChunkLoader /> })
const MealPlanPage = dynamic(() => import('@/components/meal-plan/meal-plan-page'), { ssr: false, loading: () => <ChunkLoader /> })
const MilestonesPage = dynamic(() => import('@/components/milestones/milestones-page'), { ssr: false, loading: () => <ChunkLoader /> })
const ChoresPage = dynamic(() => import('@/components/chores/chores-page'), { ssr: false, loading: () => <ChunkLoader /> })
const OnboardingFlow = dynamic(() => import('@/components/onboarding/onboarding-flow').then(m => ({ default: m.OnboardingFlow })), { ssr: false, loading: () => <ChunkLoader /> })

const CommandPalette = dynamic(() => import('@/components/shared/command-palette').then(m => ({ default: m.CommandPalette })), { ssr: false })
const GuidedTour = dynamic(() => import('@/components/shared/guided-tour').then(m => ({ default: m.GuidedTour })), { ssr: false })
const PageWrapper = dynamic(() => import('@/components/shared/page-wrapper').then(m => ({ default: m.PageWrapper })), { ssr: false })
const CookieConsentBanner = dynamic(() => import('@/components/shared/cookie-consent').then(m => ({ default: m.CookieConsent })), { ssr: false })

const logoReveal = keyframes`
  0% { opacity: 0; transform: scale(0.8) rotate(-10deg); }
  50% { transform: scale(1.05) rotate(2deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
`

const PAGE_ORDER: AppPage[] = ['dashboard', 'tasks', 'calendar', 'milestones', 'chores', 'grocery', 'meal-plan', 'budget', 'chat', 'files', 'settings']
const SWIPE_MIN_DISTANCE = 80
const SWIPE_MIN_VELOCITY = 0.3

function safeCreateClient() {
  try {
    return createClient()
  } catch (err) {
    console.error('[USRA PLUS] Failed to create Supabase client:', err)
    return null
  }
}

export function MainApp() {
  const currentPage = useCurrentPage()
  const currentFamily = useCurrentFamily()
  const showOnboarding = useShowOnboarding()
  const setCurrentPage = useAppStore((state) => state.setCurrentPage)
  const demoDataReady = useDemoDataReady()
  const sidebarCollapsed = useSidebarCollapsed()
  const user = useCurrentUser()
  const setUser = useAuthStore((state) => state.setUser)
  const { isRTL } = useI18n()
  const supabase = useMemo(() => safeCreateClient(), [])

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const mainRef = useRef<HTMLElement>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    setSwipeOffset(0)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)
    if (deltaY > Math.abs(deltaX)) { touchStartRef.current = null; setSwipeOffset(0); return }
    setSwipeOffset(Math.max(-60, Math.min(60, deltaX * 0.3)))
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current) return
    const elapsed = Date.now() - touchStartRef.current.time
    const currentIdx = PAGE_ORDER.indexOf(currentPage)
    if (currentIdx === -1) { touchStartRef.current = null; setSwipeOffset(0); return }
    const absOffset = Math.abs(swipeOffset)
    const velocity = elapsed > 0 ? absOffset / elapsed : 0
    if (absOffset > SWIPE_MIN_DISTANCE * 0.3 || velocity > SWIPE_MIN_VELOCITY) {
      if (swipeOffset < -15 && currentIdx < PAGE_ORDER.length - 1) setCurrentPage(PAGE_ORDER[currentIdx + 1])
      else if (swipeOffset > 15 && currentIdx > 0) setCurrentPage(PAGE_ORDER[currentIdx - 1])
    }
    touchStartRef.current = null
    setSwipeOffset(0)
  }, [currentPage, swipeOffset, setCurrentPage])

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.id) return
      const isDemoUser = isDemoMode() || isDemoUserId(user.id) || user.email === 'demo@usra.plus'
      if (isDemoUser) { seedDemoData(); return }
      if (!supabase) return
      try {
        const { data: memberships } = await supabase.from('family_members').select('family_id, role, families(*)').eq('user_id', user.id)
        if (memberships && memberships.length > 0) {
          const families = memberships.map((m: { families: unknown }) => m.families).filter(Boolean)
          useAppStore.getState().setFamilies(families)
          if (!currentFamily && families.length > 0) useAppStore.getState().setCurrentFamily(families[0])
          const targetFamily = currentFamily || families[0]
          if (targetFamily) {
            try {
              const { data: members } = await supabase.from('family_members').select('*, profiles(*)').eq('family_id', targetFamily.id)
              if (members) useAppStore.getState().setFamilyMembers(members)
            } catch (err) { console.error('Error fetching family members:', err) }
            try {
              const { fetchFamilyData } = await import('@/lib/supabase/fetch-family-data')
              await fetchFamilyData(supabase, targetFamily.id, user.id)
            } catch (err) { console.warn('[USRA PLUS] Supabase family data fetch failed (demo mode?):', err) }
          }
        } else {
          useAppStore.getState().setShowOnboarding(true)
        }
      } catch (error) { console.error('Error fetching initial data:', error) }
    }
    fetchInitialData()
  }, [user?.id, supabase, currentFamily])

  useEffect(() => {
    if (isDemoMode() || !user?.id || !supabase || !currentFamily) return
    let unsubscribe: (() => void) | undefined
    let cancelled = false
    import('@/lib/supabase/fetch-family-data').then(({ subscribeToRealtimeUpdates }) => {
      if (cancelled) return
      unsubscribe = subscribeToRealtimeUpdates(supabase, currentFamily.id, user.id)
    }).catch(err => console.warn('[USRA PLUS] Realtime subscription failed:', err))
    return () => { cancelled = true; if (unsubscribe) unsubscribe() }
  }, [user?.id, supabase, currentFamily?.id])

  useEffect(() => {
    if (isDemoMode() || !supabase) return
    const { data } = supabase.auth.onAuthStateChange(async (event: string, session: { user?: { id: string; email?: string; user_metadata?: { first_name?: string; last_name?: string; avatar_url?: string | null } } } | null) => {
      try {
        if (event === 'SIGNED_OUT') { useAuthStore.getState().logout(); return }
        if (!session?.user) return
        try {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
          if (profile) { setUser(profile); return }
        } catch { /* profile fetch failed */ }
        setUser({
          id: session.user.id, email: session.user.email || '',
          first_name: session.user.user_metadata?.first_name || '',
          last_name: session.user.user_metadata?.last_name || '',
          avatar_url: session.user.user_metadata?.avatar_url || null,
          language: 'en' as const, theme: 'dark' as const,
          phone: null, country_code: '+966',
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        })
      } catch (error) { console.error('Auth state change error:', error) }
    })
    return () => data?.subscription?.unsubscribe()
  }, [supabase, setUser])

  if (showOnboarding && !currentFamily && demoDataReady) return <OnboardingFlow />

  const pageContent = useMemo(() => {
    switch (currentPage) {
      case 'dashboard': return <PageWrapper><DashboardPage /></PageWrapper>
      case 'tasks': return <PageWrapper><TasksPage /></PageWrapper>
      case 'calendar': return <PageWrapper><CalendarPage /></PageWrapper>
      case 'milestones': return <PageWrapper><MilestonesPage /></PageWrapper>
      case 'chores': return <PageWrapper><ChoresPage /></PageWrapper>
      case 'grocery': return <PageWrapper><GroceryPage /></PageWrapper>
      case 'meal-plan': return <PageWrapper><MealPlanPage /></PageWrapper>
      case 'budget': return <PageWrapper><BudgetPage /></PageWrapper>
      case 'chat': return <PageWrapper><ChatPage /></PageWrapper>
      case 'files': return <PageWrapper><FilesPage /></PageWrapper>
      case 'settings': return <PageWrapper><SettingsPage /></PageWrapper>
      default: return <PageWrapper><DashboardPage /></PageWrapper>
    }
  }, [currentPage])

  return (
    <Stack sx={{ minHeight: '100vh', bgcolor: 'background.default', overflow: 'hidden' }}>
      <Link
        href="#main-content" tabIndex={0}
        sx={(theme) => ({
          position: 'absolute', left: '-9999px', top: 0, zIndex: 9999, px: 3, py: 1.5,
          bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText,
          fontWeight: 600, textDecoration: 'none', borderRadius: '0 0 0.5rem 0',
          '&:focus': { left: 0 },
        })}
      >
        Skip to main content
      </Link>

      {!demoDataReady && (
        <Box sx={{ position: 'fixed', inset: 0, zIndex: 9999, bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
            <Box sx={{ animation: `${logoReveal} 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards` }}>
              <Box sx={(theme) => ({ width: 48, height: 48, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
                <Box sx={{ color: 'primary.main' }}><HexLogo size={32} /></Box>
              </Box>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>USRA PLUS</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Loading demo data…</Typography>
            <Box sx={{ width: 96 }}>
              <LinearProgress sx={{ height: 2, borderRadius: 1, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 1 } }} />
            </Box>
          </Stack>
        </Box>
      )}

      <Box sx={{ position: 'fixed', top: 0, left: isRTL ? 'auto' : 0, right: isRTL ? 0 : 'auto', height: '100vh', zIndex: 30, display: { xs: 'none', md: 'block' } }}>
        <AppSidebar />
      </Box>

      <Stack sx={{ flex: 1, minHeight: '100vh', overflow: 'hidden', marginLeft: isRTL ? 0 : { md: sidebarCollapsed ? 72 : 256 }, marginRight: isRTL ? { md: sidebarCollapsed ? 72 : 256 } : 0, transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <AppHeader />
        <Box component="main" id="main-content" ref={mainRef} role="main"
          sx={{ flex: 1, overflowY: 'auto', position: 'relative' }}
          onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        >
          {swipeOffset !== 0 && (
            <>
              <Box sx={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 0.5, zIndex: 40, display: { xs: 'block', md: 'none' }, bgcolor: 'primary.main', opacity: swipeOffset > 10 ? Math.min(1, (swipeOffset - 10) / 30) : 0, transition: 'opacity 0.15s' }} />
              <Box sx={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 0.5, zIndex: 40, display: { xs: 'block', md: 'none' }, bgcolor: 'primary.main', opacity: swipeOffset < -10 ? Math.min(1, (-swipeOffset - 10) / 30) : 0, transition: 'opacity 0.15s' }} />
            </>
          )}
          <Container maxWidth="xl" sx={{ p: { xs: 2, md: 3 }, pb: { xs: 10, md: 3 }, transition: swipeOffset !== 0 ? 'transform 0.1s ease-out' : undefined, transform: swipeOffset !== 0 ? `translateX(${swipeOffset * 0.5}px)` : undefined, overflowX: 'hidden' }}>
            <Typography variant="h1" component="h1" tabIndex={-1}
              sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}
            >
              {currentPage}
            </Typography>
            {pageContent}
          </Container>
        </Box>
      </Stack>
      <BottomNav />
      <CommandPalette />
      <GuidedTour />
      <CookieConsentBanner />
    </Stack>
  )
}
