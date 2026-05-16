/**
 * USRA PLUS Structured Logger
 *
 * A structured logging utility that wraps console methods and integrates
 * with Sentry for production error/warning tracking.
 *
 * - logger.error() → console.error + Sentry.captureException/captureMessage
 * - logger.warn()  → console.warn  + Sentry.addBreadcrumb (level: warning)
 * - logger.info()  → console.log in development only; silent in production
 *
 * Sentry calls are only made when NEXT_PUBLIC_SENTRY_DSN is set.
 * Console calls are always preserved for Vercel log streaming.
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_ENABLED = !!process.env.NEXT_PUBLIC_SENTRY_DSN
const IS_DEV = process.env.NODE_ENV === 'development'

/**
 * Log an error with structured context.
 * - Calls Sentry.captureException if error is an Error object
 * - Calls Sentry.captureMessage at 'error' level otherwise
 * - Always calls console.error for Vercel log streaming
 */
export function error(context: string, message: string, err?: unknown): void {
  const prefix = `${context} ${message}`

  if (err !== undefined) {
    console.error(prefix, err)
  } else {
    console.error(prefix)
  }

  if (SENTRY_ENABLED) {
    if (err instanceof Error) {
      Sentry.withScope((scope) => {
        scope.setTag('context', context)
        scope.setExtra('message', message)
        Sentry.captureException(err)
      })
    } else {
      Sentry.withScope((scope) => {
        scope.setTag('context', context)
        if (err !== undefined) {
          scope.setExtra('error', err)
        }
        Sentry.captureMessage(`${context} ${message}`, 'error')
      })
    }
  }
}

/**
 * Log a warning with structured context.
 * - Calls console.warn for Vercel log streaming
 * - Adds a Sentry breadcrumb at warning level
 */
export function warn(context: string, message: string): void {
  console.warn(`${context} ${message}`)

  if (SENTRY_ENABLED) {
    Sentry.addBreadcrumb({
      category: context.replace(/[\[\]]/g, ''),
      message: `${context} ${message}`,
      level: 'warning',
    })
  }
}

/**
 * Log an informational message.
 * - Only outputs to console.log in development
 * - Silent in production
 */
export function info(context: string, message: string, data?: unknown): void {
  if (!IS_DEV) return

  if (data !== undefined) {
    console.log(`${context} ${message}`, data)
  } else {
    console.log(`${context} ${message}`)
  }
}

export const logger = { error, warn, info }
export default logger
