'use client'

import { useEffect, useState, useRef, useCallback, useMemo, Component } from 'react'
import dynamic from 'next/dynamic'
import { createClient, isDemoMode, isDemoUserId } from '@/lib/supabase/client'
import { localGetMe, localUserToProfile } from '@/lib/local-auth'
import { seedDemoData } from '@/lib/seed-demo-data'
import { useAuthStore } from '@/stores/auth-store'
import { useAppStore } from '@/stores/app-store'
import { useCurrentPage, useCurrentFamily, useShowOnboarding, useDemoDataReady, useSidebarCollapsed, useIsAuthenticated, useAuthLoading, useCurrentUser } from '@/stores/selectors'
import { useI18n } from '@/i18n/use-translation'
import { useAdminAuthStore } from '@/stores/admin-auth-store'
import { initErrorCapture } from '@/lib/error-capture'

// MUI Components
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import { keyframes } from '@mui/system'

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
const CookieConsentBanner = dynamic(() => import('@/components/shared/cookie-consent').then(m => ({ default: m.CookieConsent })), { ssr: false })

// Admin
const AdminLayout = dynamic(() => import('@/components/admin/admin-layout').then(m => ({ default: m.AdminLayout })), { ssr: false, loading: () => <ChunkLoader /> })

import type { AppPage } from '@/types'

// ─── Keyframe Animations ──────────────────────────────────────────
const logoReveal = keyframes`
  0% { opacity: 0; transform: scale(0.8) rotate(-10deg); }
  50% { transform: scale(1.05) rotate(2deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
`

const textReveal = keyframes`
  from { opacity: 0; transform: translateY(8px); filter: blur(4px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
`

const floatAnim = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`

const progressLine = keyframes`
  0% { width: 0%; }
  50% { width: 65%; }
  90% { width: 90%; }
  100% { width: 100%; }
