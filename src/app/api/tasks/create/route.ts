import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { getUserPlan, checkPlanLimit } from '@/lib/plan-limits'

/**
 * POST /api/tasks/create
 *
 * Server-side plan enforcement for task creation.
 * The client sends the current task count so we can verify the user's plan
 * allows creating one more task.  Returns 403 when the limit is reached.
 *
 * NOTE: Task data is stored client-side (Zustand).  This endpoint acts as
 * a gatekeeper — the client MUST call it before adding a task locally.
 * A determined attacker could still bypass this by modifying the Zustand
 * store directly, but the server-side check prevents casual abuse and
 * direct API calls.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let body: { currentTaskCount?: number }
    try {
      body = await request.json() as { currentTaskCount?: number }
    } catch {
      body = {}
    }

    const currentTaskCount = typeof body.currentTaskCount === 'number' ? body.currentTaskCount : 0

    // Reject obviously bogus counts
    if (currentTaskCount < 0) {
      return NextResponse.json({ error: 'Invalid task count' }, { status: 400 })
    }

    // ─── Server-side plan limit check ──────────────────────────────────
    const plan = await getUserPlan(request)
    const { allowed, limit } = checkPlanLimit(plan, 'tasks', currentTaskCount)

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Task limit reached for your plan',
          currentPlan: plan,
          limit,
          currentCount: currentTaskCount,
          upgradeRequired: true,
        },
        { status: 403 },
      )
    }

    return NextResponse.json({ allowed: true, plan, limit, remaining: limit - currentTaskCount })
  } catch (error) {
    console.error('[Tasks Create API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
