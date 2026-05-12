import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Admin Bans API Route
// Uses REAL Prisma UserBan table

// ─── GET: List all bans ──────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const banType = searchParams.get('banType')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))

  try {
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (banType) where.banType = banType

    const [total, data] = await Promise.all([
      db.userBan.count({ where }),
      db.userBan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return NextResponse.json({
      source: 'live',
      data,
      total,
      page,
      pageSize,
      hasMore: (page - 1) * pageSize + data.length < total,
    })
  } catch (err) {
    return NextResponse.json({
      source: 'live',
      data: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }
}

// ─── POST: Issue a new ban ───────────────────────────────────────────
export async function POST(request: NextRequest) {
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

  const { userId, banType, reason, durationHours } = body as {
    userId?: string
    banType?: string
    reason?: string
    durationHours?: number
  }

  if (!userId || !banType || !reason) {
    return NextResponse.json({ error: 'userId, banType, and reason are required' }, { status: 400 })
  }

  const validBanTypes = ['warning', 'temporary_suspension', 'shadow_ban', 'permanent_ban']
  if (!validBanTypes.includes(banType)) {
    return NextResponse.json({ error: `banType must be one of: ${validBanTypes.join(', ')}` }, { status: 400 })
  }

  const approvalRequired = banType === 'permanent_ban'
  let expiresAt: Date | null = null
  if (banType === 'temporary_suspension' && durationHours) {
    expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000)
  }

  try {
    const ban = await db.userBan.create({
      data: {
        userId,
        banType,
        reason,
        issuedBy: auth.admin?.email || null,
        expiresAt,
        approvalRequired,
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        adminEmail: auth.admin?.email || 'unknown',
        action: 'ban_user',
        targetType: 'user',
        targetId: userId,
        details: JSON.stringify({ banType, reason, durationHours, approvalRequired }),
      },
    })

    const response: Record<string, unknown> = { source: 'live', success: true, ban }
    if (approvalRequired) {
      response.message = 'Permanent ban requires super_admin approval before taking effect'
      response.approvalRequired = true
    }

    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to issue ban',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }
}

// ─── PATCH: Update ban (approve, revoke, resolve appeal) ─────────────
export async function PATCH(request: NextRequest) {
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

  const { banId, action, revokeReason } = body as {
    banId?: string
    action?: 'approve' | 'revoke' | 'resolve_appeal'
    revokeReason?: string
  }

  if (!banId || !action) {
    return NextResponse.json({ error: 'banId and action are required' }, { status: 400 })
  }

  if (!['approve', 'revoke', 'resolve_appeal'].includes(action)) {
    return NextResponse.json({ error: 'action must be "approve", "revoke", or "resolve_appeal"' }, { status: 400 })
  }

  try {
    // Verify the ban exists
    const existing = await db.userBan.findUnique({ where: { id: banId } })
    if (!existing) {
      return NextResponse.json({ error: 'Ban not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    const now = new Date()

    switch (action) {
      case 'approve':
        if (auth.admin?.role !== 'super_admin') {
          return NextResponse.json({ error: 'Only super_admin can approve bans' }, { status: 403 })
        }
        updateData.approvalRequired = false
        updateData.approvedBy = auth.admin?.email || null
        break
      case 'revoke':
        updateData.status = 'revoked'
        updateData.revokedBy = auth.admin?.email || null
        updateData.revokeReason = revokeReason || null
        break
      case 'resolve_appeal':
        updateData.status = 'upheld'
        break
    }

    const ban = await db.userBan.update({
      where: { id: banId },
      data: updateData,
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        adminEmail: auth.admin?.email || 'unknown',
        action: action === 'revoke' ? 'unban_user' : `ban_${action}`,
        targetType: 'user',
        targetId: ban.userId,
        details: JSON.stringify({ action, revokeReason }),
      },
    })

    return NextResponse.json({ source: 'live', success: true, ban })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to update ban',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }
}
