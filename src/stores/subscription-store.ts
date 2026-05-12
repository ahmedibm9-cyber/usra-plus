'use client'

import { create } from 'zustand'
import type { SubscriptionPlan } from '@/types'

interface SubscriptionState {
  plan: SubscriptionPlan
  isTrial: boolean
  trialEnd: string | null
  isLoading: boolean
  lastFetched: number | null
  // RevenueCat integration
  isRevenueCatPro: boolean
  revenuecatEntitlements: Record<string, { isActive: boolean; willRenew: boolean; productIdentifier: string }>
  setPlan: (plan: SubscriptionPlan) => void
  fetchPlanFromServer: (userId: string) => Promise<void>
  // RevenueCat integration
  setRevenueCatPro: (isPro: boolean) => void
  setRevenueCatEntitlements: (entitlements: Record<string, { isActive: boolean; willRenew: boolean; productIdentifier: string }>) => void
  syncWithRevenueCat: (isPro: boolean, entitlements: Record<string, { isActive: boolean; willRenew: boolean; productIdentifier: string }>, plan?: SubscriptionPlan) => void
  isPro: () => boolean
  isPremium: () => boolean
  isFamilyPlus: () => boolean
  isTrialActive: () => boolean
  trialTimeRemaining: () => number | null
  canCreateTask: (currentTaskCount: number) => boolean
  canCreateFamily: (currentFamilyCount: number) => boolean
  canUploadFile: (currentStorageBytes: number) => boolean
  getFeatureLimit: (feature: string) => number | null
}

const PLAN_LIMITS: Record<SubscriptionPlan, Record<string, number | null>> = {
  free: { tasks: 10, families: 1, storage: 100 * 1024 * 1024, members: 5 },
  pro: { tasks: null, families: 1, storage: 1024 * 1024 * 1024, members: 15 },
  family_plus: { tasks: null, families: null, storage: 10 * 1024 * 1024 * 1024, members: null },
  max: { tasks: null, families: 3, storage: 5 * 1024 * 1024 * 1024, members: 25 },
  ultimate: { tasks: null, families: null, storage: null, members: null },
}

// Cache duration: 5 minutes before re-fetching from server
const PLAN_CACHE_DURATION = 5 * 60 * 1000

// Subscription plan is fetched from the server via /api/subscription/plan.
// Client-side checks are for UX ONLY — real enforcement is in Supabase RLS policies.
// RevenueCat entitlements can override the server-fetched plan for real-time updates.
export const useSubscriptionStore = create<SubscriptionState>()(
  (set, get) => ({
    plan: 'free',
    isTrial: false,
    trialEnd: null,
    isLoading: false,
    lastFetched: null,
    isRevenueCatPro: false,
    revenuecatEntitlements: {},

    setPlan: (plan) => set({ plan }),

    fetchPlanFromServer: async (userId: string) => {
      const { lastFetched } = get()
      if (lastFetched && Date.now() - lastFetched < PLAN_CACHE_DURATION) {
        return
      }

      set({ isLoading: true })
      try {
        const response = await fetch(`/api/subscription/plan?userId=${encodeURIComponent(userId)}`)
        
        if (response.ok) {
          const data = await response.json()
          if (data.plan) {
            set({ 
              plan: data.plan as SubscriptionPlan, 
              isTrial: data.isTrial === true,
              trialEnd: data.trialEnd || null,
              lastFetched: Date.now() 
            })
          }
        } else if (response.status === 401) {
          set({ plan: 'free', isTrial: false, trialEnd: null, lastFetched: null })
        }
      } catch {
        console.warn('[SubscriptionStore] Failed to fetch plan from server')
      } finally {
        set({ isLoading: false })
      }
    },

    // RevenueCat integration methods
    setRevenueCatPro: (isPro) => set({ isRevenueCatPro: isPro }),

    setRevenueCatEntitlements: (entitlements) => set({ revenuecatEntitlements: entitlements }),

    syncWithRevenueCat: (isPro, entitlements, plan) => {
      const updates: Partial<SubscriptionState> = {
        isRevenueCatPro: isPro,
        revenuecatEntitlements: entitlements,
      }
      // If RevenueCat says user is pro, update the plan
      if (isPro && plan) {
        updates.plan = plan
      } else if (isPro) {
        // Default to pro if no specific plan provided
        updates.plan = 'pro'
      }
      // If RevenueCat says user is not pro, and the current plan is pro-level,
      // the RevenueCat data is the source of truth
      if (!isPro && ['pro', 'family_plus', 'max', 'ultimate'].includes(get().plan)) {
        updates.plan = 'free'
      }
      set(updates)
    },

    isPro: () => {
      const state = get()
      // RevenueCat entitlement takes priority
      if (state.isRevenueCatPro) return true
      return ['pro', 'family_plus', 'max', 'ultimate'].includes(state.plan)
    },
    isPremium: () => {
      const state = get()
      if (state.isRevenueCatPro) return true
      return state.plan !== 'free'
    },
    isFamilyPlus: () => {
      const state = get()
      if (state.isRevenueCatPro) return true
      return ['family_plus', 'max', 'ultimate'].includes(state.plan)
    },
    isTrialActive: () => {
      const { isTrial, trialEnd } = get()
      if (!isTrial || !trialEnd) return false
      return new Date(trialEnd).getTime() > Date.now()
    },
    trialTimeRemaining: () => {
      const { isTrial, trialEnd } = get()
      if (!isTrial || !trialEnd) return null
      const remaining = new Date(trialEnd).getTime() - Date.now()
      return remaining > 0 ? remaining : 0
    },
    canCreateTask: (currentTaskCount) => {
      const state = get()
      if (state.isRevenueCatPro) return true
      const limit = PLAN_LIMITS[state.plan]?.tasks
      return limit === null || limit === undefined || currentTaskCount < limit
    },
    canCreateFamily: (currentFamilyCount) => {
      const state = get()
      if (state.isRevenueCatPro) return true
      const limit = PLAN_LIMITS[state.plan]?.families
      return limit === null || limit === undefined || currentFamilyCount < limit
    },
    canUploadFile: (currentStorageBytes) => {
      const state = get()
      if (state.isRevenueCatPro) return true
      const limit = PLAN_LIMITS[state.plan]?.storage
      return limit === null || limit === undefined || currentStorageBytes < limit
    },
    getFeatureLimit: (feature) => {
      const state = get()
      if (state.isRevenueCatPro) return null // No limits for pro
      return PLAN_LIMITS[state.plan]?.[feature] ?? null
    },
  })
)
