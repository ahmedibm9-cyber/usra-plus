'use client'

import { createTheme, ThemeOptions } from '@mui/material/styles'

// Shared design tokens — no red, no yellow
const TEAL = {
  50: '#E6F7F3',
  100: '#B3E8DA',
  200: '#80D9C1',
  300: '#4DCAA8',
  400: '#26BF96',
  500: '#0D6B58',
  600: '#0A5A4A',
  700: '#08493C',
  800: '#05382E',
  900: '#03271F',
}

const EMERALD = {
  50: '#ECFDF5',
  100: '#D1FAE5',
  200: '#A7F3D0',
  300: '#6EE7B7',
  400: '#34D399',
  500: '#10B981',
  600: '#059669',
  700: '#047857',
  800: '#065F46',
  900: '#064E3B',
}

const NEUTRAL = {
  50: '#FAFAF8',
  100: '#F4F1ED',
  200: '#E7E0DC',
  300: '#CAC4D0',
  400: '#9E9C94',
  500: '#79747E',
  600: '#5F5D58',
  700: '#49454F',
  800: '#2B2930',
  900: '#1C1B1F',
}

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: TEAL[500],
      light: TEAL[300],
      dark: TEAL[700],
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: EMERALD[800],
      light: EMERALD[400],
      dark: EMERALD[900],
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FEFCF9',
      paper: '#FFFFFF',
    },
    text: {
      primary: NEUTRAL[900],
      secondary: NEUTRAL[700],
    },
    divider: 'rgba(28, 27, 31, 0.12)',
    error: {
      main: '#BA1A1A',
      light: '#FFDAD6',
      dark: '#93000A',
      contrastText: '#FFFFFF',
    },
    success: {
      main: TEAL[500],
      light: TEAL[100],
      dark: TEAL[800],
    },
    warning: {
      main: EMERALD[600],
      light: EMERALD[100],
      dark: EMERALD[900],
    },
    info: {
      main: '#3B82F6',
      light: '#DBEAFE',
      dark: '#1E40AF',
    },
  },
  typography: {
    fontFamily: '"Inter", "IBM Plex Sans Arabic", system-ui, sans-serif',
    h1: { fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700 },
    h2: { fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 600 },
    h4: { fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 600 },
    h5: { fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 600 },
    button: { fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 600 },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          fontWeight: 600,
          padding: '8px 20px',
        },
        contained: {
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
          border: '1px solid rgba(28, 27, 31, 0.08)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: { boxShadow: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)' },
        elevation2: { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)' },
        elevation3: { boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.06)' },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
          border: '1px solid rgba(28, 27, 31, 0.08)',
          bgcolor: '#FFFFFF',
          backgroundImage: 'none',
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          bgcolor: '#FFFFFF',
          backgroundImage: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(28, 27, 31, 0.08)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid rgba(28, 27, 31, 0.08)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: '0.75rem',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '&.Mui-selected': {
            backgroundColor: 'rgba(13, 107, 88, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(13, 107, 88, 0.14)',
            },
          },
        },
      },
    },
  },
} as ThemeOptions)

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
      main: EMERALD[400],
      light: EMERALD[300],
      dark: EMERALD[800],
      contrastText: EMERALD[900],
    },
    background: {
      default: '#1C1B1F',
      paper: '#2B2930',
    },
    text: {
      primary: '#E6E1E5',
      secondary: '#B8B5BC',
    },
    divider: 'rgba(230, 225, 229, 0.10)',
    error: {
      main: '#FFB4AB',
      light: '#93000A',
      dark: '#FFDAD6',
      contrastText: '#690005',
    },
    success: {
      main: '#6EE7B7',
      light: '#00513D',
      dark: '#A7F3D0',
    },
    warning: {
      main: EMERALD[400],
      light: EMERALD[800],
      dark: EMERALD[200],
    },
    info: {
      main: '#93C5FD',
      light: '#1E3A5F',
      dark: '#DBEAFE',
    },
  },
  typography: {
    fontFamily: '"Inter", "IBM Plex Sans Arabic", system-ui, sans-serif',
    h1: { fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700 },
    h2: { fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 600 },
    h4: { fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 600 },
    h5: { fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 600 },
    button: { fontFamily: '"Space Grotesk", system-ui, sans-serif', fontWeight: 600 },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          fontWeight: 600,
          padding: '8px 20px',
        },
        contained: {
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.3), 0 1px 2px -1px rgba(0,0,0,0.2)',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.2)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.3), 0 1px 2px -1px rgba(0,0,0,0.2)',
          border: '1px solid rgba(230, 225, 229, 0.06)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: { boxShadow: '0 1px 3px 0 rgba(0,0,0,0.3), 0 1px 2px -1px rgba(0,0,0,0.2)' },
        elevation2: { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.2)' },
        elevation3: { boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -4px rgba(0,0,0,0.2)' },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.3)',
          border: '1px solid rgba(230, 225, 229, 0.06)',
          bgcolor: '#2B2930',
          backgroundImage: 'none',
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          bgcolor: '#2B2930',
          backgroundImage: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(230, 225, 229, 0.06)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid rgba(230, 225, 229, 0.06)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.2)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: '0.75rem',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          '&.Mui-selected': {
            backgroundColor: 'rgba(110, 231, 183, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(110, 231, 183, 0.14)',
            },
          },
        },
      },
    },
  },
} as ThemeOptions)

// Helper to get theme based on current mode
export function getAppTheme(mode: 'light' | 'dark') {
  return mode === 'dark' ? darkTheme : lightTheme
}
