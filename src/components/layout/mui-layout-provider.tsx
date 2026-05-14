'use client'

import React from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { useAppStore } from '@/stores/app-store'
import { getAppTheme } from '@/lib/mui-theme'

/**
 * Shared MUI ThemeProvider for layout components.
 * Reads the current theme mode from app-store and provides
 * the correct MUI theme + CssBaseline.
 */
export function MuiLayoutProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.theme)
  const muiTheme = getAppTheme(theme)

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  )
}
