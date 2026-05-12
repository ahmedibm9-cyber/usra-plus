'use client'

import { create } from 'zustand'
import {
  initializeRevenueCat,
  loginRevenueCatUser,
  fetchCustomerInfo,
  fetchOfferings as rcFetchOfferings,
  checkProPlusEntitlement,
  getManagementURL,
  getPurchasesInstance,
  resetRevenueCat,
  isRevenueCatConfigured,
  presentPaywall,
  PRO_PLUS_ENTITLEMENT,
  type RevenueCatState,
} from '@/lib/revenuecat'
import { useSubscriptionStore } from '@/stores/subscription-store'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EntitlementInfo {
  identifier: string
  isActive: boolean
  willRenew: boolean
  productIdentifier: string
  expirationDate: Date | null
  latestPurchaseDate: Date | null
  periodType: string
  store: string
  isSandbox: boolean
}

export interface PackageData {
  identifier: string
  packageType: string
  product: {
    identifier: string
    title: string
    description: string | null
    price: {
      amount: number
      amountMicros: number
      currency: string
      formattedPrice: string
    }
    productType: string
    period: { number: number; unit: string } | null
    freeTrialPhase: {
      price: { formattedPrice: string } | null
      period: { number: number; unit: string } | null
    } | null
  }
  webCheckoutURL?: string | null
}

export interface OfferingsData {
  current: {
    identifier: string
    description: string
    packages: PackageData[]
  } | null
  all: Record<string, unknown>
}

interface RevenueCatStoreState {
  // State
  offerings: OfferingsData | null
  entitlements: Record<string, EntitlementInfo>
  customerInfo: unknown
  managementURL: string | null
  isPro: boolean
  loading: boolean
  error: string | null
  isConfigured: boolean
  sdkState: RevenueCatState
  initializedUserId: string | null
  lastFetched: number | null

  // Actions
  init: (userId: string) => Promise<void>
  fetchOfferings: () => Promise<void>
  purchasePackage: (pkg: PackageData, customerEmail?: string, selectedLocale?: string) => Promise<boolean>
  restorePurchases: () => Promise<void>
  checkEntitlements: () => Promise<void>
  refresh: () => Promise<void>
  reset: () => void
}

// ─── Cache Duration ─────────────────────────────────────────────────────────

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// ─── Helper: Map product identifier to plan ─────────────────────────────────

function mapEntitlementToPlan(productIdentifier: string): 'pro' | 'family_plus' | 'max' | 'ultimate' {
  const id = productIdentifier.toLowerCase()
  if (id.includes('ultimate')) return 'ultimate'
  if (id.includes('family') || id.includes('family_plus')) return 'family_plus'
  if (id.includes('max')) return 'max'
  return 'pro'
}

// ─── Helper: Transform RevenueCat Offerings ─────────────────────────────────

