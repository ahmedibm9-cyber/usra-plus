'use client'

import { useEffect, useState, useRef, useCallback, useMemo, Component } from 'react'
import dynamic from 'next/dynamic'
import { createClient, isDemoMode } from '@/lib/supabase/client'
import { localGetMe, localUserToProfile } from '@/lib/local-auth'
import { useAuthStore } from '@/stores/auth-store'
import { useAppStore } from '@/stores/app-store'
import { useI18n } from '@/i18n/use-translation'
import { useAdminAuthStore } from '@/stores/admin-auth-store'
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

// ─── Chunk loader — Elegant emerald skeleton ──────────────────────
function ChunkLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="size-10 rounded-full border-2 border-muted border-t-primary animate-spin" />
          <div className="absolute inset-0 size-10 rounded-full border border-transparent border-t-[#B8860B]/30 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
        <div className="h-1 w-20 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-[#B8860B] animate-progress-line" />
        </div>
      </div>
    </div>
  )
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
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-sm w-full text-center">
            {/* Hexagon logo with gold glow */}
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary/10 gold-glow">
              <svg width="32" height="35" viewBox="0 0 40 44" fill="none">
                <path d="M20 1L37.3205 10.5V29.5L20 39L2.67949 29.5V10.5L20 1Z" fill="currentColor" className="text-primary" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
                <path d="M20 8L30.3923 14V26L20 32L9.6077 26V14L20 8Z" fill="currentColor" className="text-primary" fillOpacity="0.5" />
                <path d="M20 14L25.5885 17.5V24.5L20 28L14.4115 24.5V17.5L20 14Z" fill="currentColor" className="text-primary" />
              </svg>
            </div>
            {/* Gold accent line */}
            <div className="gold-line w-16 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2 font-display">
              Something went wrong
            </h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              A rendering error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-xl btn-gradient px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200"
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

// ─── Auth Screen — Desert Oasis Split Layout ────────────────────
function AuthScreen() {
  const { authView } = useAuthStore()

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      {/* LEFT: Decorative panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden bg-gradient-to-br from-[#047857] via-[#065f46] to-[#0C0A09]">
        {/* Geometric pattern overlay */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23D4A843' stroke-width='0.5'%3E%3Crect x='10' y='10' width='60' height='60'/%3E%3Crect x='20' y='20' width='40' height='40'/%3E%3Cline x1='0' y1='0' x2='80' y2='80'/%3E%3Cline x1='80' y1='0' x2='0' y2='80'/%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        {/* Floating geometric shapes */}
        <div className="absolute top-[15%] left-[10%] w-24 h-24 border border-[#D4A843]/20 rounded-lg rotate-12 animate-float-geometric" />
        <div className="absolute top-[60%] left-[20%] w-16 h-16 border border-[#D4A843]/15 rotate-45 animate-float-geometric" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[20%] right-[15%] w-20 h-20 border border-[#D4A843]/20 rounded-full animate-float-geometric" style={{ animationDelay: '4s' }} />
        <div className="absolute top-[35%] right-[10%] w-12 h-12 border border-white/10 rotate-12 animate-float-geometric" style={{ animationDelay: '1s' }} />

        {/* Gradient orbs */}
        <div className="absolute top-[20%] right-[10%] w-64 h-64 rounded-full bg-[#D4A843]/8 blur-[80px]" />
        <div className="absolute bottom-[10%] left-[5%] w-48 h-48 rounded-full bg-[#059669]/10 blur-[60px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center px-12 w-full">
          {/* Logo */}
          <div className="mb-8 animate-hex-glow">
            <svg viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-20 h-20">
              <path d="M20 1L37.3205 10.5V29.5L20 39L2.67949 29.5V10.5L20 1Z" fill="#D4A843" fillOpacity="0.15" stroke="#D4A843" strokeWidth="1.5" />
              <path d="M20 8L30.3923 14V26L20 32L9.6077 26V14L20 8Z" fill="#D4A843" fillOpacity="0.4" />
              <path d="M20 14L25.5885 17.5V24.5L20 28L14.4115 24.5V17.5L20 14Z" fill="#D4A843" fillOpacity="0.8" />
            </svg>
          </div>

          {/* Tagline */}
          <h1 className="text-4xl font-bold text-white tracking-tight font-display mb-3">
            USRA PLUS
          </h1>
          <div className="gold-line w-20 mx-auto mb-4" style={{ opacity: 0.4 }} />
          <p className="text-lg text-white/60 font-light text-center max-w-xs">
            Your Family Operating System
          </p>

          {/* Decorative dots */}
          <div className="flex items-center gap-2 mt-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4A843]/40" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4A843]/25" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4A843]/15" />
          </div>
        </div>
      </div>

      {/* RIGHT: Auth form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8 relative">
        {/* Subtle background pattern for mobile */}
        <div className="absolute inset-0 opacity-[0.015] lg:hidden" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23047857' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        {/* Warm gradient blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/4 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#B8860B]/4 blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md">
          {authView === 'login' && <LoginForm />}
          {authView === 'signup' && <SignupForm />}
          {authView === 'forgot-password' && <ForgotPasswordForm />}
        </div>
      </div>
    </div>
  )
}

