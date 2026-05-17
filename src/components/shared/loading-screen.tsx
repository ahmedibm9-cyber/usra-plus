'use client'

import { keyframes } from '@mui/system'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import { alpha } from '@mui/material/styles'
import { HexLogo } from './hex-logo'

const logoReveal = keyframes`
  0% { opacity: 0; transform: scale(0.8) rotate(-10deg); }
  50% { transform: scale(1.05) rotate(2deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
`

const textReveal = keyframes`
  from { opacity: 0; transform: translateY(8px); filter: blur(4px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
`

export function LoadingScreen() {
  return (
    <Container maxWidth={false} sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            animation: `${logoReveal} 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
          }}
        >
          <Box sx={(theme) => ({ width: 64, height: 64, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
            <Box sx={{ color: 'primary.main' }}>
              <HexLogo size={40} />
            </Box>
          </Box>
        </Box>

        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            letterSpacing: '-0.02em',
            animation: `${textReveal} 0.5s ease-out forwards`,
            animationDelay: '0.3s',
            opacity: 0,
          }}
        >
          USRA PLUS
        </Typography>

        <Box sx={{ width: 128 }}>
          <LinearProgress
            sx={{
              height: 2,
              borderRadius: 1,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': { borderRadius: 1 },
            }}
          />
        </Box>
      </Stack>
    </Container>
  )
}
