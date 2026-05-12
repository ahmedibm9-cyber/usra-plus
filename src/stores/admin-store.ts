'use client'

import { create } from 'zustand'
import type { AdminPage, DateRange, FeatureFlag, PlanConfig, Announcement } from '@/types/admin'

interface AdminState {
  currentPage: AdminPage
  dateRange: DateRange
  sidebarCollapsed: boolean
  searchQuery: string
  featureFlags: FeatureFlag[]
  planConfigs: PlanConfig[]
  announcements: Announcement[]
  isLoading: boolean

  // Actions
  setCurrentPage: (page: AdminPage) => void
  setDateRange: (range: DateRange) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSearchQuery: (query: string) => void
  setFeatureFlags: (flags: FeatureFlag[]) => void
  toggleFeatureFlag: (flagId: string) => void
  setPlanConfigs: (configs: PlanConfig[]) => void
  setAnnouncements: (announcements: Announcement[]) => void
  addAnnouncement: (announcement: Announcement) => void
  setIsLoading: (loading: boolean) => void
  fetchFeatureFlags: () => Promise<void>
  fetchPlanConfigs: () => Promise<void>
  fetchAnnouncements: () => Promise<void>
}

const getDefaultDateRange = (): DateRange => {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  }
}

export const useAdminStore = create<AdminState>((set, get) => ({
  currentPage: 'overview',
  dateRange: getDefaultDateRange(),
  sidebarCollapsed: false,
  searchQuery: '',
  // Empty initial state — all data fetched from Supabase via API
  featureFlags: [],
  planConfigs: [],
  announcements: [],
  isLoading: false,

  setCurrentPage: (page) => set({ currentPage: page }),
  setDateRange: (range) => set({ dateRange: range }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFeatureFlags: (flags) => set({ featureFlags: flags }),
  toggleFeatureFlag: (flagId) => set((state) => ({
    featureFlags: state.featureFlags.map(f =>
      f.id === flagId ? { ...f, enabled: !f.enabled } : f
    ),
  })),
  setPlanConfigs: (configs) => set({ planConfigs: configs }),
  setAnnouncements: (announcements) => set({ announcements }),
  addAnnouncement: (announcement) => set((state) => ({
    announcements: [announcement, ...state.announcements],
  })),
  setIsLoading: (loading) => set({ isLoading: loading }),

  fetchFeatureFlags: async () => {
    try {
      const res = await fetch('/api/admin/features', { credentials: 'same-origin' })
      if (res.ok) {
        const json = await res.json()
        if (json.data) set({ featureFlags: json.data })
      }
    } catch { /* ignore */ }
  },

  fetchPlanConfigs: async () => {
    try {
      const res = await fetch('/api/admin/subscriptions', { credentials: 'same-origin' })
      if (res.ok) {
        const json = await res.json()
        // The API returns { data: PlanRow[], total: number }
        // json.data is the array directly (not json.data.plans)
        if (Array.isArray(json.data)) {
          const mapped: PlanConfig[] = json.data.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            plan: (p.slug as string) || (p.name as string),
            price: Number(p.monthlyPrice ?? 0),
            monthlyPrice: Number(p.monthlyPrice ?? 0),
            yearlyPrice: p.yearlyPrice != null ? Number(p.yearlyPrice) : null,
            lifetimePrice: p.lifetimePrice != null ? Number(p.lifetimePrice) : null,
            currency: (p.currency as string) || 'USD',
            features: typeof p.features === 'string' ? JSON.parse(p.features) : (Array.isArray(p.features) ? p.features : []),
            limits: typeof p.limits === 'string' ? JSON.parse(p.limits) : (p.limits && typeof p.limits === 'object' ? p.limits : {}),
            active: Boolean(p.isActive),
            trialDays: Number(p.trialDays ?? 0),
            isPopular: Boolean(p.isPopular),
            description: (p.description as string) || '',
            ctaText: (p.ctaText as string) || '',
            regionalPricing: {},
          }))
          set({ planConfigs: mapped })
        }
      }
    } catch { /* ignore */ }
  },

  fetchAnnouncements: async () => {
    try {
      const res = await fetch('/api/admin/system', { credentials: 'same-origin' })
      if (res.ok) {
        const json = await res.json()
        if (json.data?.announcements) set({ announcements: json.data.announcements })
      }
    } catch { /* ignore */ }
  },
}))
