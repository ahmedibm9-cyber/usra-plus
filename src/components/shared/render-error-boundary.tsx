'use client'

import React, { Component } from 'react'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import { alpha } from '@mui/material/styles'
import { HexLogo } from './hex-logo'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class RenderErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, _info: React.ErrorInfo) {
    console.error('[USRA PLUS] Render error caught by boundary:', error, _info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <Container maxWidth={false} sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
          <Stack spacing={2} sx={{ maxWidth: 384, width: '100%', alignItems: 'center', textAlign: 'center' }}>
            <Box sx={(theme) => ({ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.1) })}>
              <Box sx={{ color: 'primary.main' }}>
                <HexLogo size={32} />
              </Box>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Something went wrong
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }} sx={{ lineHeight: 1.6 }}>
              A rendering error occurred. Please try refreshing the page.
            </Typography>
            <Button variant="contained" onClick={() => window.location.reload()} sx={{ borderRadius: 3, px: 3, py: 1 }}>
              Refresh Page
            </Button>
          </Stack>
        </Container>
      )
    }
    return this.props.children
  }
}
