/**
 * CSRF Protection Utility for USRA PLUS API Routes
 *
 * Defense-in-depth against Cross-Site Request Forgery attacks.
 * Uses Origin header validation — if the Origin header is present,
 * it must match the server's own origin.
 *
 * This complements the SameSite cookie attribute:
 * - SameSite=Lax protects against cross-site POST but allows top-level navigations
 * - SameSite=Strict (admin cookies) blocks all cross-site requests
 * - Origin validation catches cases where cookies might be sent despite SameSite
 *
 * Usage:
 *   const csrfError = validateCSRF(request)
 *   if (csrfError) return csrfError
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * Get the expected origin(s) for this server.
 * In production, uses NEXT_PUBLIC_APP_URL env var.
 * In development, allows localhost variants.
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = []

  // Production origin from env
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    origins.push(appUrl.replace(/\/$/, ''))
  }

  // Development origins
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000')
    origins.push('http://127.0.0.1:3000')
  }

  // Vercel preview URLs
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`)
  }

  return origins
}

/**
 * Validate that the request's Origin header matches an allowed origin.
 * Returns null if valid, or a NextResponse with 403 if invalid.
 *
 * For same-origin requests (no Origin header, e.g., direct API calls from curl),
 * we also check the Referer header. If neither is present, we allow the request
 * since cookies with SameSite=Lax/Strict provide the primary defense.
 */
export function validateCSRF(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase()

  // Only protect state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return null
  }

  // Webhook endpoints are exempt (they come from external services)
  const pathname = request.nextUrl?.pathname || ''
  if (pathname.includes('/webhook') || pathname.includes('/revenuecat')) {
    return null
  }

  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  // If Origin header is present, validate it strictly
  if (origin) {
    const allowedOrigins = getAllowedOrigins()

    if (allowedOrigins.length === 0) {
      // No configured origins — skip check (first-run scenario)
      return null
    }

    const originAllowed = allowedOrigins.some(allowed => {
      return origin.toLowerCase() === allowed.toLowerCase()
    })

    if (!originAllowed) {
      logger.warn('[CSRF]', `Blocked request with Origin: ${origin}`)
      return NextResponse.json(
        { error: 'Request blocked — invalid origin' },
        { status: 403 }
      )
    }

    return null
  }

  // No Origin header — check Referer as fallback
  if (referer) {
    const allowedOrigins = getAllowedOrigins()

    if (allowedOrigins.length === 0) {
      return null
    }

    const refererAllowed = allowedOrigins.some(allowed => {
      return referer.toLowerCase().startsWith(allowed.toLowerCase() + '/') ||
             referer.toLowerCase() === allowed.toLowerCase()
    })

    if (!refererAllowed) {
      logger.warn('[CSRF]', `Blocked request with Referer: ${referer}`)
      return NextResponse.json(
        { error: 'Request blocked — invalid referer' },
        { status: 403 }
      )
    }

    return null
  }

  // No Origin or Referer — in production, require at least one
  // In development, allow through for API testing (curl, Postman)
  if (process.env.NODE_ENV === 'production') {
    logger.warn('[CSRF]', 'Blocked request with no Origin or Referer header')
    return NextResponse.json(
      { error: 'Request blocked — missing origin validation' },
      { status: 403 }
    )
  }

  return null
}
