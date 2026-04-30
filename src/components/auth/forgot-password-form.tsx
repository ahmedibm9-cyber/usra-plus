'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

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
      const supabase = createClient()
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      })

      if (supabaseError) {
        setError(supabaseError.message)
        toast.error(supabaseError.message)
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

  if (isSent) {
    return (
      <div className="w-full max-w-md mx-auto glass-strong rounded-3xl p-8 relative z-10 text-center space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Success illustration */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0 }}
        >
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="absolute -inset-2 rounded-full bg-emerald-500/5 animate-pulse" />
          </div>
        </motion.div>

        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h2 className="text-2xl font-bold text-gray-100">
            {t.auth.resetPassword}
          </h2>
          <p className="text-[--text-muted] text-sm">
            {t.auth.verificationSent}
          </p>
          <p className="text-indigo-300 font-medium text-sm">{email}</p>
          <p className="text-[--text-muted] text-sm mt-2">
            {t.auth.checkInbox}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Button
            onClick={() => setAuthView('login')}
            variant="outline"
            className="w-full border-[--border-subtle] bg-[--bg-surface] text-[--text-secondary] hover:bg-[--bg-surface-2] hover:text-[--text-primary] rounded-2xl h-11 hover:scale-[1.01] transition-all duration-200"
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            {t.auth.backToLogin}
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto glass-strong rounded-3xl p-8 relative z-10 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <motion.div
        className="space-y-2 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0 }}
      >
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center animate-pulse-glow">
            <Mail className="w-7 h-7 text-indigo-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-100">
          {t.auth.resetPassword}
        </h2>
        <p className="text-[--text-muted] text-sm">
          {t.auth.verificationSent}
        </p>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Label htmlFor="reset-email" className="text-[--text-secondary] text-sm font-medium">
            {t.auth.email}
          </Label>
          <div className="auth-input-wrapper">
            <Mail className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted] z-10 ${isRTL ? 'right-3' : 'left-3'}`} />
            <Input
              id="reset-email"
              type="email"
              placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError('')
              }}
              className={`h-11 premium-input bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] placeholder:text-gray-600 rounded-xl focus:border-indigo-500/50 focus:ring-indigo-500/20 ${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
              disabled={isLoading}
            />
          </div>
          {error && (
            <p className="text-sm text-red-400 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-red-400" />
              {error}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl h-11 font-medium transition-all duration-200 disabled:opacity-50 shadow-lg shadow-indigo-500/20 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-indigo-500/30"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              t.auth.resetPassword
            )}
          </Button>
        </motion.div>
      </form>

      {/* Back to login */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <button
          onClick={() => setAuthView('login')}
          className="text-sm text-[--text-muted] hover:text-indigo-300 transition-colors duration-200 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          {t.auth.backToLogin}
        </button>
      </motion.div>
    </div>
  )
}
