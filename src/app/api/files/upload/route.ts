import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { getUserPlan, checkPlanLimit } from '@/lib/plan-limits'

/**
 * POST /api/files/upload
 *
 * Server-side plan enforcement for file uploads.
 * The client sends its current storage usage (in bytes) and the size of the
 * file it intends to upload.  Returns 403 when the storage limit would be
 * exceeded.
 *
 * NOTE: File metadata is stored client-side (Zustand).  This endpoint acts
 * as a gatekeeper — the client MUST call it before uploading a file.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let body: { currentStorageBytes?: number; fileSizeBytes?: number }
    try {
      body = await request.json() as { currentStorageBytes?: number; fileSizeBytes?: number }
    } catch {
      body = {}
    }

    const currentStorageBytes = typeof body.currentStorageBytes === 'number' ? body.currentStorageBytes : 0
    const fileSizeBytes = typeof body.fileSizeBytes === 'number' ? body.fileSizeBytes : 0

    // Reject obviously bogus values
    if (currentStorageBytes < 0 || fileSizeBytes < 0) {
      return NextResponse.json({ error: 'Invalid storage values' }, { status: 400 })
    }

    // ─── Server-side plan limit check ──────────────────────────────────
    const plan = await getUserPlan(request)
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
