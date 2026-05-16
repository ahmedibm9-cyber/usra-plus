/**
 * Stripe Checkout Session API Route
 *
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout Session for subscription creation.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { validateCSRF } from '@/lib/csrf'
import { db } from '@/lib/db'
import {
  isStripeConfigured,
  getOrCreateStripeCustomer,
  createCheckoutSession,
  PLAN_CONFIG,
  type StripePlanId,
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
    const body = await request.json()
    const { planId } = body as { planId: string }

    // Validate planId
    if (!planId || !PLAN_CONFIG[planId as StripePlanId]) {
      return NextResponse.json(
        { error: 'Invalid plan ID. Must be one of: pro, family_plus' },
        { status: 400 },
      )
    }

    // Validate that the Stripe price is configured
    const planConfig = PLAN_CONFIG[planId as StripePlanId]
    if (!planConfig.priceId) {
      return NextResponse.json(
        { error: 'Payment processing is not configured for this plan yet' },
        { status: 503 },
      )
    }

    // Get user email
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(userId, user.email)

    // Determine base URL
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get('origin') ||
      'http://localhost:3000'

    // Create checkout session
    const result = await createCheckoutSession({
      customerId,
      planId: planId as StripePlanId,
      userId,
      baseUrl,
    })

    if (!result.url) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      url: result.url,
      sessionId: result.sessionId,
    })
  } catch (err) {
    console.error('[Stripe Checkout] Error:', err)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    )
  }
}
