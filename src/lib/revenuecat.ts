'use client'

/**
 * RevenueCat Service Utility for USRA PLUS
 *
 * Provides a singleton pattern for initializing and interacting with
 * the RevenueCat Purchases JS SDK. All API keys are read from
 * environment variables — never hardcoded.
 */

import type {
  Purchases,
  CustomerInfo,
  Offerings,
  PurchasesConfig,
} from '@revenuecat/purchases-js'

// ─── Types ──────────────────────────────────────────────────────────────────

export type RevenueCatInitializationState = 'uninitialized' | 'initializing' | 'initialized' | 'error'

export interface RevenueCatState {
  initializationState: RevenueCatInitializationState
  error: string | null
  userId: string | null
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** The entitlement identifier that grants USRA PRO+ access */
export const PRO_PLUS_ENTITLEMENT = 'USRA PRO+'

/** RevenueCat package identifiers we expect */
export const PACKAGE_LIFETIME = 'lifetime'
export const PACKAGE_YEARLY = 'yearly'
export const PACKAGE_MONTHLY = 'monthly'

// ─── Singleton State ────────────────────────────────────────────────────────

let _purchasesInstance: Purchases | null = null
let _initializationState: RevenueCatInitializationState = 'uninitialized'
let _initializationError: string | null = null
let _currentUserId: string | null = null

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Check if RevenueCat is configured (has an API key in env).
 * This does NOT mean the SDK is initialized — only that the key exists.
 */
export function isRevenueCatConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_REVENUECAT_API_KEY
}

/**
 * Get current RevenueCat state for diagnostics.
 */
export function getRevenueCatState(): RevenueCatState {
  return {
    initializationState: _initializationState,
    error: _initializationError,
    userId: _currentUserId,
  }
}

/**
 * Get the initialized Purchases instance.
 * Returns null if not initialized.
 */
export function getPurchasesInstance(): Purchases | null {
  return _purchasesInstance
}

// ─── Initialization ─────────────────────────────────────────────────────────

/**
 * Initialize the RevenueCat SDK.
 *
 * - Uses `NEXT_PUBLIC_REVENUECAT_API_KEY` from environment
 * - Accepts a `userId` (Supabase Auth User ID) to log the user in
 * - Singleton pattern — safe to call multiple times; only initializes once
 * - Handles network failures and blocked pop-ups gracefully
 *
 * @param userId - The Supabase Auth User ID to identify the user in RevenueCat
 * @returns The Purchases instance, or null on failure
 */
export async function initializeRevenueCat(userId: string): Promise<Purchases | null> {
  // Already initialized for this user
  if (_purchasesInstance && _currentUserId === userId && _initializationState === 'initialized') {
    return _purchasesInstance
  }

  // Already initializing — wait for it
  if (_initializationState === 'initializing') {
    // Poll until state changes (max 10s)
    const maxWait = 10000
    const interval = 100
    let waited = 0
    while (_initializationState === 'initializing' && waited < maxWait) {
      await new Promise((r) => setTimeout(r, interval))
      waited += interval
    }
    return (_initializationState as RevenueCatInitializationState) === 'initialized' ? _purchasesInstance : null
  }

  _initializationState = 'initializing'
  _initializationError = null

  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY
  if (!apiKey) {
    _initializationState = 'error'
    _initializationError = 'RevenueCat API key is not configured. Set NEXT_PUBLIC_REVENUECAT_API_KEY in your environment.'
    console.warn('[RevenueCat] ' + _initializationError)
    return null
  }

  try {
    // Dynamic import to avoid SSR issues and reduce initial bundle
    const { Purchases } = await import('@revenuecat/purchases-js')

    // Close any existing instance
    if (_purchasesInstance) {
      try {
        _purchasesInstance.close()
      } catch {
        // Ignore close errors
      }
      _purchasesInstance = null
    }

    const config: PurchasesConfig = {
      apiKey,
      appUserId: userId,
    }

    _purchasesInstance = Purchases.configure(config)
    _currentUserId = userId
    _initializationState = 'initialized'

    console.info('[RevenueCat] SDK initialized successfully for user:', userId)
    return _purchasesInstance
  } catch (err: unknown) {
    _initializationState = 'error'
    _initializationError = err instanceof Error ? err.message : 'Unknown initialization error'
    console.error('[RevenueCat] Failed to initialize SDK:', _initializationError)

    // Handle common errors
    if (err instanceof Error) {
      if (err.message.includes('network') || err.message.includes('fetch')) {
        _initializationError = 'Network error during RevenueCat initialization. Please check your internet connection.'
      } else if (err.message.includes('popup') || err.message.includes('blocked')) {
        _initializationError = 'Pop-up blocked during RevenueCat initialization. Please allow pop-ups for this site.'
      } else if (err.message.includes('API key') || err.message.includes('apiKey')) {
        _initializationError = 'Invalid RevenueCat API key. Please check your NEXT_PUBLIC_REVENUECAT_API_KEY environment variable.'
      }
    }

    return null
  }
}

