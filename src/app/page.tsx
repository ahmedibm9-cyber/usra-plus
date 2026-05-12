'use client'

import { useEffect, useState, useRef, useCallback, useMemo, Component } from 'react'
import dynamic from 'next/dynamic'
import { createClient, isDemoMode } from '@/lib/supabase/client'
import { localGetMe, localLogout, localUserToProfile } from '@/lib/local-auth'
import { useAuthStore } from '@/stores/auth-store'
import { useAppStore } from '@/stores/app-store'
import { useI18n } from '@/i18n/use-translation'
import { useAdminAuthStore } from '@/stores/admin-auth-store'
import { useUIPreferencesStore } from '@/stores/ui-preferences-store'
import { initErrorCapture } from '@/lib/error-capture'

// Layout Components
const AppSidebar = dynamic(() => import('@/components/layout/app-sidebar').then(m => ({ default: m.AppSidebar })), { ssr: false })
const AppHeader = dynamic(() => import('@/components/layout/app-header').then(m => ({ default: m.AppHeader })), { ssr: false })
const BottomNav = dynamic(() => import('@/components/layout/bottom-nav').then(m => ({ default: m.BottomNav })), { ssr: false })

// Auth Components
const LoginForm = dynamic(() => import('@/components/auth/login-form').then(m => ({ default: m.LoginForm })), { ssr: false, loading: () => <ChunkLoader /> })
const SignupForm = dynamic(() => import('@/components/auth/signup-form').then(m => ({ default: m.SignupForm })), { ssr: false, loading: () => <ChunkLoader /> })
const ForgotPasswordForm = dynamic(() => import('@/components/auth/forgot-password-form').then(m => ({ default: m.ForgotPasswordForm })), { ssr: false, loading: () => <ChunkLoader /> })

// Feature Pages
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

// Shared Components
const CommandPalette = dynamic(() => import('@/components/shared/command-palette').then(m => ({ default: m.CommandPalette })), { ssr: false })
const GuidedTour = dynamic(() => import('@/components/shared/guided-tour').then(m => ({ default: m.GuidedTour })), { ssr: false })
const PageWrapper = dynamic(() => import('@/components/shared/page-wrapper').then(m => ({ default: m.PageWrapper })), { ssr: false })

// Admin
const AdminLayout = dynamic(() => import('@/components/admin/admin-layout').then(m => ({ default: m.AdminLayout })), { ssr: false, loading: () => <ChunkLoader /> })

import { Loader2 } from 'lucide-react'
import type { AppPage } from '@/types'

// ─── Safe Supabase client creation ────────────────────────────────
function safeCreateClient() {
  try {
    return createClient()
  } catch (err) {
    console.error('[USRA PLUS] Failed to create Supabase client:', err)
    return null
  }
}

// Chunk loader — NothingOS industrial spinner
function ChunkLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 border-2 border-transparent border-t-[#E50914] rounded-full animate-spin" />
        </div>
      </div>
    </div>
  )
}

// Live announcer — uses a single persistent live region element
let _liveRegion: HTMLDivElement | null = null
function getLiveRegion(): HTMLDivElement {
  if (_liveRegion && _liveRegion.parentNode) return _liveRegion
  const el = document.createElement('div')
  el.setAttribute('role', 'status')
  el.setAttribute('aria-live', 'polite')
  el.setAttribute('aria-atomic', 'true')
  el.className = 'sr-only'
  document.body.appendChild(el)
  _liveRegion = el
  return el
}
function announce(message: string) {
  if (typeof window === 'undefined') return
  const el = getLiveRegion()
  el.textContent = ''
  window.setTimeout(() => { el.textContent = message }, 100)
}

// ─── Render Error Boundary ────────────────────────────────────────
interface ErrorBoundaryProps { children: React.ReactNode; fallback?: React.ReactNode }
interface ErrorBoundaryState { hasError: boolean; error: Error | null }

class RenderErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[USRA PLUS] Render error caught by boundary:', error, info)
  }
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div style={{
          minHeight: '100vh',
          background: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: '#E50914',
              marginBottom: '20px',
            }}>
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <path d="M8 6L16 2L24 6V14L16 18L8 14V6Z" fill="white" fillOpacity="0.9"/>
                <path d="M4 16L16 22L28 16V24L16 30L4 24V16Z" fill="white" fillOpacity="0.6"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#F5F5F0', marginBottom: '8px', fontFamily: "'Space Grotesk', sans-serif" }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '14px', color: '#8A8A8A', marginBottom: '16px', lineHeight: '1.6' }}>
              A rendering error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                background: '#E50914',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: "'Space Grotesk', sans-serif",
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Auth Screen — NothingOS Industrial ───────────────────────────
function AuthScreen() {
  const { authView } = useAuthStore()

  return (
    <div className="min-h-screen bg-[--bg-primary] flex items-center justify-center p-4 auth-bg">
      <div className="auth-blob-1" />
      <div className="auth-blob-2" />
      <div className="auth-blob-3" />
      {authView === 'login' && <LoginForm />}
      {authView === 'signup' && <SignupForm />}
      {authView === 'forgot-password' && <ForgotPasswordForm />}
    </div>
  )
}

