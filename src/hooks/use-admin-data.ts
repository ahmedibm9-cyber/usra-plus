'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type DataSource = 'live' | 'demo' | 'loading'

export interface AnalyticsData {
  users: {
    total: number
    newThisMonth: number
    active: number
    dailyActive: number
    monthlyActive: number
  }
  families: {
    total: number
    avgSize: number
    active: number
  }
  tasks: {
    created: number
    completed: number
    completionRate: number
  }
  groceries: {
    itemsTracked: number
    completedLists: number
  }
  subscriptions: {
    mrr: number
    arr: number
    free: number
    pro: number
    familyPlus: number
    conversionRate: number
  }
  chat: {
    totalMessages: number
  }
}

export interface SafeUserRecord {
  id: string
  email: string
  name: string
  plan: string
  status: string
  last_login: string | null
  created_at: string
  family_count: number
  language: string
  country: string | null
}

export interface SafeFamilyRecord {
  id: string
  name: string
  member_count: number
  plan: string
  tasks_completed_count: number
  last_active: string | null
  activity_score: number
}

interface PaginatedResponse<T> {
  source: DataSource
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ─── Hook: useAnalyticsData ────────────────────────────────────────────────────

interface UseAnalyticsDataReturn {
  data: AnalyticsData | null
  isLoading: boolean
  source: DataSource
  error: string | null
  refetch: () => void
}

export function useAnalyticsData(): UseAnalyticsDataReturn {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [source, setSource] = useState<DataSource>('loading')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/analytics', {
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const json = await response.json()

      if (!controller.signal.aborted) {
        setData(json.data)
        setSource(json.source === 'live' ? 'live' : 'demo')
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
        setSource('demo')
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchData()
    return () => {
      if (abortRef.current) {
        abortRef.current.abort()
      }
    }
  }, [fetchData])

  return { data, isLoading, source, error, refetch: fetchData }
}

// ─── Hook: useAdminUsers ───────────────────────────────────────────────────────

interface UseAdminUsersParams {
  page?: number
  pageSize?: number
  plan?: string
  status?: string
  search?: string
  enabled?: boolean
}

interface UseAdminUsersReturn {
  data: SafeUserRecord[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  isLoading: boolean
  source: DataSource
  error: string | null
  refetch: () => void
}

export function useAdminUsers(params: UseAdminUsersParams = {}): UseAdminUsersReturn {
  const { page = 1, pageSize = 20, plan, status, search, enabled = true } = params
  const [data, setData] = useState<SafeUserRecord[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [source, setSource] = useState<DataSource>('loading')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) return

    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (plan) queryParams.set('plan', plan)
      if (status) queryParams.set('status', status)
      if (search) queryParams.set('search', search)

      const response = await fetch(`/api/admin/users?${queryParams}`, {
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const json: PaginatedResponse<SafeUserRecord> = await response.json()

      if (!controller.signal.aborted) {
        setData(json.data)
        setTotal(json.total)
        setHasMore(json.hasMore)
        setSource(json.source === 'live' ? 'live' : 'demo')
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Failed to fetch users')
        setSource('demo')
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [page, pageSize, plan, status, search, enabled])

  useEffect(() => {
    fetchData()
    return () => {
      if (abortRef.current) {
        abortRef.current.abort()
      }
    }
  }, [fetchData])

  return { data, total, page, pageSize, hasMore, isLoading, source, error, refetch: fetchData }
}

// ─── Hook: useAdminFamilies ────────────────────────────────────────────────────

interface UseAdminFamiliesParams {
  page?: number
  pageSize?: number
  plan?: string
  search?: string
  enabled?: boolean
}

interface UseAdminFamiliesReturn {
  data: SafeFamilyRecord[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  isLoading: boolean
  source: DataSource
  error: string | null
  refetch: () => void
}

export function useAdminFamilies(params: UseAdminFamiliesParams = {}): UseAdminFamiliesReturn {
  const { page = 1, pageSize = 20, plan, search, enabled = true } = params
  const [data, setData] = useState<SafeFamilyRecord[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [source, setSource] = useState<DataSource>('loading')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) return

    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (plan) queryParams.set('plan', plan)
      if (search) queryParams.set('search', search)

      const response = await fetch(`/api/admin/families?${queryParams}`, {
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const json: PaginatedResponse<SafeFamilyRecord> = await response.json()

      if (!controller.signal.aborted) {
        setData(json.data)
        setTotal(json.total)
        setHasMore(json.hasMore)
        setSource(json.source === 'live' ? 'live' : 'demo')
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Failed to fetch families')
        setSource('demo')
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [page, pageSize, plan, search, enabled])

  useEffect(() => {
    fetchData()
    return () => {
      if (abortRef.current) {
        abortRef.current.abort()
      }
    }
  }, [fetchData])

  return { data, total, page, pageSize, hasMore, isLoading, source, error, refetch: fetchData }
}
