/**
 * Server-side Error Logging Utility for USRA PLUS
 * 
 * Provides centralized error logging for API routes and server components.
 * In production, integrate with Sentry/PostHog/Datadog.
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface ServerErrorLog {
  id: string
  message: string
  source: string
  severity: ErrorSeverity
  timestamp: string
  stack?: string
  metadata?: Record<string, unknown>
  userId?: string
  requestId?: string
}

const MAX_LOG_ENTRIES = 200
const logs: ServerErrorLog[] = []

/**
 * Log a server-side error.
 * In production, this would send to an external monitoring service.
 */
export function logServerError(
  error: Error | unknown,
  source: string,
  severity: ErrorSeverity = 'error',
  metadata?: Record<string, unknown>,
  userId?: string
): void {
  const logEntry: ServerErrorLog = {
    id: `srv-err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message: error instanceof Error ? error.message : String(error),
    source,
    severity,
    timestamp: new Date().toISOString(),
    stack: error instanceof Error ? error.stack : undefined,
    metadata,
    userId,
  }

  // Add to in-memory buffer
  logs.unshift(logEntry)
  if (logs.length > MAX_LOG_ENTRIES) {
    logs.length = MAX_LOG_ENTRIES
  }

  // Console output with severity-based formatting
  const prefix = `[USRA:${severity.toUpperCase()}]`
  switch (severity) {
    case 'critical':
      console.error(prefix, source, error, metadata)
      break
    case 'error':
      console.error(prefix, source, error instanceof Error ? error.message : error)
      break
    case 'warning':
      console.warn(prefix, source, error instanceof Error ? error.message : error)
      break
    case 'info':
      console.info(prefix, source, error instanceof Error ? error.message : error)
      break
  }

  // ─── Production Integration Points ──────────────────────────────────────
  // Uncomment and configure when ready for production monitoring:
  
  // Sentry:
  // if (severity === 'error' || severity === 'critical') {
  //   Sentry.captureException(error, { extra: { source, ...metadata }, user: { id: userId } })
  // }
  
  // PostHog:
  // if (severity === 'error' || severity === 'critical') {
  //   PostHog.capture('server_error', { source, message: logEntry.message, severity, ...metadata })
  // }
}

/**
 * Get recent server error logs (for admin dashboard).
 */
export function getServerErrorLogs(limit: number = 50): ServerErrorLog[] {
  return logs.slice(0, limit)
}

/**
 * Clear server error logs.
 */
export function clearServerErrorLogs(): void {
  logs.length = 0
}

/**
 * Create a safe API handler wrapper that catches errors and logs them.
 * Returns a proper error response instead of crashing.
 */
export function safeApiHandler(
  handler: (request: Request) => Promise<Response>,
  options?: { source?: string; rateLimitCheck?: () => Response | null }
): (request: Request) => Promise<Response> {
  const source = options?.source || 'api'

  return async (request: Request) => {
    try {
      // Apply rate limit check if provided
      if (options?.rateLimitCheck) {
        const rateLimitResponse = options.rateLimitCheck()
        if (rateLimitResponse) return rateLimitResponse
      }

      return await handler(request)
    } catch (error) {
      logServerError(error, source, 'critical', {
        url: request.url,
        method: request.method,
      })

      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          // Only include error details in development
          ...(process.env.NODE_ENV === 'development' && {
            details: error instanceof Error ? error.message : String(error),
          }),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }
}
