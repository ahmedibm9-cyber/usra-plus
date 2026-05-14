'use client'

import { createTheme, ThemeOptions } from '@mui/material/styles'

// ─── Shared Design Tokens ─────────────────────────────────────────
const typography = {
  fontFamily: "'Space Grotesk', 'Inter', 'IBM Plex Sans Arabic', system-ui, sans-serif",
  h1: { fontWeight: 700, letterSpacing: '-0.02em' },
  h2: { fontWeight: 700, letterSpacing: '-0.01em' },
  h3: { fontWeight: 600, letterSpacing: '-0.01em' },
  h4: { fontWeight: 600 },
  h5: { fontWeight: 600 },
  h6: { fontWeight: 600 },
  subtitle1: { fontWeight: 500 },
  subtitle2: { fontWeight: 500, fontSize: '0.8rem' },
  body1: { fontSize: '0.9rem' },
  body2: { fontSize: '0.8rem' },
  button: { fontWeight: 600, textTransform: 'none' as const },
  caption: { fontSize: '0.7rem' },
  overline: { fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em' },
}

const shape = {
  borderRadius: 14,
  borderRadiusSm: 10,
  borderRadiusLg: 18,
}

const components: ThemeOptions['components'] = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        padding: '8px 20px',
        fontWeight: 600,
        textTransform: 'none',
      },
      sizeSmall: { borderRadius: 10, padding: '4px 12px', fontSize: '0.8rem' },
      sizeLarge: { borderRadius: 14, padding: '12px 28px' },
      contained: {
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
        '&:hover': { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)' },
      },
    },
    defaultProps: { disableElevation: true },
  },
  MuiCard: {
    styleOverrides: {
      root: { borderRadius: 16, border: '1px solid transparent' },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: { borderRadius: 14 },
      elevation1: { boxShadow: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)' },
      elevation2: { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)' },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: { '& .MuiOutlinedInput-root': { borderRadius: 12 } },
    },
    defaultProps: { variant: 'outlined' },
  },
  MuiChip: {
    styleOverrides: {
      root: { borderRadius: 8, fontWeight: 500 },
    },
  },
  MuiAvatar: {
    styleOverrides: {
      root: { fontWeight: 600 },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: { borderRadius: 12, margin: '2px 8px', paddingLeft: 12, paddingRight: 12 },
    },
  },
  MuiMenu: {
    styleOverrides: {
      paper: {
        borderRadius: 14,
        minWidth: 200,
        boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: { border: 'none' },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: { boxShadow: 'none' },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: { borderRadius: 8, fontSize: '0.75rem', fontWeight: 500 },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: { borderRadius: 18 },
    },
  },
  MuiFab: {
    styleOverrides: {
      root: { borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
    },
  },
  MuiSwitch: {
    styleOverrides: {
      root: { padding: 8 },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: { textTransform: 'none', fontWeight: 600 },
    },
  },
  MuiBadge: {
    defaultProps: { overlap: 'circular' },
  },
}

// ─── Light Theme ──────────────────────────────────────────────────
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0D6B58',
      light: '#A7F3D0',
      dark: '#00513D',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#92400E',
      light: '#FDE68A',
      dark: '#78350F',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FEFCF9',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1C1B1F',
      secondary: '#49454F',
    },
    divider: 'rgba(28, 27, 31, 0.12)',
    error: { main: '#BA1A1A' },
    success: { main: '#0D6B58' },
    info: { main: '#6B5CE7' },
  },
  typography,
  shape,
  components,
})

// ─── Dark Theme ──────────────────────────────────────────────────
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6EE7B7',
      light: '#A7F3D0',
      dark: '#00513D',
      contrastText: '#00382A',
    },
    secondary: {
      main: '#FBBF24',
      light: '#FDE68A',
      dark: '#78350F',
      contrastText: '#451A03',
    },
    background: {
      default: '#1C1B1F',
      paper: '#2B2930',
    },
    text: {
      primary: '#E6E1E5',
      secondary: '#CAC4D0',
    },
    divider: 'rgba(230, 225, 229, 0.10)',
    error: { main: '#FFB4AB' },
    success: { main: '#6EE7B7' },
    info: { main: '#C7BFFF' },
  },
  typography,
  shape,
  components: {
    ...components,
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 14 },
        elevation1: { boxShadow: '0 1px 3px 0 rgba(0,0,0,0.3), 0 1px 2px -1px rgba(0,0,0,0.2)' },
        elevation2: { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.2)' },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          minWidth: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.48)',
        },
      },
    },
  },
})

// ─── Glass Morphism Styles (for dropdowns/popovers) ──────────────
export const glassStyles = {
  light: {
    background: 'rgba(255, 255, 255, 0.88)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(28, 27, 31, 0.08)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
  },
  dark: {
    background: 'rgba(43, 41, 48, 0.92)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(230, 225, 229, 0.06)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.48), 0 2px 8px rgba(0,0,0,0.24)',
  },
}
