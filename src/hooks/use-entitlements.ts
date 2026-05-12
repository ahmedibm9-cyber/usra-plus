'use client'

import { useCallback, useEffect } from 'react'
import {
  isRevenueCatConfigured,
  getRevenueCatState,
  type RevenueCatState,
} from '@/lib/revenuecat'
import {
  useRevenueCatStore,
  type PackageData,
  type EntitlementInfo,
  type OfferingsData,
} from '@/stores/revenuecat-store'
import { useAuthStore } from '@/stores/auth-store'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UseEntitlementsReturn {
  /** Whether the user has the USRA PRO+ entitlement */
  isPro: boolean
  /** Whether entitlement data is still loading */
  loading: boolean
  /** Error message if any */
  error: string | null
  /** Active entitlements keyed by identifier */
  entitlements: Record<string, EntitlementInfo>
  /** Available offerings from RevenueCat */
  offerings: OfferingsData | null
  /** Full CustomerInfo from RevenueCat */
  customerInfo: unknown
  /** URL to manage the subscription (cancel, change plan) */
  managementURL: string | null
  /** Whether RevenueCat is configured (has API key) */
  isConfigured: boolean
  /** SDK initialization state */
  sdkState: RevenueCatState
  /** Manually refresh entitlement data */
  refresh: () => Promise<void>
  /** Initialize and login with a specific user ID */
  init: (userId: string) => Promise<void>
  /** Reset the SDK (for logout) */
  reset: () => void
  /** Purchase a specific package */
  purchasePackage: (pkg: PackageData, customerEmail?: string, selectedLocale?: string) => Promise<boolean>
  /** Restore purchases from RevenueCat */
  restorePurchases: () => Promise<void>
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useEntitlements(): UseEntitlementsReturn {
  const {
    isPro,
    loading,
    error,
    entitlements,
    offerings,
    customerInfo,
    managementURL,
    isConfigured,
    sdkState,
    init: storeInit,
    refresh: storeRefresh,
    reset: storeReset,
    purchasePackage: storePurchasePackage,
    restorePurchases: storeRestorePurchases,
  } = useRevenueCatStore()

  const user = useAuthStore((s) => s.user)

  // Auto-initialize when user changes
  useEffect(() => {
    if (user?.id && isConfigured) {
      storeInit(user.id).catch(console.error)
    }
  }, [user?.id, isConfigured, storeInit])

  // Periodically sync SDK state
  useEffect(() => {
    const interval = setInterval(() => {
      const state = getRevenueCatState()
      useRevenueCatStore.setState({ sdkState: state })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  /**
   * Initialize RevenueCat and login the user.
   */
  const init = useCallback(async (userId: string) => {
    await storeInit(userId)
  }, [storeInit])

  /**
   * Refresh entitlement data from RevenueCat.
   */
  const refresh = useCallback(async () => {
    await storeRefresh()
  }, [storeRefresh])

  /**
   * Reset the SDK (for logout).
   */
  const reset = useCallback(() => {
    storeReset()
  }, [storeReset])

  /**
   * Purchase a specific package.
   */
  const purchasePackage = useCallback(async (pkg: PackageData, customerEmail?: string, selectedLocale?: string) => {
    return storePurchasePackage(pkg, customerEmail, selectedLocale)
  }, [storePurchasePackage])

  /**
   * Restore purchases.
   */
  const restorePurchases = useCallback(async () => {
    await storeRestorePurchases()
  }, [storeRestorePurchases])

  return {
    isPro,
    loading,
    error,
    entitlements,
    offerings,
    customerInfo,
    managementURL,
    isConfigured,
    sdkState,
    refresh,
    init,
    reset,
    purchasePackage,
    restorePurchases,
  }
}

// Re-export types for convenience
export type { EntitlementInfo, PackageData, OfferingsData }
