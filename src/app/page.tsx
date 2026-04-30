'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useAppStore } from '@/stores/app-store'
import { useI18n } from '@/i18n/use-translation'

// Auth Components
import { LoginForm } from '@/components/auth/login-form'
import { SignupForm } from '@/components/auth/signup-form'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

// Layout Components
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { BottomNav } from '@/components/layout/bottom-nav'

// Page Components
import DashboardPage from '@/components/dashboard/dashboard-page'
import TasksPage from '@/components/tasks/tasks-page'
import CalendarPage from '@/components/calendar/calendar-page'
import { GroceryPage } from '@/components/grocery/grocery-page'
import { ChatPage } from '@/components/chat/chat-page'
import { FilesPage } from '@/components/files/files-page'
import SettingsPage from '@/components/settings/settings-page'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'
import { PageWrapper } from '@/components/shared/page-wrapper'
import { CommandPalette } from '@/components/shared/command-palette'

import { Loader2 } from 'lucide-react'
import type { AppPage } from '@/types'

// Auth Screen Component
function AuthScreen() {
  const { authView } = useAuthStore()

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-4 auth-bg">
      {/* Animated gradient blobs */}
      <div className="auth-blob-1" />
      <div className="auth-blob-2" />
      <div className="auth-blob-3" />
      {authView === 'login' && <LoginForm />}
      {authView === 'signup' && <SignupForm />}
      {authView === 'forgot-password' && <ForgotPasswordForm />}
    </div>
  )
}

// Loading Screen
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
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
const PAGE_ORDER: AppPage[] = ['dashboard', 'tasks', 'calendar', 'grocery', 'chat', 'files', 'settings']

// Swipe threshold constants
const SWIPE_MIN_DISTANCE = 80
const SWIPE_MIN_VELOCITY = 0.3

