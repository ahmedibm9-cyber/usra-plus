'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient, isDemoMode } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'
import { ThemeProvider } from '@mui/material/styles'
import { getAppTheme } from '@/lib/mui-theme'
import {
  Card,
  CardContent,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Typography,
  Box,
  Stack,
  InputAdornment,
  Divider,
  Link,
} from '@mui/material'
import {
  Mail,
  Lock,
  Visibility,
  VisibilityOff,
  Shield,
  Fingerprint,
  ArrowBack,
} from '@mui/icons-material'
import { LanguageSelector } from './language-selector'
import { ThemeToggle } from './theme-toggle'
import { TermsModal } from './terms-modal'
import { localLogin, localUserToProfile } from '@/lib/local-auth'
import { toast } from 'sonner'
import { useAdminAuthStore } from '@/stores/admin-auth-store'
import { useAppStore } from '@/stores/app-store'

// ─── Animation variants ───────────────────────────────────────────
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

// Google SVG icon
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

// USRA PLUS Logo
function UsraLogo({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Box
      sx={{
        width: 56,
        height: 56,
        borderRadius: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: isAdmin ? 'secondary.light' : 'primary.light',
        transition: 'background-color 0.3s',
      }}
    >
      <svg viewBox="0 0 40 44" fill="none" width="32" height="32">
        <path
          d="M20 1L37.3205 10.5V29.5L20 39L2.67949 29.5V10.5L20 1Z"
          fill="currentColor"
          style={{ color: isAdmin ? '#065F46' : '#0D6B58' }}
          fillOpacity="0.7"
        />
        <path
          d="M20 14L25.5885 17.5V24.5L20 28L14.4115 24.5V17.5L20 14Z"
          fill="currentColor"
          style={{ color: isAdmin ? '#065F46' : '#0D6B58' }}
        />
      </svg>
    </Box>
  )
}

