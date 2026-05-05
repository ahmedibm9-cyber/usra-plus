'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
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
import { TermsModal } from './terms-modal'
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

export default function SignupForm() {
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
      const supabase = createClient()
      const { data, error: supabaseError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone ? `${countryCode}${phone}` : null,
            country_code: countryCode,
          },
        },
      })

      if (supabaseError) {
        const message = supabaseError.message === 'User already registered'
          ? (isRTL ? 'هذا البريد الإلكتروني مسجل بالفعل' : 'This email is already registered')
          : supabaseError.message
        toast.error(message)
        return
      }

      if (data.user) {
        toast.success(t.auth.signupSuccess)
      }
    } catch {
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

    setIsGoogleLoading(true)

    try {
      const supabase = createClient()
      const { error: supabaseError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      })

      if (supabaseError) {
        toast.error(supabaseError.message)
      }
    } catch {
      toast.error(t.common.error)
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <>
      <div className="w-full max-w-md mx-auto glass-strong rounded-3xl p-8 relative z-10" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Language selector */}
        <motion.div
          className="flex justify-end"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0 }}
        >
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
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-pulse-glow">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 blur-sm" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-100 tracking-tight">
            {t.auth.signup}
          </h1>
          <p className="text-[--text-muted] text-sm">
            {t.app.tagline}
          </p>
        </motion.div>

        {/* Signup Form */}
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
                  className={`h-11 premium-input bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] placeholder:text-gray-600 rounded-xl focus:border-indigo-500/50 focus:ring-indigo-500/20 ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} ${errors.firstName ? 'border-red-500/50' : ''}`}
                  disabled={isLoading}
                  autoComplete="given-name"
                />
              </div>
              {errors.firstName && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-red-400" />
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
                  className={`h-11 premium-input bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] placeholder:text-gray-600 rounded-xl focus:border-indigo-500/50 focus:ring-indigo-500/20 ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} ${errors.lastName ? 'border-red-500/50' : ''}`}
                  disabled={isLoading}
                  autoComplete="family-name"
                />
              </div>
              {errors.lastName && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-red-400" />
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
                className={`h-11 premium-input bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] placeholder:text-gray-600 rounded-xl focus:border-indigo-500/50 focus:ring-indigo-500/20 ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} ${errors.email ? 'border-red-500/50' : ''}`}
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-red-400" />
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
                <SelectTrigger className="w-[110px] h-11 bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] rounded-xl focus:ring-indigo-500/20 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[--border-subtle] bg-[--bg-surface] text-[--text-primary] rounded-xl max-h-64">
                  {countryCodes.map((cc) => (
                    <SelectItem
                      key={cc.code}
                      value={cc.code}
                      className="focus:bg-indigo-500/10 focus:text-indigo-300 cursor-pointer rounded-lg"
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
                  className={`h-11 premium-input bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] placeholder:text-gray-600 rounded-xl focus:border-indigo-500/50 focus:ring-indigo-500/20 ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} ${errors.phone ? 'border-red-500/50' : ''}`}
                  disabled={isLoading}
                  autoComplete="tel"
                />
              </div>
            </div>
            {errors.phone && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-red-400" />
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
                className={`h-11 premium-input bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] placeholder:text-gray-600 rounded-xl focus:border-indigo-500/50 focus:ring-indigo-500/20 ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} ${errors.password ? 'border-red-500/50' : ''}`}
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
                  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500']
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
              <p className="text-xs text-red-400 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-red-400" />
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
                className={`h-11 premium-input bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] placeholder:text-gray-600 rounded-xl focus:border-indigo-500/50 focus:ring-indigo-500/20 ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} ${errors.confirmPassword ? 'border-red-500/50' : ''}`}
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
              <p className="text-xs text-red-400 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-red-400" />
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
                className="mt-0.5 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                disabled={isLoading}
              />
              <label htmlFor="signup-terms" className="text-sm text-[--text-muted] leading-relaxed cursor-pointer">
                {t.auth.termsAgreement}{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors duration-200"
                >
                  {t.auth.termsOfService}
                </button>{' '}
                {t.auth.and}{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors duration-200"
                >
                  {t.auth.privacyPolicy}
                </button>
              </label>
            </div>
            {errors.terms && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-red-400" />
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
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl h-11 font-medium transition-all duration-200 disabled:opacity-50 shadow-lg shadow-indigo-500/20 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-indigo-500/30"
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
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[--bg-surface]/80 backdrop-blur-sm px-3 text-xs text-[--text-muted]">
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
            className="w-full border-[--border-subtle] bg-[--bg-surface] text-[--text-secondary] hover:bg-[--bg-surface-2] hover:text-[--text-primary] hover:border-[--border-medium] hover:scale-[1.01] rounded-2xl h-11 font-medium transition-all duration-200"
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
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors duration-200"
            >
              {t.auth.logInInstead}
            </button>
          </p>
        </motion.div>
      </div>

      <TermsModal />
    </>
  )
}
