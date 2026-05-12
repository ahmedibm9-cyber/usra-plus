'use client'

/**
 * USRA PLUS — Enhanced Admin Error Monitor
 *
 * Client-side error monitoring system that:
 * - Captures all JavaScript errors (window.onerror, unhandledrejection)
 * - Tracks performance metrics (using Performance API)
 * - Records console.error calls
 * - Stores errors in localStorage with deduplication
 * - Provides real-time error counting
 * - Auto-reports critical errors to the server
 * - Tracks performance metrics: page load time, DOM ready, FP, FCP
 */

// ─── Types ───────────────────────────────────────────────────────────

export type MonitorSeverity = 'critical' | 'error' | 'warning' | 'info'

export interface MonitoredError {
  id: string
  message: string
  source: string
  line?: number
  column?: number
  stack?: string
  severity: MonitorSeverity
  url: string
  userAgent: string
  timestamp: string
  occurrenceCount: number
  firstSeen: string
  lastSeen: string
  metadata?: Record<string, unknown>
}

export interface PerformanceSnapshot {
  pageLoadTime: number | null
  domReadyTime: number | null
  firstPaint: number | null
  firstContentfulPaint: number | null
  timeToInteractive: number | null
  domContentLoaded: number | null
  timestamp: string
}

export interface ErrorMonitorStats {
  totalErrors: number
  criticalCount: number
  errorCount: number
  warningCount: number
  infoCount: number
  errorsPerHour: number
  topErrorSources: { source: string; count: number }[]
  recentErrors: MonitoredError[]
  performance: PerformanceSnapshot | null
}

// ─── Constants ───────────────────────────────────────────────────────

const STORAGE_KEY = 'usra-admin-error-monitor'
const PERF_KEY = 'usra-admin-perf-snapshot'
const MAX_ERRORS = 200
const AUTO_REPORT_COOLDOWN = 30000 // 30 seconds between auto-reports of the same error

let initialized = false
let errorListeners: ((error: MonitoredError) => void)[] = []
let autoReportTimestamps = new Map<string, number>()

// ─── Deduplication Hash ──────────────────────────────────────────────

function hashError(message: string, source: string): string {
  let hash = 0
  const str = `${message}::${source}`
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

// ─── Severity Classification ─────────────────────────────────────────

function classifySeverity(
  message: string,
  source: string,
  isUnhandled?: boolean
): MonitorSeverity {
  if (isUnhandled) return 'critical'

  const criticalPatterns = [
    'chunk load error',
    'load failed',
    'import(',
    'out of memory',
    'script error',
    'network error',
    'fetch',
    'ChunkLoadError',
    'SyntaxError',
  ]

  const errorPatterns = [
    'TypeError',
    'ReferenceError',
    'RangeError',
    'Cannot read propert',
    'is not a function',
    'is not defined',
    'null is not an object',
    'undefined is not an object',
  ]

  const msgLower = message.toLowerCase()
  const srcLower = source.toLowerCase()

  if (criticalPatterns.some(p => msgLower.includes(p.toLowerCase()) || srcLower.includes(p.toLowerCase()))) {
    return 'critical'
  }

  if (errorPatterns.some(p => msgLower.includes(p.toLowerCase()))) {
    return 'error'
  }

  if (srcLower.includes('console.warn') || msgLower.includes('warning') || msgLower.includes('deprecated')) {
    return 'warning'
  }

  return 'info'
}

// ─── Storage Helpers ─────────────────────────────────────────────────

function getStoredErrors(): MonitoredError[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveErrors(errors: MonitoredError[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(errors.slice(0, MAX_ERRORS)))
  } catch {
    // localStorage full — trim and retry
    try {
      const trimmed = errors.slice(0, Math.floor(MAX_ERRORS / 2))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    } catch {
      // Give up
    }
  }
}

function getStoredPerformance(): PerformanceSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PERF_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function savePerformance(snapshot: PerformanceSnapshot): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PERF_KEY, JSON.stringify(snapshot))
  } catch {
    // Silently fail
  }
}

// ─── Auto-Report to Server ───────────────────────────────────────────

async function autoReportToServer(error: MonitoredError): Promise<void> {
  // Only auto-report critical and error severity
  if (error.severity !== 'critical' && error.severity !== 'error') return

  // Cooldown check — don't report the same error hash within the cooldown period
  const dedupeKey = hashError(error.message, error.source)
  const lastReport = autoReportTimestamps.get(dedupeKey) || 0
  if (Date.now() - lastReport < AUTO_REPORT_COOLDOWN) return
  autoReportTimestamps.set(dedupeKey, Date.now())

  try {
    await fetch('/api/admin/bugs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        title: `[Auto] ${error.message.slice(0, 100)}`,
        description: `Auto-reported by Admin Error Monitor\nSource: ${error.source}\nURL: ${error.url}\nOccurrences: ${error.occurrenceCount}`,
        severity: error.severity === 'critical' ? 'critical' : 'high',
        source: 'client',
        errorType: 'AutoDetected',
        stackTrace: error.stack || '',
        metadata: {
          monitor: true,
          line: error.line,
          column: error.column,
          userAgent: error.userAgent,
          firstSeen: error.firstSeen,
          lastSeen: error.lastSeen,
          occurrenceCount: error.occurrenceCount,
        },
      }),
    })
  } catch {
    // Don't let auto-reporting cause more errors
  }
}

