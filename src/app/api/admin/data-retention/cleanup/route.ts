/**
 * Data Retention Cleanup API Route
 *
 * POST /api/admin/data-retention/cleanup
 * Triggers the data retention cleanup process.
 * Admin-only endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Auth check
  const authResult = verifyAdminAuth(request)
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  try {
    // Dynamically import to avoid loading data-retention module unless needed
    const { cleanupExpiredData } = await import('@/lib/data-retention')
    const result = await cleanupExpiredData()

    return NextResponse.json({
      success: true,
      message: 'Data retention cleanup completed',
      result,
    })
  } catch (error) {
    console.error('[Data Retention Cleanup] Error:', error)
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 },
    )
  }
}
