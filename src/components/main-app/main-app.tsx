'use client'

import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { createClient, isDemoUserId, isLocalUserId } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useAppStore } from '@/stores/app-store'
import { useTourStore } from '@/stores/tour-store'
import { useI18n } from '@/i18n/use-translation'
import { seedDemoData } from '@/lib/demo-data'
import { buildUserProfileFromSession } from '@/lib/auth-helpers'
import { Loader2 } from 'lucide-react'
import type { AppPage } from '@/types'

// Layout Components
const AppSidebar = dynamic(() => import('@/components/layout/app-sidebar').then(m => ({ default: m.AppSidebar })), { ssr: false, loading: () => <LayoutLoader /> })
const AppHeader = dynamic(() => import('@/components/layout/app-header').then(m => ({ default: m.AppHeader })), { ssr: false, loading: () => <LayoutLoader /> })
const BottomNav = dynamic(() => import('@/components/layout/bottom-nav').then(m => ({ default: m.BottomNav })), { ssr: false, loading: () => <LayoutLoader /> })

// Page components — only the active page is loaded
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

// Shared overlays — loaded lazily
const CommandPalette = dynamic(() => import('@/components/shared/command-palette').then(m => ({ default: m.CommandPalette })), { ssr: false })
const ShortcutsModal = dynamic(() => import('@/components/shared/shortcuts-modal').then(m => ({ default: m.ShortcutsModal })), { ssr: false })
const GuidedTour = dynamic(() => import('@/components/shared/guided-tour').then(m => ({ default: m.GuidedTour })), { ssr: false })
const PageWrapper = dynamic(() => import('@/components/shared/page-wrapper').then(m => ({ default: m.PageWrapper })), { ssr: false, loading: () => <ChunkLoader /> })

function ChunkLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-primary)' }} />
    </div>
  )
}

function LayoutLoader() {
  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
    </div>
  )
}

function announce(message: string) {
  if (typeof window === 'undefined') return
  const el = document.createElement('div')
  el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); el.setAttribute('aria-atomic', 'true'); el.className = 'sr-only'
  document.body.appendChild(el)
  window.setTimeout(() => { el.textContent = message; window.setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el) }, 1000) }, 100)
}

const PAGE_ORDER: AppPage[] = ['dashboard', 'tasks', 'calendar', 'milestones', 'chores', 'grocery', 'meal-plan', 'budget', 'chat', 'files', 'settings']

