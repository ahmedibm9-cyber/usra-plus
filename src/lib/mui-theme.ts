'use client'

import { createTheme, type ThemeOptions } from '@mui/material/styles'

// ─── Color System ──────────────────────────────────────────────────
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

// ─── 8px Grid Spacing System ───────────────────────────────────────
const SPACING: Record<string | number, number> = {
  0: 0,
  0.5: 4,
  1: 8,
  1.5: 12,
  2: 16,
  2.5: 20,
  3: 24,
  4: 32,
  5: 40,
  6: 48,
  7: 56,
  8: 64,
  10: 80,
  12: 96,
}

// ─── MD3 Elevation System (0-5) ────────────────────────────────────
const ELEVATION: Record<number, string> = {
  0: 'none',
  1: '0 1px 2px 0 rgba(0,0,0,0.05)',
  2: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.05)',
  3: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.05)',
  4: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05)',
  5: '0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.05)',
}

// ─── Motion / Animation Tokens ─────────────────────────────────────
const MOTION = {
  durationShort: '150ms',
  durationMedium: '300ms',
  durationLong: '500ms',
  easingStandard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easingDecelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  easingAccelerate: 'cubic-bezier(0.4, 0, 1, 1)',
}

// ─── MD3 Shape Tokens ──────────────────────────────────────────────
const SHAPE = {
  button: 8,
  card: 12,
  dialog: 16,
  pill: 9999,
  menu: 12,
  tooltip: 8,
  chip: 8,
  fab: 16,
  textField: 12,
  bottomSheet: 24,
}

// ─── MD3 Typography Scale ──────────────────────────────────────────
const TYPOGRAPHY_FONT_FAMILY = '"Inter", "IBM Plex Sans Arabic", system-ui, sans-serif'
const HEADING_FONT_FAMILY = '"Space Grotesk", system-ui, sans-serif'

const typographyScale = {
  // Display — hero headings
  display2: {
    fontFamily: HEADING_FONT_FAMILY,
    fontWeight: 700,
    fontSize: '3.5625rem',   // 57px
    lineHeight: 1.12,        // 64px
    letterSpacing: '-0.02em',
  },
  display1: {
    fontFamily: HEADING_FONT_FAMILY,
    fontWeight: 700,
    fontSize: '2.5rem',      // 40px
    lineHeight: 1.2,         // 48px
    letterSpacing: '-0.02em',
  },
  // Headline — section headings
  headline1: {
    fontFamily: HEADING_FONT_FAMILY,
    fontWeight: 700,
    fontSize: '2rem',        // 32px
    lineHeight: 1.25,        // 40px
    letterSpacing: '-0.01em',
  },
  headline2: {
    fontFamily: HEADING_FONT_FAMILY,
    fontWeight: 600,
    fontSize: '1.5rem',      // 24px
    lineHeight: 1.33,        // 32px
    letterSpacing: '-0.01em',
  },
  // Title — sub-section headings
  title1: {
    fontFamily: HEADING_FONT_FAMILY,
    fontWeight: 600,
    fontSize: '1.25rem',     // 20px
    lineHeight: 1.4,         // 28px
    letterSpacing: '0em',
  },
  title2: {
    fontFamily: HEADING_FONT_FAMILY,
    fontWeight: 600,
    fontSize: '1.125rem',    // 18px
    lineHeight: 1.33,        // 24px
    letterSpacing: '0em',
  },
  title3: {
    fontFamily: HEADING_FONT_FAMILY,
    fontWeight: 600,
    fontSize: '1rem',        // 16px
    lineHeight: 1.5,         // 24px
    letterSpacing: '0.01em',
  },
  // Body — content text
  body1: {
    fontFamily: TYPOGRAPHY_FONT_FAMILY,
    fontWeight: 400,
    fontSize: '1rem',        // 16px
    lineHeight: 1.5,         // 24px
    letterSpacing: '0.01em',
  },
  body2: {
    fontFamily: TYPOGRAPHY_FONT_FAMILY,
    fontWeight: 400,
    fontSize: '0.875rem',    // 14px
    lineHeight: 1.43,        // 20px
    letterSpacing: '0.02em',
  },
  // Label — UI labels, buttons
  label1: {
    fontFamily: HEADING_FONT_FAMILY,
    fontWeight: 600,
    fontSize: '0.875rem',    // 14px
    lineHeight: 1.43,        // 20px
    letterSpacing: '0.01em',
  },
  label2: {
    fontFamily: HEADING_FONT_FAMILY,
    fontWeight: 600,
    fontSize: '0.75rem',     // 12px
    lineHeight: 1.33,        // 16px
    letterSpacing: '0.02em',
  },
  // Caption — small text
  caption: {
    fontFamily: TYPOGRAPHY_FONT_FAMILY,
    fontWeight: 400,
    fontSize: '0.75rem',     // 12px
    lineHeight: 1.33,        // 16px
    letterSpacing: '0.02em',
  },
  // Overline — uppercase tracked labels
  overline: {
    fontFamily: HEADING_FONT_FAMILY,
    fontWeight: 600,
    fontSize: '0.625rem',    // 10px
    lineHeight: 1.6,         // 16px
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },
}

