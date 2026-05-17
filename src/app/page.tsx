'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { createClient, isDemoMode } from '@/lib/supabase/client'
import { localGetMe, localUserToProfile } from '@/lib/local-auth'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'
import { useAdminAuthStore } from '@/stores/admin-auth-store'
import { initErrorCapture } from '@/lib/error-capture'
import { RenderErrorBoundary } from '@/components/shared/render-error-boundary'
import { LoadingScreen } from '@/components/shared/loading-screen'
import { AuthScreen } from '@/components/auth/auth-screen'
import { MainApp } from './main-app'

const AdminLayout = dynamic(() => import('@/components/admin/admin-layout').then(m => ({ default: m.AdminLayout })), { ssr: false, loading: () => <LoadingScreen /> })
const PrivacyPolicyPage = dynamic(() => import('@/components/legal/privacy-policy-page').then(m => ({ default: m.PrivacyPolicyPage })), { ssr: false, loading: () => <LoadingScreen /> })
const TermsOfServicePage = dynamic(() => import('@/components/legal/terms-of-service-page').then(m => ({ default: m.TermsOfServicePage })), { ssr: false, loading: () => <LoadingScreen /> })
const CookiePolicyPage = dynamic(() => import('@/components/legal/cookie-policy-page').then(m => ({ default: m.CookiePolicyPage })), { ssr: false, loading: () => <LoadingScreen /> })
const CheckoutSuccessModal = dynamic(() => import('@/components/shared/checkout-success-modal').then(m => ({ default: m.CheckoutSuccessModal })), { ssr: false })

export default function RootPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const setIsLoading = useAuthStore((state) => state.setIsLoading)
  const setIsAuthenticated = useAuthStore((state) => state.setIsAuthenticated)
  const setUser = useAuthStore((state) => state.setUser)
  const { language } = useI18n()
  const { isAdminAuthenticated, isSessionValid, showAdminLogin } = useAdminAuthStore()
  const supabase = useMemo(() => { try { return createClient() } catch { return null } }, [])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    initErrorCapture()
    const checkSession = async () => {
      try {
        const { user: localUser } = await localGetMe()
        if (localUser) {
          const profile = localUserToProfile(localUser)
          setUser(profile)
          if (profile.language) setTimeout(() => useI18n.getState().setLanguage(profile.language), 0)
          setIsAuthenticated(true)
          setIsLoading(false)
          return
        }
      } catch { /* local auth failed */ }

      if (!isDemoMode() && supabase) {
        try {
          const { data, error: sessionError } = await supabase.auth.getSession()
          if (sessionError) console.error('Supabase session check error:', sessionError)
          const session = data?.session ?? null
          if (session?.user) {
            try {
              const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
              if (profile) {
                setUser(profile)
                if (profile.language) setTimeout(() => useI18n.getState().setLanguage(profile.language), 0)
              } else {
                const newProfile = {
                  id: session.user.id, email: session.user.email || '',
                  first_name: session.user.user_metadata?.first_name || '',
                  last_name: session.user.user_metadata?.last_name || '',
                  avatar_url: session.user.user_metadata?.avatar_url || null,
                  language: 'en' as const, theme: 'dark' as const,
                  phone: null, country_code: '+966',
                  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
                }
                try { await supabase.from('profiles').insert({ id: newProfile.id, email: newProfile.email, first_name: newProfile.first_name, last_name: newProfile.last_name, language: 'en', theme: 'dark' }) } catch { /* profile insert failed */ }
                setUser(newProfile)
              }
            } catch { /* profile fetch failed */ }
            setIsAuthenticated(true)
            try { await localGetMe() } catch { /* local sync failed */ }
            try { await import('@/stores/subscription-store').then(m => m.useSubscriptionStore.getState().fetchPlanFromServer(session.user.id)) } catch { /* plan fetch failed */ }
          }
        } catch (error) { console.error('Supabase session check error:', error) }
      }

      setIsLoading(false)
    }
    checkSession()
  }, [supabase, setIsLoading, setIsAuthenticated, setUser])

  useEffect(() => {
    if (mounted) {
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = language
    }
  }, [language, mounted])

  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false)

  useEffect(() => {
    if (!mounted || !isAuthenticated) return
    const params = new URLSearchParams(window.location.search)
    const checkoutStatus = params.get('checkout')
    if (!checkoutStatus) return
    if (checkoutStatus === 'success') {
      setShowCheckoutSuccess(true)
      const userId = useAuthStore.getState().user?.id
      if (userId) import('@/stores/subscription-store').then(m => m.useSubscriptionStore.getState().fetchPlanFromServer(userId))
    } else if (checkoutStatus === 'cancelled') {
      import('sonner').then(({ toast }) => toast.info('Checkout cancelled.'))
    }
    const url = new URL(window.location.href)
    url.searchParams.delete('checkout')
    url.searchParams.delete('session_id')
    window.history.replaceState({}, '', url.pathname)
  }, [mounted, isAuthenticated])

  const [legalPage] = useState(() => {
    if (typeof window === 'undefined') return null
    return new URLSearchParams(window.location.search).get('page')
  })

  if (legalPage === 'privacy') return <RenderErrorBoundary><PrivacyPolicyPage /></RenderErrorBoundary>
  if (legalPage === 'terms') return <RenderErrorBoundary><TermsOfServicePage /></RenderErrorBoundary>
  if (legalPage === 'cookies') return <RenderErrorBoundary><CookiePolicyPage /></RenderErrorBoundary>

  const checkoutModal = showCheckoutSuccess ? (
    <CheckoutSuccessModal onClose={() => setShowCheckoutSuccess(false)} />
  ) : null

  if (!mounted || isLoading) return <LoadingScreen />
  if (isAdminAuthenticated && isSessionValid()) return <RenderErrorBoundary><AdminLayout />{checkoutModal}</RenderErrorBoundary>
  if (!isAuthenticated || showAdminLogin) return <RenderErrorBoundary><AuthScreen />{checkoutModal}</RenderErrorBoundary>
  return <RenderErrorBoundary><MainApp />{checkoutModal}</RenderErrorBoundary>
}