// ─── User Management ────────────────────────────────────────────────────────

/**
 * Log the user into RevenueCat using their Supabase Auth User ID.
 *
 * If the SDK is not yet initialized, this will initialize it.
 * If the SDK is already initialized for a different user, it will switch.
 *
 * @param userId - The Supabase Auth User ID
 * @returns CustomerInfo after login, or null on failure
 */
export async function loginRevenueCatUser(userId: string): Promise<CustomerInfo | null> {
  try {
    // If not initialized, initialize first
    if (!_purchasesInstance || _initializationState !== 'initialized') {
      const instance = await initializeRevenueCat(userId)
      if (!instance) return null
      // After initialization, fetch customer info
      return await instance.getCustomerInfo()
    }

    // Already initialized for this user
    if (_currentUserId === userId) {
      return await _purchasesInstance.getCustomerInfo()
    }

    // Different user — switch
    const customerInfo = await _purchasesInstance.changeUser(userId)
    _currentUserId = userId
    console.info('[RevenueCat] User switched to:', userId)
    return customerInfo
  } catch (err: unknown) {
    console.error('[RevenueCat] Failed to login user:', err instanceof Error ? err.message : err)
    return null
  }
}

// ─── Data Fetching ──────────────────────────────────────────────────────────

/**
 * Fetch customer info from RevenueCat.
 * Returns null if SDK is not initialized or on error.
 */
