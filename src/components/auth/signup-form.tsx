'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient, isDemoMode } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LanguageSelector } from './language-selector'
import { ThemeToggle } from './theme-toggle'
import { TermsModal } from './terms-modal'
import { localSignUp } from '@/lib/local-auth'
import { OtpVerificationForm } from './otp-verification-form'
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  User,
  Phone,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

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

export function SignupForm() {
  const { setAuthView, setShowTermsModal } = useAuthStore()
  const { t, isRTL } = useI18n()

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

      // ALWAYS use the API route for signup — it handles both Prisma and Supabase internally
      // and sets the usra-auth-token httpOnly cookie for session persistence.
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
        // Account created — now show OTP verification screen
        // The signup API no longer auto-confirms or creates a session.
        // User must verify email via OTP first.
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

    // Google OAuth not available in local mode
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
      <>
        <OtpVerificationForm
          email={otpEmail}
          devCode={otpDevCode}
          onVerified={() => {
            // User is auto-logged in by the verify/check route (cookie is set)
            // The auth store is already updated in OtpVerificationForm
          }}
          onBack={() => {
            setShowOtp(false)
            setAuthView('login')
          }}
        />
        <TermsModal />
      </>
    )
  }

  return (
    <>
      <div className="w-full max-w-md mx-auto bg-[--bg-surface] rounded-3xl p-8 relative z-10 border border-[--border-subtle] shadow-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Language selector */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0 }}
        >
          <ThemeToggle />
          <LanguageSelector />
        </motion.div>

        {/* Header */}
        <motion.div
          className="space-y-2 text-center mt-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <div className="flex justify-center mb-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-[#007AFF] flex items-center justify-center shadow-lg shadow-[#007AFF]/20">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -inset-1.5 rounded-2xl bg-[#007AFF]/20 blur-sm" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[--text-primary] tracking-tight font-display">
            {t.auth.signup}
          </h1>
          <p className="text-[--text-muted] text-sm">
            {t.app.tagline}
          </p>
        </motion.div>

        {/* Auth Error Banner */}
        {authError && (
          <motion.div
            className="mt-4 rounded-xl border border-[#FF3B30]/20 bg-[#FF3B30]/5 p-3"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-sm text-[#FF3B30]">{authError}</p>
          </motion.div>
        )}

        {/* Signup Form */}
        <>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          {/* Name Row */}
          <motion.div
            className="grid grid-cols-2 gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="space-y-2">
              <Label htmlFor="signup-firstName" className="text-[--text-secondary] text-sm font-medium">
                {t.auth.firstName}
              </Label>
              <div className="auth-input-wrapper">
                <User className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted] z-10 ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input
                  id="signup-firstName"
                  type="text"
                  placeholder={isRTL ? 'الاسم الأول' : 'First name'}
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); clearError('firstName') }}
                  className={`h-11 premium-input bg-[--bg-surface-2] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] rounded-xl focus:border-[#007AFF] focus:ring-[#007AFF]/20 ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} ${errors.firstName ? 'border-[#FF3B30]/50' : ''}`}
                  disabled={isLoading}
                  autoComplete="given-name"
                />
              </div>
              {errors.firstName && (
                <p className="text-xs text-[#FF3B30] flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[#FF3B30]" />
                  {errors.firstName}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-lastName" className="text-[--text-secondary] text-sm font-medium">
                {t.auth.lastName}
              </Label>
              <div className="auth-input-wrapper">
                <User className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted] z-10 ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input
                  id="signup-lastName"
                  type="text"
                  placeholder={isRTL ? 'اسم العائلة' : 'Last name'}
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); clearError('lastName') }}
                  className={`h-11 premium-input bg-[--bg-surface-2] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] rounded-xl focus:border-[#007AFF] focus:ring-[#007AFF]/20 ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} ${errors.lastName ? 'border-[#FF3B30]/50' : ''}`}
                  disabled={isLoading}
                  autoComplete="family-name"
                />
              </div>
              {errors.lastName && (
                <p className="text-xs text-[#FF3B30] flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[#FF3B30]" />
                  {errors.lastName}
                </p>
              )}
            </div>
          </motion.div>

          {/* Email */}
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <Label htmlFor="signup-email" className="text-[--text-secondary] text-sm font-medium">
              {t.auth.email}
            </Label>
            <div className="auth-input-wrapper">
              <Mail className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted] z-10 ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                id="signup-email"
                type="email"
                placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError('email') }}
                className={`h-11 premium-input bg-[--bg-surface-2] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] rounded-xl focus:border-[#007AFF] focus:ring-[#007AFF]/20 ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} ${errors.email ? 'border-[#FF3B30]/50' : ''}`}
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-[#FF3B30] flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[#FF3B30]" />
                {errors.email}
              </p>
            )}
          </motion.div>

          {/* Phone with country code */}
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Label htmlFor="signup-phone" className="text-[--text-secondary] text-sm font-medium">
              {t.auth.phone}
            </Label>
            <div className="flex gap-2">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="w-[110px] h-11 bg-[--bg-surface-2] border-[--border-subtle] text-[--text-primary] rounded-xl focus:ring-[#007AFF]/20 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[--border-subtle] bg-[--bg-surface] text-[--text-primary] rounded-xl max-h-64">
                  {countryCodes.map((cc) => (
                    <SelectItem
                      key={cc.code}
                      value={cc.code}
                      className="focus:bg-[#007AFF]/10 focus:text-[#007AFF] cursor-pointer rounded-lg"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm">{cc.flag}</span>
                        <span className="text-[--text-muted] text-xs">{cc.code}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="auth-input-wrapper flex-1">
                <Phone className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted] z-10 ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input
                  id="signup-phone"
                  type="tel"
                  placeholder={isRTL ? '5XXXXXXXX' : '5XXXXXXXX'}
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); clearError('phone') }}
                  className={`h-11 premium-input bg-[--bg-surface-2] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] rounded-xl focus:border-[#007AFF] focus:ring-[#007AFF]/20 ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} ${errors.phone ? 'border-[#FF3B30]/50' : ''}`}
                  disabled={isLoading}
                  autoComplete="tel"
                />
              </div>
            </div>
            {errors.phone && (
              <p className="text-xs text-[#FF3B30] flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[#FF3B30]" />
                {errors.phone}
              </p>
            )}
          </motion.div>

          {/* Password */}
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <Label htmlFor="signup-password" className="text-[--text-secondary] text-sm font-medium">
              {t.auth.password}
            </Label>
            <div className="auth-input-wrapper">
              <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted] z-10 ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                placeholder={isRTL ? '٨ أحرف على الأقل' : 'At least 8 characters'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError('password') }}
                className={`h-11 premium-input bg-[--bg-surface-2] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] rounded-xl focus:border-[#007AFF] focus:ring-[#007AFF]/20 ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} ${errors.password ? 'border-[#FF3B30]/50' : ''}`}
                disabled={isLoading}
                autoComplete="new-password"
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
            {/* Password strength indicator */}
            {password && (
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4].map((level) => {
                  const strength = password.length < 6 ? 1 : password.length < 8 ? 2 : password.length < 12 ? 3 : 4
                  const colors = ['bg-[#FF3B30]', 'bg-[#FF9500]', 'bg-[#FFCC00]', 'bg-[#34C759]']
                  return (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                        level <= strength ? colors[strength - 1] : 'bg-[--border-subtle]'
                      }`}
                    />
                  )
                })}
              </div>
            )}
            {errors.password && (
              <p className="text-xs text-[#FF3B30] flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[#FF3B30]" />
                {errors.password}
              </p>
            )}
          </motion.div>

          {/* Confirm Password */}
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Label htmlFor="signup-confirmPassword" className="text-[--text-secondary] text-sm font-medium">
              {t.auth.confirmPassword}
            </Label>
            <div className="auth-input-wrapper">
              <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted] z-10 ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                id="signup-confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={isRTL ? 'أعد إدخال كلمة المرور' : 'Re-enter your password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); clearError('confirmPassword') }}
                className={`h-11 premium-input bg-[--bg-surface-2] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] rounded-xl focus:border-[#007AFF] focus:ring-[#007AFF]/20 ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} ${errors.confirmPassword ? 'border-[#FF3B30]/50' : ''}`}
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={`absolute top-1/2 -translate-y-1/2 text-[--text-muted] hover:text-[--text-secondary] transition-colors z-10 ${isRTL ? 'left-3' : 'right-3'}`}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-[#FF3B30] flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[#FF3B30]" />
                {errors.confirmPassword}
              </p>
            )}
          </motion.div>

          {/* Terms agreement */}
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                id="signup-terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => {
                  setAgreedToTerms(checked === true)
                  clearError('terms')
                }}
                className="mt-0.5 data-[state=checked]:bg-[#007AFF] data-[state=checked]:border-[#007AFF]"
                disabled={isLoading}
              />
              <label htmlFor="signup-terms" className="text-sm text-[--text-muted] leading-relaxed cursor-pointer">
                {t.auth.termsAgreement}{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-[#007AFF] hover:text-[#0066CC] underline underline-offset-2 transition-colors duration-200"
                >
                  {t.auth.termsOfService}
                </button>{' '}
                {t.auth.and}{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-[#007AFF] hover:text-[#0066CC] underline underline-offset-2 transition-colors duration-200"
                >
                  {t.auth.privacyPolicy}
                </button>
              </label>
            </div>
            {errors.terms && (
              <p className="text-xs text-[#FF3B30] flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[#FF3B30]" />
                {errors.terms}
              </p>
            )}
          </motion.div>

          {/* Signup Button */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#007AFF] hover:bg-[#0066CC] text-white rounded-xl h-11 font-semibold transition-all duration-200 disabled:opacity-50 shadow-lg shadow-[#007AFF]/20 hover:shadow-[0_0_20px_rgba(0,122,255,0.3)] hover:shadow-[#007AFF]/30 font-display"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                t.auth.signup
              )}
            </Button>
          </motion.div>
        </form>

        {/* Divider */}
        <motion.div
          className="relative mt-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          <Separator className="bg-[--border-subtle]" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[--bg-surface] px-3 text-xs text-[--text-muted]">
            {t.auth.orContinueWith}
          </span>
        </motion.div>

        {/* Google OAuth */}
        <motion.div
          className="mt-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignup}
            disabled={isGoogleLoading}
            className="w-full border-[--border-subtle] bg-[--bg-surface] text-[--text-secondary] hover:bg-[--bg-surface-2] hover:text-[--text-primary] hover:border-[--border-medium] hover:scale-[1.01] rounded-xl h-11 font-medium transition-all duration-200"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {t.auth.googleLogin}
          </Button>
        </motion.div>

        {/* Login link */}
        <motion.div
          className="text-center mt-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.55 }}
        >
          <p className="text-sm text-[--text-muted]">
            {t.auth.hasAccount}{' '}
            <button
              type="button"
              onClick={() => setAuthView('login')}
              className="text-[#007AFF] hover:text-[#0066CC] font-medium transition-colors duration-200"
            >
              {t.auth.logInInstead}
            </button>
          </p>
        </motion.div>
        </>
      </div>

      <TermsModal />
    </>
  )
}