// ─── Loading Screen — NothingOS Boot Sequence ─────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#E50914] mb-4 animate-pulse-glow">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M8 6L16 2L24 6V14L16 18L8 14V6Z" fill="white" fillOpacity="0.9"/>
            <path d="M4 16L16 22L28 16V24L16 30L4 24V16Z" fill="white" fillOpacity="0.6"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#F5F5F0] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>USRA PLUS</h1>
        <div className="mt-4">
          <div className="relative w-6 h-6 mx-auto">
            <div className="absolute inset-0 border-2 border-transparent border-t-[#E50914] rounded-full animate-spin" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Page order for swipe navigation
const PAGE_ORDER: AppPage[] = ['dashboard', 'tasks', 'calendar', 'milestones', 'chores', 'grocery', 'meal-plan', 'budget', 'chat', 'files', 'settings']
const SWIPE_MIN_DISTANCE = 80
const SWIPE_MIN_VELOCITY = 0.3

// ─── Main App Layout — NothingOS Dashboard ────────────────────────
function MainApp() {
  const { currentPage, currentFamily, showOnboarding, setCurrentPage, demoDataReady } = useAppStore()
  const { user, setUser } = useAuthStore()
  const reflectionsEnabled = useUIPreferencesStore((s) => s.reflectionsEnabled)
  const supabase = useMemo(() => safeCreateClient(), [])

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const mainRef = useRef<HTMLElement>(null)
  const scrollRafRef = useRef<number | null>(null)

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

  // Fetch family data from Supabase when user has a family selected
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.id) return
      if (isDemoMode()) {
        useAppStore.getState().setDemoDataReady(true)
        return
      }
      if (!supabase) return
      try {
        const { data: memberships } = await supabase.from('family_members').select('family_id, role, families(*)').eq('user_id', user.id)
        if (memberships && memberships.length > 0) {
          const families = memberships.map(m => m.families).filter(Boolean)
          useAppStore.getState().setFamilies(families)
          const targetFamily = currentFamily || families[0]
          if (!currentFamily && families.length > 0) {
            useAppStore.getState().setCurrentFamily(families[0])
          }
          if (targetFamily) {
            try {
              const { data: members } = await supabase.from('family_members').select('*, profiles(*)').eq('family_id', targetFamily.id)
              if (members) useAppStore.getState().setFamilyMembers(members)
            } catch (err) { console.error('Error fetching family members:', err) }
            try {
              const { fetchFamilyData: fetchSupabaseData } = await import('@/lib/supabase/fetch-family-data')
              await fetchSupabaseData(supabase, targetFamily.id, user.id)
            } catch (err) { console.warn('[USRA PLUS] Supabase family data fetch failed (demo mode?):', err) }
          }
        } else {
          useAppStore.getState().setShowOnboarding(true)
        }
      } catch (error) { console.error('Error fetching initial data:', error) }
    }
    fetchInitialData()
  }, [user?.id, supabase, currentFamily])

  // Realtime subscriptions
  useEffect(() => {
    if (isDemoMode() || !user?.id || !supabase || !currentFamily) return
    let unsubscribe: (() => void) | undefined
    import('@/lib/supabase/fetch-family-data').then(({ subscribeToRealtimeUpdates }) => {
      unsubscribe = subscribeToRealtimeUpdates(supabase, currentFamily.id, user.id)
    }).catch(err => console.warn('[USRA PLUS] Realtime subscription failed:', err))
    return () => { if (unsubscribe) unsubscribe() }
  }, [user?.id, supabase, currentFamily?.id])

  useEffect(() => {
    if (isDemoMode() || !supabase) return
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_OUT') { useAuthStore.getState().logout() }
        else if (session?.user) {
          try {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
            if (profile) {
              setUser(profile)
            } else {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                first_name: session.user.user_metadata?.first_name || '',
                last_name: session.user.user_metadata?.last_name || '',
                avatar_url: session.user.user_metadata?.avatar_url || null,
                language: 'en' as const,
                theme: 'dark' as const,
                phone: null,
                country_code: '+966',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
            }
          } catch (profileErr) {
            console.error('Error fetching/creating profile on auth change:', profileErr)
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              first_name: session.user.user_metadata?.first_name || '',
              last_name: session.user.user_metadata?.last_name || '',
              avatar_url: session.user.user_metadata?.avatar_url || null,
              language: 'en' as const,
              theme: 'dark' as const,
              phone: null,
              country_code: '+966',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          }
        }
      } catch (error) { console.error('Auth state change error:', error) }
    })
    return () => data?.subscription?.unsubscribe()
  }, [supabase, setUser])

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
    <div className={`min-h-screen bg-[--bg-primary] flex${reflectionsEnabled ? '' : ' reflections-off'}`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#E50914] focus:text-white" tabIndex={0}>
        Skip to main content
      </a>
      {/* Demo data loading overlay */}
      {!demoDataReady && (
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-300">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#E50914] mb-4 animate-pulse-glow">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M8 6L16 2L24 6V14L16 18L8 14V6Z" fill="white" fillOpacity="0.9"/>
                <path d="M4 16L16 22L28 16V24L16 30L4 24V16Z" fill="white" fillOpacity="0.6"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#F5F5F0] tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>USRA PLUS</h1>
            <p className="text-sm text-[#8A8A8A] mt-2">Loading demo data…</p>
            <div className="mt-4">
              <div className="relative w-6 h-6 mx-auto">
                <div className="absolute inset-0 border-2 border-transparent border-t-[#E50914] rounded-full animate-spin" />
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="hidden md:block"><AppSidebar /></div>
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <AppHeader />
        <div className="scroll-progress" style={{ width: scrollProgress > 0 ? `${scrollProgress}%` : '0%', opacity: scrollProgress > 0 ? 1 : 0 }} />
        <main id="main-content" ref={mainRef} role="main" className="flex-1 overflow-y-auto relative" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onScroll={handleScrollProgress}>
          {swipeOffset !== 0 && (
            <>
              <div className="fixed top-0 left-0 bottom-0 w-1 z-40 md:hidden transition-opacity duration-150" style={{ background: 'linear-gradient(to right, rgba(229,9,20,0.4), transparent)', opacity: swipeOffset > 10 ? Math.min(1, (swipeOffset - 10) / 30) : 0 }} />
              <div className="fixed top-0 right-0 bottom-0 w-1 z-40 md:hidden transition-opacity duration-150" style={{ background: 'linear-gradient(to left, rgba(229,9,20,0.4), transparent)', opacity: swipeOffset < -10 ? Math.min(1, (-swipeOffset - 10) / 30) : 0 }} />
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
      <GuidedTour />
    </div>
  )
}

// ─── Root Page Component ──────────────────────────────────────────
export default function RootPage() {
  const { isAuthenticated, isLoading, setIsLoading, setIsAuthenticated, setUser } = useAuthStore()
  const { language } = useI18n()
  const { isAdminAuthenticated, isSessionValid, showAdminLogin } = useAdminAuthStore()
  const supabase = useMemo(() => safeCreateClient(), [])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    initErrorCapture()
    const checkSession = async () => {
      // ALWAYS check local auth session first (usra-auth-token cookie)
      try {
        const { user: localUser } = await localGetMe()
        if (localUser) {
          const profile = localUserToProfile(localUser)
          setUser(profile)
          if (profile.language) useI18n.getState().setLanguage(profile.language)
          setIsAuthenticated(true)
          setIsLoading(false)
          return
        }
      } catch (error) {
        console.error('Local auth session check error:', error)
      }

      // Fallback: check Supabase session
      if (!isDemoMode() && supabase) {
        try {
          const { data, error: sessionError } = await supabase.auth.getSession()
          if (sessionError) { console.error('Supabase session check error:', sessionError) }
          const session = data?.session ?? null
          if (session?.user) {
            try {
              const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
              if (profile) {
                setUser(profile)
                if (profile.language) useI18n.getState().setLanguage(profile.language)
              } else {
                const newProfile = {
                  id: session.user.id,
                  email: session.user.email || '',
                  first_name: session.user.user_metadata?.first_name || '',
                  last_name: session.user.user_metadata?.last_name || '',
                  avatar_url: session.user.user_metadata?.avatar_url || null,
                  language: 'en' as const,
                  theme: 'dark' as const,
                  phone: null,
                  country_code: '+966',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }
                try { await supabase.from('profiles').insert({ id: newProfile.id, email: newProfile.email, first_name: newProfile.first_name, last_name: newProfile.last_name, language: 'en', theme: 'dark' }) } catch {}
                setUser(newProfile)
              }
            } catch (profileErr) { console.error('Profile fetch error:', profileErr) }
            setIsAuthenticated(true)
            // Ensure the API session cookie is also established when we
            // authenticated via Supabase but don't have a usra-auth-token yet.
            // This prevents subsequent API calls from failing with 401.
            try { await localGetMe() } catch {}
            try { await import('@/stores/subscription-store').then(m => m.useSubscriptionStore.getState().fetchPlanFromServer(session.user.id)) } catch {}
          }
        } catch (error) { console.error('Supabase session check error:', error) }
      }

      setIsLoading(false)
    }
    checkSession()
  }, [supabase, setIsLoading, setIsAuthenticated, setUser])

  useEffect(() => {
    if (mounted) {
      const dir = language === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.dir = dir
      document.documentElement.lang = language
    }
  }, [language, mounted])

  // Auth gate: must be authenticated to see the app
  if (!mounted || isLoading) return <LoadingScreen />
  if (isAdminAuthenticated && isSessionValid()) return <RenderErrorBoundary><AdminLayout /></RenderErrorBoundary>
  if (!isAuthenticated || showAdminLogin) return <RenderErrorBoundary><AuthScreen /></RenderErrorBoundary>
  return <RenderErrorBoundary><MainApp /></RenderErrorBoundary>
}
