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
  free: { tasks: 10, families: 1, storage: 100 * 1024 * 1024, members: 5 },
  pro: { tasks: null, families: 3, storage: 1024 * 1024 * 1024, members: 15 },
  family_plus: { tasks: null, families: null, storage: 10 * 1024 * 1024 * 1024, members: null },
  max: { tasks: null, families: 10, storage: 20 * 1024 * 1024 * 1024, members: 25 },
  ultimate: { tasks: null, families: null, storage: null, members: null },
}

// ─── Effective Plan Resolution ───────────────────────────────────────────────

/**
 * Resolve the effective plan tier, using the `plan` field as the source of truth.
 * `isRevenueCatPro` is only a supplementary flag — if RevenueCat says the user
 * has a pro entitlement but the server-side plan is free, we upgrade to 'pro'
 * (the lowest paid tier). We do NOT bypass all plan limits anymore.
 */
function resolveEffectivePlan(state: SubscriptionState): SubscriptionPlan {
  // The server-fetched `plan` field is the source of truth
  const serverPlan = state.plan

  // If server already says non-free, trust it completely
  if (serverPlan !== 'free') return serverPlan

  // If RevenueCat reports pro but server says free, the user at least has 'pro'
  // (the lowest paid tier). We do NOT assume ultimate/max.
  if (state.isRevenueCatPro) return 'pro'

  return 'free'
}

// ─── Store Interface ─────────────────────────────────────────────────────────

interface SubscriptionState {
  plan: SubscriptionPlan
  isTrial: boolean
  trialEnd: string | null
  isLoading: boolean
  lastFetched: number | null
  // RevenueCat integration
  isRevenueCatPro: boolean
  revenuecatEntitlements: Record<string, { isActive: boolean; willRenew: boolean; productIdentifier: string }>
  // Stripe checkout/portal state
  checkoutUrl: string | null
  portalUrl: string | null
  isCheckoutLoading: boolean
  isPortalLoading: boolean
  // Setters
  setPlan: (plan: SubscriptionPlan) => void
  fetchPlanFromServer: (userId: string) => Promise<void>
  // RevenueCat integration
  setRevenueCatPro: (isPro: boolean) => void
  setRevenueCatEntitlements: (entitlements: Record<string, { isActive: boolean; willRenew: boolean; productIdentifier: string }>) => void
  syncWithRevenueCat: (isPro: boolean, entitlements: Record<string, { isActive: boolean; willRenew: boolean; productIdentifier: string }>, plan?: SubscriptionPlan) => void
  // Stripe integration
  initiateCheckout: (planId: string) => Promise<void>
  openBillingPortal: () => Promise<void>
  // Tier checks — use resolveEffectivePlan instead of raw isRevenueCatPro bypass
  isPro: () => boolean
  isPremium: () => boolean
  isFamilyPlus: () => boolean
  isTrialActive: () => boolean
  trialTimeRemaining: () => number | null
  // Feature limit checks — use effective plan, not bypass
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
// RevenueCat entitlements are supplementary — the `plan` field (from server data)
// is always the source of truth for tier resolution.
export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      plan: 'free',
      isTrial: false,
      trialEnd: null,
      isLoading: false,
      lastFetched: null,
      isRevenueCatPro: false,
      revenuecatEntitlements: {},
      checkoutUrl: null,
      portalUrl: null,
      isCheckoutLoading: false,
      isPortalLoading: false,

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

      // RevenueCat integration methods
      setRevenueCatPro: (isPro) => set({ isRevenueCatPro: isPro }),

      setRevenueCatEntitlements: (entitlements) => set({ revenuecatEntitlements: entitlements }),

      syncWithRevenueCat: (isPro, entitlements, plan) => {
        const updates: Partial<SubscriptionState> = {
          isRevenueCatPro: isPro,
          revenuecatEntitlements: entitlements,
        }
        // If RevenueCat provides a specific plan (mapped from product identifier), use it
        if (isPro && plan) {
          updates.plan = plan
        } else if (isPro) {
          // If RevenueCat says user is pro but no specific plan is given,
          // only upgrade to 'pro' (the lowest paid tier), NOT to ultimate/max.
          // This prevents the old bug where isRevenueCatPro bypassed all limits.
          const currentPlan = get().plan
          if (currentPlan === 'free') {
            updates.plan = 'pro'
          }
          // If the user already has a higher plan from server data, keep it
        }
        // If RevenueCat says user is not pro, and the current plan is pro-level,
        // the RevenueCat data is the source of truth for revocation
        if (!isPro && ['pro', 'family_plus', 'max', 'ultimate'].includes(get().plan)) {
          updates.plan = 'free'
        }
        set(updates)
      },

      // ─── Stripe Integration ──────────────────────────────────────────────

      initiateCheckout: async (planId: string) => {
        set({ isCheckoutLoading: true, checkoutUrl: null })
        try {
          const response = await fetch('/api/stripe/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId }),
          })

          const data = await safeJsonResponse<{ url?: string; error?: string }>(response)

          if (response.ok && data?.url) {
            set({ checkoutUrl: data.url })
            // Redirect to Stripe Checkout
            window.location.href = data.url
          } else {
            const errorMsg = data?.error || 'Failed to create checkout session'
            console.error('[SubscriptionStore] Checkout error:', errorMsg)
            // If Stripe is not configured, show a user-friendly message
            if (response.status === 503) {
              const { toast } = await import('sonner')
              toast.error('Payment processing is not available yet. Please try again later.')
            } else {
              const { toast } = await import('sonner')
              toast.error(errorMsg)
            }
          }
        } catch (err) {
          console.error('[SubscriptionStore] Checkout error:', err)
          const { toast } = await import('sonner')
          toast.error('Failed to initiate checkout. Please try again.')
        } finally {
          set({ isCheckoutLoading: false })
        }
      },

      openBillingPortal: async () => {
        set({ isPortalLoading: true, portalUrl: null })
        try {
          const response = await fetch('/api/stripe/portal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })

          const data = await safeJsonResponse<{ url?: string; error?: string }>(response)

          if (response.ok && data?.url) {
            set({ portalUrl: data.url })
            // Redirect to Stripe Billing Portal
            window.location.href = data.url
          } else {
            const errorMsg = data?.error || 'Failed to create portal session'
            console.error('[SubscriptionStore] Portal error:', errorMsg)
            const { toast } = await import('sonner')
            toast.error(errorMsg)
          }
        } catch (err) {
          console.error('[SubscriptionStore] Portal error:', err)
          const { toast } = await import('sonner')
          toast.error('Failed to open billing portal. Please try again.')
        } finally {
          set({ isPortalLoading: false })
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
        isRevenueCatPro: state.isRevenueCatPro,
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
