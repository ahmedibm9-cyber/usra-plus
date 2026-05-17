'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SubscriptionPlan } from '@/types'
import { safeJsonResponse } from '@/lib/safe-fetch'

// ─── AI Suggestion Daily Tracking (in-memory) ────────────────────────────────

interface AIUsageEntry {
  date: string // YYYY-MM-DD
  count: number
}

const AI_SUGGESTION_FREE_DAILY_LIMIT = 3

// In-memory tracking for AI suggestion usage today
let aiSuggestionUsage: AIUsageEntry = { date: '', count: 0 }

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

// ─── Plan Limits ─────────────────────────────────────────────────────────────

const PLAN_LIMITS: Record<SubscriptionPlan, Record<string, number | null>> = {
  free: { tasks: 50, families: 1, storage: 100 * 1024 * 1024, members: 4, aiCalls: 5, mealPlans: 0 },
  pro: { tasks: 500, families: 3, storage: 5 * 1024 * 1024 * 1024, members: 8, aiCalls: 100, mealPlans: 4 },
  family_plus: { tasks: null, families: 5, storage: 20 * 1024 * 1024 * 1024, members: 20, aiCalls: null, mealPlans: null },
  max: { tasks: null, families: 10, storage: 20 * 1024 * 1024 * 1024, members: 25, aiCalls: null, mealPlans: null },
  ultimate: { tasks: null, families: null, storage: null, members: null, aiCalls: null, mealPlans: null },
}

// ─── Effective Plan Resolution ───────────────────────────────────────────────

/**
 * Resolve the effective plan tier, using the `plan` field as the source of truth.
 */
function resolveEffectivePlan(state: SubscriptionState): SubscriptionPlan {
  return state.plan
}

// ─── Store Interface ─────────────────────────────────────────────────────────

interface SubscriptionState {
  plan: SubscriptionPlan
  isTrial: boolean
  trialEnd: string | null
  isLoading: boolean
  lastFetched: number | null
  // Setters
  setPlan: (plan: SubscriptionPlan) => void
  fetchPlanFromServer: (userId: string) => Promise<void>
  // Tier checks — use resolveEffectivePlan
  isPro: () => boolean
  isPremium: () => boolean
  isFamilyPlus: () => boolean
  isTrialActive: () => boolean
  trialTimeRemaining: () => number | null
  // Feature limit checks — use effective plan
  canCreateTask: (currentTaskCount: number) => boolean
  canCreateFamily: (currentFamilyCount: number) => boolean
  canUploadFile: (currentStorageBytes: number) => boolean
  getFeatureLimit: (feature: string) => number | null
  // Feature gates for "limited" features
  canUseAISuggestion: () => boolean
  canAccessMealPlan: () => boolean
  canCustomizeAvatar: () => boolean
  getAISuggestionUsageToday: () => number
  incrementAISuggestionUsage: () => void
}

// ─── Cache Duration ──────────────────────────────────────────────────────────

// Cache duration: 5 minutes before re-fetching from server
const PLAN_CACHE_DURATION = 5 * 60 * 1000

// Persist TTL: 5 minutes — after this, persisted state is considered stale
const PERSIST_TTL = 5 * 60 * 1000

// Subscription plan is fetched from the server via /api/subscription/plan.
// Client-side checks are for UX ONLY — real enforcement is in Supabase RLS policies.
export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      plan: 'free',
      isTrial: false,
      trialEnd: null,
      isLoading: false,
      lastFetched: null,

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
            const data = await safeJsonResponse<{ plan?: SubscriptionPlan; isTrial?: boolean; trialEnd?: string | null }>(response)
            if (data?.plan) {
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

      // ─── Tier Checks ──────────────────────────────────────────────────────
      // These use resolveEffectivePlan instead of raw isRevenueCatPro bypass

      isPro: () => {
        const effectivePlan = resolveEffectivePlan(get())
        return ['pro', 'family_plus', 'max', 'ultimate'].includes(effectivePlan)
      },

      isPremium: () => {
        const effectivePlan = resolveEffectivePlan(get())
        return effectivePlan !== 'free'
      },

      isFamilyPlus: () => {
        const effectivePlan = resolveEffectivePlan(get())
        return ['family_plus', 'max', 'ultimate'].includes(effectivePlan)
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

      // ─── Feature Limit Checks ──────────────────────────────────────────────
      // Use effective plan for limit lookups — no more bypass

      canCreateTask: (currentTaskCount) => {
        const effectivePlan = resolveEffectivePlan(get())
        const limit = PLAN_LIMITS[effectivePlan]?.tasks
        return limit === null || limit === undefined || currentTaskCount < limit
      },

      canCreateFamily: (currentFamilyCount) => {
        const effectivePlan = resolveEffectivePlan(get())
        const limit = PLAN_LIMITS[effectivePlan]?.families
        return limit === null || limit === undefined || currentFamilyCount < limit
      },

      canUploadFile: (currentStorageBytes) => {
        const effectivePlan = resolveEffectivePlan(get())
        const limit = PLAN_LIMITS[effectivePlan]?.storage
        return limit === null || limit === undefined || currentStorageBytes < limit
      },

      getFeatureLimit: (feature) => {
        const effectivePlan = resolveEffectivePlan(get())
        return PLAN_LIMITS[effectivePlan]?.[feature] ?? null
      },

      // ─── Feature Gates for "Limited" Features ──────────────────────────────

      canUseAISuggestion: () => {
        const effectivePlan = resolveEffectivePlan(get())
        // Free: limited to 3/day, Pro+: unlimited
        if (effectivePlan === 'free') {
          const today = getTodayDate()
          // Reset counter if day changed
          if (aiSuggestionUsage.date !== today) {
            aiSuggestionUsage = { date: today, count: 0 }
          }
          return aiSuggestionUsage.count < AI_SUGGESTION_FREE_DAILY_LIMIT
        }
        return true // Pro+ has unlimited
      },

      canAccessMealPlan: () => {
        const effectivePlan = resolveEffectivePlan(get())
        // Free: view only (returns false for edit/create actions)
        // Pro+: full access
        return effectivePlan !== 'free'
      },

      canCustomizeAvatar: () => {
        const effectivePlan = resolveEffectivePlan(get())
        // Free: no avatar customization, Pro+: yes
        return effectivePlan !== 'free'
      },

      getAISuggestionUsageToday: () => {
        const today = getTodayDate()
        if (aiSuggestionUsage.date !== today) {
          return 0
        }
        return aiSuggestionUsage.count
      },

      incrementAISuggestionUsage: () => {
        const today = getTodayDate()
        if (aiSuggestionUsage.date !== today) {
          aiSuggestionUsage = { date: today, count: 1 }
        } else {
          aiSuggestionUsage.count++
        }
      },
    }),
    {
      name: 'usra-subscription-store',
      // Only persist essential plan state, not loading flags or usage counters
      partialize: (state) => ({
        plan: state.plan,
        isTrial: state.isTrial,
        trialEnd: state.trialEnd,
        lastFetched: state.lastFetched,
      }),
      // On hydration, check if cache is expired and trigger refetch
      onRehydrateStorage: () => {
        return (state) => {
          if (state?.lastFetched) {
            const age = Date.now() - state.lastFetched
            if (age > PERSIST_TTL) {
              // Cache is stale — mark for refetch by clearing lastFetched
              // The next fetchPlanFromServer call will bypass cache and refetch
              state.lastFetched = null
            }
          }
        }
      },
    }
  )
)