export function LoginForm() {
  const { setAuthView, setShowTermsModal, setUser, setIsAuthenticated } = useAuthStore()
  const { t, isRTL } = useI18n()
  const { showAdminLogin, setShowAdminLogin, loginAdmin, addAuditLog } = useAdminAuthStore()
  const { theme } = useAppStore()
  const muiTheme = getAppTheme(theme)

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

        if (!isDemoMode()) {
          try {
            const supabase = createClient()
            await supabase.auth.signInWithPassword({ email, password })
          } catch {
            // Non-critical
          }
        }

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
    <ThemeProvider theme={muiTheme}>
      <Box sx={{ width: '100%', maxWidth: 448, mx: 'auto', position: 'relative', zIndex: 10 }} dir={isRTL ? 'rtl' : 'ltr'}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        >
          <Card
            sx={{
              borderRadius: 4,
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              {/* Top bar: Theme toggle + Language selector */}
              <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemeToggle />
                  <LanguageSelector />
                </Stack>
              </motion.div>

              {/* Logo + Heading */}
              <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.05 }}>
                <Box sx={{ textAlign: 'center', mt: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <IconButton
                      onClick={() => {
                        if (showAdminLogin) return
                        const triggered = useAdminAuthStore.getState().incrementLogoClick()
                        if (triggered) {
                          toast('🔐', { description: 'Admin access point detected' })
                          switchToAdmin()
                        }
                      }}
                      aria-label="USRA PLUS logo"
                      sx={{
                        '&:hover': { bgcolor: 'transparent' },
                        cursor: 'pointer',
                        p: 0,
                      }}
                    >
                      <UsraLogo isAdmin={!!showAdminLogin} />
                    </IconButton>
                  </Box>

                  <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: -0.5, mb: 0.5 }}>
                    {showAdminLogin ? 'Control Center' : (isRTL ? 'مرحباً بعودتك' : 'Welcome Back')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {showAdminLogin
                      ? 'Authorized personnel only. All access is monitored.'
                      : (isRTL ? 'سجّل الدخول إلى عائلتك' : 'Sign in to your family')
                    }
                  </Typography>
                </Box>
              </motion.div>

              {/* Admin Mode Indicator */}
              {showAdminLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      mt: 2,
                      px: 1.5,
                      py: 1,
                      borderRadius: 2,
                      bgcolor: 'secondary.light',
                      alignItems: 'center',
                    }}
                  >
                    <Shield sx={{ fontSize: 14, flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>Admin Mode</Typography>
                    <Button
                      size="small"
                      onClick={switchToUser}
                      sx={{
                        ml: 'auto',
                        fontSize: 12,
                        minWidth: 'auto',
                        p: 0,
                        color: 'text.secondary',
                        '&:hover': { bgcolor: 'transparent', color: 'text.primary' },
                      }}
                    >
                      <ArrowBack sx={{ fontSize: 12, mr: 0.5, transform: isRTL ? 'scaleX(-1)' : 'none' }} />
                      Exit
                    </Button>
                  </Stack>
                </motion.div>
              )}

              {/* Unified Form */}
              <Box
                component="form"
                onSubmit={showAdminLogin ? handleAdminSubmit : handleSubmit}
                sx={{ mt: 3, '& > .MuiBox-root + .MuiBox-root': { mt: 2 } }}
              >
                {/* Email / Access Identifier */}
                <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.1 }}>
                  <TextField
                    fullWidth
                    type="email"
                    label={showAdminLogin ? 'Access Identifier' : t.auth.email}
                    placeholder={showAdminLogin ? 'Enter access identifier' : (isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email')}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
                      if (authError) setAuthError('')
                      if (adminError) setAdminError(null)
                    }}
                    disabled={isLoading}
                    error={!!errors.email}
                    helperText={errors.email && !showAdminLogin ? errors.email : ''}
                    autoComplete="off"
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            {showAdminLogin ? <Fingerprint sx={{ fontSize: 18, color: 'text.secondary' }} /> : <Mail sx={{ fontSize: 18, color: 'text.secondary' }} />}
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        height: 48,
                      },
                    }}
                  />
                </motion.div>

                {/* Password / Access Key */}
                <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.15 }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {showAdminLogin ? 'Access Key' : t.auth.password}
                    </Typography>
                    {!showAdminLogin && (
                      <Link
                        component="button"
                        type="button"
                        onClick={() => setAuthView('forgot-password')}
                        underline="hover"
                        sx={{
                          fontSize: 12,
                          color: 'primary.main',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        {t.auth.forgotPassword}
                      </Link>
                    )}
                  </Stack>
                  <TextField
                    fullWidth
                    type={showPassword ? 'text' : 'password'}
                    placeholder={showAdminLogin ? '••••••••••••' : (isRTL ? 'أدخل كلمة المرور' : 'Enter your password')}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                      if (authError) setAuthError('')
                      if (adminError) setAdminError(null)
                    }}
                    disabled={isLoading}
                    error={!!errors.password}
                    helperText={errors.password && !showAdminLogin ? errors.password : ''}
                    autoComplete="off"
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock sx={{ fontSize: 18, color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              tabIndex={-1}
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                              size="small"
                            >
                              {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        height: 48,
                      },
                    }}
                  />
                </motion.div>

                {/* Remember me checkbox (user mode only) */}
                {!showAdminLogin && (
                  <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.18 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          disabled={isLoading}
                          size="small"
                          sx={{ color: 'primary.main', '&.Mui-checked': { color: 'primary.main' } }}
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ color: 'text.secondary', userSelect: 'none' }}>
                          {isRTL ? 'تذكرني' : 'Remember me'}
                        </Typography>
                      }
                    />
                  </motion.div>
                )}

                {/* Inline error messages */}
                {authError && !showAdminLogin && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                    <Typography variant="caption" sx={{ color: 'error.main' }}>
                      {authError}
                    </Typography>
                  </motion.div>
                )}
                {adminError && showAdminLogin && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                    <Typography variant="caption" sx={{ color: 'error.main', display: 'block' }}>
                      {adminError}
                    </Typography>
                    {adminAttempts > 0 && adminAttempts < 5 && (
                      <Typography variant="caption" sx={{ color: 'error.main', opacity: 0.7 }}>
                        {5 - adminAttempts} attempt{5 - adminAttempts !== 1 ? 's' : ''} remaining
                      </Typography>
                    )}
                  </motion.div>
                )}

                {/* Submit Button */}
                <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.2 }}>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={isLoading || (showAdminLogin && adminAttempts >= 5)}
                    color={showAdminLogin ? 'secondary' : 'primary'}
                    sx={{
                      height: 48,
                      borderRadius: 2,
                      fontSize: 14,
                      fontWeight: 600,
                      mt: 1,
                    }}
                  >
                    {isLoading
                      ? (showAdminLogin ? 'Authenticating...' : (isRTL ? 'جاري التسجيل...' : 'Signing in...'))
                      : (showAdminLogin ? 'Access Control Center' : (isRTL ? 'تسجيل الدخول' : 'Sign In'))
                    }
                  </Button>
                </motion.div>
              </Box>

              {/* Contextual sections below form */}
              {showAdminLogin ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      textAlign: 'center',
                      mt: 2,
                      color: 'text.secondary',
                      opacity: 0.6,
                      lineHeight: 1.8,
                    }}
                  >
                    All login attempts are monitored, logged, and audited.
                    <br />
                    Unauthorized access is strictly prohibited.
                  </Typography>
                </motion.div>
              ) : (
                <>
                  {/* Divider */}
                  <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.25 }}>
                    <Divider sx={{ mt: 3 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', px: 1 }}>
                        {t.auth.orContinueWith}
                      </Typography>
                    </Divider>
                  </motion.div>

                  {/* Google OAuth */}
                  <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.3 }}>
                    <Button
                      type="button"
                      fullWidth
                      variant="outlined"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      startIcon={isLoading ? undefined : <GoogleIcon />}
                      sx={{
                        mt: 2,
                        height: 48,
                        borderRadius: 2,
                        borderColor: 'divider',
                        color: 'text.secondary',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      {isLoading ? '...' : t.auth.googleLogin}
                    </Button>
                  </motion.div>

                  {/* Terms */}
                  <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.35 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        textAlign: 'center',
                        mt: 2,
                        color: 'text.secondary',
                        lineHeight: 1.8,
                      }}
                    >
                      {t.auth.termsAgreement}{' '}
                      <Link
                        component="button"
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        underline="hover"
                        sx={{ color: 'primary.main', fontSize: 'inherit' }}
                      >
                        {t.auth.termsOfService}
                      </Link>{' '}
                      {t.auth.and}{' '}
                      <Link
                        component="button"
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        underline="hover"
                        sx={{ color: 'primary.main', fontSize: 'inherit' }}
                      >
                        {t.auth.privacyPolicy}
                      </Link>
                    </Typography>
                  </motion.div>

                  {/* Sign up link */}
                  <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.4 }}>
                    <Typography
                      variant="body2"
                      sx={{ textAlign: 'center', mt: 2, color: 'text.secondary' }}
                    >
                      {t.auth.noAccount}{' '}
                      <Link
                        component="button"
                        type="button"
                        onClick={() => setAuthView('signup')}
                        underline="hover"
                        sx={{ color: 'primary.main', fontWeight: 600, fontSize: 'inherit' }}
                      >
                        {t.auth.signUpInstead}
                      </Link>
                    </Typography>
                  </motion.div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </Box>

      <TermsModal />
    </ThemeProvider>
  )
}
