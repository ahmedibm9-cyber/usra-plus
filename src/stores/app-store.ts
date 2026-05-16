'use client'

import { create } from 'zustand'
import type { AppPage, Family, FamilyMember, Theme } from '@/types'

interface AppState {
  currentPage: AppPage
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  commandPaletteOpen: boolean
  shortcutsModalOpen: boolean
  currentFamily: Family | null
  familyMembers: FamilyMember[]
  families: Family[]
  showOnboarding: boolean
  showCreateFamily: boolean
  showJoinFamily: boolean
  familyAvatar: string
  familyColor: string
  theme: Theme
  demoDataReady: boolean
  setCurrentPage: (page: AppPage) => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  setShortcutsModalOpen: (open: boolean) => void
  setCurrentFamily: (family: Family | null) => void
  setFamilyMembers: (members: FamilyMember[]) => void
  setFamilies: (families: Family[]) => void
  setShowOnboarding: (show: boolean) => void
  setShowCreateFamily: (show: boolean) => void
  setShowJoinFamily: (show: boolean) => void
  setFamilyAvatar: (avatar: string) => void
  setFamilyColor: (color: string) => void
  setTheme: (theme: Theme) => void
  setDemoDataReady: (ready: boolean) => void
  toggleSidebar: () => void
  hydrateTheme: () => void
}

function applyThemeToDOM(theme: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  // Add transitioning class briefly so CSS transitions only apply during theme switch
  root.classList.add('theme-transitioning')
  if (theme === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }
  // Remove transitioning class after the transition completes
  setTimeout(() => {
    root.classList.remove('theme-transitioning')
  }, 500)
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = localStorage.getItem('usra-theme')
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // localStorage not available
  }
  return 'light'
}

export const useAppStore = create<AppState>((set, get) => ({
  currentPage: 'dashboard',
  sidebarOpen: false,
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  shortcutsModalOpen: false,
  currentFamily: null,
  familyMembers: [],
  families: [],
  showOnboarding: false,
  showCreateFamily: false,
  showJoinFamily: false,
  familyAvatar: '🏠',
  familyColor: 'teal',
  theme: 'light', // Default to 'light' to avoid hydration mismatch; hydrateTheme() sets the real value in useEffect
  demoDataReady: true, // true by default for non-demo users; set to false during demo seeding
  setCurrentPage: (page) => set({ currentPage: page }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setShortcutsModalOpen: (open) => set({ shortcutsModalOpen: open }),
  setCurrentFamily: (family) => set({ currentFamily: family }),
  setFamilyMembers: (members) => set({ familyMembers: members }),
  setFamilies: (families) => set({ families }),
  setShowOnboarding: (show) => set({ showOnboarding: show }),
  setShowCreateFamily: (show) => set({ showCreateFamily: show }),
  setShowJoinFamily: (show) => set({ showJoinFamily: show }),
  setFamilyAvatar: (avatar) => set({ familyAvatar: avatar }),
  setFamilyColor: (color) => set({ familyColor: color }),
  setTheme: (theme) => {
    set({ theme })
    applyThemeToDOM(theme)
    try {
      localStorage.setItem('usra-theme', theme)
    } catch {
      // localStorage not available
    }
  },
  setDemoDataReady: (ready) => set({ demoDataReady: ready }),
  toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
  hydrateTheme: () => {
    const theme = getInitialTheme()
    set({ theme })
    applyThemeToDOM(theme)
  },
}))

// NOTE: Do NOT apply theme during module initialization (e.g., IIFE at bottom).
// Calling applyThemeToDOM() at module scope causes "state update before mount"
// hydration warnings because it mutates the DOM before React has hydrated.
// Instead, call useAppStore.getState().hydrateTheme() inside a useEffect.
