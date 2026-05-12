'use client'

import { create } from 'zustand'

// ─── Types ───────────────────────────────────────────────────────────

export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info'
export type ErrorType = 'client' | 'api' | 'render' | 'network' | 'unknown'
export type ErrorStatus = 'active' | 'resolved' | 'dismissed' | 'escalated'
export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown'
export type BugCategory = 'UI' | 'Backend' | 'Database' | 'Auth' | 'Performance'

export interface CapturedError {
  id: string
  timestamp: string
  type: ErrorType
  severity: ErrorSeverity
  status: ErrorStatus
  message: string
  stack?: string
  source?: string
  lineNumber?: number
  columnNumber?: number
  url?: string
  occurrenceCount: number
  firstSeen: string
  lastSeen: string
  browserInfo?: {
    userAgent: string
    viewport: string
    language: string
    platform: string
  }
}

export interface HealthCheck {
  id: string
  name: string
  status: HealthStatus
  responseTime: number | null
  lastChecked: string
  message?: string
  endpoint?: string
}

export interface PerformanceMetric {
  id: string
  name: string
  value: number
  unit: string
  timestamp: string
  category: 'page-load' | 'api-response' | 'render-count' | 'memory'
}

export interface BugReport {
  id: string
  title: string
  description: string
  severity: ErrorSeverity
  category: BugCategory
  stepsToReproduce: string
  browserInfo: {
    userAgent: string
    viewport: string
    language: string
    platform: string
    url: string
    timestamp: string
  }
  createdAt: string
  status: 'open' | 'investigating' | 'resolved' | 'closed'
}

export interface ActivityEvent {
  id: string
  timestamp: string
  type: 'error' | 'warning' | 'resolved' | 'escalated' | 'bug-report' | 'health-change' | 'performance'
  message: string
  details?: string
}

interface BugDetectionState {
  errors: CapturedError[]
  healthChecks: HealthCheck[]
  performanceMetrics: PerformanceMetric[]
  bugReports: BugReport[]
  activityFeed: ActivityEvent[]
  isMonitoring: boolean
  lastUpdated: string | null

  // Error actions
  addError: (error: Omit<CapturedError, 'id' | 'occurrenceCount' | 'firstSeen' | 'lastSeen'>) => void
  updateErrorStatus: (id: string, status: ErrorStatus) => void
  resolveError: (id: string) => void
  dismissError: (id: string) => void
  escalateError: (id: string) => void
  clearResolvedErrors: () => void

  // Health check actions
  setHealthChecks: (checks: HealthCheck[]) => void
  updateHealthCheck: (id: string, update: Partial<HealthCheck>) => void

  // Performance metric actions
  addPerformanceMetric: (metric: Omit<PerformanceMetric, 'id' | 'timestamp'>) => void
  clearPerformanceMetrics: () => void

  // Bug report actions
  addBugReport: (report: Omit<BugReport, 'id' | 'createdAt' | 'status'>) => void
  updateBugReportStatus: (id: string, status: BugReport['status']) => void

  // Activity feed actions
  addActivityEvent: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => void
  clearActivityFeed: () => void

  // Monitoring control
  setIsMonitoring: (monitoring: boolean) => void
  setLastUpdated: (time: string) => void
}

// ─── Helper Functions ─────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getBrowserInfo(): BugReport['browserInfo'] {
  if (typeof window === 'undefined') {
    return {
      userAgent: 'SSR',
      viewport: 'N/A',
      language: 'N/A',
      platform: 'N/A',
      url: 'N/A',
      timestamp: new Date().toISOString(),
    }
  }
  return {
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    language: navigator.language,
    platform: navigator.platform,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  }
}

// ─── Persist to localStorage ──────────────────────────────────────────

const STORAGE_KEY = 'usra-bug-detection'

function loadFromStorage(): Partial<BugDetectionState> | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // ignore parse errors
  }
  return null
}

