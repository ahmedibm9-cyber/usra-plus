/**
 * Shared helpers for Zustand stores that interact with Supabase.
 * Consolidates duplicated logic across meal-store, milestone-store,
 * chore-store, budget-store, and comment-store.
 */

/** Check if a Supabase error indicates the table doesn't exist (PGRST205) */
export function isTableNotFoundError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const err = error as { code?: string; message?: string }
    if (err.code === 'PGRST205') return true
    if (err.message?.includes('PGRST205')) return true
    if (err.message?.includes('does not exist')) return true
  }
  return false
}

/**
 * Create a race-condition guard for async store fetch operations.
 * Returns an object with an `abort()` method and a `check()` method.
 *
 * Usage:
 *   const guard = createFetchGuard()
 *   // In fetch:
 *   if (!guard.check()) return  // a newer fetch is in flight
 *   // Before starting a new fetch:
 *   guard.abort()               // cancel the previous fetch
 */
export function createFetchGuard() {
  let currentId = 0

  return {
    /** Call before starting a new fetch. Invalidates any in-flight fetch. */
    next(): number {
      return ++currentId
    },
    /** Call after an async boundary to verify this fetch is still the latest. */
    isLatest(id: number): boolean {
      return id === currentId
    },
  }
}
