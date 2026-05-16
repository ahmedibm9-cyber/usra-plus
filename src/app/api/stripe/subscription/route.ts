/**
 * Stripe Subscription Details API Route
 *
 * GET /api/stripe/subscription
 * Returns current subscription details from Stripe (via API, not just DB).
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import { isStripeConfigured, getStripeSubscriptionDetails } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  // Authentication
  const { userId, error: authError } = await requireAuth(request)
  if (authError) return authError

  try {
    // Find the user's subscription in our DB
    const subscription = await db.userSubscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription) {
      return NextResponse.json({
        plan: 'free',
        status: 'none',
        currentPeriodEnd: null,
        currentPeriodStart: null,
        cancelAtPeriodEnd: false,
        trialEnd: null,
        stripeManaged: false,
      })
    }

    // If the subscription has a Stripe subscription ID, fetch live details
    let stripeDetails = null
    if (subscription.stripeSubscriptionId && isStripeConfigured()) {
      stripeDetails = await getStripeSubscriptionDetails(
        subscription.stripeSubscriptionId,
      )
    }

    return NextResponse.json({
      // DB record data
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
      currentPeriodStart: subscription.currentPeriodStart?.toISOString() || null,
      trialStart: subscription.trialStart?.toISOString() || null,
      trialEnd: subscription.trialEnd?.toISOString() || null,
      autoRenew: subscription.autoRenew,
      price: subscription.price,
      currency: subscription.currency,
      store: subscription.store,
      stripeManaged: !!subscription.stripeSubscriptionId,

      // Live Stripe data (if available)
      ...(stripeDetails && {
        liveStatus: stripeDetails.status,
        liveCancelAtPeriodEnd: stripeDetails.cancelAtPeriodEnd,
        liveCurrentPeriodEnd: stripeDetails.currentPeriodEnd?.toISOString() || null,
      }),
    })
  } catch (err) {
    console.error('[Stripe Subscription] Error:', err)
    return NextResponse.json(
      { error: 'Failed to retrieve subscription details' },
      { status: 500 },
    )
  }
}