export default function MainApp() {
  const { currentPage, currentFamily, showOnboarding, setCurrentPage, demoDataReady } = useAppStore()
  const { user, setUser } = useAuthStore()
  const supabase = useMemo(() => {
    try { return createClient() } catch { return null }
  }, [])

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const mainRef = useRef<HTMLElement>(null)
  const scrollRafRef = useRef<number | null>(null)

  // Cleanup scroll RAF on unmount
  useEffect(() => {
    return () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current)
        scrollRafRef.current = null
      }
    }
  }, [])

  const handleScrollProgress = useCallback(() => {
    if (scrollRafRef.current) return
    scrollRafRef.current = requestAnimationFrame(() => {
      if (!mainRef.current) { scrollRafRef.current = null; return }
      const { scrollTop, scrollHeight, clientHeight } = mainRef.current
      const scrollableHeight = scrollHeight - clientHeight
      if (scrollableHeight <= 0) { setScrollProgress(0); scrollRafRef.current = null; return }
      setScrollProgress(Math.min(100, Math.max(0, (scrollTop / scrollableHeight) * 100)))
      scrollRafRef.current = null
    })
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]; touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }; setSwipeOffset(0)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return; const touch = e.touches[0]; const deltaX = touch.clientX - touchStartRef.current.x; const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)
    if (deltaY > Math.abs(deltaX)) { touchStartRef.current = null; setSwipeOffset(0); return }
    setSwipeOffset(Math.max(-60, Math.min(60, deltaX * 0.3)))
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current) return; const elapsed = Date.now() - touchStartRef.current.time; const currentIdx = PAGE_ORDER.indexOf(currentPage)
    if (currentIdx === -1) { touchStartRef.current = null; setSwipeOffset(0); return }
    const absOffset = Math.abs(swipeOffset); const velocity = elapsed > 0 ? absOffset / elapsed : 0
    if (absOffset > 24 || velocity > 0.3) {
      if (swipeOffset < -15 && currentIdx < PAGE_ORDER.length - 1) setCurrentPage(PAGE_ORDER[currentIdx + 1])
      else if (swipeOffset > 15 && currentIdx > 0) setCurrentPage(PAGE_ORDER[currentIdx - 1])
    }
    touchStartRef.current = null; setSwipeOffset(0)
  }, [currentPage, swipeOffset, setCurrentPage])

  // Fetch initial data from Supabase (only for real Supabase users)
  // Use a ref to track whether initial fetch has been done for the current user,
  // preventing refetch loops when currentFamily changes as a result of this effect.
  const hasFetchedRef = useRef<string | null>(null)
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.id || !supabase) return
      // Only fetch once per user ID
      if (hasFetchedRef.current === user.id) return
      hasFetchedRef.current = user.id

      if (isDemoUserId(user.id) || isLocalUserId(user.id)) {
        const appState = useAppStore.getState()
        if (!appState.currentFamily) appState.setShowOnboarding(true)
        return
      }
      try {
        const { data: memberships } = await supabase.from('family_members').select('family_id, role, families(*)').eq('user_id', user.id)
        if (memberships && memberships.length > 0) {
          const families = memberships.map(m => m.families).filter(Boolean)
          useAppStore.getState().setFamilies(families)
          if (!useAppStore.getState().currentFamily && families.length > 0) {
            useAppStore.getState().setCurrentFamily(families[0])
            try { const { data: members } = await supabase.from('family_members').select('*, profiles(*)').eq('family_id', families[0].id); if (members) useAppStore.getState().setFamilyMembers(members) } catch { /* ignore */ }
          }
        } else { useAppStore.getState().setShowOnboarding(true) }
      } catch (error) { console.error('Error fetching initial data:', error) }
    }
    fetchInitialData()
  }, [user?.id, supabase]) // Removed currentFamily from deps to prevent refetch loop

  // Listen for auth state changes
  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_OUT') { useAuthStore.getState().logout() }
        else if (session?.user) {
          const profile = buildUserProfileFromSession(session)
          setUser(profile)
        }
      } catch (error) { console.error('Auth state change error:', error) }
    })
    return () => data?.subscription?.unsubscribe()
  }, [supabase, setUser])

  const headingRef = useRef<HTMLHeadingElement>(null)
  const prevPageRef = useRef<AppPage>(currentPage)
  const [overlaysReady, setOverlaysReady] = useState(false)
  useEffect(() => {
    if (prevPageRef.current !== currentPage) { prevPageRef.current = currentPage; announce(`Navigated to ${currentPage} page`); setTimeout(() => { headingRef.current?.focus() }, 100) }
  }, [currentPage])

  // Delay overlay components to reduce initial compile load
  useEffect(() => {
    const timer = setTimeout(() => setOverlaysReady(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  // Hydrate app store theme from localStorage after mount
  useEffect(() => {
    useAppStore.getState().hydrateTheme()
  }, [])

  // Hydrate tour store from localStorage after mount
  useEffect(() => {
    useTourStore.getState().hydrate()
  }, [])

  if (showOnboarding && !currentFamily) return <OnboardingFlow />

  const renderPage = () => {
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
  }

  return (
    <div className="h-screen bg-[--bg-primary] flex overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[--accent-primary] focus:text-white" tabIndex={0}>Skip to main content</a>
      {!demoDataReady && (
        <div className="fixed inset-0 z-[9999] bg-[--bg-primary] flex items-center justify-center transition-opacity duration-300">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 mb-4 animate-pulse-glow">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M8 6L16 2L24 6V14L16 18L8 14V6Z" fill="white" fillOpacity="0.9"/><path d="M4 16L16 22L28 16V24L16 30L4 24V16Z" fill="white" fillOpacity="0.6"/></svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">USRA PLUS</h1>
            <p className="text-sm text-white/50 mt-2">Loading demo data…</p>
            <div className="mt-4"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto" /></div>
          </div>
        </div>
      )}
      <div className="hidden md:block h-screen flex-shrink-0"><AppSidebar /></div>
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <AppHeader />
        <div className="scroll-progress" style={{ width: scrollProgress > 0 ? `${scrollProgress}%` : '0%', opacity: scrollProgress > 0 ? 1 : 0 }} />
        <main id="main-content" ref={mainRef} role="main" className="flex-1 overflow-y-auto overflow-x-hidden relative overscroll-y-contain" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onScroll={handleScrollProgress}>
          {swipeOffset !== 0 && (
            <>
              <div className="fixed top-0 left-0 bottom-0 w-1 z-40 md:hidden transition-opacity duration-150" style={{ background: 'linear-gradient(to right, rgba(99,102,241,0.4), transparent)', opacity: swipeOffset > 10 ? Math.min(1, (swipeOffset - 10) / 30) : 0 }} />
              <div className="fixed top-0 right-0 bottom-0 w-1 z-40 md:hidden transition-opacity duration-150" style={{ background: 'linear-gradient(to left, rgba(99,102,241,0.4), transparent)', opacity: swipeOffset < -10 ? Math.min(1, (-swipeOffset - 10) / 30) : 0 }} />
            </>
          )}
          <div className="p-4 md:p-6 pb-[max(6rem,calc(1.5rem+env(safe-area-inset-bottom)))] md:pb-6 transition-transform duration-100 ease-out" style={{ transform: swipeOffset !== 0 ? `translateX(${swipeOffset * 0.5}px)` : undefined }}>
            <h1 ref={headingRef} tabIndex={-1} className="sr-only">{currentPage}</h1>
            <Suspense fallback={<ChunkLoader />}>
              {renderPage()}
            </Suspense>
          </div>
        </main>
      </div>
      <BottomNav />
      {overlaysReady && (
        <>
          <CommandPalette />
          <ShortcutsModal />
          <GuidedTour />
        </>
      )}
    </div>
  )
}
