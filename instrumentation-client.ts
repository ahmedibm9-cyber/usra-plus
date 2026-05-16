/**
 * Next.js Client-Side Instrumentation
 *
 * Replaces the deprecated sentry.client.config.ts file.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
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

// Required by Sentry SDK for client-side navigation tracking
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