// ─── Transition helper using MOTION tokens ─────────────────────────
function transition(properties: string[] = ['all']): string {
  return properties
    .map((p) => `${p} ${MOTION.durationMedium} ${MOTION.easingStandard}`)
    .join(', ')
}

// ─── Shared Component Overrides (mode-agnostic) ────────────────────
function sharedComponents(): ThemeOptions['components'] {
  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: TYPOGRAPHY_FONT_FAMILY,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '*': {
          scrollbarWidth: 'thin',
        },
        '::-webkit-scrollbar': {
          width: 6,
          height: 6,
        },
        '::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '::-webkit-scrollbar-thumb': {
          borderRadius: 3,
        },
      },
    },

    // ─── Button ──────────────────────────────────────────────────
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          borderRadius: SHAPE.button,
          fontWeight: 600,
          fontFamily: HEADING_FONT_FAMILY,
          padding: `${SPACING[1]}px ${SPACING[2.5]}px`,
          transition: transition(['all']),
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
        contained: {
          boxShadow: ELEVATION[1],
          '&:hover': {
            boxShadow: ELEVATION[3],
            transform: 'translateY(-1px)',
          },
          '&:active': {
            boxShadow: ELEVATION[1],
            transform: 'translateY(0) scale(0.98)',
          },
        },
        outlined: {
          borderWidth: 1.5,
          '&:hover': {
            borderWidth: 1.5,
          },
        },
        text: {
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        },
        sizeSmall: {
          padding: `${SPACING[0.5]}px ${SPACING[1.5]}px`,
          fontSize: '0.75rem',
          borderRadius: 6,
        },
        sizeMedium: {
          padding: `${SPACING[1]}px ${SPACING[2.5]}px`,
          fontSize: '0.875rem',
        },
        sizeLarge: {
          padding: `${SPACING[1.5]}px ${SPACING[3]}px`,
          fontSize: '1rem',
          borderRadius: 10,
        },
      },
    },

    // ─── Card ────────────────────────────────────────────────────
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: SHAPE.card,
          boxShadow: ELEVATION[2],
          border: '1px solid',
          borderColor: 'divider',
          transition: transition(['box-shadow', 'transform', 'border-color']),
          overflow: 'hidden',
          '&:hover': {
            boxShadow: ELEVATION[4],
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: `${SPACING[3]}px`,
          '&:last-child': {
            paddingBottom: `${SPACING[3]}px`,
          },
        },
      },
    },

    // ─── Paper ──────────────────────────────────────────────────
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation0: { boxShadow: ELEVATION[0] },
        elevation1: { boxShadow: ELEVATION[1] },
        elevation2: { boxShadow: ELEVATION[2] },
        elevation3: { boxShadow: ELEVATION[3] },
        elevation4: { boxShadow: ELEVATION[4] },
        elevation5: { boxShadow: ELEVATION[5] },
        rounded: {
          borderRadius: SHAPE.card,
        },
      },
    },

    // ─── TextField / OutlinedInput ───────────────────────────────
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: SHAPE.textField,
            transition: transition(['border-color', 'box-shadow']),
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: SHAPE.textField,
          transition: transition(['border-color', 'box-shadow']),
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderWidth: 1.5,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: 2,
          },
        },
        notchedOutline: {
          transition: transition(['border-color']),
        },
      },
    },

    // ─── Dialog ──────────────────────────────────────────────────
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: SHAPE.dialog,
          boxShadow: ELEVATION[5],
          backgroundImage: 'none',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: HEADING_FONT_FAMILY,
          fontWeight: 600,
          fontSize: '1.25rem',
          padding: `${SPACING[3]}px ${SPACING[3]}px ${SPACING[1]}px`,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: `${SPACING[1]}px ${SPACING[3]}px`,
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: `${SPACING[1]}px ${SPACING[3]}px ${SPACING[2]}px`,
          gap: SPACING[1],
        },
      },
    },

    // ─── Menu / MenuItem ─────────────────────────────────────────
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: SHAPE.menu,
          boxShadow: ELEVATION[4],
          border: '1px solid',
          borderColor: 'divider',
          backgroundImage: 'none',
          overflow: 'hidden',
        },
        list: {
          padding: `${SPACING[0.5]}px 0`,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          margin: `0 ${SPACING[0.5]}px`,
          padding: `${SPACING[1]}px ${SPACING[2]}px`,
          transition: transition(['background-color', 'color']),
          minHeight: 36,
          '&:hover': {
            backgroundColor: 'action.hover',
          },
          '&.Mui-selected': {
            backgroundColor: 'action.selected',
            '&:hover': {
              backgroundColor: 'action.selected',
            },
          },
        },
      },
    },

    // ─── Drawer ──────────────────────────────────────────────────
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid',
          borderColor: 'divider',
          backgroundImage: 'none',
        },
        anchorBottom: {
          borderRadius: `${SHAPE.bottomSheet}px ${SHAPE.bottomSheet}px 0 0`,
          borderTop: '1px solid',
          borderColor: 'divider',
          borderRight: 'none',
        },
      },
    },

    // ─── AppBar / Toolbar ────────────────────────────────────────
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundImage: 'none',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 56,
          gap: SPACING[1],
        },
        dense: {
          minHeight: 48,
        },
      },
    },

    // ─── Tabs / Tab ──────────────────────────────────────────────
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 48,
        },
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
          transition: transition(['all']),
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontWeight: 600,
          fontFamily: HEADING_FONT_FAMILY,
          fontSize: '0.875rem',
          minHeight: 48,
          padding: `${SPACING[1]}px ${SPACING[2]}px`,
          transition: transition(['color', 'background-color']),
        },
      },
    },

    // ─── Chip ────────────────────────────────────────────────────
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: SHAPE.chip,
          fontWeight: 500,
          fontFamily: HEADING_FONT_FAMILY,
          transition: transition(['background-color', 'box-shadow']),
          '&:hover': {
            boxShadow: ELEVATION[1],
          },
        },
        sizeSmall: {
          height: 24,
          fontSize: '0.6875rem',
        },
        sizeMedium: {
          height: 32,
          fontSize: '0.8125rem',
        },
        outlined: {
          borderWidth: 1.5,
        },
      },
    },

    // ─── Avatar ──────────────────────────────────────────────────
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontFamily: HEADING_FONT_FAMILY,
          transition: transition(['box-shadow', 'border-color']),
        },
      },
    },

    // ─── IconButton ──────────────────────────────────────────────
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: transition(['all']),
        },
        sizeSmall: {
          padding: 4,
        },
        sizeMedium: {
          padding: 8,
        },
        sizeLarge: {
          padding: 12,
        },
      },
    },

    // ─── ListItemButton ──────────────────────────────────────────
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: transition(['background-color', 'color']),
          '&.Mui-selected': {
            backgroundColor: 'action.selected',
            '&:hover': {
              backgroundColor: 'action.selected',
            },
          },
        },
      },
    },

    // ─── Tooltip ─────────────────────────────────────────────────
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: SHAPE.tooltip,
          fontSize: '0.75rem',
          fontWeight: 500,
          fontFamily: TYPOGRAPHY_FONT_FAMILY,
          padding: `${SPACING[1]}px ${SPACING[1.5]}px`,
          boxShadow: ELEVATION[3],
        },
        arrow: {
          fontSize: '0.5rem',
        },
      },
    },

    // ─── Fab ─────────────────────────────────────────────────────
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: SHAPE.fab,
          boxShadow: ELEVATION[3],
          fontFamily: HEADING_FONT_FAMILY,
          fontWeight: 600,
          textTransform: 'none' as const,
          transition: transition(['all']),
          '&:hover': {
            boxShadow: ELEVATION[4],
            transform: 'translateY(-2px)',
          },
          '&:active': {
            boxShadow: ELEVATION[2],
            transform: 'translateY(0) scale(0.97)',
          },
        },
        sizeSmall: {
          width: 40,
          height: 40,
          minWidth: 40,
        },
        sizeMedium: {
          width: 48,
          height: 48,
        },
      },
    },

    // ─── Snackbar / Alert ────────────────────────────────────────
    MuiSnackbar: {
      styleOverrides: {
        root: {
          '& .MuiSnackbarContent-root': {
            borderRadius: SHAPE.card,
            boxShadow: ELEVATION[4],
            fontFamily: TYPOGRAPHY_FONT_FAMILY,
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: SHAPE.card,
          fontFamily: TYPOGRAPHY_FONT_FAMILY,
          fontWeight: 500,
          padding: `${SPACING[1]}px ${SPACING[2]}px`,
        },
        standard: {
          border: '1px solid',
        },
      },
    },

    // ─── Breadcrumbs ─────────────────────────────────────────────
    MuiBreadcrumbs: {
      styleOverrides: {
        root: {
          fontFamily: TYPOGRAPHY_FONT_FAMILY,
          fontSize: '0.875rem',
        },
        separator: {
          margin: `0 ${SPACING[0.5]}px`,
        },
      },
    },

    // ─── Badge ───────────────────────────────────────────────────
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontFamily: HEADING_FONT_FAMILY,
          fontWeight: 700,
          transition: transition(['transform', 'background-color']),
        },
      },
    },

    // ─── Switch ──────────────────────────────────────────────────
    MuiSwitch: {
      styleOverrides: {
        root: {
          padding: 8,
          transition: transition(['background-color']),
        },
        switchBase: {
          transition: transition(['all']),
        },
        thumb: {
          boxShadow: ELEVATION[1],
          transition: transition(['transform', 'box-shadow']),
        },
        track: {
          borderRadius: SHAPE.pill,
          transition: transition(['background-color', 'opacity']),
        },
      },
    },

    // ─── LinearProgress / CircularProgress ───────────────────────
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: SHAPE.pill,
          height: 4,
          overflow: 'hidden',
        },
        bar: {
          borderRadius: SHAPE.pill,
          transition: transition(['transform']),
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          transition: transition(['color']),
        },
      },
    },

    // ─── Skeleton ────────────────────────────────────────────────
    MuiSkeleton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: transition(['opacity']),
        },
        rectangular: {
          borderRadius: SHAPE.card,
        },
        circular: {
          borderRadius: '50%',
        },
        text: {
          borderRadius: 4,
        },
      },
    },

    // ─── Divider ─────────────────────────────────────────────────
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'divider',
        },
        vertical: {
          marginLeft: SPACING[1],
          marginRight: SPACING[1],
        },
      },
    },

    // ─── Grid (v2) ───────────────────────────────────────────────
    MuiGrid: {
      styleOverrides: {
        root: {
          display: 'flex',
          flexWrap: 'wrap',
        },
      },
    },

    // ─── Stack ───────────────────────────────────────────────────
    MuiStack: {
      defaultProps: {
        useFlexGap: true,
      },
    },

    // ─── Container ───────────────────────────────────────────────
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: SPACING[2],
          paddingRight: SPACING[2],
          [('@media (min-width:' + '600px)')]: {
            paddingLeft: SPACING[3],
            paddingRight: SPACING[3],
          },
          [('@media (min-width:' + '960px)')]: {
            paddingLeft: SPACING[4],
            paddingRight: SPACING[4],
          },
        },
      },
    },

    // ─── Popover ─────────────────────────────────────────────────
    MuiPopover: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          boxShadow: ELEVATION[4],
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: SHAPE.menu,
        },
      },
    },

    // ─── List ────────────────────────────────────────────────────
    MuiList: {
      styleOverrides: {
        root: {
          padding: 0,
        },
      },
    },

    // ─── ListItem ────────────────────────────────────────────────
    MuiListItem: {
      styleOverrides: {
        root: {
          transition: transition(['background-color']),
        },
      },
    },

    // ─── ListItemIcon ────────────────────────────────────────────
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 36,
          transition: transition(['color']),
        },
      },
    },

    // ─── ListItemText ────────────────────────────────────────────
    MuiListItemText: {
      styleOverrides: {
        root: {
          margin: 0,
        },
        primary: {
          fontFamily: TYPOGRAPHY_FONT_FAMILY,
          fontWeight: 500,
        },
        secondary: {
          fontFamily: TYPOGRAPHY_FONT_FAMILY,
          fontWeight: 400,
        },
      },
    },

    // ─── InputBase ───────────────────────────────────────────────
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: TYPOGRAPHY_FONT_FAMILY,
        },
      },
    },

    // ─── Typography ──────────────────────────────────────────────
    MuiTypography: {
      defaultProps: {
        variantMapping: {
          overline: 'span',
        },
      },
    },

    // ─── ButtonBase ──────────────────────────────────────────────
    MuiButtonBase: {
      styleOverrides: {
        root: {
          transition: transition(['background-color', 'opacity']),
        },
      },
    },
  }
}

