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
}

// Default date range: last 30 days
const getDefaultDateRange = (): DateRange => {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  }
}

// Demo feature flags
const DEMO_FEATURE_FLAGS: FeatureFlag[] = [
  { id: 'ff-1', key: 'ai_insights', name: 'AI Insights Widget', description: 'Show AI-powered insights on dashboard', enabled: true, rolloutPercentage: 100, targetPlan: null, createdAt: '2024-01-15' },
  { id: 'ff-2', key: 'hijri_calendar', name: 'Hijri Calendar View', description: 'Show Hijri dates alongside Gregorian', enabled: true, rolloutPercentage: 80, targetPlan: 'pro', createdAt: '2024-02-01' },
  { id: 'ff-3', key: 'voice_messages', name: 'Voice Messages', description: 'Allow voice message recording in chat', enabled: true, rolloutPercentage: 100, targetPlan: null, createdAt: '2024-02-10' },
  { id: 'ff-4', key: 'budget_tracking', name: 'Budget Tracking', description: 'Family budget and expense tracking', enabled: true, rolloutPercentage: 60, targetPlan: 'family_plus', createdAt: '2024-03-01' },
  { id: 'ff-5', key: 'meal_planning', name: 'Meal Planning', description: 'Weekly meal planning and recipes', enabled: true, rolloutPercentage: 40, targetPlan: 'pro', createdAt: '2024-03-15' },
  { id: 'ff-6', key: 'chores_module', name: 'Chores Module', description: 'Chore assignment and tracking', enabled: false, rolloutPercentage: 0, targetPlan: null, createdAt: '2024-04-01' },
  { id: 'ff-7', key: 'milestones', name: 'Milestones', description: 'Family milestone tracking', enabled: true, rolloutPercentage: 100, targetPlan: null, createdAt: '2024-04-10' },
  { id: 'ff-8', key: 'family_qr', name: 'QR Code Invites', description: 'QR code for family invitation', enabled: true, rolloutPercentage: 90, targetPlan: null, createdAt: '2024-04-20' },
]

// Demo plan configs
const DEMO_PLAN_CONFIGS: PlanConfig[] = [
  {
    id: 'plan-free',
    plan: 'Free',
    price: 0,
    features: ['Basic tasks', 'Grocery lists', 'Calendar', 'Chat', 'Up to 5 family members'],
    limits: { tasks: 10, storage: 100, families: 1, members: 5 },
    active: true,
  },
  {
    id: 'plan-pro',
    plan: 'Pro',
    price: 9.99,
    features: ['Unlimited tasks', '1GB storage', 'AI insights', 'Hijri calendar', 'Meal planning', 'Up to 15 members'],
    limits: { tasks: null, storage: 1000, families: 1, members: 15 },
    active: true,
  },
  {
    id: 'plan-family',
    plan: 'Family+',
    price: 19.99,
    features: ['Everything in Pro', '10GB storage', 'Budget tracking', 'Priority support', 'Unlimited families', 'Unlimited members', 'Custom themes'],
    limits: { tasks: null, storage: 10000, families: null, members: null },
    active: true,
  },
]

// Demo announcements
const DEMO_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Welcome to USRA PLUS!',
    message: 'Thank you for joining our family coordination platform. Explore all features and start organizing your family life.',
    type: 'info',
    active: true,
    startDate: '2024-01-01',
    endDate: null,
    createdAt: '2024-01-01',
  },
  {
    id: 'ann-2',
    title: 'Ramadan Mubarak!',
    message: 'May this blessed month bring joy and togetherness to your family. Check out our meal planning feature for Iftar recipes.',
    type: 'info',
    active: false,
    startDate: '2024-03-10',
    endDate: '2024-04-09',
    createdAt: '2024-03-01',
  },
]

export const useAdminStore = create<AdminState>((set) => ({
  currentPage: 'overview',
  dateRange: getDefaultDateRange(),
  sidebarCollapsed: false,
  searchQuery: '',
  featureFlags: DEMO_FEATURE_FLAGS,
  planConfigs: DEMO_PLAN_CONFIGS,
  announcements: DEMO_ANNOUNCEMENTS,
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
}))
