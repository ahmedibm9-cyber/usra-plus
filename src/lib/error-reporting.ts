/**
 * Error Reporting Utility for USRA PLUS
 *
 * Provides a unified interface for reporting errors to Sentry and console.
 * Works both client-side and server-side — Sentry is only initialized when
 * NEXT_PUBLIC_SENTRY_DSN is configured.
 */

import * as Sentry from '@sentry/nextjs'

/**
 * Report a generic error with optional context.
 * Sends to Sentry (if configured) and logs to console.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const err = error instanceof Error ? error : new Error(String(error))

  if (context) {
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value)
      }
      Sentry.captureException(err)
    })
  } else {
    Sentry.captureException(err)
  }

  // Always log to console for local debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('[USRA Error]', err.message, context ?? '')
  }
}

/**
 * Report an API route error with route context.
 * Includes the route path and optional HTTP status code.
 */
export function reportApiError(
  route: string,
  error: unknown,
  statusCode?: number,
): void {
  const err = error instanceof Error ? error : new Error(String(error))

  Sentry.withScope((scope) => {
    scope.setTag('api_route', route)
    if (statusCode) {
      scope.setTag('status_code', String(statusCode))
      scope.setExtra('statusCode', statusCode)
    }
    scope.setExtra('route', route)
    Sentry.captureException(err)
  })

  if (process.env.NODE_ENV === 'development') {
    console.error(`[API Error] ${route}${statusCode ? ` (${statusCode})` : ''}:`, err.message)
  }
}

/**
 * Set the Sentry user context after successful login.
 * This allows Sentry to associate errors with specific users.
 */
export function setUserContext(userId: string, email?: string): void {
  Sentry.setUser({
    id: userId,
    email: email ?? undefined,
  })
}

/**
 * Clear the Sentry user context on logout.
 * Prevents subsequent errors from being associated with the previous user.
 */
export function clearUserContext(): void {
  Sentry.setUser(null)
}