// ─── Light Theme ───────────────────────────────────────────────────
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: TEAL[500],
      light: TEAL[100],
      dark: TEAL[700],
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: EMERALD[800],
      light: EMERALD[100],
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
      disabled: NEUTRAL[400],
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
    action: {
      hover: 'rgba(13, 107, 88, 0.04)',
      selected: 'rgba(13, 107, 88, 0.08)',
      disabled: 'rgba(28, 27, 31, 0.12)',
      disabledBackground: 'rgba(28, 27, 31, 0.04)',
    },
  },
  typography: {
    fontFamily: TYPOGRAPHY_FONT_FAMILY,
    // Map MUI default variants to MD3 scale
    h1: typographyScale.display2,
    h2: typographyScale.display1,
    h3: typographyScale.headline1,
    h4: typographyScale.headline2,
    h5: typographyScale.title1,
    h6: typographyScale.title2,
    subtitle1: typographyScale.title3,
    subtitle2: typographyScale.label1,
    body1: typographyScale.body1,
    body2: typographyScale.body2,
    button: {
      fontFamily: HEADING_FONT_FAMILY,
      fontWeight: 600,
      fontSize: '0.875rem',
      letterSpacing: '0.01em',
      textTransform: 'none' as const,
    },
    caption: typographyScale.caption,
    overline: typographyScale.overline,
    // MD3 custom variants
    display2: typographyScale.display2,
    display1: typographyScale.display1,
    headline1: typographyScale.headline1,
    headline2: typographyScale.headline2,
    title1: typographyScale.title1,
    title2: typographyScale.title2,
    title3: typographyScale.title3,
    label1: typographyScale.label1,
    label2: typographyScale.label2,
  },
  spacing: (factor: number) => `${factor * 8}px`,
  shape: {
    borderRadius: SHAPE.card,
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  components: {
    ...sharedComponents(),

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: SHAPE.card,
          boxShadow: ELEVATION[2],
          border: '1px solid rgba(28, 27, 31, 0.08)',
          transition: transition(['box-shadow', 'transform', 'border-color']),
          overflow: 'hidden',
          '&:hover': {
            boxShadow: '0 8px 25px -5px rgba(13, 107, 88, 0.08), 0 4px 10px -4px rgba(13, 107, 88, 0.04)',
          },
        },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: transition(['background-color', 'color']),
          '&.Mui-selected': {
            backgroundColor: 'rgba(13, 107, 88, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(13, 107, 88, 0.14)',
            },
          },
        },
      },
    },

    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: TYPOGRAPHY_FONT_FAMILY,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          backgroundColor: '#FEFCF9',
        },
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: `${NEUTRAL[300]} transparent`,
        },
        '::-webkit-scrollbar': {
          width: 6,
          height: 6,
        },
        '::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '::-webkit-scrollbar-thumb': {
          borderRadius: 3,
          backgroundColor: NEUTRAL[300],
        },
      },
    },
  },
} as ThemeOptions)

