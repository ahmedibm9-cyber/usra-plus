/**
 * Performance Optimization Utilities for USRA PLUS
 * 
 * Provides:
 * 1. Memoized selectors for Zustand stores (prevents re-renders on every state change)
 * 2. Pagination helper for large lists
 * 3. Debounced search for reducing filter operations
 * 4. Throttled scroll handlers
 */

import { useRef, useCallback, useMemo, useEffect } from 'react'

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

export interface PaginationControls {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
  startIndex: number
  endIndex: number
}

/**
 * Calculate pagination metadata from current state.
 */
export function getPaginationMeta(
  page: number,
  pageSize: number,
  total: number
): PaginationControls {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
    startIndex: (safePage - 1) * pageSize,
    endIndex: Math.min(safePage * pageSize, total),
  }
}

/**
 * Paginate an array — returns a slice of the array for the current page.
 */
export function paginateArray<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}

// ─── Debounced Search ────────────────────────────────────────────────────────

/**
 * Hook that debounces a search query value.
 * Returns the debounced value that only updates after the specified delay.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  
  return debouncedValue
}

// Need useState for the hook above
import { useState } from 'react'

// ─── Throttled Callback ──────────────────────────────────────────────────────

/**
 * Create a throttled version of a callback that fires at most once per interval.
 */
export function useThrottledCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  intervalMs: number = 100
): T {
  const lastRunRef = useRef(0)
  const callbackRef = useRef(callback)
  
  useEffect(() => {
    callbackRef.current = callback
  })

  return useCallback(
    (...args: unknown[]) => {
      const now = Date.now()
      if (now - lastRunRef.current >= intervalMs) {
        lastRunRef.current = now
        callbackRef.current(...args)
      }
    },
    [intervalMs]
  ) as T
}

// ─── Stable Reference ────────────────────────────────────────────────────────

/**
 * Returns a stable reference that only updates when the value actually changes.
 * Useful for preventing unnecessary re-renders from object/array props.
 * Uses useMemo with JSON serialization as a dependency key.
 */
export function useStableValue<T>(value: T): T {
  const serialized = JSON.stringify(value)
  return useMemo(() => value, [serialized])
}

// ─── Intersection Observer for Infinite Scroll ───────────────────────────────

/**
 * Hook for infinite scroll — returns a ref to attach to a sentinel element.
 * When the sentinel becomes visible, calls onLoadMore.
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  hasMore: boolean,
  threshold: number = 200
) {
  const observerRef = useRef<IntersectionObserver | null>(null)

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect()
      if (!node || !hasMore) return

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            onLoadMore()
          }
        },
        { rootMargin: `${threshold}px` }
      )
      observerRef.current.observe(node)
    },
    [onLoadMore, hasMore, threshold]
  )

  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [])

  return sentinelRef
}
