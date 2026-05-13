'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient, isDemoMode } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { LanguageSelector } from './language-selector'
import { ThemeToggle } from './theme-toggle'
import { TermsModal } from './terms-modal'
import { localLogin, localUserToProfile } from '@/lib/local-auth'
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  Fingerprint,
  ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAdminAuthStore } from '@/stores/admin-auth-store'

// ─── USRA PLUS Desert Oasis Hexagon Logo ──────────────────────────
function HexLogo({ className, admin }: { className?: string; admin?: boolean }) {
  const primaryColor = admin ? '#B8860B' : '#047857'
  const goldColor = admin ? '#D4A843' : '#B8860B'
  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 40 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path
          d="M20 1L37.3205 10.5V29.5L20 39L2.67949 29.5V10.5L20 1Z"
          fill={primaryColor}
          fillOpacity="0.1"
          stroke={primaryColor}
          strokeWidth="1.5"
        />
        <path
          d="M20 8L30.3923 14V26L20 32L9.6077 26V14L20 8Z"
          fill={primaryColor}
          fillOpacity="0.4"
        />
        <path
          d="M20 14L25.5885 17.5V24.5L20 28L14.4115 24.5V17.5L20 14Z"
          fill={primaryColor}
          fillOpacity="0.8"
        />
        {/* Gold shimmer highlight */}
        <path
          d="M20 8L30.3923 14V26L20 32L9.6077 26V14L20 8Z"
          fill={goldColor}
          fillOpacity="0.08"
        />
      </svg>
      {/* Subtle gold glow ring */}
      <div className={`absolute -inset-2 rounded-2xl bg-gradient-to-br ${admin ? 'from-[#B8860B]/10 to-transparent' : 'from-[#047857]/10 to-[#B8860B]/5'} blur-sm -z-10`} />
    </div>
  )
}

// ─── Animation variants ───────────────────────────────────────────
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

