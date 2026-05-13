import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Admin Errors API Route
// Uses REAL Prisma data (ModerationItem with content_flag type for error logs)

export async function GET(request: NextRequest) {

  try {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

  try {
    // Get recent audit logs as error-like entries (for the errors page)
    const errorLogs = await db.auditLog.findMany({
      where: {
        action: { in: ['bug_report_created', 'moderation_escalated', 'ban_user'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const formatted = errorLogs.map(log => ({
      id: log.id,
      level: log.action === 'ban_user' ? 'critical' : log.action === 'moderation_escalated' ? 'warning' : 'info',
      source: 'server',
      error_type: log.action,
      message: `Admin action: ${log.action}`,
      stack_trace: null,
      url: null,
      user_id: log.targetId,
      occurrence_count: 1,
      first_seen_at: log.createdAt.toISOString(),
      last_seen_at: log.createdAt.toISOString(),
      resolved: log.action === 'moderation_resolved',
      created_at: log.createdAt.toISOString(),
    }))

    return NextResponse.json({
      source: 'live',
      data: formatted,
      total: formatted.length,
    })
  } catch (err) {
    return NextResponse.json({
      source: 'live',
      data: [],
      total: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }

  } catch (error) {

    console.error('[src.app.api.admin.errors] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// ─── PATCH: Mark error as resolved ───────────────────────────────────
export async function PATCH(request: NextRequest) {

  try {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { errorId } = body as { errorId?: string }
  if (!errorId) {
    return NextResponse.json({ error: 'errorId is required' }, { status: 400 })
  }

  try {
    // Update the corresponding audit log with resolved status
    const log = await db.auditLog.update({
      where: { id: errorId },
      data: {
        details: JSON.stringify({ resolved: true, resolvedBy: auth.admin?.email }),
      },
    })

    return NextResponse.json({ source: 'live', success: true, entry: log })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to resolve error',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.errors] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