// ─── Dark Theme ────────────────────────────────────────────────────
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
      paper: 'rgba(43, 41, 48, 0.92)', // semi-transparent overlay, not pure black
    },
    text: {
      primary: '#E6E1E5',
      secondary: '#B8B5BC',
      disabled: '#5F5D58',
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
    action: {
      hover: 'rgba(110, 231, 183, 0.06)',
      selected: 'rgba(110, 231, 183, 0.10)',
      disabled: 'rgba(230, 225, 229, 0.12)',
      disabledBackground: 'rgba(230, 225, 229, 0.04)',
    },
  },
  typography: {
    fontFamily: TYPOGRAPHY_FONT_FAMILY,
    h1: typographyScale.display2,
    h2: typographyScale.display1,
    h3: typographyScale.headline1,
    h4: typographyScale.headline2,
    h5: typographyScale.title1,
    h6: typographyScale.title2,
    subtitle1: typographyScale.title3,
    subtitle2: typographyScale.label1,
    body1: typographyScale.body1,
    body2: typographyScale.body2,
    button: {
      fontFamily: HEADING_FONT_FAMILY,
      fontWeight: 600,
      fontSize: '0.875rem',
      letterSpacing: '0.01em',
      textTransform: 'none' as const,
    },
    caption: typographyScale.caption,
    overline: typographyScale.overline,
    display2: typographyScale.display2,
    display1: typographyScale.display1,
    headline1: typographyScale.headline1,
    headline2: typographyScale.headline2,
    title1: typographyScale.title1,
    title2: typographyScale.title2,
    title3: typographyScale.title3,
    label1: typographyScale.label1,
    label2: typographyScale.label2,
  },
  spacing: (factor: number) => `${factor * 8}px`,
  shape: {
    borderRadius: SHAPE.card,
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  components: {
    ...sharedComponents(),

    // ─── Dark-theme specific shadow overrides (low alpha rgba) ──
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation0: { boxShadow: 'none' },
        elevation1: { boxShadow: '0 1px 2px 0 rgba(0,0,0,0.20)' },
        elevation2: { boxShadow: '0 1px 3px 0 rgba(0,0,0,0.24), 0 1px 2px -1px rgba(0,0,0,0.16)' },
        elevation3: { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.24), 0 2px 4px -2px rgba(0,0,0,0.16)' },
        elevation4: { boxShadow: '0 10px 15px -3px rgba(0,0,0,0.24), 0 4px 6px -4px rgba(0,0,0,0.16)' },
        elevation5: { boxShadow: '0 20px 25px -5px rgba(0,0,0,0.24), 0 8px 10px -6px rgba(0,0,0,0.16)' },
        rounded: {
          borderRadius: SHAPE.card,
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          borderRadius: SHAPE.button,
          fontWeight: 600,
          fontFamily: HEADING_FONT_FAMILY,
          padding: `${SPACING[1]}px ${SPACING[2.5]}px`,
          transition: transition(['all']),
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
        contained: {
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.20)',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.24), 0 2px 4px -2px rgba(0,0,0,0.16)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            boxShadow: '0 1px 2px 0 rgba(0,0,0,0.20)',
            transform: 'translateY(0) scale(0.98)',
          },
        },
        outlined: {
          borderWidth: 1.5,
          '&:hover': {
            borderWidth: 1.5,
          },
        },
        text: {
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        },
        sizeSmall: {
          padding: `${SPACING[0.5]}px ${SPACING[1.5]}px`,
          fontSize: '0.75rem',
          borderRadius: 6,
        },
        sizeMedium: {
          padding: `${SPACING[1]}px ${SPACING[2.5]}px`,
          fontSize: '0.875rem',
        },
        sizeLarge: {
          padding: `${SPACING[1.5]}px ${SPACING[3]}px`,
          fontSize: '1rem',
          borderRadius: 10,
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: SHAPE.card,
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.24), 0 1px 2px -1px rgba(0,0,0,0.16)',
          border: '1px solid rgba(230, 225, 229, 0.06)',
          transition: transition(['box-shadow', 'transform', 'border-color']),
          overflow: 'hidden',
          '&:hover': {
            boxShadow: '0 8px 25px -5px rgba(110, 231, 183, 0.06), 0 4px 10px -4px rgba(110, 231, 183, 0.03)',
          },
        },
      },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: SHAPE.menu,
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.32), 0 4px 6px -4px rgba(0,0,0,0.24)',
          border: '1px solid rgba(230, 225, 229, 0.06)',
          backgroundImage: 'none',
          overflow: 'hidden',
        },
        list: {
          padding: `${SPACING[0.5]}px 0`,
        },
      },
    },

    MuiPopover: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.32), 0 4px 6px -4px rgba(0,0,0,0.24)',
          border: '1px solid rgba(230, 225, 229, 0.06)',
          borderRadius: SHAPE.menu,
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(230, 225, 229, 0.06)',
          backgroundImage: 'none',
        },
        paperAnchorBottom: {
          borderRadius: `${SHAPE.bottomSheet}px ${SHAPE.bottomSheet}px 0 0`,
          borderTop: '1px solid rgba(230, 225, 229, 0.06)',
          borderRight: 'none',
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid rgba(230, 225, 229, 0.06)',
          backgroundImage: 'none',
        },
      },
    },

    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: SHAPE.fab,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.24), 0 2px 4px -2px rgba(0,0,0,0.16)',
          fontFamily: HEADING_FONT_FAMILY,
          fontWeight: 600,
          textTransform: 'none' as const,
          transition: transition(['all']),
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.28), 0 4px 6px -4px rgba(0,0,0,0.20)',
            transform: 'translateY(-2px)',
          },
          '&:active': {
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.24), 0 1px 2px -1px rgba(0,0,0,0.16)',
            transform: 'translateY(0) scale(0.97)',
          },
        },
        sizeSmall: {
          width: 40,
          height: 40,
          minWidth: 40,
        },
        sizeMedium: {
          width: 48,
          height: 48,
        },
        sizeLarge: {
          width: 56,
          height: 56,
        },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: transition(['background-color', 'color']),
          '&.Mui-selected': {
            backgroundColor: 'rgba(110, 231, 183, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(110, 231, 183, 0.14)',
            },
          },
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: SHAPE.dialog,
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.32), 0 8px 10px -6px rgba(0,0,0,0.24)',
          backgroundImage: 'none',
          border: '1px solid rgba(230, 225, 229, 0.06)',
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: SHAPE.tooltip,
          fontSize: '0.75rem',
          fontWeight: 500,
          fontFamily: TYPOGRAPHY_FONT_FAMILY,
          padding: `${SPACING[1]}px ${SPACING[1.5]}px`,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.32), 0 2px 4px -2px rgba(0,0,0,0.24)',
          backgroundColor: '#49454F',
          color: '#E6E1E5',
        },
        arrow: {
          fontSize: '0.5rem',
        },
      },
    },

    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: TYPOGRAPHY_FONT_FAMILY,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          backgroundColor: '#1C1B1F',
        },
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: `${NEUTRAL[600]} transparent`,
        },
        '::-webkit-scrollbar': {
          width: 6,
          height: 6,
        },
        '::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '::-webkit-scrollbar-thumb': {
          borderRadius: 3,
          backgroundColor: NEUTRAL[600],
        },
      },
    },
  },
} as ThemeOptions)

// ─── Helper to get theme based on current mode ─────────────────────
export function getAppTheme(mode: 'light' | 'dark') {
  return mode === 'dark' ? darkTheme : lightTheme
}

// ─── Public Exports ────────────────────────────────────────────────
export { SPACING, ELEVATION, MOTION, TEAL, EMERALD, NEUTRAL }
