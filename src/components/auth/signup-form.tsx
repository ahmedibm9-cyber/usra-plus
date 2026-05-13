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
  Typography,
  Box,
  Stack,
  InputAdornment,
  Divider,
  Link,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  IconButton,
} from '@mui/material'
import {
  Mail,
  Lock,
  Visibility,
  VisibilityOff,
  Person,
  Phone,
} from '@mui/icons-material'
import { LanguageSelector } from './language-selector'
import { ThemeToggle } from './theme-toggle'
import { TermsModal } from './terms-modal'
import { OtpVerificationForm } from './otp-verification-form'
import { localSignUp } from '@/lib/local-auth'
import { toast } from 'sonner'
import { useAppStore } from '@/stores/app-store'

const countryCodes = [
  { code: '+966', country: 'SA', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+971', country: 'AE', flag: '🇦🇪', name: 'UAE' },
  { code: '+965', country: 'KW', flag: '🇰🇼', name: 'Kuwait' },
  { code: '+974', country: 'QA', flag: '🇶🇦', name: 'Qatar' },
  { code: '+973', country: 'BH', flag: '🇧🇭', name: 'Bahrain' },
  { code: '+968', country: 'OM', flag: '🇴🇲', name: 'Oman' },
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States' },
  { code: '+44', country: 'UK', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
]

interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  password?: string
  confirmPassword?: string
  terms?: string
}

// Password strength calculation with teal/amber colors (no red/yellow)
const getPasswordStrength = (pwd: string): { level: number; percent: number; color: string; label: string } => {
  if (!pwd) return { level: 0, percent: 0, color: '', label: '' }
  if (pwd.length < 6) return { level: 1, percent: 25, color: '#92400E', label: 'Weak' } // amber dark
  if (pwd.length < 8) return { level: 2, percent: 50, color: '#D97706', label: 'Fair' } // amber
  if (pwd.length < 12) return { level: 3, percent: 75, color: '#0D6B58', label: 'Good' } // teal
  return { level: 4, percent: 100, color: '#0D6B58', label: 'Strong' } // teal
}

// USRA PLUS Hex Logo
function HexLogo() {
  return (
    <Box
      sx={{
        width: 56,
        height: 56,
        borderRadius: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'primary.light',
        border: '1px solid',
        borderColor: 'rgba(13,107,88,0.2)',
      }}
    >
      <svg viewBox="0 0 40 44" fill="none" width="32" height="32">
        <path d="M20 1L37.3205 10.5V29.5L20 39L2.67949 29.5V10.5L20 1Z" fill="#0D6B58" fillOpacity="0.1" stroke="#0D6B58" strokeWidth="1.5" />
        <path d="M20 8L30.3923 14V26L20 32L9.6077 26V14L20 8Z" fill="#0D6B58" fillOpacity="0.4" />
        <path d="M20 14L25.5885 17.5V24.5L20 28L14.4115 24.5V17.5L20 14Z" fill="#0D6B58" fillOpacity="0.8" />
      </svg>
    </Box>
  )
}

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

export function SignupForm() {
  const { setAuthView, setShowTermsModal } = useAuthStore()
  const { t, isRTL } = useI18n()
  const { theme } = useAppStore()
  const muiTheme = getAppTheme(theme)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [countryCode, setCountryCode] = useState('+966')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [authError, setAuthError] = useState('')
  const [showOtp, setShowOtp] = useState(false)
  const [otpEmail, setOtpEmail] = useState('')
  const [otpDevCode, setOtpDevCode] = useState('')

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!firstName.trim()) {
      newErrors.firstName = t.auth.requiredField
    }
    if (!lastName.trim()) {
      newErrors.lastName = t.auth.requiredField
    }

    if (!email.trim()) {
      newErrors.email = t.auth.requiredField
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        newErrors.email = t.auth.invalidEmail
      }
    }

    if (phone.trim() && !/^\d{6,15}$/.test(phone.replace(/[\s-]/g, ''))) {
      newErrors.phone = isRTL ? 'رقم الهاتف غير صالح' : 'Invalid phone number'
    }

    if (!password) {
      newErrors.password = t.auth.requiredField
    } else if (password.length < 8) {
      newErrors.password = t.auth.passwordMinLength
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = t.auth.requiredField
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t.auth.passwordsNotMatch
    }

    if (!agreedToTerms) {
      newErrors.terms = isRTL
        ? 'يجب الموافقة على شروط الخدمة'
        : 'You must agree to the Terms of Service'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsLoading(true)

    try {
      setAuthError('')

      const { user, error: localError, devCode } = await localSignUp({
        firstName,
        lastName,
        email,
        password,
        phone: phone ? `${countryCode}${phone}` : undefined,
        countryCode,
      })

      if (localError) {
        let message = localError
        if (localError.includes('already exists')) {
          message = t.auth.emailAlreadyExists
        }
        setAuthError(message)
        toast.error(message)
        return
      }

      if (user) {
        setOtpEmail(email)
        setOtpDevCode(devCode || '')
        toast.success(isRTL ? 'تم إنشاء حسابك! تحقق من بريدك الإلكتروني' : 'Account created! Check your email for the code')
        setShowOtp(true)
      } else {
        setAuthError(t.common.error)
      }
    } catch {
      setAuthError(t.common.error)
      toast.error(t.common.error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    if (!agreedToTerms) {
      setErrors((prev) => ({
        ...prev,
        terms: isRTL
          ? 'يجب الموافقة على شروط الخدمة'
          : 'You must agree to the Terms of Service',
      }))
      return
    }

    if (isDemoMode()) {
      toast.error(isRTL ? 'تسجيل الدخول عبر Google غير متاح حالياً' : 'Google sign-in is not available in offline mode')
      return
    }

    setIsGoogleLoading(true)

    try {
      const supabase = createClient()
      const { error: supabaseError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
          skipBrowserRedirect: false,
        },
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
      setIsGoogleLoading(false)
    }
  }

  // Show OTP verification form if signup succeeded
  if (showOtp) {
    return (
      <ThemeProvider theme={muiTheme}>
        <OtpVerificationForm
          email={otpEmail}
          devCode={otpDevCode}
          onVerified={() => {
            // User is auto-logged in by the verify/check route
          }}
          onBack={() => {
            setShowOtp(false)
            setAuthView('login')
          }}
        />
        <TermsModal />
      </ThemeProvider>
    )
  }

  const passwordStrength = getPasswordStrength(password)

  return (
    <ThemeProvider theme={muiTheme}>
      <Box sx={{ width: '100%', maxWidth: 448, mx: 'auto', position: 'relative', zIndex: 10 }} dir={isRTL ? 'rtl' : 'ltr'}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
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
              {/* Top bar */}
              <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemeToggle />
                  <LanguageSelector />
                </Stack>
              </motion.div>

              {/* Header */}
              <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}>
                <Box sx={{ textAlign: 'center', mt: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <HexLogo />
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: -0.5, mb: 0.5 }}>
                    {isRTL ? 'إنشاء حساب' : 'Create Account'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {isRTL ? 'ابدأ بإدارة عائلتك' : 'Start managing your family'}
                  </Typography>
                  <Divider sx={{ width: 48, mx: 'auto', mt: 2, borderColor: 'secondary.main', borderBottomWidth: 2 }} />
                </Box>
              </motion.div>

              {/* Auth Error */}
              {authError && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                  <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'error.main' }}>
                    {authError}
                  </Typography>
                </motion.div>
              )}

              {/* Signup Form */}
              <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{ mt: 3, '& > .MuiBox-root + .MuiBox-root': { mt: 2 } }}
              >
                {/* Name Row */}
                <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
                  <Stack direction="row" spacing={1.5}>
                    <TextField
                      fullWidth
                      id="signup-firstName"
                      type="text"
                      label={t.auth.firstName}
                      placeholder={isRTL ? 'الاسم الأول' : 'First name'}
                      value={firstName}
                      onChange={(e) => { setFirstName(e.target.value); clearError('firstName') }}
                      disabled={isLoading}
                      error={!!errors.firstName}
                      helperText={errors.firstName || ''}
                      autoComplete="given-name"
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <Person sx={{ fontSize: 18, color: 'text.secondary' }} />
                            </InputAdornment>
                          ),
                        },
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
                    />
                    <TextField
                      fullWidth
                      id="signup-lastName"
                      type="text"
                      label={t.auth.lastName}
                      placeholder={isRTL ? 'اسم العائلة' : 'Last name'}
                      value={lastName}
                      onChange={(e) => { setLastName(e.target.value); clearError('lastName') }}
                      disabled={isLoading}
                      error={!!errors.lastName}
                      helperText={errors.lastName || ''}
                      autoComplete="family-name"
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <Person sx={{ fontSize: 18, color: 'text.secondary' }} />
                            </InputAdornment>
                          ),
                        },
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
                    />
                  </Stack>
                </motion.div>

                {/* Email */}
                <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }}>
                  <TextField
                    fullWidth
                    id="signup-email"
                    type="email"
                    label={t.auth.email}
                    placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError('email') }}
                    disabled={isLoading}
                    error={!!errors.email}
                    helperText={errors.email || ''}
                    autoComplete="email"
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Mail sx={{ fontSize: 18, color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
                  />
                </motion.div>

                {/* Phone with country code */}
                <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
                  <Stack direction="row" spacing={1}>
                    <FormControl sx={{ minWidth: 110, flexShrink: 0 }}>
                      <InputLabel sx={{ '&.Mui-shrink': { bgcolor: 'background.paper', px: 0.5 } }}>Code</InputLabel>
                      <Select
                        value={countryCode}
                        label="Code"
                        onChange={(e) => setCountryCode(e.target.value)}
                        sx={{ height: 44, borderRadius: 2 }}
                      >
                        {countryCodes.map((cc) => (
                          <MenuItem key={cc.code} value={cc.code} sx={{ py: 0.75 }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                              <span style={{ fontSize: 14 }}>{cc.flag}</span>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{cc.code}</Typography>
                            </Stack>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      id="signup-phone"
                      type="tel"
                      label={t.auth.phone}
                      placeholder="5XXXXXXXX"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); clearError('phone') }}
                      disabled={isLoading}
                      error={!!errors.phone}
                      helperText={errors.phone || ''}
                      autoComplete="tel"
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <Phone sx={{ fontSize: 18, color: 'text.secondary' }} />
                            </InputAdornment>
                          ),
                        },
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
                    />
                  </Stack>
                </motion.div>

                {/* Password with strength indicator */}
                <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.25 }}>
                  <TextField
                    fullWidth
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    label={t.auth.password}
                    placeholder={isRTL ? '٨ أحرف على الأقل' : 'At least 8 characters'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError('password') }}
                    disabled={isLoading}
                    error={!!errors.password}
                    helperText={errors.password || ''}
                    autoComplete="new-password"
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
                    sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
                  />
                  {/* Password strength indicator */}
                  {password && (
                    <Box sx={{ mt: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={passwordStrength.percent}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: 'action.hover',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            bgcolor: passwordStrength.color,
                            transition: 'all 0.5s ease-out',
                          },
                        }}
                      />
                      <Typography variant="caption" sx={{ color: passwordStrength.color, mt: 0.5, display: 'block' }}>
                        {passwordStrength.label}
                      </Typography>
                    </Box>
                  )}
                </motion.div>

                {/* Confirm Password */}
                <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.3 }}>
                  <TextField
                    fullWidth
                    id="signup-confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    label={t.auth.confirmPassword}
                    placeholder={isRTL ? 'أعد إدخال كلمة المرور' : 'Re-enter your password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); clearError('confirmPassword') }}
                    disabled={isLoading}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword || ''}
                    autoComplete="new-password"
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
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge="end"
                              tabIndex={-1}
                              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                              size="small"
                            >
                              {showConfirmPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { height: 44 } }}
                  />
                </motion.div>

                {/* Terms agreement */}
                <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.35 }}>
                  <Box>
                    <FormControlLabel
                      control={
                        <Checkbox
                          id="signup-terms"
                          checked={agreedToTerms}
                          onChange={(e) => {
                            setAgreedToTerms(e.target.checked)
                            clearError('terms')
                          }}
                          disabled={isLoading}
                          size="small"
                          sx={{ color: 'primary.main', '&.Mui-checked': { color: 'primary.main' }, mt: 0.5 }}
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
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
                      }
                    />
                    {errors.terms && (
                      <Typography variant="caption" sx={{ color: 'error.main', ml: 4 }}>
                        {errors.terms}
                      </Typography>
                    )}
                  </Box>
                </motion.div>

                {/* Signup Button */}
                <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.4 }}>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={isLoading}
                    sx={{
                      height: 44,
                      borderRadius: 2,
                      fontSize: 14,
                      fontWeight: 600,
                      mt: 1,
                    }}
                  >
                    {isLoading ? '...' : (isRTL ? 'إنشاء حساب' : 'Create Account')}
                  </Button>
                </motion.div>
              </Box>

              {/* Divider */}
              <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.45 }}>
                <Divider sx={{ mt: 3 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', px: 1 }}>
                    {t.auth.orContinueWith}
                  </Typography>
                </Divider>
              </motion.div>

              {/* Google OAuth */}
              <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.5 }}>
                <Button
                  type="button"
                  fullWidth
                  variant="outlined"
                  onClick={handleGoogleSignup}
                  disabled={isGoogleLoading}
                  startIcon={isGoogleLoading ? undefined : <GoogleIcon />}
                  sx={{
                    mt: 2,
                    height: 44,
                    borderRadius: 2,
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  {isGoogleLoading ? '...' : t.auth.googleLogin}
                </Button>
              </motion.div>

              {/* Login link */}
              <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.55 }}>
                <Typography
                  variant="body2"
                  sx={{ textAlign: 'center', mt: 2, color: 'text.secondary' }}
                >
                  {t.auth.hasAccount}{' '}
                  <Link
                    component="button"
                    type="button"
                    onClick={() => setAuthView('login')}
                    underline="hover"
                    sx={{ color: 'secondary.main', fontWeight: 600, fontSize: 'inherit' }}
                  >
                    {t.auth.logInInstead}
                  </Link>
                </Typography>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </Box>

      <TermsModal />
    </ThemeProvider>
  )
}
