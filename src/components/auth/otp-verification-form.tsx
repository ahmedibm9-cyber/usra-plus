'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'
import { localSendVerificationCode, localVerifyCode, localUserToProfile } from '@/lib/local-auth'
import { Button } from '@/components/ui/button'
import { LanguageSelector } from './language-selector'
import { ThemeToggle } from './theme-toggle'
import {
  Mail,
  Loader2,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  KeyRound,
  Copy,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'

interface OtpVerificationFormProps {
  email: string
  devCode?: string
  onVerified: () => void
  onBack: () => void
}

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 60 // seconds

export function OtpVerificationForm({ email, devCode: initialDevCode, onVerified, onBack }: OtpVerificationFormProps) {
  const { setUser, setIsAuthenticated } = useAuthStore()
  const { t, isRTL } = useI18n()

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState('')
  const [verified, setVerified] = useState(false)
  const [devCode, setDevCode] = useState(initialDevCode || '')
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)
  const [canResend, setCanResend] = useState(false)
  const [copied, setCopied] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) {
      setCanResend(true)
      return
    }
    const timer = setInterval(() => {
      setCooldown(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Format countdown as MM:SS
  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleInputChange = useCallback((index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '')
    if (digit.length > 1) return

    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)
    setError('')

    // Auto-focus next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits are filled
    if (digit && index === OTP_LENGTH - 1) {
      const fullCode = newOtp.join('')
      if (fullCode.length === OTP_LENGTH) {
        handleVerify(fullCode)
      }
    }
  }, [otp])

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Move to previous input on backspace if current is empty
        const newOtp = [...otp]
        newOtp[index - 1] = ''
        setOtp(newOtp)
        inputRefs.current[index - 1]?.focus()
      } else {
        const newOtp = [...otp]
        newOtp[index] = ''
        setOtp(newOtp)
      }
      setError('')
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    } else if (e.key === 'Enter') {
      const fullCode = otp.join('')
      if (fullCode.length === OTP_LENGTH) {
        handleVerify(fullCode)
      }
    }
  }, [otp])

  // Handle paste — fill all inputs from pasted text
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pastedText) return

    const newOtp = [...Array(OTP_LENGTH).fill('')]
    for (let i = 0; i < pastedText.length; i++) {
      newOtp[i] = pastedText[i]
    }
    setOtp(newOtp)
    setError('')

    // Focus the next empty input or the last one
    const nextIndex = Math.min(pastedText.length, OTP_LENGTH - 1)
    inputRefs.current[nextIndex]?.focus()

    // Auto-submit if all filled
    if (pastedText.length === OTP_LENGTH) {
      handleVerify(pastedText)
    }
  }, [])

  const handleVerify = async (code?: string) => {
    const fullCode = code || otp.join('')
    if (fullCode.length !== OTP_LENGTH) {
      setError(isRTL ? 'يرجى إدخال الرمز كاملاً' : 'Please enter the complete code')
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      const result = await localVerifyCode(email, fullCode)

      if (result.error) {
        setError(result.error)
        toast.error(result.error)
        // Shake the inputs
        setOtp(Array(OTP_LENGTH).fill(''))
        inputRefs.current[0]?.focus()
        return
      }

      if (result.success && result.user) {
        setVerified(true)
        toast.success(isRTL ? 'تم التحقق بنجاح!' : 'Verified successfully!')

        // Small delay for the success animation
        setTimeout(() => {
          const profile = localUserToProfile(result.user!)
          setUser(profile)
          setIsAuthenticated(true)
          onVerified()
        }, 1500)
      }
    } catch {
      setError(isRTL ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'An error occurred. Please try again.')
      toast.error(isRTL ? 'حدث خطأ' : 'An error occurred')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    if (!canResend && cooldown > 0) return

    setIsResending(true)
    setError('')

    try {
      const result = await localSendVerificationCode(email)

      if (result.error) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      if (result.alreadyVerified) {
        toast.info(isRTL ? 'البريد الإلكتروني تم التحقق منه بالفعل' : 'Email is already verified')
        return
      }

      // Update dev code if returned
      if (result.devCode) {
        setDevCode(result.devCode)
      }

      // Reset cooldown
      setCooldown(RESEND_COOLDOWN)
      setCanResend(false)

      // Clear OTP inputs
      setOtp(Array(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()

      toast.success(isRTL ? 'تم إرسال رمز جديد' : 'New code sent!')
    } catch {
      setError(isRTL ? 'فشل في إرسال الرمز' : 'Failed to send code')
      toast.error(isRTL ? 'فشل في إرسال الرمز' : 'Failed to send code')
    } finally {
      setIsResending(false)
    }
  }

  const copyDevCode = () => {
    if (devCode) {
      navigator.clipboard.writeText(devCode).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-[--bg-surface] rounded-3xl p-8 relative z-10 border border-[--border-subtle] shadow-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Language & Theme selector */}
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
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-colors duration-500 ${
              verified 
                ? 'bg-[#34C759] shadow-[#34C759]/20' 
                : 'bg-[#007AFF] shadow-[#007AFF]/20'
            }`}>
              {verified ? (
                <CheckCircle2 className="w-7 h-7 text-white" />
              ) : (
                <KeyRound className="w-7 h-7 text-white" />
              )}
            </div>
            <div className={`absolute -inset-1.5 rounded-2xl blur-sm transition-colors duration-500 ${
              verified 
                ? 'bg-[#34C759]/20' 
                : 'bg-[#007AFF]/20'
            }`} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-[--text-primary] tracking-tight font-display">
          {verified 
            ? (isRTL ? 'تم التحقق!' : 'Verified!') 
            : (isRTL ? 'تحقق من بريدك الإلكتروني' : 'Verify Your Email')
          }
        </h1>
        <p className="text-[--text-muted] text-sm">
          {verified 
            ? (isRTL ? 'جاري تسجيل الدخول...' : 'Signing you in...')
            : (isRTL 
              ? `أدخل الرمز المكون من 6 أرقام المرسل إلى` 
              : `Enter the 6-digit code sent to`
            )
          }
        </p>
        {!verified && (
          <p className="text-sm font-medium text-[#007AFF]">{email}</p>
        )}
      </motion.div>

      {/* Success Animation */}
      <AnimatePresence>
        {verified && (
          <motion.div
            className="mt-6 flex justify-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <div className="relative">
              <motion.div
                className="w-24 h-24 rounded-full bg-[#34C759]/10 border border-[#34C759]/20 flex items-center justify-center"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  <CheckCircle2 className="w-12 h-12 text-[#34C759]" />
                </motion.div>
              </motion.div>
              {/* Confetti rings */}
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border border-[#34C759]/30"
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 2 + i * 0.5, opacity: 0 }}
                  transition={{ duration: 1.2, delay: i * 0.15, ease: 'easeOut' }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OTP Input (hidden when verified) */}
      {!verified && (
        <>
          {/* Error Banner */}
          {error && (
            <motion.div
              className="mt-4 rounded-xl border border-[#FF3B30]/20 bg-[#FF3B30]/5 p-3"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm text-[#FF3B30]">{error}</p>
            </motion.div>
          )}

          {/* 6-digit input boxes */}
          <motion.div
            className="mt-6 flex justify-center gap-2 sm:gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {otp.map((digit, index) => (
              <div key={index} className="relative">
                {/* Glow on filled state */}
                {digit && (
                  <div className="absolute inset-0 rounded-xl bg-[#007AFF]/10 blur-sm" />
                )}
                <input
                  ref={(el) => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  disabled={isVerifying || verified}
                  className={`
                    relative w-11 h-14 sm:w-13 sm:h-16 
                    text-center text-xl sm:text-2xl font-bold font-metric
                    rounded-xl 
                    bg-[--bg-surface-2]
                    border-2 
                    ${digit 
                      ? 'border-[#007AFF]/50 text-[--text-primary] shadow-lg shadow-[#007AFF]/10' 
                      : error 
                        ? 'border-[#FF3B30]/30 text-[--text-primary]' 
                        : 'border-[--border-subtle] text-[--text-primary]'
                    }
                    focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 
                    focus:shadow-lg focus:shadow-[#007AFF]/10
                    outline-none
                    transition-all duration-200
                    placeholder:text-[--text-muted]/30
                    ${isVerifying ? 'opacity-50' : ''}
                  `}
                  aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
                />
              </div>
            ))}
          </motion.div>

          {/* Progress indicator dots */}
          <div className="mt-3 flex justify-center gap-1.5">
            {otp.map((digit, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                  digit ? 'bg-[#007AFF]' : 'bg-[--border-subtle]'
                }`}
              />
            ))}
          </div>

          {/* Verify Button */}
          <motion.div
            className="mt-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <Button
              type="button"
              onClick={() => handleVerify()}
              disabled={isVerifying || otp.join('').length !== OTP_LENGTH}
              className="w-full bg-[#007AFF] hover:bg-[#0066CC] text-white rounded-xl h-11 font-semibold transition-all duration-200 disabled:opacity-50 shadow-lg shadow-[#007AFF]/20 hover:shadow-[0_0_20px_rgba(0,122,255,0.3)] hover:shadow-[#007AFF]/30 font-display"
            >
              {isVerifying ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  {isRTL ? 'تحقق' : 'Verify Code'}
                </span>
              )}
            </Button>
          </motion.div>

          {/* Resend / Countdown */}
          <motion.div
            className="mt-4 text-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-sm text-[#007AFF] hover:text-[#0066CC] font-medium transition-colors duration-200 flex items-center justify-center gap-1.5 mx-auto"
              >
                {isResending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {isRTL ? 'إعادة إرسال الرمز' : 'Resend Code'}
              </button>
            ) : (
              <p className="text-sm text-[--text-muted]">
                {isRTL ? 'إعادة الإرسال خلال' : 'Resend code in'}{' '}
                <span className="text-[#007AFF] font-mono font-medium tabular-nums">
                  {formatCooldown(cooldown)}
                </span>
              </p>
            )}
          </motion.div>

          {/* Dev Mode OTP Display */}
          {devCode && (
            <motion.div
              className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-amber-400/80 font-medium">
                    {isRTL ? 'وضع التطوير - الرمز:' : 'Dev Mode — Code:'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-mono font-bold text-amber-300 tracking-widest">
                    {devCode}
                  </span>
                  <button
                    type="button"
                    onClick={copyDevCode}
                    className="p-1 rounded-md hover:bg-amber-500/10 transition-colors"
                    aria-label="Copy code"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-[#34C759]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-amber-400/50 mt-1">
                {isRTL 
                  ? 'سيتم دمج إرسال البريد الإلكتروني لاحقاً' 
                  : 'Email integration will be added later'
                }
              </p>
            </motion.div>
          )}

          {/* Back to signup */}
          <motion.div
            className="mt-4 text-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-[--text-muted] hover:text-[--text-secondary] flex items-center justify-center gap-1.5 mx-auto transition-colors duration-200"
            >
              <ArrowLeft className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
              {isRTL ? 'العودة لتسجيل الدخول' : 'Back to login'}
            </button>
          </motion.div>
        </>
      )}
    </div>
  )
}
