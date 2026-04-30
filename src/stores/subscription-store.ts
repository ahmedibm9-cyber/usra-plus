'use client'

import { create } from 'zustand'
import type { SubscriptionPlan } from '@/types'

interface SubscriptionState {
  plan: SubscriptionPlan
  setPlan: (plan: SubscriptionPlan) => void
  isPro: () => boolean
  isFamilyPlus: () => boolean
  canCreateTask: (currentTaskCount: number) => boolean
  canCreateFamily: (currentFamilyCount: number) => boolean
  canUploadFile: (currentStorageBytes: number) => boolean
  getFeatureLimit: (feature: string) => number | null
}

const PLAN_LIMITS: Record<SubscriptionPlan, Record<string, number | null>> = {
  free: { tasks: 10, families: 1, storage: 100 * 1024 * 1024, members: 5 },
  pro: { tasks: null, families: 1, storage: 1024 * 1024 * 1024, members: 15 },
  family_plus: { tasks: null, families: null, storage: 10 * 1024 * 1024 * 1024, members: null },
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  plan: 'free',
  setPlan: (plan) => set({ plan }),
  isPro: () => ['pro', 'family_plus'].includes(get().plan),
  isFamilyPlus: () => get().plan === 'family_plus',
  canCreateTask: (currentTaskCount) => {
    const limit = PLAN_LIMITS[get().plan].tasks
    return limit === null || currentTaskCount < limit
  },
  canCreateFamily: (currentFamilyCount) => {
    const limit = PLAN_LIMITS[get().plan].families
    return limit === null || currentFamilyCount < limit
  },
  canUploadFile: (currentStorageBytes) => {
    const limit = PLAN_LIMITS[get().plan].storage
    return limit === null || currentStorageBytes < limit
  },
  getFeatureLimit: (feature) => PLAN_LIMITS[get().plan][feature] ?? null,
}))
