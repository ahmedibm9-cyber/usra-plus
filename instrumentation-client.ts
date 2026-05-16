/**
 * Sentry Client-Side Initialization
 *
 * This file is automatically loaded by Next.js on the client side.
 * Replaces the deprecated sentry.client.config.ts file.
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  debug: false,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
})
