/**
 * Stripe Customer Portal API Route
 *
 * POST /api/stripe/portal
 * Creates a Stripe Customer Portal session for managing subscriptions.
 * Allows cancellation, payment method updates, and invoice history.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { validateCSRF } from '@/lib/csrf'
import { db } from '@/lib/db'
import {
  isStripeConfigured,
  createCustomerPortalSession,
} from '@/lib/stripe'

export async function POST(request: NextRequest) {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Payment processing is not configured yet. Please try again later.' },
      { status: 503 },
    )
  }

  // CSRF protection
  const csrfError = validateCSRF(request)
  if (csrfError) return csrfError

  // Rate limiting
  const rateLimitError = await applyRateLimit(request, RATE_LIMITS.SUBSCRIPTION)
  if (rateLimitError) return rateLimitError

  // Authentication
  const { userId, error: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    // Find the user's subscription with Stripe customer ID
    const subscription = await db.userSubscription.findFirst({
      where: { userId, stripeCustomerId: { not: null } },
    })

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe subscription found. Please subscribe first.' },
        { status: 400 },
      )
    }

    // Determine base URL
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get('origin') ||
      'http://localhost:3000'

    // Create portal session with full configuration
    const result = await createCustomerPortalSession({
      customerId: subscription.stripeCustomerId,
      baseUrl,
    })

    return NextResponse.json({ url: result.url })
  } catch (err) {
    console.error('[Stripe Portal] Error:', err)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 },
    )
  }
}