export function LoginForm() {
  const { setAuthView, setShowTermsModal, setUser, setIsAuthenticated } = useAuthStore()
  const { t, isRTL } = useI18n()
  const { showAdminLogin, setShowAdminLogin, loginAdmin, addAuditLog } = useAdminAuthStore()

  // Shared state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  // Admin-specific state
  const [adminAttempts, setAdminAttempts] = useState(0)
  const [adminError, setAdminError] = useState<string | null>(null)

  // Field validation errors
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  // ─── Regular Login ────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {}
    if (!email.trim()) {
      newErrors.email = t.auth.requiredField
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) newErrors.email = t.auth.invalidEmail
    }
    if (!password) newErrors.password = t.auth.requiredField
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)

    try {
      setAuthError('')

      const { user, error: localError } = await localLogin({ email, password })

      if (localError) {
        let message = localError
        if (localError.includes('Invalid email or password')) {
          message = t.auth.invalidCredentials
        }
        setAuthError(message)
        toast.error(message)
        return
      }

      if (user) {
        const profile = localUserToProfile(user)
        setUser(profile)
        setIsAuthenticated(true)
        toast.success(t.auth.loginSuccess)

        // Also sign in to Supabase client-side if available
        if (!isDemoMode()) {
          try {
            const supabase = createClient()
            await supabase.auth.signInWithPassword({ email, password })
          } catch {
            // Non-critical
          }
        }

        // Force page reload to ensure the httpOnly cookie-based session is fully established
        window.location.reload()
      } else {
        setAuthError(t.auth.invalidCredentials)
      }
    } catch {
      setAuthError(t.common.error)
      toast.error(t.common.error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (isDemoMode()) {
      toast.error(isRTL ? 'تسجيل الدخول عبر Google غير متاح حالياً' : 'Google sign-in is not available in offline mode')
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error: supabaseError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/api/auth/callback`, skipBrowserRedirect: false },
      })
      if (supabaseError) {
        const message = (supabaseError as { name?: string }).name === 'DemoModeError'
          ? t.auth.authServiceUnavailable
          : supabaseError.message
        toast.error(message)
      }
    } catch {
      toast.error(t.common.error)
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Admin Login ──────────────────────────────────────────────────────
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminError(null)
    setIsLoading(true)

    if (adminAttempts >= 5) {
      setAdminError('Too many attempts. Access temporarily locked.')
      setIsLoading(false)
      addAuditLog('rate_limited', 'admin_auth', null, { email, attempts: adminAttempts })
      return
    }

    try {
      const success = await loginAdmin(email, password)
      if (!success) {
        setAdminAttempts(prev => prev + 1)
        setAdminError('Invalid credentials or unauthorized access.')
        toast.error('Access denied', { description: 'Authentication failed.' })
      } else {
        toast.success('Access granted', { description: 'Welcome to the control center.' })
      }
    } catch {
      setAdminError('Authentication failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const switchToAdmin = () => {
    setAuthError('')
    setAdminError(null)
    setEmail('')
    setPassword('')
  }

  const switchToUser = () => {
    setShowAdminLogin(false)
    setAuthError('')
    setAdminError(null)
    setEmail('')
    setPassword('')
  }

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <>
      <div className="w-full max-w-md mx-auto relative z-10" dir={isRTL ? 'rtl' : 'ltr'}>
        <motion.div
          className="glass rounded-2xl p-8 shadow-warm-lg"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Top bar: Theme toggle + Language selector */}
          <motion.div
            className="flex items-center justify-between"
            {...fadeUp}
            transition={{ duration: 0.35, delay: 0 }}
          >
            <ThemeToggle />
            <LanguageSelector />
          </motion.div>

          {/* Logo + Heading */}
          <motion.div
            className="space-y-2 text-center mt-6"
            {...fadeUp}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <div className="flex justify-center mb-4">
              <motion.button
                type="button"
                className="relative cursor-pointer select-none focus:outline-none"
                onClick={() => {
                  if (showAdminLogin) return
                  const triggered = useAdminAuthStore.getState().incrementLogoClick()
                  if (triggered) {
                    toast('🔐', { description: 'Admin access point detected' })
                    switchToAdmin()
                  }
                }}
                whileTap={{ scale: 0.95 }}
                aria-label="USRA PLUS logo"
              >
                <HexLogo className="w-14 h-14" admin={showAdminLogin} />
              </motion.button>
            </div>

            <motion.h1
              className="text-2xl font-bold tracking-tight font-display"
              style={{ color: showAdminLogin ? 'var(--accent)' : 'var(--foreground)' }}
              layout
            >
              {showAdminLogin ? 'Control Center' : (isRTL ? 'مرحباً بعودتك' : 'Welcome Back')}
            </motion.h1>
            <motion.p
              className="text-sm text-muted-foreground"
              layout
            >
              {showAdminLogin
                ? 'Authorized personnel only. All access is monitored.'
                : (isRTL ? 'سجّل الدخول إلى عائلتك' : 'Sign in to your family')
              }
            </motion.p>

            {/* Gold accent line under heading */}
            <div className="gold-line w-12 mx-auto mt-3" />
          </motion.div>

          {/* ─── Admin Mode Indicator ────────────────────────────────── */}
          {showAdminLogin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/10 border border-accent/20"
            >
              <Shield className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="text-xs text-accent font-medium">Admin Mode</span>
              <button
                type="button"
                onClick={switchToUser}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <ArrowLeft className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                Exit
              </button>
            </motion.div>
          )}

          {/* ─── Unified Form ────────────────────────────────────────── */}
          <form onSubmit={showAdminLogin ? handleAdminSubmit : handleSubmit} className="space-y-4 mt-6">
            {/* Email / Access Identifier */}
            <motion.div className="space-y-1.5" {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
              <Label className="text-sm font-medium text-muted-foreground">
                {showAdminLogin ? 'Access Identifier' : t.auth.email}
              </Label>
              <div className="relative">
                {showAdminLogin ? (
                  <Fingerprint className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 ${isRTL ? 'right-3' : 'left-3'}`} />
                ) : (
                  <Mail className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 ${isRTL ? 'right-3' : 'left-3'}`} />
                )}
                <Input
                  type="email"
                  placeholder={showAdminLogin ? 'Enter access identifier' : (isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email')}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
                    if (authError) setAuthError('')
                    if (adminError) setAdminError(null)
                  }}
                  className={`h-11 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_12px_-2px_rgba(184,134,11,0.1)] transition-all duration-200 ${showAdminLogin ? 'focus:border-accent focus:ring-accent/20 focus:shadow-[0_0_12px_-2px_rgba(184,134,11,0.15)]' : ''} ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} ${errors.email ? 'border-destructive/50 focus:border-destructive focus:ring-destructive/20' : ''}`}
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>
              {errors.email && !showAdminLogin && (
                <p className="text-xs text-destructive mt-1">{errors.email}</p>
              )}
            </motion.div>

            {/* Password / Access Key */}
            <motion.div className="space-y-1.5" {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }}>
              {!showAdminLogin && (
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t.auth.password}
                  </Label>
                  <button
                    type="button"
                    onClick={() => setAuthView('forgot-password')}
                    className="text-xs text-primary hover:text-primary/80 transition-colors duration-200 font-medium"
                  >
                    {t.auth.forgotPassword}
                  </button>
                </div>
              )}
              {showAdminLogin && (
                <Label className="text-sm font-medium text-muted-foreground">
                  Access Key
                </Label>
              )}
              <div className="relative">
                <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={showAdminLogin ? '••••••••••••' : (isRTL ? 'أدخل كلمة المرور' : 'Enter your password')}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                    if (authError) setAuthError('')
                    if (adminError) setAdminError(null)
                  }}
                  className={`h-11 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_12px_-2px_rgba(184,134,11,0.1)] transition-all duration-200 ${showAdminLogin ? 'focus:border-accent focus:ring-accent/20 focus:shadow-[0_0_12px_-2px_rgba(184,134,11,0.15)]' : ''} ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} ${errors.password ? 'border-destructive/50 focus:border-destructive focus:ring-destructive/20' : ''}`}
                  disabled={isLoading}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10 ${isRTL ? 'left-3' : 'right-3'}`}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && !showAdminLogin && (
                <p className="text-xs text-destructive mt-1">{errors.password}</p>
              )}
            </motion.div>

            {/* Remember me checkbox (user mode only) */}
            {!showAdminLogin && (
              <motion.div
                className="flex items-center gap-2.5"
                {...fadeUp}
                transition={{ duration: 0.35, delay: 0.18 }}
              >
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  disabled={isLoading}
                />
                <label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer select-none">
                  {isRTL ? 'تذكرني' : 'Remember me'}
                </label>
              </motion.div>
            )}

            {/* Inline error messages */}
            {authError && !showAdminLogin && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-destructive"
              >
                {authError}
              </motion.p>
            )}
            {adminError && showAdminLogin && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1"
              >
                <p className="text-xs text-destructive">{adminError}</p>
                {adminAttempts > 0 && adminAttempts < 5 && (
                  <p className="text-[11px] text-destructive/70">
                    {5 - adminAttempts} attempt{5 - adminAttempts !== 1 ? 's' : ''} remaining
                  </p>
                )}
              </motion.div>
            )}

            {/* Submit Button — Emerald-to-Gold Gradient */}
            <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
              <Button
                type="submit"
                disabled={isLoading || (showAdminLogin && adminAttempts >= 5)}
                className={`w-full h-11 rounded-xl font-semibold text-sm text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                  showAdminLogin
                    ? 'bg-gradient-to-r from-[#B8860B] to-[#D4A843] hover:from-[#D4A843] hover:to-[#B8860B] shadow-lg shadow-[#B8860B]/20'
                    : 'btn-gradient shadow-lg shadow-primary/20'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{showAdminLogin ? 'Authenticating...' : ''}</span>
                  </span>
                ) : (
                  <span>{showAdminLogin ? 'Access Control Center' : (isRTL ? 'تسجيل الدخول' : 'Sign In')}</span>
                )}
              </Button>
            </motion.div>
          </form>

          {/* ─── Contextual sections below form ─────────────────────────── */}
          {showAdminLogin ? (
            /* Admin footer */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-5 text-center"
            >
              <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                All login attempts are monitored, logged, and audited.<br />
                Unauthorized access is strictly prohibited.
              </p>
            </motion.div>
          ) : (
            <>
              {/* Divider with gold line */}
              <motion.div
                className="relative mt-6"
                {...fadeUp}
                transition={{ duration: 0.35, delay: 0.25 }}
              >
                <div className="gold-line w-full" />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                  {t.auth.orContinueWith}
                </span>
              </motion.div>

              {/* Google OAuth */}
              <motion.div
                className="mt-4"
                {...fadeUp}
                transition={{ duration: 0.35, delay: 0.3 }}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full border-border bg-card/50 text-muted-foreground hover:bg-secondary hover:text-foreground hover:border-[#B8860B]/20 rounded-xl h-11 font-medium transition-all duration-200"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className={`w-5 h-5 shrink-0 ${isRTL ? 'ml-2' : 'mr-2'}`} viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  {t.auth.googleLogin}
                </Button>
              </motion.div>

              {/* Terms */}
              <motion.div
                className="mt-4"
                {...fadeUp}
                transition={{ duration: 0.35, delay: 0.35 }}
              >
                <p className="text-center text-xs text-muted-foreground leading-relaxed">
                  {t.auth.termsAgreement}{' '}
                  <button type="button" onClick={() => setShowTermsModal(true)} className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors duration-200">
                    {t.auth.termsOfService}
                  </button>{' '}
                  {t.auth.and}{' '}
                  <button type="button" onClick={() => setShowTermsModal(true)} className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors duration-200">
                    {t.auth.privacyPolicy}
                  </button>
                </p>
              </motion.div>

              {/* Sign up link — gold accent */}
              <motion.div
                className="text-center mt-4"
                {...fadeUp}
                transition={{ duration: 0.35, delay: 0.4 }}
              >
                <p className="text-sm text-muted-foreground">
                  {t.auth.noAccount}{' '}
                  <button type="button" onClick={() => setAuthView('signup')} className="text-accent hover:text-accent/80 font-medium transition-colors duration-200">
                    {t.auth.signUpInstead}
                  </button>
                </p>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>

      <TermsModal />
    </>
  )
}