function transformOfferings(rcOfferings: { current: unknown | null; all: Record<string, unknown> }): OfferingsData | null {
  try {
    const current = rcOfferings.current as {
      identifier: string
      serverDescription: string
      availablePackages: Array<{
        identifier: string
        packageType: string
        webBillingProduct: {
          identifier: string
          title: string
          description: string | null
          price: {
            amount: number
            amountMicros: number
            currency: string
            formattedPrice: string
          }
          productType: string
          period: { number: number; unit: string } | null
          freeTrialPhase: {
            price: { formattedPrice: string } | null
            period: { number: number; unit: string } | null
          } | null
        }
        webCheckoutURL?: string | null
      }> | null
    } | null

    return {
      current: current
        ? {
            identifier: current.identifier,
            description: current.serverDescription,
            packages: (current.availablePackages || []).map((pkg) => ({
              identifier: pkg.identifier,
              packageType: pkg.packageType,
              product: {
                identifier: pkg.webBillingProduct.identifier,
                title: pkg.webBillingProduct.title,
                description: pkg.webBillingProduct.description,
                price: pkg.webBillingProduct.price,
                productType: pkg.webBillingProduct.productType,
                period: pkg.webBillingProduct.period,
                freeTrialPhase: pkg.webBillingProduct.freeTrialPhase,
              },
              webCheckoutURL: pkg.webCheckoutURL,
            })),
          }
        : null,
      all: rcOfferings.all,
    }
  } catch (err) {
    console.error('[RevenueCatStore] Failed to transform offerings:', err)
    return null
  }
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useRevenueCatStore = create<RevenueCatStoreState>()((set, get) => ({
  // Initial state
  offerings: null,
  entitlements: {},
  customerInfo: null,
  managementURL: null,
  isPro: false,
  loading: false,
  error: null,
  isConfigured: isRevenueCatConfigured(),
  sdkState: {
    initializationState: 'uninitialized',
    error: null,
    userId: null,
  },
  initializedUserId: null,
  lastFetched: null,

  // ─── Initialize RevenueCat for a user ──────────────────────────────────────

  init: async (userId: string) => {
    if (!userId) return

    const state = get()
    if (state.initializedUserId === userId && state.sdkState.initializationState === 'initialized') {
      // Already initialized for this user — just refresh if cache expired
      if (state.lastFetched && Date.now() - state.lastFetched < CACHE_DURATION) {
        return
      }
      await get().refresh()
      return
    }

    set({ loading: true, error: null })

    try {
      const customerInfoData = await loginRevenueCatUser(userId)
      if (!customerInfoData) {
        set({
          error: 'Failed to login to RevenueCat',
          loading: false,
          sdkState: { initializationState: 'error', error: 'Login failed', userId: null },
        })
        return
      }

      set({ initializedUserId: userId, customerInfo: customerInfoData })

      // Process entitlements
      const activeEntitlements: Record<string, EntitlementInfo> = {}
      if (customerInfoData.entitlements?.active) {
        for (const [key, value] of Object.entries(customerInfoData.entitlements.active)) {
          const ent = value as {
            identifier: string
            isActive: boolean
            willRenew: boolean
            productIdentifier: string
            expirationDate: Date | null
            latestPurchaseDate: Date | null
            periodType: string
            store: string
            isSandbox: boolean
          }
          activeEntitlements[key] = {
            identifier: ent.identifier,
            isActive: ent.isActive,
            willRenew: ent.willRenew,
            productIdentifier: ent.productIdentifier,
            expirationDate: ent.expirationDate,
            latestPurchaseDate: ent.latestPurchaseDate,
            periodType: ent.periodType,
            store: ent.store,
            isSandbox: ent.isSandbox,
          }
        }
      }

      const hasPro = PRO_PLUS_ENTITLEMENT in activeEntitlements

      // Update subscription store
      if (hasPro) {
        const entitlement = activeEntitlements[PRO_PLUS_ENTITLEMENT]
        const plan = mapEntitlementToPlan(entitlement.productIdentifier)
        useSubscriptionStore.getState().syncWithRevenueCat(true, {}, plan)
      } else {
        useSubscriptionStore.getState().syncWithRevenueCat(false, {})
      }

      // Fetch offerings
      const offeringsData = await rcFetchOfferings()
      const transformedOfferings = offeringsData ? transformOfferings(offeringsData) : null

      // Get management URL
      const mgmtURL = await getManagementURL()

      set({
        entitlements: activeEntitlements,
        isPro: hasPro,
        offerings: transformedOfferings,
        managementURL: mgmtURL,
        loading: false,
        lastFetched: Date.now(),
        sdkState: {
          initializationState: 'initialized',
          error: null,
          userId,
        },
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error initializing RevenueCat'
      set({
        error: msg,
        loading: false,
        sdkState: { initializationState: 'error', error: msg, userId: null },
      })
      console.error('[RevenueCatStore] Init error:', msg)
    }
  },

  // ─── Fetch Offerings ──────────────────────────────────────────────────────

  fetchOfferings: async () => {
    try {
      const offeringsData = await rcFetchOfferings()
      const transformedOfferings = offeringsData ? transformOfferings(offeringsData) : null
      set({ offerings: transformedOfferings })
    } catch (err: unknown) {
      console.error('[RevenueCatStore] Fetch offerings error:', err)
    }
  },

  // ─── Purchase a Package ───────────────────────────────────────────────────

  purchasePackage: async (pkg: PackageData, customerEmail?: string, selectedLocale?: string) => {
    set({ loading: true, error: null })

    try {
      const instance = getPurchasesInstance()

      if (!instance) {
        set({ error: 'RevenueCat SDK not initialized', loading: false })
        return false
      }

      // Find the actual RC package from offerings
      const rcOfferings = await instance.getOfferings()
       
      let rcPackage: any = null

      if (rcOfferings?.current?.availablePackages) {
        rcPackage = rcOfferings.current.availablePackages.find(
          (p: { identifier: string }) => p.identifier === pkg.identifier
        ) ?? null
      }

      if (!rcPackage) {
        // Fallback: use presentPaywall
        const result = await presentPaywall({
          offeringIdentifier: rcOfferings?.current?.identifier,
          customerEmail,
          selectedLocale,
        })

        if (result?.success) {
          await get().checkEntitlements()
          set({ loading: false })
          return true
        }

        set({ loading: false })
        return false
      }

      const result = await instance.purchase({
        rcPackage,
        customerEmail,
        selectedLocale,
      })

      if (result?.customerInfo) {
        set({ customerInfo: result.customerInfo })
        await get().checkEntitlements()
        set({ loading: false })
        return true
      }

      set({ loading: false })
      return false
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      if (errorMessage.includes('UserCancelled') || errorMessage.includes('cancelled')) {
        set({ loading: false })
        return false
      }
      set({ error: errorMessage, loading: false })
      console.error('[RevenueCatStore] Purchase error:', errorMessage)
      return false
    }
  },

  // ─── Restore Purchases ────────────────────────────────────────────────────

  restorePurchases: async () => {
    set({ loading: true, error: null })

    try {
      const instance = getPurchasesInstance()

      if (!instance) {
        set({ error: 'RevenueCat SDK not initialized', loading: false })
        return
      }

      // For web, restoring purchases is equivalent to re-fetching customer info
      const customerInfoData = await instance.getCustomerInfo()

      if (customerInfoData) {
        set({ customerInfo: customerInfoData })

        // Process entitlements
        const activeEntitlements: Record<string, EntitlementInfo> = {}
        if (customerInfoData.entitlements?.active) {
          for (const [key, value] of Object.entries(customerInfoData.entitlements.active)) {
            const ent = value as {
              identifier: string
              isActive: boolean
              willRenew: boolean
              productIdentifier: string
              expirationDate: Date | null
              latestPurchaseDate: Date | null
              periodType: string
              store: string
              isSandbox: boolean
            }
            activeEntitlements[key] = {
              identifier: ent.identifier,
              isActive: ent.isActive,
              willRenew: ent.willRenew,
              productIdentifier: ent.productIdentifier,
              expirationDate: ent.expirationDate,
              latestPurchaseDate: ent.latestPurchaseDate,
              periodType: ent.periodType,
              store: ent.store,
              isSandbox: ent.isSandbox,
            }
          }
        }

        const hasPro = PRO_PLUS_ENTITLEMENT in activeEntitlements

        if (hasPro) {
          const entitlement = activeEntitlements[PRO_PLUS_ENTITLEMENT]
          const plan = mapEntitlementToPlan(entitlement.productIdentifier)
          useSubscriptionStore.getState().syncWithRevenueCat(true, {}, plan)
        } else {
          useSubscriptionStore.getState().syncWithRevenueCat(false, {})
        }

        // Get management URL
        const mgmtURL = await getManagementURL()

        set({
          entitlements: activeEntitlements,
          isPro: hasPro,
          managementURL: mgmtURL,
          loading: false,
          lastFetched: Date.now(),
        })
      } else {
        set({ loading: false })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to restore purchases'
      set({ error: msg, loading: false })
      console.error('[RevenueCatStore] Restore error:', msg)
    }
  },

  // ─── Check Entitlements ───────────────────────────────────────────────────

  checkEntitlements: async () => {
    try {
      const hasPro = await checkProPlusEntitlement()
      const customerInfoData = await fetchCustomerInfo()

      if (customerInfoData) {
        const activeEntitlements: Record<string, EntitlementInfo> = {}
        if (customerInfoData.entitlements?.active) {
          for (const [key, value] of Object.entries(customerInfoData.entitlements.active)) {
            const ent = value as {
              identifier: string
              isActive: boolean
              willRenew: boolean
              productIdentifier: string
              expirationDate: Date | null
              latestPurchaseDate: Date | null
              periodType: string
              store: string
              isSandbox: boolean
            }
            activeEntitlements[key] = {
              identifier: ent.identifier,
              isActive: ent.isActive,
              willRenew: ent.willRenew,
              productIdentifier: ent.productIdentifier,
              expirationDate: ent.expirationDate,
              latestPurchaseDate: ent.latestPurchaseDate,
              periodType: ent.periodType,
              store: ent.store,
              isSandbox: ent.isSandbox,
            }
          }
        }

        if (hasPro) {
          const entitlement = activeEntitlements[PRO_PLUS_ENTITLEMENT]
          if (entitlement) {
            const plan = mapEntitlementToPlan(entitlement.productIdentifier)
            useSubscriptionStore.getState().syncWithRevenueCat(true, {}, plan)
          }
        }

        const mgmtURL = await getManagementURL()

        set({
          entitlements: activeEntitlements,
          isPro: hasPro,
          managementURL: mgmtURL,
          customerInfo: customerInfoData,
          lastFetched: Date.now(),
        })
      }
    } catch (err: unknown) {
      console.error('[RevenueCatStore] Check entitlements error:', err)
    }
  },

  // ─── Refresh all data ────────────────────────────────────────────────────

  refresh: async () => {
    const state = get()
    if (!state.initializedUserId) return

    set({ loading: true, error: null })

    try {
      const customerInfoData = await fetchCustomerInfo()

      if (customerInfoData) {
        const activeEntitlements: Record<string, EntitlementInfo> = {}
        if (customerInfoData.entitlements?.active) {
          for (const [key, value] of Object.entries(customerInfoData.entitlements.active)) {
            const ent = value as {
              identifier: string
              isActive: boolean
              willRenew: boolean
              productIdentifier: string
              expirationDate: Date | null
              latestPurchaseDate: Date | null
              periodType: string
              store: string
              isSandbox: boolean
            }
            activeEntitlements[key] = {
              identifier: ent.identifier,
              isActive: ent.isActive,
              willRenew: ent.willRenew,
              productIdentifier: ent.productIdentifier,
              expirationDate: ent.expirationDate,
              latestPurchaseDate: ent.latestPurchaseDate,
              periodType: ent.periodType,
              store: ent.store,
              isSandbox: ent.isSandbox,
            }
          }
        }

        const hasPro = PRO_PLUS_ENTITLEMENT in activeEntitlements

        if (hasPro) {
          const entitlement = activeEntitlements[PRO_PLUS_ENTITLEMENT]
          const plan = mapEntitlementToPlan(entitlement.productIdentifier)
          useSubscriptionStore.getState().syncWithRevenueCat(true, {}, plan)
        } else {
          useSubscriptionStore.getState().syncWithRevenueCat(false, {})
        }

        // Refresh offerings
        const offeringsData = await rcFetchOfferings()
        const transformedOfferings = offeringsData ? transformOfferings(offeringsData) : null

        // Get management URL
        const mgmtURL = await getManagementURL()

        set({
          customerInfo: customerInfoData,
          entitlements: activeEntitlements,
          isPro: hasPro,
          offerings: transformedOfferings || state.offerings,
          managementURL: mgmtURL,
          loading: false,
          lastFetched: Date.now(),
        })
      } else {
        set({ loading: false })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error refreshing RevenueCat data'
      set({ error: msg, loading: false })
    }
  },

  // ─── Reset (for logout) ──────────────────────────────────────────────────

  reset: () => {
    resetRevenueCat()
    set({
      offerings: null,
      entitlements: {},
      customerInfo: null,
      managementURL: null,
      isPro: false,
      loading: false,
      error: null,
      initializedUserId: null,
      lastFetched: null,
      sdkState: {
        initializationState: 'uninitialized',
        error: null,
        userId: null,
      },
    })
  },
}))
