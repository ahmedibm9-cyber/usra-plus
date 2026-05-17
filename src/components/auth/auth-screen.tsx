'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useAuthStore } from '@/stores/auth-store'
import { HexLogo } from '@/components/shared/hex-logo'
import { ChunkLoader } from '@/components/shared/chunk-loader'
import { keyframes } from '@mui/system'
import { alpha } from '@mui/material/styles'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'

const LoginForm = dynamic(() => import('@/components/auth/login-form').then(m => ({ default: m.LoginForm })), { ssr: false, loading: () => <ChunkLoader /> })
const SignupForm = dynamic(() => import('@/components/auth/signup-form').then(m => ({ default: m.SignupForm })), { ssr: false, loading: () => <ChunkLoader /> })
const ForgotPasswordForm = dynamic(() => import('@/components/auth/forgot-password-form').then(m => ({ default: m.ForgotPasswordForm })), { ssr: false, loading: () => <ChunkLoader /> })

const AUTH_FEATURES = ['Tasks', 'Calendar', 'Meals', 'Budget', 'Chat'] as const

const TESTIMONIALS = [
  { text: '"USRA PLUS transformed how our family stays organized. We never miss an event now!"', author: 'Sara M.', role: 'Mother of 3' },
  { text: '"التنسيق العائلي أصبح أسهل بكثير مع أسرا بلس"', author: 'أحمد خ.', role: 'Father of 4' },
  { text: '"The meal planning and budget features saved us hours every week."', author: 'Fatima A.', role: 'Family Manager' },
] as const

const logoReveal = keyframes`
  0% { opacity: 0; transform: scale(0.8) rotate(-10deg); }
  50% { transform: scale(1.05) rotate(2deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
`

const textReveal = keyframes`
  from { opacity: 0; transform: translateY(8px); filter: blur(4px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
`

const floatAnim = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`

const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`

const hexFloat1 = keyframes`
  0% { transform: translate(0, 0) rotate(0deg); opacity: 0.08; }
  25% { transform: translate(30px, -20px) rotate(60deg); opacity: 0.12; }
  50% { transform: translate(-10px, -40px) rotate(120deg); opacity: 0.06; }
  75% { transform: translate(-30px, -15px) rotate(200deg); opacity: 0.10; }
  100% { transform: translate(0, 0) rotate(360deg); opacity: 0.08; }
`

const hexFloat2 = keyframes`
  0% { transform: translate(0, 0) rotate(0deg); opacity: 0.06; }
  25% { transform: translate(-25px, 15px) rotate(-60deg); opacity: 0.10; }
  50% { transform: translate(15px, 35px) rotate(-120deg); opacity: 0.04; }
  75% { transform: translate(25px, 10px) rotate(-200deg); opacity: 0.08; }
  100% { transform: translate(0, 0) rotate(-360deg); opacity: 0.06; }
`

const hexFloat3 = keyframes`
  0% { transform: translate(0, 0) rotate(30deg); opacity: 0.05; }
  33% { transform: translate(20px, -30px) rotate(150deg); opacity: 0.09; }
  66% { transform: translate(-20px, 20px) rotate(270deg); opacity: 0.04; }
  100% { transform: translate(0, 0) rotate(390deg); opacity: 0.05; }
`