`

// ─── Hexagon Logo SVG ─────────────────────────────────────────────
function HexLogo({ size = 40, color }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 40 44" fill="none">
      <path
        d="M20 1L37.3205 10.5V29.5L20 39L2.67949 29.5V10.5L20 1Z"
        fill="currentColor"
        fillOpacity={0.15}
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <path d="M20 8L30.3923 14V26L20 32L9.6077 26V14L20 8Z" fill="currentColor" fillOpacity={0.5} />
      <path d="M20 14L25.5885 17.5V24.5L20 28L14.4115 24.5V17.5L20 14Z" fill="currentColor" />
    </svg>
  )
}

// ─── Safe Supabase client creation ────────────────────────────────
function safeCreateClient() {
  try {
    return createClient()
  } catch (err) {
    console.error('[USRA PLUS] Failed to create Supabase client:', err)
    return null
  }
}

// ─── Chunk loader — MUI CircularProgress ──────────────────────────
function ChunkLoader() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Stack direction="column" spacing={2.5} sx={{ alignItems: 'center' }}>
        <CircularProgress size={40} thickness={3} />
        <Box sx={{ width: 96, height: 2, borderRadius: 1, bgcolor: 'action.hover', overflow: 'hidden' }}>
          <Box
            sx={{
              height: '100%',
              borderRadius: 1,
              bgcolor: 'primary.main',
              animation: `${progressLine} 2s ease-out forwards`,
            }}
          />
        </Box>
      </Stack>
    </Box>
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
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
          <Box sx={{ maxWidth: 384, width: '100%', textAlign: 'center' }}>
            <Box sx={{ mx: 'auto', mb: 2.5, width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, bgcolor: 'primary.main', opacity: 0.1 }}>
              <Box sx={{ color: 'primary.main' }}>
                <HexLogo size={32} />
              </Box>
            </Box>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Something went wrong
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
              A rendering error occurred. Please try refreshing the page.
            </Typography>
            <Button variant="contained" onClick={() => window.location.reload()} sx={{ borderRadius: 3, px: 3, py: 1 }}>
              Refresh Page
            </Button>
          </Box>
        </Box>
      )
    }
    return this.props.children
  }
}

// ─── Auth Screen — MUI ────────────────────────────────────────────
const AUTH_FEATURES = ['Tasks', 'Calendar', 'Meals', 'Budget', 'Chat'] as const

function AuthScreen() {
  const authView = useAuthStore((state) => state.authView)

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', position: 'relative', overflow: 'hidden' }}>
      {/* LEFT: Decorative panel (hidden on mobile) */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          width: { lg: '45%', xl: '50%' },
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, var(--primary), var(--secondary), #1C1B1F)',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: 5,
        }}
      >
        {/* Subtle pattern overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.04,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236EE7B7' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Floating blobs */}
        <Box sx={{ position: 'absolute', top: '15%', right: '10%', width: 288, height: 288, borderRadius: '50%', bgcolor: '#6EE7B7', opacity: 0.06, filter: 'blur(80px)', animation: `${floatAnim} 4s ease-in-out infinite` }} />
        <Box sx={{ position: 'absolute', bottom: '10%', left: '5%', width: 224, height: 224, borderRadius: '50%', bgcolor: '#5EEAD4', opacity: 0.05, filter: 'blur(60px)', animation: `${floatAnim} 4s ease-in-out infinite`, animationDelay: '2s' }} />
        <Box sx={{ position: 'absolute', top: '50%', left: '40%', width: 160, height: 160, borderRadius: '50%', bgcolor: '#C7BFFF', opacity: 0.04, filter: 'blur(50px)', animation: `${floatAnim} 4s ease-in-out infinite`, animationDelay: '4s' }} />

        {/* Content */}
        <Box sx={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', px: 5, width: '100%' }}>
          {/* Logo */}
          <Box sx={{ mb: 3, animation: `${logoReveal} 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards` }}>
            <Box sx={{ width: 80, height: 80, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ color: '#6EE7B7' }}>
                <HexLogo size={48} />
              </Box>
            </Box>
          </Box>

          {/* Tagline */}
          <Typography
            variant="h3"
            sx={{
              color: '#FFFFFF',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              animation: `${textReveal} 0.5s ease-out forwards`,
              animationDelay: '0.2s',
              opacity: 0,
            }}
          >
            USRA PLUS
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255,255,255,0.5)',
              fontWeight: 300,
              textAlign: 'center',
              maxWidth: 320,
              mt: 1.5,
              animation: `${textReveal} 0.5s ease-out forwards`,
              animationDelay: '0.4s',
              opacity: 0,
            }}
          >
            Your Family Operating System
          </Typography>

          {/* Feature pills */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              mt: 4,
              flexWrap: 'wrap',
              justifyContent: 'center',
              animation: `${textReveal} 0.5s ease-out forwards`,
              animationDelay: '0.6s',
              opacity: 0,
            }}
          >
            {AUTH_FEATURES.map((feature) => (
              <Chip
                key={feature}
                label={feature}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 2,
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                }}
              />
            ))}
          </Stack>
        </Box>
      </Box>

      {/* RIGHT: Auth form */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, lg: 4 }, position: 'relative' }}>
        {/* Subtle background pattern for mobile */}
        <Box sx={{ position: 'absolute', top: 0, right: 0, width: 500, height: 500, borderRadius: '50%', bgcolor: 'primary.main', opacity: 0.03, filter: 'blur(100px)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, width: 400, height: 400, borderRadius: '50%', bgcolor: 'secondary.main', opacity: 0.03, filter: 'blur(100px)', pointerEvents: 'none' }} />

        <Box sx={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 448 }}>
          {authView === 'login' && <LoginForm />}
          {authView === 'signup' && <SignupForm />}
          {authView === 'forgot-password' && <ForgotPasswordForm />}
        </Box>
      </Box>
    </Box>
  )
}

// ─── Loading Screen — MUI ─────────────────────────────────────────
function LoadingScreen() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box sx={{ textAlign: 'center' }}>
        {/* Animated logo */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            mb: 3,
            animation: `${logoReveal} 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
          }}
        >
          <Box sx={{ width: 64, height: 64, borderRadius: 3, bgcolor: 'primary.main', opacity: 0.1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ color: 'primary.main' }}>
              <HexLogo size={40} />
            </Box>
          </Box>
        </Box>

        {/* Brand name */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            letterSpacing: '-0.02em',
            animation: `${textReveal} 0.5s ease-out forwards`,
            animationDelay: '0.3s',
            opacity: 0,
          }}
        >
          USRA PLUS
        </Typography>

        {/* Progress indicator */}
        <Box sx={{ mt: 3, mx: 'auto', width: 128 }}>
          <LinearProgress
            sx={{
              height: 2,
              borderRadius: 1,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': {
                borderRadius: 1,
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  )
}

// Page order for swipe navigation
const PAGE_ORDER: AppPage[] = ['dashboard', 'tasks', 'calendar', 'milestones', 'chores', 'grocery', 'meal-plan', 'budget', 'chat', 'files', 'settings']
const SWIPE_MIN_DISTANCE = 80
const SWIPE_MIN_VELOCITY = 0.3

