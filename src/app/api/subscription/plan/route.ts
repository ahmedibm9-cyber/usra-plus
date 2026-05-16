import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserId } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * Server-side subscription plan verification.
 * 
 * This is the ONLY trusted source for the user's current plan.
 * Client-side subscription store data is for UX only and can be tampered with.
 * 
 * GET /api/subscription/plan
 * 
 * Returns the user's plan based on their authenticated session.
 * Uses the usra-auth-token cookie for authentication — no userId query param needed.
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const rateLimitResult = await checkRateLimit(request, RATE_LIMITS.API_READ)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: Math.ceil(rateLimitResult.retryAfterMs / 1000) },
        { 
          status: 429,
          headers: { 'Retry-After': Math.ceil(rateLimitResult.retryAfterMs / 1000).toString() }
        }
      )
    }

    // Authenticate via session cookie
    const userId = await getAuthenticatedUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Fetch subscription from Prisma database — this is the source of truth
    const subscription = await db.userSubscription.findFirst({
      where: { userId, status: { in: ['active', 'trialing'] } },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription) {
      // No subscription row — user is on free plan
      return NextResponse.json({ plan: 'free', source: 'database' })
    }

    // Check if subscription is expired
    if (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < new Date()) {
      return NextResponse.json({ plan: 'free', source: 'database', expired: true })
    }

    return NextResponse.json({ 
      plan: subscription.plan || 'free', 
      source: 'database',
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
    })
  } catch (error) {
    console.error('[SubscriptionPlanAPI] Error:', error)
    // On error, default to free plan — never block a user on error
    return NextResponse.json({ plan: 'free', source: 'error' })
  }
}
