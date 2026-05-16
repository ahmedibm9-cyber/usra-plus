'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { getAppTheme } from '@/lib/mui-theme'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'

// ─── Theme Context ────────────────────────────────────────────────
type ThemeMode = 'light' | 'dark'

interface ThemeContextValue {
  mode: ThemeMode
  toggleTheme: () => void
  setMode: (mode: ThemeMode) => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  toggleTheme: () => {},
  setMode: () => {},
})

export const useThemeMode = () => useContext(ThemeContext)

// ─── MUI Theme Wrapper ────────────────────────────────────────────
export default function MuiThemeWrapper({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light')
  const [mounted, setMounted] = useState(false)

  // Read initial theme from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('usra-theme')
      if (stored === 'dark') {
        setMode('dark')
      } else {
        setMode('light')
      }
    } catch {
      setMode('light')
    }
    setMounted(true)
  }, [])

  // Sync mode to localStorage and DOM classes when MUI wrapper changes mode
  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem('usra-theme', mode)
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(mode)
    } catch {
      // ignore
    }
  }, [mode, mounted])

  // Watch for external theme changes (e.g. from app-store's setTheme)
  // by observing class changes on <html> element
  useEffect(() => {
    if (!mounted) return

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          const classList = document.documentElement.classList
          if (classList.contains('dark') && mode !== 'dark') {
            setMode('dark')
          } else if (classList.contains('light') && mode !== 'light') {
            setMode('light')
          }
        }
      }
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [mode, mounted])

  // Cross-tab theme sync via storage events (no polling needed)
  useEffect(() => {
    if (!mounted) return

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'usra-theme') {
        if (e.newValue === 'dark' && mode !== 'dark') {
          setMode('dark')
        } else if (e.newValue === 'light' && mode !== 'light') {
          setMode('light')
        }
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [mode, mounted])

  const toggleTheme = useCallback(() => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const handleSetMode = useCallback((newMode: ThemeMode) => {
    setMode(newMode)
  }, [])

  const theme = getAppTheme(mode)

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, setMode: handleSetMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: mode === 'dark' ? '#313033' : '#1C1B1F',
              border: 'none',
              color: mode === 'dark' ? '#F4EFF4' : '#FFFFFF',
              borderRadius: '12px',
              boxShadow:
                '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
            },
          }}
        />
        <Analytics />
      </ThemeProvider>
    </ThemeContext.Provider>
  )
}