// Main App Layout
function MainApp() {
  const { currentPage, currentFamily, showOnboarding, sidebarCollapsed, setCurrentPage } = useAppStore()
  const { user, setUser } = useAuthStore()
  const supabase = createClient()

  // Swipe gesture state
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    }
    setSwipeOffset(0)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)

    // Only track horizontal swipes (not vertical scrolls)
    if (deltaY > Math.abs(deltaX)) {
      touchStartRef.current = null
      setSwipeOffset(0)
      return
    }

    // Clamp the offset for visual feedback
    const clampedOffset = Math.max(-60, Math.min(60, deltaX * 0.3))
    setSwipeOffset(clampedOffset)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current) return

    const endTime = Date.now()
    const elapsed = endTime - touchStartRef.current.time

    // We need current touch position, but since touch ended, use swipeOffset as proxy
    const currentIdx = PAGE_ORDER.indexOf(currentPage)

    if (currentIdx === -1) {
      touchStartRef.current = null
      setSwipeOffset(0)
      return
    }

    const absOffset = Math.abs(swipeOffset)
    const velocity = elapsed > 0 ? absOffset / elapsed : 0

    // Check if swipe meets threshold
    if (absOffset > SWIPE_MIN_DISTANCE * 0.3 || velocity > SWIPE_MIN_VELOCITY) {
      if (swipeOffset < -15 && currentIdx < PAGE_ORDER.length - 1) {
        // Swipe left → next page
        setCurrentPage(PAGE_ORDER[currentIdx + 1])
      } else if (swipeOffset > 15 && currentIdx > 0) {
        // Swipe right → previous page
        setCurrentPage(PAGE_ORDER[currentIdx - 1])
      }
    }

    touchStartRef.current = null
    setSwipeOffset(0)
  }, [currentPage, swipeOffset, setCurrentPage])

  // Fetch user's families and set current family
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.id) return

      try {
        // Fetch user's family memberships
        const { data: memberships } = await supabase
          .from('family_members')
          .select('family_id, role, families(*)')
          .eq('user_id', user.id)

        if (memberships && memberships.length > 0) {
          const families = memberships.map(m => m.families).filter(Boolean)
          useAppStore.getState().setFamilies(families)
          
          // Set first family as current if none selected
          if (!currentFamily && families.length > 0) {
            useAppStore.getState().setCurrentFamily(families[0])
            
            // Fetch members for the current family
            const { data: members } = await supabase
              .from('family_members')
              .select('*, profiles(*)')
              .eq('family_id', families[0].id)
            
            if (members) {
              useAppStore.getState().setFamilyMembers(members)
            }
          }
        } else {
          // No families - show onboarding
          useAppStore.getState().setShowOnboarding(true)
        }
      } catch (error) {
        console.error('Error fetching initial data:', error)
      }
    }

    fetchInitialData()
  }, [user?.id])

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        useAuthStore.getState().logout()
      } else if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (profile) {
          setUser(profile)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Show onboarding if no family
  if (showOnboarding && !currentFamily) {
    return <OnboardingFlow />
  }

  // Render current page
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <PageWrapper><DashboardPage /></PageWrapper>
      case 'tasks':
        return <PageWrapper><TasksPage /></PageWrapper>
      case 'calendar':
        return <PageWrapper><CalendarPage /></PageWrapper>
      case 'grocery':
        return <PageWrapper><GroceryPage /></PageWrapper>
      case 'chat':
        return <PageWrapper><ChatPage /></PageWrapper>
      case 'files':
        return <PageWrapper><FilesPage /></PageWrapper>
      case 'settings':
        return <PageWrapper><SettingsPage /></PageWrapper>
      default:
        return <PageWrapper><DashboardPage /></PageWrapper>
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex">
      {/* Sidebar - Desktop */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <AppHeader />

        {/* Page Content */}
        <main
          className="flex-1 overflow-y-auto relative"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Swipe edge peek indicators */}
          {swipeOffset !== 0 && (
            <>
              {/* Left edge peek */}
              <div
                className="fixed top-0 left-0 bottom-0 w-1 z-40 md:hidden transition-opacity duration-150"
                style={{
                  background: 'linear-gradient(to right, rgba(99,102,241,0.4), transparent)',
                  opacity: swipeOffset > 10 ? Math.min(1, (swipeOffset - 10) / 30) : 0,
                }}
              />
              {/* Right edge peek */}
              <div
                className="fixed top-0 right-0 bottom-0 w-1 z-40 md:hidden transition-opacity duration-150"
                style={{
                  background: 'linear-gradient(to left, rgba(99,102,241,0.4), transparent)',
                  opacity: swipeOffset < -10 ? Math.min(1, (-swipeOffset - 10) / 30) : 0,
                }}
              />
            </>
          )}

          <div
            className="p-4 md:p-6 pb-20 md:pb-6 transition-transform duration-100 ease-out"
            style={{
              transform: swipeOffset !== 0 ? `translateX(${swipeOffset * 0.5}px)` : undefined,
            }}
          >
            {renderPage()}
          </div>
        </main>
      </div>

      {/* Bottom Navigation - Mobile */}
      <BottomNav />

      {/* Command Palette */}
      <CommandPalette />
    </div>
  )
}

// Root Page Component
export default function RootPage() {
  const { isAuthenticated, isLoading, setIsLoading, setIsAuthenticated, setUser } = useAuthStore()
  const { language } = useI18n()
  const supabase = createClient()
  const [mounted, setMounted] = useState(false)

  // Check session on mount
  useEffect(() => {
    setMounted(true)
    
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (profile) {
            setUser(profile)
            // Set language from profile
            if (profile.language) {
              useI18n.getState().setLanguage(profile.language)
            }
          } else {
            // Profile doesn't exist yet, create basic one from auth metadata
            const basicProfile = {
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
            setUser(basicProfile)
          }
          setIsAuthenticated(true)
        }
      } catch (error) {
        console.error('Session check error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [])

  // Apply RTL direction
  useEffect(() => {
    if (mounted) {
      const dir = language === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.dir = dir
      document.documentElement.lang = language
    }
  }, [language, mounted])

  // Prevent flash of wrong content
  if (!mounted || isLoading) {
    return <LoadingScreen />
  }

  // Show auth screen or main app
  if (!isAuthenticated) {
    return <AuthScreen />
  }

  return <MainApp />
}