// ─── Main App Layout — MUI ────────────────────────────────────────
function MainApp() {
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

  // Fetch family data from Supabase when user has a family selected
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.id) return

      // Demo user detection: either no Supabase configured, or user is the demo account
      // This ensures demo data seeds correctly even on Vercel where Supabase IS configured
      const isDemoUser = isDemoMode() || isDemoUserId(user.id) || user.email === 'demo@usra.plus'
      if (isDemoUser) {
        // Seed demo data into all stores (sets demoDataReady=true at the end)
        seedDemoData()
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
    let cancelled = false
    import('@/lib/supabase/fetch-family-data').then(({ subscribeToRealtimeUpdates }) => {
      // If the effect was already cleaned up before the import resolved, skip subscription
      if (cancelled) return
      unsubscribe = subscribeToRealtimeUpdates(supabase, currentFamily.id, user.id)
    }).catch(err => console.warn('[USRA PLUS] Realtime subscription failed:', err))
    return () => {
      cancelled = true
      if (unsubscribe) unsubscribe()
    }
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', overflow: 'hidden' }}>
      {/* Skip to content (accessibility) */}
      <a
        href="#main-content"
        tabIndex={0}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          zIndex: 9999,
          padding: '0.75rem 1.5rem',
          background: 'var(--primary)',
          color: '#fff',
          fontWeight: 600,
          fontSize: '0.875rem',
          textDecoration: 'none',
          borderRadius: '0 0 0.5rem 0',
        }}
        onFocus={(e) => { e.currentTarget.style.left = '0' }}
        onBlur={(e) => { e.currentTarget.style.left = '-9999px' }}
      >
        Skip to main content
      </a>

      {/* Demo data loading overlay */}
      {!demoDataReady && (
        <Box sx={{ position: 'fixed', inset: 0, zIndex: 9999, bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ display: 'inline-block', mb: 2, animation: `${logoReveal} 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards` }}>
              <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: 'primary.main', opacity: 0.1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ color: 'primary.main' }}>
                  <HexLogo size={32} />
                </Box>
              </Box>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
              USRA PLUS
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Loading demo data…
            </Typography>
            <Box sx={{ mt: 2, mx: 'auto', width: 96 }}>
              <LinearProgress
                sx={{
                  height: 2,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  '& .MuiLinearProgress-bar': { borderRadius: 1 },
                }}
              />
            </Box>
          </Box>
        </Box>
      )}

      {/* Sidebar — FIXED position so it does NOT scroll with content */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: isRTL ? 'auto' : 0,
          right: isRTL ? 0 : 'auto',
          height: '100vh',
          zIndex: 30,
          display: { xs: 'none', md: 'block' },
        }}
      >
        <AppSidebar />
      </Box>

      {/* Main content area — offset by sidebar width on desktop */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          overflow: 'hidden',
          marginLeft: isRTL ? 0 : { md: sidebarCollapsed ? 72 : 256 },
          marginRight: isRTL ? { md: sidebarCollapsed ? 72 : 256 } : 0,
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <AppHeader />
        <Box
          component="main"
          id="main-content"
          ref={mainRef}
          role="main"
          sx={{
            flex: 1,
            overflowY: 'auto',
            position: 'relative',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Swipe indicators */}
          {swipeOffset !== 0 && (
            <>
              <Box sx={{
                position: 'fixed', top: 0, left: 0, bottom: 0, width: 4, zIndex: 40,
                display: { xs: 'block', md: 'none' },
                bgcolor: 'primary.main',
                opacity: swipeOffset > 10 ? Math.min(1, (swipeOffset - 10) / 30) : 0,
                transition: 'opacity 0.15s',
              }} />
              <Box sx={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: 4, zIndex: 40,
                display: { xs: 'block', md: 'none' },
                bgcolor: 'primary.main',
                opacity: swipeOffset < -10 ? Math.min(1, (-swipeOffset - 10) / 30) : 0,
                transition: 'opacity 0.15s',
              }} />
            </>
          )}
          <Box
            sx={{
              p: { xs: 2, md: 3 },
              pb: { xs: 10, md: 3 },
              transition: swipeOffset !== 0 ? 'transform 0.1s ease-out' : undefined,
              transform: swipeOffset !== 0 ? `translateX(${swipeOffset * 0.5}px)` : undefined,
              overflowX: 'hidden',
            }}
          >
            <h1 tabIndex={-1} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
              {currentPage}
            </h1>
            {pageContent}
          </Box>
        </Box>
      </Box>
      <BottomNav />
      <CommandPalette />
      <GuidedTour />
      <CookieConsentBanner />
    </Box>
  )
}

// ─── Root Page Component ──────────────────────────────────────────
export default function RootPage() {
  const isAuthenticated = useIsAuthenticated()
  const isLoading = useAuthLoading()
  const setIsLoading = useAuthStore((state) => state.setIsLoading)
  const setIsAuthenticated = useAuthStore((state) => state.setIsAuthenticated)
  const setUser = useAuthStore((state) => state.setUser)
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
          if (profile.language) {
            // Defer to next tick to avoid "state update before mount" warning
            setTimeout(() => useI18n.getState().setLanguage(profile.language), 0)
          }
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
                if (profile.language) {
                  setTimeout(() => useI18n.getState().setLanguage(profile.language), 0)
                }
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
