/**
 * Next.js Instrumentation Hook
 *
 * This file is automatically loaded by Next.js on the server side.
 * Used to initialize Sentry and other server-side services.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs')

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      debug: false,
      enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    })
  }
}
