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
  Typography,
  Box,
  InputAdornment,
  Divider,
} from '@mui/material'
import {
  Mail,
  ArrowBack,
  CheckCircle,
} from '@mui/icons-material'
import { ThemeToggle } from './theme-toggle'
import { toast } from 'sonner'
import { useAppStore } from '@/stores/app-store'

// ─── Animation variants ───────────────────────────────────────────
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

// Compact TextField sx — consistent across all auth forms
const textFieldSx = {
  '& .MuiOutlinedInput-root': { height: 40 },
  '& .MuiOutlinedInput-input': { fontSize: 14 },
}

export function ForgotPasswordForm() {
  const { setAuthView } = useAuthStore()
  const { t, isRTL } = useI18n()
  const { theme } = useAppStore()
  const muiTheme = getAppTheme(theme)

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

  // ─── Success State ──────────────────────────────────────────────
  if (isSent) {
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
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                {/* Theme toggle */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1.5 }}>
                  <ThemeToggle />
                </Box>

                {/* Success illustration */}
                <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
                    <Box sx={{ position: 'relative' }}>
                      <Box
                        sx={{
                          width: 72,
                          height: 72,
                          borderRadius: '50%',
                          bgcolor: 'primary.light',
                          border: '1px solid',
                          borderColor: 'primary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CheckCircle sx={{ fontSize: 36, color: 'primary.main' }} />
                      </Box>
                    </Box>
                  </Box>
                </motion.div>

                <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    {t.auth.resetPassword}
                  </Typography>
                  <Divider sx={{ width: 48, mx: 'auto', my: 1.5, borderColor: 'secondary.main', borderBottomWidth: 2 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {t.auth.verificationSent}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 500, mt: 0.5 }}>
                    {email}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                    {t.auth.checkInbox}
                  </Typography>
                </motion.div>

                <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
                  <Button
                    onClick={() => setAuthView('login')}
                    variant="outlined"
                    fullWidth
                    startIcon={<ArrowBack sx={{ transform: isRTL ? 'scaleX(-1)' : 'none' }} />}
                    sx={{
                      mt: 3,
                      height: 40,
                      borderRadius: 2,
                      borderColor: 'divider',
                      color: 'text.secondary',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    {t.auth.backToLogin}
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </Box>
      </ThemeProvider>
    )
  }

  // ─── Default State ──────────────────────────────────────────────
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
            <CardContent sx={{ p: 3 }}>
              {/* Theme toggle */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1.5 }}>
                <ThemeToggle />
              </Box>

              {/* Header */}
              <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0 }}>
                <Box sx={{ textAlign: 'center', mb: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: 3,
                        bgcolor: 'primary.light',
                        border: '1px solid',
                        borderColor: 'rgba(13,107,88,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Mail sx={{ fontSize: 26, color: 'primary.main' }} />
                    </Box>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {isRTL ? 'أدخل بريدك الإلكتروني وسنرسل لك رابط الإعادة' : "Enter your email and we'll send you a reset link"}
                  </Typography>
                  <Divider sx={{ width: 48, mx: 'auto', mt: 1.5, borderColor: 'secondary.main', borderBottomWidth: 2 }} />
                </Box>
              </motion.div>

              {/* Form */}
              <Box component="form" onSubmit={handleSubmit}>
                <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
                  <TextField
                    fullWidth
                    id="reset-email"
                    type="email"
                    label={t.auth.email}
                    placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (error) setError('')
                    }}
                    disabled={isLoading}
                    error={!!error}
                    helperText={error || ''}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Mail sx={{ fontSize: 16, color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={textFieldSx}
                  />
                </motion.div>

                <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }}>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={isLoading}
                    sx={{
                      mt: 2,
                      height: 40,
                      borderRadius: 2,
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {isLoading ? '...' : (isRTL ? 'إرسال رابط الإعادة' : 'Send Reset Link')}
                  </Button>
                </motion.div>
              </Box>

              {/* Back to login */}
              <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
                <Box sx={{ textAlign: 'center', mt: 1.5 }}>
                  <Button
                    type="button"
                    onClick={() => setAuthView('login')}
                    size="small"
                    startIcon={<ArrowBack sx={{ fontSize: 14, transform: isRTL ? 'scaleX(-1)' : 'none' }} />}
                    sx={{
                      color: 'text.secondary',
                      fontSize: 13,
                      '&:hover': { bgcolor: 'transparent', color: 'primary.main' },
                    }}
                  >
                    {t.auth.backToLogin}
                  </Button>
                </Box>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </Box>
    </ThemeProvider>
  )
}
