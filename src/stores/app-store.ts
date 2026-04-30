'use client'

import { create } from 'zustand'
import type { AppPage, Family, FamilyMember, Theme } from '@/types'

interface AppState {
  currentPage: AppPage
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  commandPaletteOpen: boolean
  currentFamily: Family | null
  familyMembers: FamilyMember[]
  families: Family[]
  showOnboarding: boolean
  showCreateFamily: boolean
  showJoinFamily: boolean
  familyAvatar: string
  familyColor: string
  theme: Theme
  setCurrentPage: (page: AppPage) => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  setCurrentFamily: (family: Family | null) => void
  setFamilyMembers: (members: FamilyMember[]) => void
  setFamilies: (families: Family[]) => void
  setShowOnboarding: (show: boolean) => void
  setShowCreateFamily: (show: boolean) => void
  setShowJoinFamily: (show: boolean) => void
  setFamilyAvatar: (avatar: string) => void
  setFamilyColor: (color: string) => void
  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
}

function applyThemeToDOM(theme: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  try {
    const stored = localStorage.getItem('usra-theme')
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // localStorage not available
  }
  return 'dark'
}

export const useAppStore = create<AppState>((set, get) => ({
  currentPage: 'dashboard',
  sidebarOpen: false,
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  currentFamily: null,
  familyMembers: [],
  families: [],
  showOnboarding: false,
  showCreateFamily: false,
  showJoinFamily: false,
  familyAvatar: '🏠',
  familyColor: 'indigo',
  theme: getInitialTheme(),
  setCurrentPage: (page) => set({ currentPage: page }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
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
  toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
}))

// Initialize theme on load
if (typeof window !== 'undefined') {
  const initialTheme = getInitialTheme()
  applyThemeToDOM(initialTheme)
}
