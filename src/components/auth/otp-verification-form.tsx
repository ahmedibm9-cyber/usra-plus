'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'
import { localSendVerificationCode, localVerifyCode, localUserToProfile } from '@/lib/local-auth'
import { ThemeProvider } from '@mui/material/styles'
import { getAppTheme } from '@/lib/mui-theme'
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Box,
  Stack,
  IconButton,
  Alert,
  LinearProgress,
  Tooltip,
} from '@mui/material'
import {
  Mail,
  CheckCircle,
  Refresh,
  Shield,
  ArrowBack,
  AutoAwesome,
  VpnKey,
  ContentCopy,
  Check,
  Error as ErrorOutline,
} from '@mui/icons-material'
import { LanguageSelector } from './language-selector'
import { ThemeToggle } from './theme-toggle'
import { toast } from 'sonner'
import { useAppStore } from '@/stores/app-store'

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
  const { theme } = useAppStore()
  const muiTheme = getAppTheme(theme)

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

  // Circular progress for countdown
  const cooldownProgress = ((RESEND_COOLDOWN - cooldown) / RESEND_COOLDOWN) * 100

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
    <ThemeProvider theme={muiTheme}>
      <Box sx={{ width: '100%', maxWidth: 448, mx: 'auto', position: 'relative', zIndex: 10 }} dir={isRTL ? 'rtl' : 'ltr'}>
        <Card
          sx={{
            borderRadius: 4,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Language & Theme selector */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0 }}
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <ThemeToggle />
                <LanguageSelector />
              </Stack>
            </motion.div>

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
                  <Box sx={{ position: 'relative' }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: verified ? 'success.main' : 'primary.main',
                        boxShadow: verified ? '0 4px 12px rgba(13,107,88,0.3)' : '0 4px 12px rgba(13,107,88,0.2)',
                        transition: 'background-color 0.5s',
                      }}
                    >
                      {verified ? (
                        <CheckCircle sx={{ fontSize: 28, color: '#fff' }} />
                      ) : (
                        <VpnKey sx={{ fontSize: 28, color: '#fff' }} />
                      )}
                    </Box>
                  </Box>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: -0.5 }}>
                  {verified
                    ? (isRTL ? 'تم التحقق!' : 'Verified!')
                    : (isRTL ? 'تحقق من بريدك الإلكتروني' : 'Verify Your Email')
                  }
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {verified
                    ? (isRTL ? 'جاري تسجيل الدخول...' : 'Signing you in...')
                    : (isRTL
                      ? 'أدخل الرمز المكون من 6 أرقام المرسل إلى'
                      : 'Enter the 6-digit code sent to'
                    )
                  }
                </Typography>
                {!verified && (
                  <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 500, mt: 0.5 }}>
                    {email}
                  </Typography>
                )}
              </Box>
            </motion.div>

            {/* Success Animation */}
            <AnimatePresence>
              {verified && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <Box sx={{ position: 'relative' }}>
                      <motion.div
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        <Box
                          sx={{
                            width: 96,
                            height: 96,
                            borderRadius: '50%',
                            bgcolor: 'success.light',
                            border: '1px solid',
                            borderColor: 'success.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                          >
                            <CheckCircle sx={{ fontSize: 48, color: 'success.main' }} />
                          </motion.div>
                        </Box>
                      </motion.div>
                      {/* Confetti rings */}
                      {[1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 1, opacity: 0.8 }}
                          animate={{ scale: 2 + i * 0.5, opacity: 0 }}
                          transition={{ duration: 1.2, delay: i * 0.15, ease: 'easeOut' }}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '50%',
                            border: '1px solid',
                            borderColor: 'rgba(13,107,88,0.3)',
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>

            {/* OTP Input (hidden when verified) */}
            {!verified && (
              <>
                {/* Error Banner */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Alert
                      severity="error"
                      icon={<ErrorOutline sx={{ fontSize: 18 }} />}
                      sx={{
                        mt: 2,
                        borderRadius: 2,
                        '& .MuiAlert-message': { fontSize: 14 },
                      }}
                    >
                      {error}
                    </Alert>
                  </motion.div>
                )}

                {/* 6-digit input boxes */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ justifyContent: 'center', mt: 3 }}
                  >
                    {otp.map((digit, index) => (
                      <Box key={index} sx={{ position: 'relative' }}>
                        {/* Glow on filled state */}
                        {digit && (
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              borderRadius: 2,
                              bgcolor: 'rgba(13,107,88,0.08)',
                              filter: 'blur(4px)',
                            }}
                          />
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
                          aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
                          style={{
                            position: 'relative',
                            width: 44,
                            height: 56,
                            textAlign: 'center',
                            fontSize: 20,
                            fontWeight: 700,
                            fontFamily: '"JetBrains Mono", monospace',
                            borderRadius: 12,
                            backgroundColor: muiTheme.palette.mode === 'dark' ? '#2B2930' : '#F4F1ED',
                            border: `2px solid ${
                              digit
                                ? 'rgba(13,107,88,0.5)'
                                : error
                                  ? 'rgba(186,26,26,0.3)'
                                  : muiTheme.palette.divider
                            }`,
                            color: muiTheme.palette.text.primary,
                            outline: 'none',
                            transition: 'all 0.2s',
                            boxShadow: digit ? '0 4px 12px rgba(13,107,88,0.1)' : 'none',
                            opacity: isVerifying ? 0.5 : 1,
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = 'rgba(13,107,88,0.8)'
                            e.target.style.boxShadow = '0 4px 12px rgba(13,107,88,0.15)'
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = digit
                              ? 'rgba(13,107,88,0.5)'
                              : error
                                ? 'rgba(186,26,26,0.3)'
                                : muiTheme.palette.divider
                            e.target.style.boxShadow = digit ? '0 4px 12px rgba(13,107,88,0.1)' : 'none'
                          }}
                        />
                      </Box>
                    ))}
                  </Stack>
                </motion.div>

                {/* Progress indicator dots */}
                <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center', mt: 1.5 }}>
                  {otp.map((digit, index) => (
                    <Box
                      key={index}
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: digit ? 'primary.main' : 'action.disabledBackground',
                        transition: 'background-color 0.2s',
                      }}
                    />
                  ))}
                </Stack>

                {/* Verify Button */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                >
                  <Button
                    type="button"
                    fullWidth
                    variant="contained"
                    onClick={() => handleVerify()}
                    disabled={isVerifying || otp.join('').length !== OTP_LENGTH}
                    startIcon={<Shield sx={{ fontSize: 18 }} />}
                    sx={{
                      mt: 3,
                      height: 44,
                      borderRadius: 2,
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {isVerifying ? '...' : (isRTL ? 'تحقق' : 'Verify Code')}
                  </Button>
                </motion.div>

                {/* Resend / Countdown */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    {canResend ? (
                      <Button
                        type="button"
                        size="small"
                        onClick={handleResend}
                        disabled={isResending}
                        startIcon={<Refresh sx={{ fontSize: 14 }} />}
                        sx={{
                          color: 'primary.main',
                          fontSize: 13,
                          '&:hover': { bgcolor: 'transparent' },
                        }}
                      >
                        {isResending ? '...' : (isRTL ? 'إعادة إرسال الرمز' : 'Resend Code')}
                      </Button>
                    ) : (
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                        {/* Circular progress indicator */}
                        <Box sx={{ position: 'relative', width: 24, height: 24 }}>
                          <svg width="24" height="24" style={{ transform: 'rotate(-90deg)' }} viewBox="0 0 24 24">
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              fill="none"
                              stroke={muiTheme.palette.divider}
                              strokeWidth="2"
                            />
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              fill="none"
                              stroke={muiTheme.palette.primary.main}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 10}`}
                              strokeDashoffset={`${2 * Math.PI * 10 * (1 - cooldownProgress / 100)}`}
                              style={{ transition: 'all 1s linear' }}
                            />
                          </svg>
                        </Box>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {isRTL ? 'إعادة الإرسال خلال' : 'Resend code in'}{' '}
                          <Box component="span" sx={{ color: 'primary.main', fontWeight: 500, fontFamily: '"JetBrains Mono", monospace' }}>
                            {formatCooldown(cooldown)}
                          </Box>
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                </motion.div>

                {/* Dev Mode OTP Display */}
                {devCode && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.25 }}
                  >
                    <Alert
                      severity="warning"
                      icon={<AutoAwesome sx={{ fontSize: 16 }} />}
                      sx={{
                        mt: 2,
                        borderRadius: 2,
                        bgcolor: 'rgba(217,119,6,0.05)',
                        border: '1px solid rgba(217,119,6,0.2)',
                        '& .MuiAlert-icon': { color: 'secondary.main' },
                      }}
                    >
                      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'secondary.main', fontWeight: 500 }}>
                          {isRTL ? 'وضع التطوير - الرمز:' : 'Dev Mode — Code:'}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Typography
                            variant="h6"
                            sx={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontWeight: 700,
                              color: 'secondary.main',
                              letterSpacing: 2,
                            }}
                          >
                            {devCode}
                          </Typography>
                          <Tooltip title="Copy code">
                            <IconButton size="small" onClick={copyDevCode}>
                              {copied ? <Check sx={{ fontSize: 14, color: 'success.main' }} /> : <ContentCopy sx={{ fontSize: 14, color: 'secondary.main' }} />}
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                      <Typography variant="caption" sx={{ color: 'secondary.main', opacity: 0.5, mt: 0.5, display: 'block' }}>
                        {isRTL
                          ? 'سيتم دمج إرسال البريد الإلكتروني لاحقاً'
                          : 'Email integration will be added later'
                        }
                      </Typography>
                    </Alert>
                  </motion.div>
                )}

                {/* Back to signup */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Button
                      type="button"
                      size="small"
                      onClick={onBack}
                      startIcon={<ArrowBack sx={{ fontSize: 14, transform: isRTL ? 'scaleX(-1)' : 'none' }} />}
                      sx={{
                        color: 'text.secondary',
                        fontSize: 13,
                        '&:hover': { bgcolor: 'transparent', color: 'text.primary' },
                      }}
                    >
                      {isRTL ? 'العودة لتسجيل الدخول' : 'Back to login'}
                    </Button>
                  </Box>
                </motion.div>
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </ThemeProvider>
  )
}
