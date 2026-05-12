'use client'

export interface CapturedError {
  id: string
  message: string
  source: string
  stack?: string
  severity: 'error' | 'warning' | 'critical'
  timestamp: string
  metadata?: Record<string, unknown>
}

const MAX_ERRORS = 100
const STORAGE_KEY = 'usra-captured-errors'
let initialized = false

function getStoredErrors(): CapturedError[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveErrors(errors: CapturedError[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(errors.slice(0, MAX_ERRORS)))
  } catch {
    // localStorage full - trim and retry
    const trimmed = errors.slice(0, Math.floor(MAX_ERRORS / 2))
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    } catch {
      // Give up
    }
  }
}

export function captureError(
  error: Error | unknown,
  source = 'unknown',
  severity: 'error' | 'warning' | 'critical' = 'error',
  metadata?: Record<string, unknown>
) {
  const captured: CapturedError = {
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message: error instanceof Error ? error.message : String(error),
    source,
    stack: error instanceof Error ? error.stack : undefined,
    severity,
    timestamp: new Date().toISOString(),
    metadata,
  }

  const errors = getStoredErrors()
  errors.unshift(captured)
  saveErrors(errors)
}

export function getCapturedErrors(): CapturedError[] {
  return getStoredErrors()
}

export function clearCapturedErrors(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export function initErrorCapture() {
  if (typeof window === 'undefined' || initialized) return
  initialized = true

  // Capture unhandled errors
  window.addEventListener('error', (event) => {
    captureError(
      event.error || event.message,
      `${event.filename}:${event.lineno}:${event.colno}`,
      'critical'
    )
  })

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    captureError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      'unhandled_promise',
      'critical'
    )
  })

  // Override console.error to capture logged errors
  const originalConsoleError = console.error
  console.error = (...args: unknown[]) => {
    originalConsoleError.apply(console, args)
    try {
      const message = args.map(a => (a instanceof Error ? a.message : String(a))).join(' ')
      const stack = args.find(a => a instanceof Error)?.stack
      captureError(
        { message, stack, name: 'ConsoleError' } as Error,
        'console.error',
        'error'
      )
    } catch {
      // Don't let error capture cause more errors
    }
  }

  // Override console.warn to capture warnings
  const originalConsoleWarn = console.warn
  console.warn = (...args: unknown[]) => {
    originalConsoleWarn.apply(console, args)
    try {
      const message = args.map(a => (a instanceof Error ? a.message : String(a))).join(' ')
      captureError(
        { message, name: 'ConsoleWarning' } as Error,
        'console.warn',
        'warning'
      )
    } catch {
      // Don't let error capture cause more errors
    }
  }
}
