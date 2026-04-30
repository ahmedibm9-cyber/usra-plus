'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { LanguageSelector } from './language-selector'
import { TermsModal } from './terms-modal'
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

export function LoginForm() {
  const { setAuthView, setShowTermsModal } = useAuthStore()
  const { t, isRTL } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {}

    if (!email.trim()) {
      newErrors.email = t.auth.requiredField
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        newErrors.email = t.auth.invalidEmail
      }
    }

    if (!password) {
      newErrors.password = t.auth.requiredField
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsLoading(true)

    try {
      const supabase = createClient()
      const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (supabaseError) {
        const message = supabaseError.message === 'Invalid login credentials'
          ? (isRTL ? 'بيانات الدخول غير صحيحة' : 'Invalid login credentials')
          : supabaseError.message
        toast.error(message)
        return
      }

      if (data.user) {
        toast.success(t.auth.loginSuccess)
      }
    } catch {
      toast.error(t.common.error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
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
      <div className="w-full max-w-md mx-auto space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Language selector */}
        <div className="flex justify-end">
          <LanguageSelector />
        </div>

        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="flex justify-center mb-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 blur-sm" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-100 tracking-tight">
            {t.app.name}
          </h1>
          <p className="text-gray-400 text-sm">
            {t.app.tagline}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="login-email" className="text-gray-300 text-sm font-medium">
              {t.auth.email}
            </Label>
            <div className="relative">
              <Mail className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                id="login-email"
                type="email"
                placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
                }}
                className={`h-11 bg-[#111117] border-white/[0.08] text-gray-200 placeholder:text-gray-600 rounded-xl focus:border-indigo-500/50 focus:ring-indigo-500/20 ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'} ${errors.email ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''}`}
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-400" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password" className="text-gray-300 text-sm font-medium">
                {t.auth.password}
              </Label>
              <button
                type="button"
                onClick={() => setAuthView('forgot-password')}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors duration-200"
              >
                {t.auth.forgotPassword}
              </button>
            </div>
            <div className="relative">
              <Lock className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder={isRTL ? 'أدخل كلمة المرور' : 'Enter your password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                }}
                className={`h-11 bg-[#111117] border-white/[0.08] text-gray-200 placeholder:text-gray-600 rounded-xl focus:border-indigo-500/50 focus:ring-indigo-500/20 ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} ${errors.password ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''}`}
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors ${isRTL ? 'left-3' : 'right-3'}`}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-400" />
                {errors.password}
              </p>
            )}
          </div>

          {/* Login Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl h-11 font-medium transition-all duration-200 disabled:opacity-50 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              t.auth.login
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative">
          <Separator className="bg-white/[0.06]" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0B0B0F] px-3 text-xs text-gray-500">
            {t.auth.orContinueWith}
          </span>
        </div>

        {/* Google OAuth */}
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          className="w-full border-white/[0.08] bg-[#111117] text-gray-300 hover:bg-[#1a1a22] hover:text-gray-200 hover:border-white/[0.12] rounded-2xl h-11 font-medium transition-all duration-200"
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

        {/* Terms */}
        <p className="text-center text-xs text-gray-500 leading-relaxed">
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
        </p>

        {/* Sign up link */}
        <div className="text-center">
          <p className="text-sm text-gray-400">
            {t.auth.noAccount}{' '}
            <button
              type="button"
              onClick={() => setAuthView('signup')}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors duration-200"
            >
              {t.auth.signUpInstead}
            </button>
          </p>
        </div>
      </div>

      <TermsModal />
    </>
  )
}
