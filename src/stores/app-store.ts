'use client'

import { create } from 'zustand'
import type { AppPage, Family, FamilyMember } from '@/types'

interface AppState {
  currentPage: AppPage
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  currentFamily: Family | null
  familyMembers: FamilyMember[]
  families: Family[]
  showOnboarding: boolean
  showCreateFamily: boolean
  showJoinFamily: boolean
  setCurrentPage: (page: AppPage) => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setCurrentFamily: (family: Family | null) => void
  setFamilyMembers: (members: FamilyMember[]) => void
  setFamilies: (families: Family[]) => void
  setShowOnboarding: (show: boolean) => void
  setShowCreateFamily: (show: boolean) => void
  setShowJoinFamily: (show: boolean) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  currentPage: 'dashboard',
  sidebarOpen: true,
  sidebarCollapsed: false,
  currentFamily: null,
  familyMembers: [],
  families: [],
  showOnboarding: false,
  showCreateFamily: false,
  showJoinFamily: false,
  setCurrentPage: (page) => set({ currentPage: page }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setCurrentFamily: (family) => set({ currentFamily: family }),
  setFamilyMembers: (members) => set({ familyMembers: members }),
  setFamilies: (families) => set({ families }),
  setShowOnboarding: (show) => set({ showOnboarding: show }),
  setShowCreateFamily: (show) => set({ showCreateFamily: show }),
  setShowJoinFamily: (show) => set({ showJoinFamily: show }),
  toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
}))
