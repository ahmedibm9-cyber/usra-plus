'use client'

import React, { useMemo } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { lightTheme, darkTheme } from './theme'
import { useAppStore } from '@/stores/app-store'

export function MUIProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.theme)
  const muiTheme = useMemo(() => (theme === 'dark' ? darkTheme : lightTheme), [theme])

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  )
}
