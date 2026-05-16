/**
 * Next.js Server-Side Instrumentation Hook
 *
 * This file is automatically loaded by Next.js on the server side.
 * Used to initialize Sentry and validate environment at startup.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Validate environment variables at startup
    const { validateEnvironment } = await import('@/lib/env-validation')
    validateEnvironment()

    const Sentry = await import('@sentry/nextjs')

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      debug: false,
      enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    })
  }
}
