import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Admin Audit Log API Route
// Queries REAL AuditLog table from Prisma/PostgreSQL — NO fake data

export async function GET(request: NextRequest) {

  try {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20')))
  const actionFilter = url.searchParams.get('action') || ''
  const adminFilter = url.searchParams.get('admin') || ''
  const search = url.searchParams.get('search') || ''
  const dateFrom = url.searchParams.get('dateFrom') || ''
  const dateTo = url.searchParams.get('dateTo') || ''

  try {
    // Build where clause
    const where: Record<string, unknown> = {}

    if (actionFilter) where.action = actionFilter
    if (adminFilter) where.adminEmail = adminFilter
    if (dateFrom || dateTo) {
      const createdAtFilter: Record<string, unknown> = {}
      if (dateFrom) createdAtFilter.gte = new Date(dateFrom)
      if (dateTo) createdAtFilter.lte = new Date(dateTo + 'T23:59:59.999Z')
      where.createdAt = createdAtFilter
    }

    // Get total count and paginated results
    const [total, logs] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    // Apply search filter in-memory (for JSON details search)
    let filtered = logs
    if (search) {
      const lowerSearch = search.toLowerCase()
      filtered = logs.filter(log =>
        log.action.toLowerCase().includes(lowerSearch) ||
        log.adminEmail.toLowerCase().includes(lowerSearch) ||
        (log.targetId && log.targetId.toLowerCase().includes(lowerSearch)) ||
        JSON.stringify(log.details).toLowerCase().includes(lowerSearch)
      )
    }

    // Stats from all logs (limited for performance)
    const allLogs = await db.auditLog.findMany({
      select: { adminEmail: true, action: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const actionsToday = allLogs.filter(l => l.createdAt >= today).length

    // Most active admin
    const adminCounts: Record<string, number> = {}
    allLogs.forEach(l => { adminCounts[l.adminEmail] = (adminCounts[l.adminEmail] || 0) + 1 })
    const mostActiveAdmin = Object.entries(adminCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

    // Most common action
    const actionCounts: Record<string, number> = {}
    allLogs.forEach(l => { actionCounts[l.action] = (actionCounts[l.action] || 0) + 1 })
    const mostCommonAction = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

    // High-risk actions count
    const highRiskActions = ['ban_user', 'impersonate_user', 'delete_user', 'system_shutdown', 'emergency_shutdown', 'revoke_session', 'shadow_ban']
    const highRiskCount = allLogs.filter(l => highRiskActions.includes(l.action)).length

    // Action types list for filter
    const actionTypes = [...new Set(allLogs.map(l => l.action))].sort()
    const adminEmails = [...new Set(allLogs.map(l => l.adminEmail))].sort()

    const formatted = filtered.map(log => ({
      id: log.id,
      adminEmail: log.adminEmail,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
    }))

    return NextResponse.json({
      source: 'live',
      data: {
        logs: formatted,
        total,
        page,
        pageSize,
        hasMore: total > page * pageSize,
        stats: {
          actionsToday,
          mostActiveAdmin,
          mostCommonAction,
          highRiskCount,
        },
        actionTypes,
        adminEmails,
      },
      lastUpdated: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({
      source: 'live',
      data: {
        logs: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
        stats: { actionsToday: 0, mostActiveAdmin: '—', mostCommonAction: '—', highRiskCount: 0 },
        actionTypes: [],
        adminEmails: [],
      },
      error: err instanceof Error ? err.message : 'Unknown error',
      lastUpdated: new Date().toISOString(),
    })
  }

  } catch (error) {

    console.error('[src.app.api.admin.audit] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// ─── POST: Create audit log entry ──────────────────────────────────────
export async function POST(request: NextRequest) {

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

  const { action, targetType, targetId, details, ipAddress, userAgent } = body as {
    action?: string
    targetType?: string
    targetId?: string
    details?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
  }

  if (!action) {
    return NextResponse.json({ error: 'action is required' }, { status: 400 })
  }

  try {
    const log = await db.auditLog.create({
      data: {
        adminEmail: auth.admin?.email || 'unknown',
        action,
        targetType: targetType || 'system',
        targetId: targetId || null,
        details: JSON.stringify(details || {}),
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    })

    return NextResponse.json({ source: 'live', success: true, log }, { status: 201 })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to create audit log',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.audit] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
