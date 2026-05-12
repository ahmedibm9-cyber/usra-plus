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
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  Sparkles,
  Shield,
  Fingerprint,
  ArrowLeft,
  AlertTriangle,
  CircleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAdminAuthStore } from '@/stores/admin-auth-store'

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

  // ─── Regular Login ────────────────────────────────────────────────────
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  // Password strength calculation
  const getPasswordStrength = (pwd: string): { level: number; color: string; label: string } => {
    if (!pwd) return { level: 0, color: '', label: '' }
    if (pwd.length < 4) return { level: 1, color: '#FF3B30', label: isRTL ? 'ضعيفة' : 'Weak' }
    if (pwd.length < 8) return { level: 2, color: '#FF9500', label: isRTL ? 'متوسطة' : 'Fair' }
    if (pwd.length < 12) return { level: 3, color: '#FFCC00', label: isRTL ? 'جيدة' : 'Good' }
    return { level: 4, color: '#34C759', label: isRTL ? 'قوية' : 'Strong' }
  }

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

      // ALWAYS use the API route for login — it handles both Prisma and Supabase internally
      // and sets the usra-auth-token httpOnly cookie for session persistence.
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
        
        // Also sign in to Supabase client-side if available (for realtime subscriptions, etc.)
        if (!isDemoMode()) {
          try {
            const supabase = createClient()
            await supabase.auth.signInWithPassword({ email, password })
          } catch {
            // Non-critical — the API route already authenticated the user
          }
        }

        // Force page reload to ensure the httpOnly cookie-based session is fully established
        // This prevents stale state where the auth store shows authenticated but the 
        // page component hasn't re-fetched the session from the API
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
    // Google OAuth not available in local mode
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

  const passwordStrength = getPasswordStrength(password)

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <>
      <div className="w-full max-w-md mx-auto relative z-10" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Decorative accent line at top */}
        <div className="absolute -top-px inset-x-0 h-1 rounded-t-3xl bg-gradient-to-r from-[#E50914] via-[#007AFF] to-[#007AFF]" />

        <div className="bg-gradient-to-b from-[--bg-surface] to-[--bg-surface-2] rounded-3xl p-8 border border-[--border-subtle] shadow-2xl backdrop-blur-xl">
          {/* Language selector + Theme toggle */}
          <motion.div
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0 }}
          >
            <ThemeToggle />
            <LanguageSelector />
          </motion.div>

          {/* Header — morphs between user and admin */}
          <motion.div
            className="space-y-2 text-center mt-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <div className="flex justify-center mb-3">
              <motion.div
                className="relative cursor-pointer select-none"
                onClick={() => {
                  if (showAdminLogin) return // already in admin mode
                  const triggered = useAdminAuthStore.getState().incrementLogoClick()
                  if (triggered) {
                    toast('🔐', { description: 'Admin access point detected' })
                    switchToAdmin()
                  }
                }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  layout
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{
                    background: showAdminLogin
                      ? 'linear-gradient(135deg, #F4C430, #E0B52E)'
                      : 'linear-gradient(135deg, #007AFF, #0066CC)',
                    boxShadow: showAdminLogin
                      ? '0 10px 25px rgba(244,196,48,0.2)'
                      : '0 10px 25px rgba(0,122,255,0.2)',
                  }}
                  transition={{ duration: 0.4 }}
                >
                  <motion.div layout transition={{ duration: 0.3 }}>
                    {showAdminLogin ? (
                      <Shield className="w-7 h-7 text-black" />
                    ) : (
                      <Sparkles className="w-7 h-7 text-white" />
                    )}
                  </motion.div>
                </motion.div>
                {!showAdminLogin && (
                  <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-br from-[#007AFF]/20 to-[#0066CC]/20 blur-sm" />
                )}
              </motion.div>
            </div>

            <motion.h1 layout className="text-2xl font-bold tracking-tight font-display" style={{ color: showAdminLogin ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
              {showAdminLogin ? 'Control Center' : t.app.name}
            </motion.h1>
            <motion.p layout className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {showAdminLogin ? 'Authorized personnel only. All access is monitored.' : t.app.tagline}
            </motion.p>
          </motion.div>

          {/* ─── Admin Mode Indicator ──────────────────────────────────── */}
          {showAdminLogin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F4C430]/10 border border-[#F4C430]/20"
            >
              <Shield className="w-3.5 h-3.5 text-[#F4C430] shrink-0" />
              <span className="text-xs text-[#E0B52E] dark:text-[#F4C430]">Admin Mode</span>
              <button
                type="button"
                onClick={switchToUser}
                className="ml-auto text-xs text-[--text-muted] hover:text-[--text-primary] transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Exit
              </button>
            </motion.div>
          )}

          {/* Error banners using Alert component */}
          {authError && !showAdminLogin && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="mt-4"
            >
              <Alert variant="destructive" className="border-[#FF3B30]/20 bg-[#FF3B30]/5 rounded-xl">
                <CircleAlert className="h-4 w-4 text-[#FF3B30]" />
                <AlertDescription className="text-sm text-[#FF3B30]">
                  {authError}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {adminError && showAdminLogin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4"
            >
              <Alert variant="destructive" className="border-[#FF3B30]/20 bg-[#FF3B30]/10 rounded-xl">
                <AlertTriangle className="h-4 w-4 text-[#FF3B30]" />
                <AlertDescription className="text-[#FF3B30]">
                  <p className="text-sm">{adminError}</p>
                  {adminAttempts > 0 && adminAttempts < 5 && (
                    <p className="text-xs text-[#FF3B30]/70 mt-1">{5 - adminAttempts} attempt{5 - adminAttempts !== 1 ? 's' : ''} remaining</p>
                  )}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* ─── Unified Form ──────────────────────────────────────────── */}
          <form onSubmit={showAdminLogin ? handleAdminSubmit : handleSubmit} className="space-y-4 mt-6">
            {/* Email */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {showAdminLogin ? 'Access Identifier' : t.auth.email}
              </Label>
              <div className="auth-input-wrapper">
                {showAdminLogin ? (
                  <Fingerprint className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted] z-10 ${isRTL ? 'right-3' : 'left-3'}`} />
                ) : (
                  <Mail className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted] z-10 ${isRTL ? 'right-3' : 'left-3'}`} />
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
                  className={`h-11 premium-input bg-[--bg-surface-2] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] rounded-xl focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 transition-all duration-200 ${showAdminLogin ? 'focus:border-[#F4C430] focus:ring-[#F4C430]/20' : ''} ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} ${errors.email ? 'border-[#FF3B30]/50' : ''}`}
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>
              {errors.email && !showAdminLogin && (
                <p className="text-sm text-[#FF3B30] flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#FF3B30]" />
                  {errors.email}
                </p>
              )}
            </motion.div>

            {/* Password */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              {!showAdminLogin && (
                <div className="flex items-center justify-between">
                  <Label className="text-[--text-secondary] text-sm font-medium">
                    {t.auth.password}
                  </Label>
                  <button
                    type="button"
                    onClick={() => setAuthView('forgot-password')}
                    className="text-xs text-[#007AFF] hover:text-[#0066CC] transition-colors duration-200"
                  >
                    {t.auth.forgotPassword}
                  </button>
                </div>
              )}
              {showAdminLogin && (
                <Label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Access Key
                </Label>
              )}
              <div className="auth-input-wrapper">
                <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted] z-10 ${isRTL ? 'right-3' : 'left-3'}`} />
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
                  className={`h-11 premium-input bg-[--bg-surface-2] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] rounded-xl focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 transition-all duration-200 ${showAdminLogin ? 'focus:border-[#F4C430] focus:ring-[#F4C430]/20' : ''} ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} ${errors.password ? 'border-[#FF3B30]/50' : ''}`}
                  disabled={isLoading}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-[--text-secondary] transition-colors z-10 ${isRTL ? 'left-3' : 'right-3'}`}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength indicator bar */}
              {!showAdminLogin && password && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className="h-1.5 flex-1 rounded-full transition-all duration-500 ease-out"
                        style={{
                          backgroundColor: level <= passwordStrength.level
                            ? passwordStrength.color
                            : 'var(--border-subtle)',
                          opacity: level <= passwordStrength.level ? 1 : 0.3,
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] transition-colors duration-300" style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </p>
                </div>
              )}

              {errors.password && !showAdminLogin && (
                <p className="text-sm text-[#FF3B30] flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#FF3B30]" />
                  {errors.password}
                </p>
              )}
            </motion.div>

            {/* Remember me checkbox (user mode only) */}
            {!showAdminLogin && (
              <motion.div
                className="flex items-center gap-2.5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.18 }}
              >
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="data-[state=checked]:bg-[#007AFF] data-[state=checked]:border-[#007AFF]"
                  disabled={isLoading}
                />
                <label htmlFor="remember-me" className="text-sm text-[--text-muted] cursor-pointer select-none">
                  {isRTL ? 'تذكرني' : 'Remember me'}
                </label>
              </motion.div>
            )}

            {/* Submit Button — uses shadcn Button with gradient style prop */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Button
                type="submit"
                disabled={isLoading || (showAdminLogin && adminAttempts >= 5)}
                className="w-full py-3 rounded-xl h-11 font-semibold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-display"
                style={{
                  background: showAdminLogin
                    ? 'linear-gradient(135deg, #F4C430, #E0B52E)'
                    : '#007AFF',
                  color: showAdminLogin ? '#000000' : '#fff',
                  boxShadow: showAdminLogin
                    ? '0 10px 25px rgba(244,196,48,0.2)'
                    : '0 10px 25px rgba(0,122,255,0.2)',
                }}
                asChild
              >
                <motion.span
                  whileHover={!isLoading ? { scale: 1.01 } : {}}
                  whileTap={!isLoading ? { scale: 0.98 } : {}}
                  className="flex items-center justify-center gap-2 w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{showAdminLogin ? 'Authenticating...' : ''}</span>
                    </>
                  ) : (
                    <span>{showAdminLogin ? 'Access Control Center' : t.auth.login}</span>
                  )}
                </motion.span>
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
              <p className="text-[10px] text-[--text-muted] leading-relaxed">
                All login attempts are monitored, logged, and audited.<br />
                Unauthorized access is strictly prohibited.
              </p>
            </motion.div>
          ) : (
            <>
              {/* Divider + Google OAuth (user mode only) */}
              <motion.div
                className="relative mt-6"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
              >
                <Separator className="bg-[--border-subtle]" />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[--bg-surface] px-3 text-xs text-[--text-muted]">
                  {t.auth.orContinueWith}
                </span>
              </motion.div>

              <motion.div
                className="mt-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full border-[--border-subtle] bg-[--bg-surface] text-[--text-secondary] hover:bg-[--bg-surface-2] hover:text-[--text-primary] hover:border-[--border-medium] hover:scale-[1.01] rounded-xl h-11 font-medium transition-all duration-200"
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
              >
                <p className="text-center text-xs text-[--text-muted] leading-relaxed">
                  {t.auth.termsAgreement}{' '}
                  <button type="button" onClick={() => setShowTermsModal(true)} className="text-[#007AFF] hover:text-[#0066CC] underline underline-offset-2 transition-colors duration-200">
                    {t.auth.termsOfService}
                  </button>{' '}
                  {t.auth.and}{' '}
                  <button type="button" onClick={() => setShowTermsModal(true)} className="text-[#007AFF] hover:text-[#0066CC] underline underline-offset-2 transition-colors duration-200">
                    {t.auth.privacyPolicy}
                  </button>
                </p>
              </motion.div>

              {/* Sign up link */}
              <motion.div
                className="text-center mt-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.45 }}
              >
                <p className="text-sm text-[--text-muted]">
                  {t.auth.noAccount}{' '}
                  <button type="button" onClick={() => setAuthView('signup')} className="text-[#007AFF] hover:text-[#0066CC] font-medium transition-colors duration-200">
                    {t.auth.signUpInstead}
                  </button>
                </p>
              </motion.div>
            </>
          )}
        </div>
      </div>

      <TermsModal />
    </>
  )
}
