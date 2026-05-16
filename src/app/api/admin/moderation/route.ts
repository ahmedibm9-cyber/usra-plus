import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Admin Moderation API Route
// Uses REAL Prisma ModerationItem table — NO fake data

// ─── GET: List moderation queue items ──────────────────────────────
export async function GET(request: NextRequest) {

  try {
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const itemType = searchParams.get('itemType')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))

  try {
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (priority) where.priority = priority
    if (itemType) where.itemType = itemType

    const [total, items] = await Promise.all([
      db.moderationItem.count({ where }),
      db.moderationItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    // Also get fraud alerts (moderation items of type fraud_alert)
    const fraudAlerts = items.filter(i => i.itemType === 'fraud_alert')
    // Get abuse reports (moderation items of type abuse_report)
    const abuseReports = items.filter(i => i.itemType === 'abuse_report')

    // Get active bans
    const bans = await db.userBan.findMany({
      where: { status: { in: ['active', 'appealed'] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Stats
    const pendingCount = await db.moderationItem.count({ where: { status: 'pending' } })
    const escalatedCount = await db.moderationItem.count({ where: { status: 'escalated' } })
    const activeBansCount = await db.userBan.count({ where: { status: 'active' } })
    const appealedBansCount = await db.userBan.count({ where: { status: 'appealed' } })

    const formattedItems = items.map(item => ({
      id: item.id,
      itemType: item.itemType,
      status: item.status,
      priority: item.priority,
      notes: item.notes,
      reportedBy: item.reportedBy,
      assignedTo: item.assignedTo,
      targetId: item.targetId,
      reason: item.reason,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }))

    const formattedFraudAlerts = fraudAlerts.map(item => ({
      id: item.id,
      title: item.reason || 'Fraud Alert',
      alertType: item.itemType,
      severity: item.priority === 'urgent' ? 'critical' as const : item.priority === 'high' ? 'high' as const : 'medium' as const,
      riskScore: item.priority === 'urgent' ? 90 : item.priority === 'high' ? 70 : item.priority === 'medium' ? 40 : 15,
      status: item.status === 'resolved' ? 'resolved' as const : item.status === 'escalated' ? 'investigating' as const : 'new' as const,
      description: item.notes || '',
      createdAt: item.createdAt.toISOString(),
    }))

    const formattedReports = abuseReports.map(item => ({
      id: item.id,
      reportType: item.itemType,
      status: item.status === 'pending' ? 'pending' as const : item.status === 'in_progress' ? 'reviewing' as const : item.status === 'resolved' ? 'actioned' as const : 'escalated' as const,
      priority: item.priority,
      description: item.reason || item.notes || '',
      evidenceUrls: [] as string[],
      createdAt: item.createdAt.toISOString(),
    }))

    const formattedBans = bans.map(ban => ({
      id: ban.id,
      userId: ban.userId,
      banType: ban.banType,
      status: ban.status,
      reason: ban.reason,
      issuedAt: ban.createdAt.toISOString(),
      expiresAt: ban.expiresAt?.toISOString() || null,
      appealText: ban.appealText || null,
      appealSubmittedAt: ban.appealSubmittedAt?.toISOString() || null,
      approvalRequired: ban.approvalRequired,
      approvedBy: ban.approvedBy || null,
    }))

    // Trust scores — derive from bans (simple calculation)
    const allBannedUsers = await db.userBan.findMany({ where: { status: 'active' } })
    const trustScores = allBannedUsers.map(ban => ({
      userId: ban.userId,
      trustScore: ban.banType === 'warning' ? 60 : ban.banType === 'temporary_suspension' ? 30 : ban.banType === 'shadow_ban' ? 20 : 5,
      fraudScore: ban.banType === 'permanent_ban' ? 95 : ban.banType === 'shadow_ban' ? 75 : ban.banType === 'temporary_suspension' ? 55 : 25,
      riskLevel: ban.banType === 'permanent_ban' ? 'critical' as const : ban.banType === 'shadow_ban' ? 'high' as const : ban.banType === 'temporary_suspension' ? 'medium' as const : 'low' as const,
    }))

    return NextResponse.json({
      source: 'live',
      data: {
        items: formattedItems,
        fraudAlerts: formattedFraudAlerts,
        abuseReports: formattedReports,
        bans: formattedBans,
        trustScores,
        stats: {
          pendingCount,
          escalatedCount,
          activeBansCount,
          appealedBansCount,
        },
      },
      total,
      page,
      pageSize,
      hasMore: (page - 1) * pageSize + items.length < total,
    })
  } catch (err) {
    return NextResponse.json({
      source: 'live',
      data: {
        items: [],
        fraudAlerts: [],
        abuseReports: [],
        bans: [],
        trustScores: [],
        stats: { pendingCount: 0, escalatedCount: 0, activeBansCount: 0, appealedBansCount: 0 },
      },
      total: 0,
      page,
      pageSize,
      hasMore: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }

  } catch (error) {

    console.error('[src.app.api.admin.moderation] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// ─── PATCH: Update moderation item (assign, resolve, escalate) ───────────
export async function PATCH(request: NextRequest) {

  try {
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.ADMIN_API)
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

  const { itemId, action, assignedTo, notes, priority } = body as {
    itemId?: string
    action?: 'assign' | 'resolve' | 'escalate'
    assignedTo?: string
    notes?: string
    priority?: string
  }

  if (!itemId || !action) {
    return NextResponse.json({ error: 'itemId and action are required' }, { status: 400 })
  }

  if (!['assign', 'resolve', 'escalate'].includes(action)) {
    return NextResponse.json({ error: 'action must be "assign", "resolve", or "escalate"' }, { status: 400 })
  }

  try {
    const updateData: Record<string, unknown> = {}

    switch (action) {
      case 'assign':
        updateData.assignedTo = assignedTo || auth.admin?.email || 'admin'
        updateData.status = 'in_progress'
        break
      case 'resolve':
        updateData.status = 'resolved'
        break
      case 'escalate':
        updateData.status = 'escalated'
        updateData.priority = 'urgent'
        break
    }

    if (notes) updateData.notes = notes
    if (priority && action !== 'escalate') updateData.priority = priority

    const item = await db.moderationItem.update({
      where: { id: itemId },
      data: updateData,
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        adminEmail: auth.admin?.email || 'unknown',
        action: `moderation_${action}`,
        targetType: 'moderation',
        targetId: itemId,
        details: JSON.stringify({ action, notes, priority }),
      },
    })

    return NextResponse.json({ source: 'live', success: true, item })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to update moderation item',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.moderation] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// ─── POST: Create a new moderation item ────────────────────────────────
export async function POST(request: NextRequest) {

  try {
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.ADMIN_API)
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

  const { itemType, priority, notes, targetId, reason, reportedBy } = body as {
    itemType?: string
    priority?: string
    notes?: string
    targetId?: string
    reason?: string
    reportedBy?: string
  }

  try {
    const item = await db.moderationItem.create({
      data: {
        itemType: itemType || 'content_flag',
        priority: priority || 'medium',
        notes: notes || null,
        targetId: targetId || null,
        reason: reason || null,
        reportedBy: reportedBy || auth.admin?.email || null,
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        adminEmail: auth.admin?.email || 'unknown',
        action: 'moderation_created',
        targetType: 'moderation',
        targetId: item.id,
        details: JSON.stringify({ itemType, reason }),
      },
    })

    return NextResponse.json({ source: 'live', success: true, item }, { status: 201 })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to create moderation item',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.moderation] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
