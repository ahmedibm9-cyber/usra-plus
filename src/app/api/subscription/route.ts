import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserId } from '@/lib/auth-utils'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * GET /api/subscription/plan?userId=xxx
 *
 * Check a user's subscription status from the local database.
 * Returns plan, status, trial info.
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await checkRateLimit(request, RATE_LIMITS.API_READ)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const userId = await getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let subscription: {
      plan?: string | null
      status?: string | null
      trialStart?: Date | null
      trialEnd?: Date | null
      currentPeriodEnd?: Date | null
    } | null = null

    try {
      const { db } = await import('@/lib/db')
      const sub = await db.userSubscription.findUnique({
        where: { userId },
      })
      if (sub) {
        subscription = {
          plan: sub.plan,
          status: sub.status,
          trialStart: sub.trialStart,
          trialEnd: sub.trialEnd,
          currentPeriodEnd: sub.currentPeriodEnd,
        }
      }
    } catch {
      // Database not available
    }

    if (!subscription) {
      return NextResponse.json({
        plan: 'free',
        status: 'active',
        isTrial: false,
        trialEnd: null,
        source: 'default',
      })
    }

    const now = new Date()
    const isTrial = subscription.trialStart && subscription.trialEnd
      ? now >= new Date(subscription.trialStart) && now <= new Date(subscription.trialEnd)
      : false

    return NextResponse.json({
      plan: subscription.plan || 'free',
      status: subscription.status || 'active',
      isTrial,
      trialEnd: subscription.trialEnd?.toISOString() || null,
      source: 'database',
    })
  } catch (error) {
    console.error('[SubscriptionAPI] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
