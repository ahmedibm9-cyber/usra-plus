'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useAppStore } from '@/stores/app-store'
import { useI18n } from '@/i18n/use-translation'
import { useAdminAuthStore } from '@/stores/admin-auth-store'

// Layout Components — also dynamic to reduce initial compilation memory
const AppSidebar = dynamic(() => import('@/components/layout/app-sidebar').then(m => ({ default: m.AppSidebar })), { ssr: false })
const AppHeader = dynamic(() => import('@/components/layout/app-header').then(m => ({ default: m.AppHeader })), { ssr: false })
const BottomNav = dynamic(() => import('@/components/layout/bottom-nav').then(m => ({ default: m.BottomNav })), { ssr: false })

// ALL page and heavy components are loaded dynamically to prevent OOM
// during compilation. Each dynamic() creates a separate chunk that
// Turbopack/Webpack can compile independently.
const LoginForm = dynamic(() => import('@/components/auth/login-form'), { ssr: false, loading: () => <ChunkLoader /> })
const SignupForm = dynamic(() => import('@/components/auth/signup-form'), { ssr: false, loading: () => <ChunkLoader /> })
const ForgotPasswordForm = dynamic(() => import('@/components/auth/forgot-password-form'), { ssr: false, loading: () => <ChunkLoader /> })

const DashboardPage = dynamic(() => import('@/components/dashboard/dashboard-page'), { ssr: false, loading: () => <ChunkLoader /> })
const TasksPage = dynamic(() => import('@/components/tasks/tasks-page'), { ssr: false, loading: () => <ChunkLoader /> })
const CalendarPage = dynamic(() => import('@/components/calendar/calendar-page'), { ssr: false, loading: () => <ChunkLoader /> })
const GroceryPage = dynamic(() => import('@/components/grocery/grocery-page'), { ssr: false, loading: () => <ChunkLoader /> })
const ChatPage = dynamic(() => import('@/components/chat/chat-page'), { ssr: false, loading: () => <ChunkLoader /> })
const FilesPage = dynamic(() => import('@/components/files/files-page'), { ssr: false, loading: () => <ChunkLoader /> })
const SettingsPage = dynamic(() => import('@/components/settings/settings-page'), { ssr: false, loading: () => <ChunkLoader /> })
const BudgetPage = dynamic(() => import('@/components/budget/budget-page'), { ssr: false, loading: () => <ChunkLoader /> })
const MealPlanPage = dynamic(() => import('@/components/meal-plan/meal-plan-page'), { ssr: false, loading: () => <ChunkLoader /> })
const MilestonesPage = dynamic(() => import('@/components/milestones/milestones-page'), { ssr: false, loading: () => <ChunkLoader /> })
const ChoresPage = dynamic(() => import('@/components/chores/chores-page'), { ssr: false, loading: () => <ChunkLoader /> })
const OnboardingFlow = dynamic(() => import('@/components/onboarding/onboarding-flow'), { ssr: false, loading: () => <ChunkLoader /> })

const CommandPalette = dynamic(() => import('@/components/shared/command-palette').then(m => ({ default: m.CommandPalette })), { ssr: false })
const ShortcutsModal = dynamic(() => import('@/components/shared/shortcuts-modal').then(m => ({ default: m.ShortcutsModal })), { ssr: false })
const GuidedTour = dynamic(() => import('@/components/shared/guided-tour').then(m => ({ default: m.GuidedTour })), { ssr: false })
const PageWrapper = dynamic(() => import('@/components/shared/page-wrapper').then(m => ({ default: m.PageWrapper })), { ssr: false })

const AdminLogin = dynamic(() => import('@/components/admin/admin-login').then(m => ({ default: m.AdminLogin })), { ssr: false })
const AdminLayout = dynamic(() => import('@/components/admin/admin-layout').then(m => ({ default: m.AdminLayout })), { ssr: false, loading: () => <ChunkLoader /> })

import { Loader2 } from 'lucide-react'
import type { AppPage } from '@/types'

// Chunk loader — shown while dynamic components load
function ChunkLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
    </div>
  )
}

// Live announcer — inline to avoid importing a file
function announce(message: string) {
  if (typeof window === 'undefined') return
  const el = document.createElement('div')
  el.setAttribute('role', 'status')
  el.setAttribute('aria-live', 'polite')
  el.setAttribute('aria-atomic', 'true')
  el.className = 'sr-only'
  document.body.appendChild(el)
  window.setTimeout(() => {
    el.textContent = message
    window.setTimeout(() => {
      document.body.removeChild(el)
    }, 1000)
  }, 100)
}

// Auth Screen Component
function AuthScreen() {
  const { authView } = useAuthStore()
  const { showAdminLogin } = useAdminAuthStore()

  return (
    <>
      <div className="min-h-screen bg-[--bg-primary] flex items-center justify-center p-4 auth-bg">
        <div className="auth-blob-1" />
        <div className="auth-blob-2" />
        <div className="auth-blob-3" />
        {authView === 'login' && <LoginForm />}
        {authView === 'signup' && <SignupForm />}
        {authView === 'forgot-password' && <ForgotPasswordForm />}
      </div>
      {showAdminLogin && <AdminLogin />}
    </>
  )
}

// Loading Screen
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[--bg-primary] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 mb-4 animate-pulse-glow">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M8 6L16 2L24 6V14L16 18L8 14V6Z" fill="white" fillOpacity="0.9"/>
            <path d="M4 16L16 22L28 16V24L16 30L4 24V16Z" fill="white" fillOpacity="0.6"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">USRA PLUS</h1>
        <div className="mt-4">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
        </div>
      </div>
    </div>
  )
}

