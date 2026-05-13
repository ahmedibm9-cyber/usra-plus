import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server-client'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * Server-side subscription plan verification.
 * 
 * This is the ONLY trusted source for the user's current plan.
 * Client-side subscription store data is for UX only and can be tampered with.
 * 
 * GET /api/subscription/plan?userId=xxx
 * 
 * Returns the user's plan, or 'free' if no subscription exists.
 * The server validates the Supabase auth session before returning data.
 */
export async function GET(request: NextRequest) {

  try {
  // Rate limit
  const rateLimitResult = checkRateLimit(request, RATE_LIMITS.API_READ)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: Math.ceil(rateLimitResult.retryAfterMs / 1000) },
      { 
        status: 429,
        headers: { 'Retry-After': Math.ceil(rateLimitResult.retryAfterMs / 1000).toString() }
      }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = createServerClient()
    if (!supabase) {
      // No Supabase — default to free
      return NextResponse.json({ plan: 'free', source: 'fallback' })
    }

    // Verify the requesting user's auth session matches the requested userId
    const { data: { session } } = await supabase.auth.getSession()
    
    // If no session or userId doesn't match session, deny
    // This prevents users from querying other users' plans
    if (!session?.user || session.user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch subscription from database — this is the source of truth
    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      // No subscription row — user is on free plan
      return NextResponse.json({ plan: 'free', source: 'database' })
    }

    // Check if subscription is expired
    if (data.status === 'expired' || (data.current_period_end && new Date(data.current_period_end) < new Date())) {
      return NextResponse.json({ plan: 'free', source: 'database', expired: true })
    }

    return NextResponse.json({ 
      plan: data.plan || 'free', 
      source: 'database',
      status: data.status,
    })
  } catch (error) {
    console.error('[SubscriptionPlanAPI] Error:', error)
    return NextResponse.json({ plan: 'free', source: 'error' }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.subscription.plan] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
