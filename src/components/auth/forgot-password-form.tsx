'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient, isDemoMode } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { toast } from 'sonner'

// ─── Animation variants ───────────────────────────────────────────
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

export function ForgotPasswordForm() {
  const { setAuthView } = useAuthStore()
  const { t, isRTL } = useI18n()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError(t.auth.requiredField)
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError(t.auth.invalidEmail)
      return
    }

    setIsLoading(true)

    try {
      if (isDemoMode()) {
        setError(isRTL ? 'إعادة تعيين كلمة المرور غير متاحة حالياً. يرجى إنشاء حساب جديد.' : 'Password reset is not available in offline mode. Please create a new account.')
        toast.error(isRTL ? 'إعادة تعيين كلمة المرور غير متاحة' : 'Password reset unavailable')
        return
      }

      const supabase = createClient()
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      })

      if (supabaseError) {
        const message = (supabaseError as { name?: string }).name === 'DemoModeError'
          ? t.auth.authServiceUnavailable
          : supabaseError.message
        setError(message)
        toast.error(message)
      } else {
        setIsSent(true)
        toast.success(t.auth.resetSent)
      }
    } catch {
      setError(t.common.error)
      toast.error(t.common.error)
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Success State — Gold Checkmark Animation ──────────────────
  if (isSent) {
    return (
      <div className="w-full max-w-md mx-auto relative z-10" dir={isRTL ? 'rtl' : 'ltr'}>
        <motion.div
          className="glass rounded-2xl p-8 shadow-warm-lg text-center space-y-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Theme toggle */}
          <div className="flex justify-start">
            <ThemeToggle />
          </div>

          {/* Success illustration — gold checkmark */}
          <motion.div
            className="flex justify-center"
            {...fadeUp}
            transition={{ duration: 0.35, delay: 0 }}
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-[#B8860B]/10 border border-primary/20 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              {/* Gold glow ring */}
              <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-primary/5 to-[#B8860B]/5 animate-gentle-pulse" />
            </div>
          </motion.div>

          <motion.div
            className="space-y-2"
            {...fadeUp}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <h2 className="text-2xl font-bold text-foreground font-display">
              {t.auth.resetPassword}
            </h2>
            <div className="gold-line w-12 mx-auto my-2" />
            <p className="text-muted-foreground text-sm">
              {t.auth.verificationSent}
            </p>
            <p className="text-primary font-medium text-sm">{email}</p>
            <p className="text-muted-foreground text-sm mt-2">
              {t.auth.checkInbox}
            </p>
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
            <Button
              onClick={() => setAuthView('login')}
              variant="outline"
              className="w-full border-border bg-card/50 text-muted-foreground hover:bg-secondary hover:text-foreground hover:border-[#B8860B]/20 rounded-xl h-11 transition-all duration-200"
            >
              <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              {t.auth.backToLogin}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  // ─── Default State — Minimal Elegant Form ──────────────────────
  return (
    <div className="w-full max-w-md mx-auto relative z-10" dir={isRTL ? 'rtl' : 'ltr'}>
      <motion.div
        className="glass rounded-2xl p-8 shadow-warm-lg space-y-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Theme toggle */}
        <div className="flex justify-start">
          <ThemeToggle />
        </div>

        {/* Header */}
        <motion.div
          className="space-y-2 text-center"
          {...fadeUp}
          transition={{ duration: 0.35, delay: 0 }}
        >
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-[#B8860B]/10 border border-primary/20 flex items-center justify-center">
              <Mail className="w-7 h-7 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-foreground font-display">
            {isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isRTL ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط الإعادة' : "Enter your email and we'll send you a reset link"}
          </p>
          <div className="gold-line w-12 mx-auto mt-3" />
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <motion.div
            className="space-y-1.5"
            {...fadeUp}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <Label htmlFor="reset-email" className="text-sm font-medium text-muted-foreground">
              {t.auth.email}
            </Label>
            <div className="relative">
              <Mail className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                id="reset-email"
                type="email"
                placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError('')
                }}
                className={`h-11 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-[0_0_12px_-2px_rgba(184,134,11,0.1)] transition-all duration-200 ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
                disabled={isLoading}
              />
            </div>
            {error && (
              <p className="text-xs text-destructive mt-1">{error}</p>
            )}
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }}>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full btn-gradient text-white rounded-xl h-11 font-semibold transition-all duration-300 disabled:opacity-50 shadow-lg shadow-primary/20 font-display"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                isRTL ? 'إرسال رابط الإعادة' : 'Send Reset Link'
              )}
            </Button>
          </motion.div>
        </form>

        {/* Back to login */}
        <motion.div
          className="text-center"
          {...fadeUp}
          transition={{ duration: 0.35, delay: 0.2 }}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() => setAuthView('login')}
            className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 inline-flex items-center gap-1.5 h-auto p-0 hover:bg-transparent"
          >
            <ArrowLeft className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
            {t.auth.backToLogin}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