// ─── Core: Capture Error ─────────────────────────────────────────────

function captureMonitorError(
  error: Error | unknown,
  source: string,
  severity?: MonitorSeverity,
  line?: number,
  column?: number,
  metadata?: Record<string, unknown>
): MonitoredError {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  // Auto-classify severity if not specified
  const classified = severity || classifySeverity(message, source)

  const dedupeKey = hashError(message, source)
  const errors = getStoredErrors()

  // Check for duplicate
  const existingIdx = errors.findIndex(e => hashError(e.message, e.source) === dedupeKey)

  let monitoredError: MonitoredError

  if (existingIdx >= 0) {
    // Update existing error — increment count
    const existing = errors[existingIdx]
    monitoredError = {
      ...existing,
      occurrenceCount: existing.occurrenceCount + 1,
      lastSeen: new Date().toISOString(),
      severity: classified, // Update to highest severity
      stack: stack || existing.stack,
    }
    errors.splice(existingIdx, 1)
  } else {
    monitoredError = {
      id: `mon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message,
      source,
      line,
      column,
      stack,
      severity: classified,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      timestamp: new Date().toISOString(),
      occurrenceCount: 1,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      metadata,
    }
  }

  // Add to front
  errors.unshift(monitoredError)
  saveErrors(errors)

  // Notify listeners
  errorListeners.forEach(fn => {
    try { fn(monitoredError) } catch { /* listener error */ }
  })

  // Auto-report
  autoReportToServer(monitoredError).catch(() => {})

  return monitoredError
}

// ─── Performance Tracking ────────────────────────────────────────────

function capturePerformanceSnapshot(): PerformanceSnapshot {
  const snapshot: PerformanceSnapshot = {
    pageLoadTime: null,
    domReadyTime: null,
    firstPaint: null,
    firstContentfulPaint: null,
    timeToInteractive: null,
    domContentLoaded: null,
    timestamp: new Date().toISOString(),
  }

  if (typeof window === 'undefined' || !window.performance) return snapshot

  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (nav) {
      snapshot.pageLoadTime = Math.round(nav.loadEventEnd - nav.startTime)
      snapshot.domReadyTime = Math.round(nav.domContentLoadedEventEnd - nav.startTime)
      snapshot.domContentLoaded = Math.round(nav.domContentLoadedEventEnd - nav.startTime)
    }

    // Paint metrics
    const paints = performance.getEntriesByType('paint') as PerformancePaintTiming[]
    for (const paint of paints) {
      if (paint.name === 'first-paint') {
        snapshot.firstPaint = Math.round(paint.startTime)
      }
      if (paint.name === 'first-contentful-paint') {
        snapshot.firstContentfulPaint = Math.round(paint.startTime)
      }
    }

    // TTI approximation (based on DOMContentLoaded + network idle)
    if (nav) {
      snapshot.timeToInteractive = Math.round(nav.domInteractive - nav.startTime)
    }
  } catch {
    // Performance API may not be available
  }

  savePerformance(snapshot)
  return snapshot
}

// ─── Initialize Monitor ──────────────────────────────────────────────

export function initAdminErrorMonitor(): void {
  if (typeof window === 'undefined' || initialized) return
  initialized = true

  // ── Capture unhandled errors ──────────────────────────────────────────
  window.addEventListener('error', (event) => {
    captureMonitorError(
      event.error || event.message,
      `${event.filename}:${event.lineno}:${event.colno}`,
      undefined,
      event.lineno,
      event.colno
    )
  })

  // ── Capture unhandled promise rejections ───────────────────────────────
  window.addEventListener('unhandledrejection', (event) => {
    captureMonitorError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      'unhandled_promise',
      'critical'
    )
  })

  // ── Override console.error ─────────────────────────────────────────────
  const originalConsoleError = console.error
  console.error = (...args: unknown[]) => {
    originalConsoleError.apply(console, args)
    try {
      const message = args.map(a => (a instanceof Error ? a.message : String(a))).join(' ')
      const stack = args.find(a => a instanceof Error)?.stack
      captureMonitorError(
        { message, stack, name: 'ConsoleError' } as Error,
        'console.error',
        'error'
      )
    } catch {
      // Don't let error capture cause more errors
    }
  }

  // ── Override console.warn ──────────────────────────────────────────────
  const originalConsoleWarn = console.warn
  console.warn = (...args: unknown[]) => {
    originalConsoleWarn.apply(console, args)
    try {
      const message = args.map(a => (a instanceof Error ? a.message : String(a))).join(' ')
      captureMonitorError(
        { message, name: 'ConsoleWarning' } as Error,
        'console.warn',
        'warning'
      )
    } catch {
      // Don't let error capture cause more errors
    }
  }

  // ── Capture performance after page load ────────────────────────────────
  if (document.readyState === 'complete') {
    setTimeout(capturePerformanceSnapshot, 100)
  } else {
    window.addEventListener('load', () => {
      setTimeout(capturePerformanceSnapshot, 500)
    })
  }
}

// ─── Public API ──────────────────────────────────────────────────────

export function getMonitoredErrors(): MonitoredError[] {
  return getStoredErrors()
}

export function clearMonitoredErrors(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export function getPerformanceSnapshot(): PerformanceSnapshot | null {
  return getStoredPerformance()
}

export function refreshPerformanceSnapshot(): PerformanceSnapshot {
  return capturePerformanceSnapshot()
}

export function getErrorMonitorStats(): ErrorMonitorStats {
  const errors = getStoredErrors()
  const perf = getStoredPerformance()

  const now = Date.now()
  const oneHourAgo = now - 3600000
  const recentErrors = errors.filter(e => new Date(e.lastSeen).getTime() > oneHourAgo)

  // Top error sources
  const sourceCounts = new Map<string, number>()
  errors.forEach(e => {
    const src = e.source.split(':')[0] // Get base source
    sourceCounts.set(src, (sourceCounts.get(src) || 0) + e.occurrenceCount)
  })
  const topErrorSources = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalErrors: errors.reduce((acc, e) => acc + e.occurrenceCount, 0),
    criticalCount: errors.filter(e => e.severity === 'critical').reduce((acc, e) => acc + e.occurrenceCount, 0),
    errorCount: errors.filter(e => e.severity === 'error').reduce((acc, e) => acc + e.occurrenceCount, 0),
    warningCount: errors.filter(e => e.severity === 'warning').reduce((acc, e) => acc + e.occurrenceCount, 0),
    infoCount: errors.filter(e => e.severity === 'info').reduce((acc, e) => acc + e.occurrenceCount, 0),
    errorsPerHour: recentErrors.reduce((acc, e) => acc + e.occurrenceCount, 0),
    topErrorSources,
    recentErrors: errors.slice(0, 20),
    performance: perf,
  }
}

export function onErrorCaptured(listener: (error: MonitoredError) => void): () => void {
  errorListeners.push(listener)
  return () => {
    errorListeners = errorListeners.filter(fn => fn !== listener)
  }
}

export function getErrorCount(): number {
  return getStoredErrors().reduce((acc, e) => acc + e.occurrenceCount, 0)
}

export function getErrorTrend(): { hour: string; count: number }[] {
  const errors = getStoredErrors()
  const now = Date.now()
  const trend: { hour: string; count: number }[] = []

  for (let i = 23; i >= 0; i--) {
    const hourStart = now - (i + 1) * 3600000
    const hourEnd = now - i * 3600000
    const hourLabel = new Date(hourStart).toISOString().slice(11, 13) + ':00'
    const count = errors
      .filter(e => {
        const t = new Date(e.lastSeen).getTime()
        return t >= hourStart && t < hourEnd
      })
      .reduce((acc, e) => acc + e.occurrenceCount, 0)
    trend.push({ hour: hourLabel, count })
  }

  return trend
}

export function getSeverityDistribution(): { severity: MonitorSeverity; count: number; percentage: number }[] {
  const errors = getStoredErrors()
  const total = errors.reduce((acc, e) => acc + e.occurrenceCount, 0)
  if (total === 0) return []

  const counts = new Map<MonitorSeverity, number>()
  errors.forEach(e => {
    counts.set(e.severity, (counts.get(e.severity) || 0) + e.occurrenceCount)
  })

  return (['critical', 'error', 'warning', 'info'] as MonitorSeverity[])
    .map(severity => ({
      severity,
      count: counts.get(severity) || 0,
      percentage: Math.round(((counts.get(severity) || 0) / total) * 100),
    }))
    .filter(d => d.count > 0)
}

// Capture a manual error through the monitor
export function captureAdminError(
  error: Error | unknown,
  source: string,
  severity?: MonitorSeverity,
  metadata?: Record<string, unknown>
): MonitoredError {
  return captureMonitorError(error, source, severity, undefined, undefined, metadata)
}

// Export error counts for the live indicator
export function getLiveErrorCount(): number {
  const errors = getStoredErrors()
  const oneMinuteAgo = Date.now() - 60000
  return errors
    .filter(e => new Date(e.lastSeen).getTime() > oneMinuteAgo)
    .reduce((acc, e) => acc + e.occurrenceCount, 0)
}