// Page order for swipe navigation
const PAGE_ORDER: AppPage[] = ['dashboard', 'tasks', 'calendar', 'milestones', 'chores', 'grocery', 'meal-plan', 'budget', 'chat', 'files', 'settings']

// Swipe threshold constants
const SWIPE_MIN_DISTANCE = 80
const SWIPE_MIN_VELOCITY = 0.3

// Main App Layout
function MainApp() {
  const { currentPage, currentFamily, showOnboarding, setCurrentPage } = useAppStore()
  const { user, setUser } = useAuthStore()
  const supabase = createClient()

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const mainRef = useRef<HTMLElement>(null)

  const handleScrollProgress = useCallback(() => {
    if (!mainRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = mainRef.current
    const scrollableHeight = scrollHeight - clientHeight
    if (scrollableHeight <= 0) { setScrollProgress(0); return }
    setScrollProgress(Math.min(100, Math.max(0, (scrollTop / scrollableHeight) * 100)))
  }, [])

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
      try {
        const { data: memberships } = await supabase.from('family_members').select('family_id, role, families(*)').eq('user_id', user.id)
        if (memberships && memberships.length > 0) {
          const families = memberships.map(m => m.families).filter(Boolean)
          useAppStore.getState().setFamilies(families)
          if (!currentFamily && families.length > 0) {
            useAppStore.getState().setCurrentFamily(families[0])
            const { data: members } = await supabase.from('family_members').select('*, profiles(*)').eq('family_id', families[0].id)
            if (members) useAppStore.getState().setFamilyMembers(members)
          }
        } else {
          useAppStore.getState().setShowOnboarding(true)
        }
      } catch (error) { console.error('Error fetching initial data:', error) }
    }
    fetchInitialData()
  }, [user?.id])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') { useAuthStore.getState().logout() }
      else if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        if (profile) setUser(profile)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const headingRef = useRef<HTMLHeadingElement>(null)
  const prevPageRef = useRef<AppPage>(currentPage)
  useEffect(() => {
    if (prevPageRef.current !== currentPage) {
      prevPageRef.current = currentPage
      announce(`Navigated to ${currentPage} page`)
      setTimeout(() => { headingRef.current?.focus() }, 100)
    }
  }, [currentPage])

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
    <div className="min-h-screen bg-[--bg-primary] flex">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[--accent-primary] focus:text-white" tabIndex={0}>
        Skip to main content
      </a>
      <div className="hidden md:block"><AppSidebar /></div>
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <AppHeader />
        <div className="scroll-progress" style={{ width: scrollProgress > 0 ? `${scrollProgress}%` : '0%', opacity: scrollProgress > 0 ? 1 : 0 }} />
        <main id="main-content" ref={mainRef} role="main" className="flex-1 overflow-y-auto relative" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onScroll={handleScrollProgress}>
          {swipeOffset !== 0 && (
            <>
              <div className="fixed top-0 left-0 bottom-0 w-1 z-40 md:hidden transition-opacity duration-150" style={{ background: 'linear-gradient(to right, rgba(99,102,241,0.4), transparent)', opacity: swipeOffset > 10 ? Math.min(1, (swipeOffset - 10) / 30) : 0 }} />
              <div className="fixed top-0 right-0 bottom-0 w-1 z-40 md:hidden transition-opacity duration-150" style={{ background: 'linear-gradient(to left, rgba(99,102,241,0.4), transparent)', opacity: swipeOffset < -10 ? Math.min(1, (-swipeOffset - 10) / 30) : 0 }} />
            </>
          )}
          <div className="p-4 md:p-6 pb-20 md:pb-6 transition-transform duration-100 ease-out" style={{ transform: swipeOffset !== 0 ? `translateX(${swipeOffset * 0.5}px)` : undefined }}>
            <h1 ref={headingRef} tabIndex={-1} className="sr-only">{currentPage}</h1>
            {renderPage()}
          </div>
        </main>
      </div>
      <BottomNav />
      <CommandPalette />
      <ShortcutsModal />
      <GuidedTour />
    </div>
  )
}

// Root Page Component
export default function RootPage() {
  const { isAuthenticated, isLoading, setIsLoading, setIsAuthenticated, setUser } = useAuthStore()
  const { language } = useI18n()
  const { isAdminAuthenticated, isSessionValid, showAdminLogin } = useAdminAuthStore()
  const supabase = createClient()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
          if (profile) {
            setUser(profile)
            if (profile.language) useI18n.getState().setLanguage(profile.language)
          } else {
            setUser({ id: session.user.id, email: session.user.email || '', first_name: session.user.user_metadata?.first_name || '', last_name: session.user.user_metadata?.last_name || '', avatar_url: session.user.user_metadata?.avatar_url || null, language: 'en' as const, theme: 'dark' as const, phone: null, country_code: '+966', created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          }
          setIsAuthenticated(true)
        }
      } catch (error) { console.error('Session check error:', error) }
      finally { setIsLoading(false) }
    }
    checkSession()
  }, [])

  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash
      if (hash === '#internal-control-center' || hash === '#system-ops' || hash === '#founder-access') {
        useAdminAuthStore.getState().setShowAdminLogin(true)
        useAdminAuthStore.getState().addAuditLog('hash_route_access', 'admin_auth', null, { hash })
        window.history.replaceState(null, '', window.location.pathname)
      }
    }
    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  useEffect(() => {
    if (mounted) {
      const dir = language === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.dir = dir
      document.documentElement.lang = language
    }
  }, [language, mounted])

  if (!mounted || isLoading) return <LoadingScreen />
  if (isAdminAuthenticated && isSessionValid()) return <AdminLayout />
  if (showAdminLogin) return <AuthScreen />
  if (!isAuthenticated) return <AuthScreen />
  return <MainApp />
}