// ─── Loading Screen — Desert Oasis Premium ──────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        {/* Animated hexagon logo with gold shimmer */}
        <div className="inline-flex items-center justify-center w-16 h-16 mb-5 animate-hex-glow">
          <div className="relative">
            <svg viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
              <path d="M20 1L37.3205 10.5V29.5L20 39L2.67949 29.5V10.5L20 1Z" fill="var(--primary)" fillOpacity="0.1" stroke="var(--primary)" strokeWidth="1.5" />
              <path d="M20 8L30.3923 14V26L20 32L9.6077 26V14L20 8Z" fill="var(--primary)" fillOpacity="0.4" />
              <path d="M20 14L25.5885 17.5V24.5L20 28L14.4115 24.5V17.5L20 14Z" fill="var(--primary)" />
              {/* Gold shimmer overlay */}
              <path d="M20 1L37.3205 10.5V29.5L20 39L2.67949 29.5V10.5L20 1Z" fill="url(#goldShimmer)" fillOpacity="0.3" />
              <defs>
                <linearGradient id="goldShimmer" x1="0" y1="0" x2="40" y2="44" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#B8860B" stopOpacity="0" />
                  <stop offset="45%" stopColor="#D4A843" stopOpacity="0.6" />
                  <stop offset="55%" stopColor="#D4A843" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#B8860B" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Letter-by-letter USRA PLUS */}
        <h1 className="text-2xl font-bold text-foreground tracking-tight font-display flex items-center justify-center gap-[2px]">
          {'USRA PLUS'.split('').map((char, i) => (
            <span
              key={i}
              className="inline-block"
              style={{
                animation: `letterReveal 0.4s ease-out ${i * 0.06}s both`,
                color: char === ' ' ? undefined : undefined,
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </h1>

        {/* Thin emerald progress line */}
        <div className="mt-5 mx-auto w-32 h-[2px] rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-[#B8860B] animate-progress-line" />
        </div>
      </div>
    </div>
  )
}

// Page order for swipe navigation
const PAGE_ORDER: AppPage[] = ['dashboard', 'tasks', 'calendar', 'milestones', 'chores', 'grocery', 'meal-plan', 'budget', 'chat', 'files', 'settings']
const SWIPE_MIN_DISTANCE = 80
const SWIPE_MIN_VELOCITY = 0.3

// ─── Main App Layout ──────────────────────────────────────────────
function MainApp() {
  const { currentPage, currentFamily, showOnboarding, setCurrentPage, demoDataReady } = useAppStore()
  const { user, setUser } = useAuthStore()
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
    <div className="min-h-screen bg-background flex">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-primary-foreground" tabIndex={0}>
        Skip to main content
      </a>
      {/* Demo data loading overlay */}
      {!demoDataReady && (
        <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-hex-glow inline-block mb-4">
              <svg viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
                <path d="M20 1L37.3205 10.5V29.5L20 39L2.67949 29.5V10.5L20 1Z" fill="var(--primary)" fillOpacity="0.15" stroke="var(--primary)" strokeWidth="1.5" />
                <path d="M20 8L30.3923 14V26L20 32L9.6077 26V14L20 8Z" fill="var(--primary)" fillOpacity="0.5" />
                <path d="M20 14L25.5885 17.5V24.5L20 28L14.4115 24.5V17.5L20 14Z" fill="var(--primary)" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight font-display">
              USRA PLUS
            </h1>
            <p className="text-sm text-muted-foreground mt-2">Loading demo data…</p>
            <div className="mt-4 mx-auto w-24 h-[2px] rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-[#B8860B] animate-progress-line" />
            </div>
          </div>
        </div>
      )}
      <div className="hidden md:block"><AppSidebar /></div>
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <AppHeader />
        <main id="main-content" ref={mainRef} role="main" className="flex-1 overflow-y-auto relative" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          {swipeOffset !== 0 && (
            <>
              <div className="fixed top-0 left-0 bottom-0 w-1 z-40 md:hidden transition-opacity duration-150 bg-gradient-to-r from-primary/30 to-transparent" style={{ opacity: swipeOffset > 10 ? Math.min(1, (swipeOffset - 10) / 30) : 0 }} />
              <div className="fixed top-0 right-0 bottom-0 w-1 z-40 md:hidden transition-opacity duration-150 bg-gradient-to-l from-primary/30 to-transparent" style={{ opacity: swipeOffset < -10 ? Math.min(1, (-swipeOffset - 10) / 30) : 0 }} />
            </>
          )}
          <div className="p-4 md:p-6 pb-20 md:pb-6 transition-transform duration-100 ease-out" style={{ transform: swipeOffset !== 0 ? `translateX(${swipeOffset * 0.5}px)` : undefined }}>
            <h1 tabIndex={-1} className="sr-only">{currentPage}</h1>
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
