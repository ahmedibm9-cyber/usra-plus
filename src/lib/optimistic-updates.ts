/**
 * Optimistic Update Utility for USRA PLUS Stores
 * 
 * Provides rollback-on-failure semantics for Zustand store mutations.
 * When a Supabase write fails, the store automatically reverts to its
 * previous state, preventing false UI state.
 */

interface OptimisticUpdate<T> {
  /** The snapshot of the state before the mutation */
  snapshot: T
  /** Function to restore the snapshot on failure */
  rollback: () => void
}

/**
 * Execute an optimistic update with automatic rollback on failure.
 * 
 * @param getState - Current store state getter
 * @param setState - Store state setter
 * @param optimisticChange - The optimistic change to apply immediately
 * @param persistFn - The async function that persists the change to Supabase
 * @returns The result of the persist function, or throws on failure (after rollback)
 */
export async function withOptimisticRollback<TState, TResult>(
  getState: () => TState,
  setState: (partial: Partial<TState> | ((state: TState) => Partial<TState>)) => void,
  optimisticChange: (state: TState) => Partial<TState>,
  persistFn: () => Promise<TResult>
): Promise<TResult> {
  // 1. Capture snapshot before mutation
  const snapshot = { ...getState() }
  
  // 2. Apply optimistic change immediately
  setState(optimisticChange(getState()))
  
  try {
    // 3. Attempt to persist to server
    const result = await persistFn()
    return result
  } catch (error) {
    // 4. On failure, rollback to snapshot
    console.warn('[OptimisticUpdate] Persist failed, rolling back:', error)
    setState(snapshot)
    throw error
  }
}

/**
 * Execute an optimistic update with retry logic.
 * On failure, retries up to `maxRetries` times before rolling back.
 */
export async function withRetryAndRollback<TState, TResult>(
  getState: () => TState,
  setState: (partial: Partial<TState> | ((state: TState) => Partial<TState>)) => void,
  optimisticChange: (state: TState) => Partial<TState>,
  persistFn: () => Promise<TResult>,
  maxRetries: number = 2,
  retryDelayMs: number = 1000
): Promise<TResult> {
  const snapshot = { ...getState() }
  setState(optimisticChange(getState()))
  
  let lastError: unknown = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await persistFn()
      return result
    } catch (error) {
      lastError = error
      
      if (attempt < maxRetries) {
        // Wait before retrying, with exponential backoff
        await new Promise(resolve => setTimeout(resolve, retryDelayMs * Math.pow(2, attempt)))
      }
    }
  }
  
  // All retries exhausted — rollback
  console.warn('[OptimisticUpdate] All retries failed, rolling back:', lastError)
  setState(snapshot)
  throw lastError
}

/**
 * Simple debounce utility for reducing rapid successive writes.
 */
export function createDebouncedMutation<TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<void>,
  delayMs: number = 500
): (...args: TArgs) => void {
  let timerId: ReturnType<typeof setTimeout> | null = null
  
  return (...args: TArgs) => {
    if (timerId) clearTimeout(timerId)
    timerId = setTimeout(() => {
      fn(...args).catch(console.error)
      timerId = null
    }, delayMs)
  }
}
