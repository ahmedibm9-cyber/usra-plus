import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { getUserPlan, checkPlanLimit, getCurrentStorageUsage } from '@/lib/plan-limits'

/**
 * POST /api/files/upload
 *
 * Server-side plan enforcement for file uploads.
 * Uses getCurrentStorageUsage() to get the REAL storage usage from the
 * server-side database, NOT from the client request body.
 *
 * SECURITY FIX: The previous implementation accepted currentStorageBytes from
 * the client request body, which allowed trivial bypass by sending
 * { currentStorageBytes: 0 }. Now the usage is resolved entirely server-side.
 *
 * The client still sends fileSizeBytes so we can check if the NEW upload
 * would exceed the limit. But the CURRENT usage is now verified server-side.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get the size of the file the client intends to upload
    let body: { fileSizeBytes?: number }
    try {
      body = await request.json() as { fileSizeBytes?: number }
    } catch {
      body = {}
    }

    const fileSizeBytes = typeof body.fileSizeBytes === 'number' ? body.fileSizeBytes : 0

    // Reject obviously bogus values
    if (fileSizeBytes < 0) {
      return NextResponse.json({ error: 'Invalid file size' }, { status: 400 })
    }

    // ─── Server-side plan limit check (NO client-provided storage usage) ──
    const plan = await getUserPlan(request)
    const currentStorageBytes = await getCurrentStorageUsage(auth.userId)

    // If currentStorageBytes is Infinity, we can't enforce the limit server-side
    if (currentStorageBytes === Infinity) {
      // Cannot verify — allow but note that enforcement is not possible
      return NextResponse.json({
        allowed: true,
        plan,
        limit: Infinity,
        remainingBytes: Infinity,
        enforcementNote: 'Storage limit cannot be verified server-side without Supabase',
      })
    }

    const { allowed, limit } = checkPlanLimit(plan, 'storage', currentStorageBytes + fileSizeBytes)

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Storage limit reached for your plan',
          currentPlan: plan,
          limit,
          currentUsage: currentStorageBytes,
          requestedBytes: fileSizeBytes,
          upgradeRequired: true,
        },
        { status: 403 },
      )
    }

    return NextResponse.json({
      allowed: true,
      plan,
      limit,
      remainingBytes: limit - currentStorageBytes,
    })
  } catch (error) {
    console.error('[Files Upload API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
