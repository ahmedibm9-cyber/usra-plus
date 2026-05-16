import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { checkPlanLimitServerSide } from '@/lib/plan-limits'

/**
 * POST /api/tasks/create
 *
 * Server-side plan enforcement for task creation.
 * Uses checkPlanLimitServerSide() to get the REAL task count from the
 * server-side database, NOT from the client request body.
 *
 * SECURITY FIX: The previous implementation accepted currentTaskCount from
 * the client request body, which allowed trivial bypass by sending
 * { currentTaskCount: 0 }. Now the count is resolved entirely server-side.
 *
 * NOTE: Task data is stored client-side (Zustand) and in Supabase.  This
 * endpoint acts as a gatekeeper — the client MUST call it before adding a
 * task locally. When Supabase is unavailable, the server-side count returns
 * Infinity (limit cannot be enforced), and the check defaults to allowed.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // ─── Server-side plan limit check (NO client-provided count) ──────
    const result = await checkPlanLimitServerSide(request, 'tasks')

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Task limit reached for your plan',
          limit: result.limit,
          currentCount: result.current,
          upgradeRequired: true,
        },
        { status: 403 },
      )
    }

    return NextResponse.json({
      allowed: true,
      limit: result.limit,
      remaining: result.limit === Infinity ? Infinity : result.limit - result.current,
    })
  } catch (error) {
    console.error('[Tasks Create API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