function saveToStorage(state: Partial<BugDetectionState>): void {
  if (typeof window === 'undefined') return
  try {
    const toSave = {
      errors: state.errors?.slice(-200), // Keep last 200 errors
      bugReports: state.bugReports?.slice(-50), // Keep last 50 bug reports
      activityFeed: state.activityFeed?.slice(-100), // Keep last 100 activity events
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch {
    // ignore storage errors
  }
}

// ─── Default Health Checks ────────────────────────────────────────────

const DEFAULT_HEALTH_CHECKS: HealthCheck[] = [
  { id: 'supabase-connection', name: 'Supabase Connection', status: 'unknown', responseTime: null, lastChecked: new Date().toISOString(), endpoint: '/api/admin/infrastructure' },
  { id: 'database-tables', name: 'Database Tables', status: 'unknown', responseTime: null, lastChecked: new Date().toISOString() },
  { id: 'auth-service', name: 'Auth Service', status: 'unknown', responseTime: null, lastChecked: new Date().toISOString(), endpoint: '/api/admin/overview' },
  { id: 'api-health', name: 'API Routes', status: 'unknown', responseTime: null, lastChecked: new Date().toISOString(), endpoint: '/api/admin/error-log' },
  { id: 'client-runtime', name: 'Client Runtime', status: 'healthy', responseTime: null, lastChecked: new Date().toISOString(), message: 'Browser runtime active' },
]

// ─── Store ────────────────────────────────────────────────────────────

export const useBugDetectionStore = create<BugDetectionState>((set, get) => {
  const stored = typeof window !== 'undefined' ? loadFromStorage() : null

  return {
    errors: stored?.errors ?? [],
    healthChecks: DEFAULT_HEALTH_CHECKS,
    performanceMetrics: stored?.performanceMetrics ?? [],
    bugReports: stored?.bugReports ?? [],
    activityFeed: stored?.activityFeed ?? [],
    isMonitoring: false,
    lastUpdated: null,

    addError: (errorData) => {
      const now = new Date().toISOString()
      const fingerprint = `${errorData.type}-${errorData.message}-${errorData.source}`
      
      const existingError = get().errors.find(e => {
        const existingFingerprint = `${e.type}-${e.message}-${e.source}`
        return existingFingerprint === fingerprint && e.status === 'active'
      })

      if (existingError) {
        // Increment occurrence count
        set((state) => ({
          errors: state.errors.map(e =>
            e.id === existingError.id
              ? { ...e, occurrenceCount: e.occurrenceCount + 1, lastSeen: now, severity: worseSeverity(e.severity, errorData.severity) }
              : e
          ),
        }))
      } else {
        const newError: CapturedError = {
          ...errorData,
          id: generateId(),
          occurrenceCount: 1,
          firstSeen: now,
          lastSeen: now,
          browserInfo: getBrowserInfo(),
        }
        set((state) => ({
          errors: [newError, ...state.errors],
        }))

        // Add to activity feed
        get().addActivityEvent({
          type: errorData.severity === 'critical' || errorData.severity === 'error' ? 'error' : 'warning',
          message: `New ${errorData.severity} error: ${errorData.message.slice(0, 80)}`,
          details: `Type: ${errorData.type}${errorData.source ? ` | Source: ${errorData.source}` : ''}`,
        })
      }

      // Save to localStorage
      saveToStorage(get())
    },

    updateErrorStatus: (id, status) => {
      set((state) => ({
        errors: state.errors.map(e => e.id === id ? { ...e, status } : e),
      }))
      saveToStorage(get())
    },

    resolveError: (id) => {
      const error = get().errors.find(e => e.id === id)
      set((state) => ({
        errors: state.errors.map(e => e.id === id ? { ...e, status: 'resolved' } : e),
      }))
      if (error) {
        get().addActivityEvent({
          type: 'resolved',
          message: `Resolved: ${error.message.slice(0, 60)}`,
        })
      }
      saveToStorage(get())
    },

    dismissError: (id) => {
      set((state) => ({
        errors: state.errors.map(e => e.id === id ? { ...e, status: 'dismissed' } : e),
      }))
      saveToStorage(get())
    },

    escalateError: (id) => {
      const error = get().errors.find(e => e.id === id)
      set((state) => ({
        errors: state.errors.map(e => e.id === id ? { ...e, status: 'escalated', severity: 'critical' } : e),
      }))
      if (error) {
        get().addActivityEvent({
          type: 'escalated',
          message: `Escalated: ${error.message.slice(0, 60)}`,
        })
      }
      saveToStorage(get())
    },

    clearResolvedErrors: () => {
      set((state) => ({
        errors: state.errors.filter(e => e.status !== 'resolved' && e.status !== 'dismissed'),
      }))
      saveToStorage(get())
    },

    setHealthChecks: (checks) => {
      set({ healthChecks: checks, lastUpdated: new Date().toISOString() })
    },

    updateHealthCheck: (id, update) => {
      set((state) => ({
        healthChecks: state.healthChecks.map(hc =>
          hc.id === id ? { ...hc, ...update, lastChecked: new Date().toISOString() } : hc
        ),
      }))
    },

    addPerformanceMetric: (metricData) => {
      const metric: PerformanceMetric = {
        ...metricData,
        id: generateId(),
        timestamp: new Date().toISOString(),
      }
      set((state) => ({
        performanceMetrics: [metric, ...state.performanceMetrics].slice(0, 500),
      }))
    },

    clearPerformanceMetrics: () => {
      set({ performanceMetrics: [] })
    },

    addBugReport: (reportData) => {
      const report: BugReport = {
        ...reportData,
        id: generateId(),
        createdAt: new Date().toISOString(),
        status: 'open',
      }
      set((state) => ({
        bugReports: [report, ...state.bugReports],
      }))
      get().addActivityEvent({
        type: 'bug-report',
        message: `Bug reported: ${reportData.title.slice(0, 60)}`,
        details: `Category: ${reportData.category} | Severity: ${reportData.severity}`,
      })
      saveToStorage(get())
    },

    updateBugReportStatus: (id, status) => {
      set((state) => ({
        bugReports: state.bugReports.map(br => br.id === id ? { ...br, status } : br),
      }))
      saveToStorage(get())
    },

    addActivityEvent: (eventData) => {
      const event: ActivityEvent = {
        ...eventData,
        id: generateId(),
        timestamp: new Date().toISOString(),
      }
      set((state) => ({
        activityFeed: [event, ...state.activityFeed].slice(0, 200),
      }))
    },

    clearActivityFeed: () => {
      set({ activityFeed: [] })
      saveToStorage(get())
    },

    setIsMonitoring: (monitoring) => {
      set({ isMonitoring: monitoring })
    },

    setLastUpdated: (time) => {
      set({ lastUpdated: time })
    },
  }
})

// ─── Utility ──────────────────────────────────────────────────────────

function worseSeverity(a: ErrorSeverity, b: ErrorSeverity): ErrorSeverity {
  const order: ErrorSeverity[] = ['info', 'warning', 'error', 'critical']
  return order.indexOf(a) >= order.indexOf(b) ? a : b
}

// ─── Global Error Capture Setup ───────────────────────────────────────

let globalErrorCaptureInstalled = false

export function installGlobalErrorCapture(): () => void {
  if (typeof window === 'undefined' || globalErrorCaptureInstalled) return () => {}
  globalErrorCaptureInstalled = true

  const store = useBugDetectionStore

  // Capture window.onerror
  const originalOnError = window.onerror
  window.onerror = (message, source, lineno, colno, error) => {
    store.getState().addError({
      type: 'client',
      timestamp: new Date().toISOString(),
      severity: 'error',
      status: 'active',
      message: String(message),
      stack: error?.stack,
      source: source || undefined,
      lineNumber: lineno || undefined,
      columnNumber: colno || undefined,
      url: window.location.href,
    })
    if (originalOnError) {
      originalOnError(message, source, lineno, colno, error)
    }
  }

  // Capture unhandled promise rejections
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason
    store.getState().addError({
      type: 'client',
      timestamp: new Date().toISOString(),
      severity: 'error',
      status: 'active',
      message: reason?.message || String(reason),
      stack: reason?.stack,
      source: 'unhandledrejection',
      url: window.location.href,
    })
  }
  window.addEventListener('unhandledrejection', handleUnhandledRejection)

  // Performance Observer for long tasks
  let perfObserver: PerformanceObserver | null = null
  try {
    if (typeof PerformanceObserver !== 'undefined') {
      perfObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 100) {
            store.getState().addPerformanceMetric({
              name: entry.name || 'Long Task',
              value: Math.round(entry.duration),
              unit: 'ms',
              category: 'page-load',
            })
          }
        }
      })
      perfObserver.observe({ entryTypes: ['longtask', 'measure'] })
    }
  } catch {
    // PerformanceObserver not supported
  }

  // Return cleanup function
  return () => {
    window.onerror = originalOnError
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    perfObserver?.disconnect()
    globalErrorCaptureInstalled = false
  }
}