export async function fetchCustomerInfo(): Promise<CustomerInfo | null> {
  if (!_purchasesInstance || _initializationState !== 'initialized') {
    return null
  }
  try {
    return await _purchasesInstance.getCustomerInfo()
  } catch (err: unknown) {
    console.error('[RevenueCat] Failed to fetch customer info:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Fetch available offerings from RevenueCat.
 * Returns null if SDK is not initialized or on error.
 */
export async function fetchOfferings(): Promise<Offerings | null> {
  if (!_purchasesInstance || _initializationState !== 'initialized') {
    return null
  }
  try {
    return await _purchasesInstance.getOfferings()
  } catch (err: unknown) {
    console.error('[RevenueCat] Failed to fetch offerings:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Check if the current user has the PRO+ entitlement.
 */
export async function checkProPlusEntitlement(): Promise<boolean> {
  if (!_purchasesInstance || _initializationState !== 'initialized') {
    return false
  }
  try {
    return await _purchasesInstance.isEntitledTo(PRO_PLUS_ENTITLEMENT)
  } catch (err: unknown) {
    console.error('[RevenueCat] Failed to check entitlement:', err instanceof Error ? err.message : err)
    return false
  }
}

/**
 * Purchase a specific package from an offering.
 */
export async function purchasePackage(
  rcPackage: Parameters<Purchases['purchase']>[0]['rcPackage'],
  options?: {
    customerEmail?: string
    selectedLocale?: string
  }
): Promise<{ customerInfo: CustomerInfo; success: boolean } | null> {
  if (!_purchasesInstance || _initializationState !== 'initialized') {
    return null
  }
  try {
    const result = await _purchasesInstance.purchase({
      rcPackage,
      customerEmail: options?.customerEmail,
      selectedLocale: options?.selectedLocale,
    })
    return {
      customerInfo: result.customerInfo,
      success: true,
    }
  } catch (err: unknown) {
    // User cancelled is not really an error
    const errorMessage = err instanceof Error ? err.message : String(err)
    if (errorMessage.includes('UserCancelled') || errorMessage.includes('cancelled')) {
      console.info('[RevenueCat] Purchase cancelled by user')
      return null
    }
    console.error('[RevenueCat] Purchase failed:', errorMessage)
    return null
  }
}

/**
 * Present the RevenueCat paywall using the SDK's built-in UI.
 */
export async function presentPaywall(options?: {
  offeringIdentifier?: string
  customerEmail?: string
  selectedLocale?: string
}): Promise<{ customerInfo: CustomerInfo; success: boolean } | null> {
  if (!_purchasesInstance || _initializationState !== 'initialized') {
    return null
  }
  try {
    let offering: Parameters<Purchases['presentPaywall']>[0]['offering'] | undefined

    if (options?.offeringIdentifier) {
      const offerings = await _purchasesInstance.getOfferings()
      offering = offerings.all[options.offeringIdentifier] || offerings.current || undefined
    }

    const result = await _purchasesInstance.presentPaywall({
      offering,
      customerEmail: options?.customerEmail,
      selectedLocale: options?.selectedLocale,
    })

    return {
      customerInfo: result.customerInfo,
      success: true,
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    if (errorMessage.includes('UserCancelled') || errorMessage.includes('cancelled')) {
      console.info('[RevenueCat] Paywall dismissed by user')
      return null
    }
    console.error('[RevenueCat] Paywall error:', errorMessage)
    return null
  }
}

/**
 * Get the management URL for the current subscription.
 * Users can use this URL to manage their subscription (cancel, change plan, etc.)
 */
export async function getManagementURL(): Promise<string | null> {
  if (!_purchasesInstance || _initializationState !== 'initialized') {
    return null
  }
  try {
    const customerInfo = await _purchasesInstance.getCustomerInfo()
    return customerInfo.managementURL
  } catch (err: unknown) {
    console.error('[RevenueCat] Failed to get management URL:', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Restore purchases — re-fetches customer info to sync any
 * purchases made on other devices or after reinstall.
 *
 * On web, this is equivalent to calling getCustomerInfo().
 * On mobile platforms, it triggers the App Store / Play Store restore flow.
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!_purchasesInstance || _initializationState !== 'initialized') {
    return null
  }
  try {
    const customerInfo = await _purchasesInstance.getCustomerInfo()
    console.info('[RevenueCat] Purchases restored successfully')
    return customerInfo
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('[RevenueCat] Failed to restore purchases:', errorMessage)

    // Handle network failures gracefully
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('offline')) {
      console.warn('[RevenueCat] Network error during restore — the device may be offline')
    }

    return null
  }
}

/**
 * Get the shared Purchases instance.
 * Returns the singleton instance if initialized, or null.
 */
export function getSharedPurchasesInstance(): Purchases | null {
  return _purchasesInstance
}

/**
 * Reset / close the RevenueCat instance (e.g. on logout).
 */
export function resetRevenueCat(): void {
  if (_purchasesInstance) {
    try {
      _purchasesInstance.close()
    } catch {
      // Ignore
    }
  }
  _purchasesInstance = null
  _initializationState = 'uninitialized'
  _initializationError = null
  _currentUserId = null
  console.info('[RevenueCat] SDK reset')
}