const dotPulse = keyframes`
  0%, 100% { opacity: 0.03; }
  50% { opacity: 0.08; }
`

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`

export function AuthScreen() {
  const { authView } = useAuthStore()
  const [testimonialIdx, setTestimonialIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIdx((prev) => (prev + 1) % TESTIMONIALS.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  const currentTestimonial = TESTIMONIALS[testimonialIdx]

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', position: 'relative', overflow: 'hidden' }}
    >
      <Box
        sx={(theme) => ({
          display: { xs: 'none', lg: 'flex' },
          width: { lg: '45%', xl: '50%' },
          position: 'relative',
          overflow: 'hidden',
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark}, ${theme.palette.background.paper}, ${theme.palette.background.default})`
            : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.primary.dark}, ${theme.palette.background.default})`,
          backgroundSize: '300% 300%',
          animation: `${gradientShift} 15s ease infinite`,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: 5,
        })}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.04,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236EE7B7' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <Box sx={(theme) => ({ position: 'absolute', top: '8%', left: '8%', animation: `${hexFloat1} 20s ease-in-out infinite`, opacity: 0.08, color: theme.palette.primary.light })}>
          <HexLogo size={60} />
        </Box>
        <Box sx={(theme) => ({ position: 'absolute', top: '25%', right: '12%', animation: `${hexFloat2} 25s ease-in-out infinite`, opacity: 0.06, color: theme.palette.secondary.light })}>
          <HexLogo size={40} />
        </Box>
        <Box sx={(theme) => ({ position: 'absolute', bottom: '20%', left: '15%', animation: `${hexFloat3} 22s ease-in-out infinite`, opacity: 0.07, color: theme.palette.primary.light })}>
          <HexLogo size={50} />
        </Box>
        <Box sx={(theme) => ({ position: 'absolute', bottom: '35%', right: '8%', animation: `${hexFloat1} 18s ease-in-out infinite`, animationDelay: '5s', opacity: 0.05, color: theme.palette.success.light })}>
          <HexLogo size={35} />
        </Box>
        <Box sx={(theme) => ({ position: 'absolute', top: '55%', left: '5%', animation: `${hexFloat2} 28s ease-in-out infinite`, animationDelay: '8s', opacity: 0.04, color: theme.palette.primary.light })}>
          <HexLogo size={28} />
        </Box>

        <Box sx={(theme) => ({ position: 'absolute', top: '15%', right: '10%', width: 288, height: 288, borderRadius: '50%', bgcolor: theme.palette.primary.light, opacity: 0.06, filter: 'blur(80px)', animation: `${floatAnim} 4s ease-in-out infinite` })} />
        <Box sx={(theme) => ({ position: 'absolute', bottom: '10%', left: '5%', width: 224, height: 224, borderRadius: '50%', bgcolor: theme.palette.secondary.light, opacity: 0.05, filter: 'blur(60px)', animation: `${floatAnim} 4s ease-in-out infinite`, animationDelay: '2s' })} />
        <Box sx={(theme) => ({ position: 'absolute', top: '50%', left: '40%', width: 160, height: 160, borderRadius: '50%', bgcolor: theme.palette.secondary.light, opacity: 0.04, filter: 'blur(50px)', animation: `${floatAnim} 4s ease-in-out infinite`, animationDelay: '4s' })} />

        <Stack sx={{ position: 'relative', zIndex: 10, justifyContent: 'center', alignItems: 'center', px: 5, width: '100%' }}>
          <Box sx={{ mb: 3, animation: `${logoReveal} 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards` }}>
            <Box sx={(theme) => ({
              width: 88, height: 88, borderRadius: 4,
              bgcolor: alpha(theme.palette.common.white, 0.08),
              backdropFilter: 'blur(12px)',
              border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 40px ${alpha(theme.palette.primary.light, 0.15)}`,
            })}>
              <Box sx={{ color: 'primary.light' }}>
                <HexLogo size={52} />
              </Box>
            </Box>
          </Box>

          <Typography
            variant="h3"
            sx={{
              color: 'common.white',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              animation: `${textReveal} 0.5s ease-out forwards`,
              animationDelay: '0.2s', opacity: 0,
            }}
          >
            USRA PLUS
          </Typography>
          <Typography
            variant="body1"
            sx={(theme) => ({
              color: alpha(theme.palette.common.white, 0.6),
              fontWeight: 300, textAlign: 'center', maxWidth: 320, mt: 1.5,
              animation: `${textReveal} 0.5s ease-out forwards`,
              animationDelay: '0.4s', opacity: 0,
            })}
          >
            Your Family Operating System
          </Typography>

          <Stack
            direction="row" spacing={1}
            sx={(theme) => ({
              mt: 4, flexWrap: 'wrap', justifyContent: 'center',
              animation: `${textReveal} 0.5s ease-out forwards`,
              animationDelay: '0.6s', opacity: 0,
              '& .MuiChip-root': {
                bgcolor: alpha(theme.palette.common.white, 0.06),
                color: alpha(theme.palette.common.white, 0.5),
                border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
                borderRadius: 2, fontWeight: 500,
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.light, 0.12),
                  color: theme.palette.primary.light,
                  borderColor: alpha(theme.palette.primary.light, 0.3),
                  boxShadow: `0 0 12px ${alpha(theme.palette.primary.light, 0.2)}`,
                  transform: 'translateY(-1px)',
                },
              },
            })}
          >
            {AUTH_FEATURES.map((feature) => (
              <Chip key={feature} label={feature} size="small" />
            ))}
          </Stack>

          <Paper
            key={testimonialIdx}
            elevation={0}
            sx={(theme) => ({
              mt: 5, maxWidth: 320, textAlign: 'center', p: 2.5,
              bgcolor: 'transparent',
              border: `1px solid ${alpha(theme.palette.common.white, 0.06)}`,
              borderRadius: 3,
              animation: `${fadeInUp} 0.6s ease-out forwards`,
            })}
          >
            <Typography
              variant="body2"
              sx={(theme) => ({ color: alpha(theme.palette.common.white, 0.5), fontStyle: 'italic', lineHeight: 1.7 })}
            >
              {currentTestimonial.text}
            </Typography>
            <Typography
              variant="caption"
              sx={(theme) => ({ display: 'block', mt: 1.5, color: alpha(theme.palette.common.white, 0.35), fontWeight: 500 })}
            >
              — {currentTestimonial.author}, {currentTestimonial.role}
            </Typography>
          </Paper>

          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', mt: 4, gap: 1, animation: `${textReveal} 0.5s ease-out forwards`, animationDelay: '0.8s', opacity: 0 }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'row', '& > :not(:first-child)': { ml: '-0.5rem' } }}>
              {(['primary.main', 'secondary.main', 'success.dark', 'warning.main'] as const).map((paletteKey, i) => (
                <Box key={paletteKey}
                  sx={(theme) => ({
                    width: 22, height: 22, borderRadius: '50%',
                    bgcolor: theme.palette.primary.main,
                    border: `2px solid ${alpha(theme.palette.common.white, 0.2)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.5rem', fontWeight: 700,
                    color: alpha(theme.palette.common.white, 0.7), zIndex: 4 - i,
                  })}
                >
                  {['S', 'A', 'F', 'K'][i]}
                </Box>
              ))}
            </Box>
            <Typography variant="caption" sx={(theme) => ({ color: alpha(theme.palette.common.white, 0.4), fontWeight: 500 })}>
              Trusted by 10,000+ families
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Stack sx={{ flex: 1, alignItems: 'center', justifyContent: 'center', p: { xs: 2, lg: 4 }, position: 'relative' }}>
        <Box
          sx={(theme) => ({
            position: 'absolute', inset: 0, opacity: 0.4,
            backgroundImage: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.08)} 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
            animation: `${dotPulse} 4s ease-in-out infinite`,
            pointerEvents: 'none',
          })}
        />
        <Box sx={{ position: 'absolute', top: 0, right: 0, width: 500, height: 500, borderRadius: '50%', bgcolor: 'primary.main', opacity: 0.03, filter: 'blur(100px)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, width: 400, height: 400, borderRadius: '50%', bgcolor: 'secondary.main', opacity: 0.03, filter: 'blur(100px)', pointerEvents: 'none' }} />

        <Box sx={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 448 }}>
          <Box key={authView} sx={{ animation: `${fadeInUp} 0.35s ease-out forwards` }}>
            {authView === 'login' && <LoginForm />}
            {authView === 'signup' && <SignupForm />}
            {authView === 'forgot-password' && <ForgotPasswordForm />}
          </Box>
        </Box>
      </Stack>
    </Container>
  )
}
