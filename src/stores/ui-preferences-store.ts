import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AccentColor = 'red' | 'blue' | 'teal' | 'purple' | 'orange' | 'pink' | 'green'

export interface AccentColorConfig {
  id: AccentColor
  label: string
  primary: string      // Main accent color
  primaryHover: string  // Darker variant for hover
  secondary: string     // Secondary accent
  ring: string          // Focus ring color
  glow: string          // RGB values for glow effects (e.g., "229, 9, 20")
}

export const ACCENT_COLORS: Record<AccentColor, AccentColorConfig> = {
  red: {
    id: 'red',
    label: 'Signal Red',
    primary: '#E50914',
    primaryHover: '#C40812',
    secondary: '#F4C430',
    ring: '#E50914',
    glow: '229, 9, 20',
  },
  blue: {
    id: 'blue',
    label: 'Ocean Blue',
    primary: '#007AFF',
    primaryHover: '#0066D6',
    secondary: '#5AC8FA',
    ring: '#007AFF',
    glow: '0, 122, 255',
  },
  teal: {
    id: 'teal',
    label: 'Sage Teal',
    primary: '#0D9488',
    primaryHover: '#0A7A70',
    secondary: '#F4C430',
    ring: '#0D9488',
    glow: '13, 148, 136',
  },
  purple: {
    id: 'purple',
    label: 'Royal Purple',
    primary: '#7C3AED',
    primaryHover: '#6D28D9',
    secondary: '#F4C430',
    ring: '#7C3AED',
    glow: '124, 58, 237',
  },
  orange: {
    id: 'orange',
    label: 'Warm Orange',
    primary: '#EA580C',
    primaryHover: '#C2410C',
    secondary: '#F4C430',
    ring: '#EA580C',
    glow: '234, 88, 12',
  },
  pink: {
    id: 'pink',
    label: 'Rose Pink',
    primary: '#DB2777',
    primaryHover: '#BE185D',
    secondary: '#F4C430',
    ring: '#DB2777',
    glow: '219, 39, 119',
  },
  green: {
    id: 'green',
    label: 'Forest Green',
    primary: '#16A34A',
    primaryHover: '#15803D',
    secondary: '#F4C430',
    ring: '#16A34A',
    glow: '22, 163, 74',
  },
}

interface UIPreferences {
  reflectionsEnabled: boolean
  accentColor: AccentColor
  toggleReflections: () => void
  setAccentColor: (color: AccentColor) => void
}

function applyAccentToDOM(color: AccentColor) {
  if (typeof document === 'undefined') return
  const config = ACCENT_COLORS[color]
  if (!config) return

  const root = document.documentElement

  // Override CSS custom properties
  root.style.setProperty('--accent-primary', config.primary)
  root.style.setProperty('--accent-secondary', config.secondary)
  root.style.setProperty('--primary', config.primary)
  root.style.setProperty('--ring', config.ring)
  root.style.setProperty('--usra-primary', config.primary)
  root.style.setProperty('--sidebar-primary', config.primary)
  root.style.setProperty('--sidebar-ring', config.primary)
  root.style.setProperty('--destructive', config.primary)
  root.style.setProperty('--chart-1', config.primary)
}

export const useUIPreferencesStore = create<UIPreferences>()(
  persist(
    (set) => ({
      reflectionsEnabled: true,
      accentColor: 'red' as AccentColor,
      toggleReflections: () => set((state) => ({ reflectionsEnabled: !state.reflectionsEnabled })),
      setAccentColor: (color: AccentColor) => {
        set({ accentColor: color })
        applyAccentToDOM(color)
      },
    }),
    {
      name: 'usra-ui-preferences',
      onRehydrateStorage: () => (state) => {
        // Apply accent color on store rehydration (page load)
        if (state?.accentColor) {
          applyAccentToDOM(state.accentColor)
        }
      },
    }
  )
)
