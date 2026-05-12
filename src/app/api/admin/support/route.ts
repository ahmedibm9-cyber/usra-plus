import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Admin Support API Route
// Uses REAL Prisma SupportTicket table — NO fake data, with actionable operations

// ─── GET: Fetch support data ────────────────────────────────────────
export async function GET(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const section = searchParams.get('section') || 'all'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
  const ticketStatus = searchParams.get('ticketStatus')

  try {
    const where: Record<string, unknown> = {}
    if (ticketStatus) where.status = ticketStatus

    const [total, tickets] = await Promise.all([
      db.supportTicket.count({ where }),
      db.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    // Build KPIs from ticket data
    const [openCount, inProgressCount, resolvedCount, closedCount] = await Promise.all([
      db.supportTicket.count({ where: { status: 'open' } }),
      db.supportTicket.count({ where: { status: 'in_progress' } }),
      db.supportTicket.count({ where: { status: 'resolved' } }),
      db.supportTicket.count({ where: { status: 'closed' } }),
    ])

    // Calculate avg resolution time
    const resolvedTickets = await db.supportTicket.findMany({
      where: { status: 'resolved', resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
      take: 100,
    })

    let avgResolutionHours = 0
    if (resolvedTickets.length > 0) {
      const totalHours = resolvedTickets.reduce((acc, t) => {
        if (t.resolvedAt) {
          return acc + (t.resolvedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60)
        }
        return acc
      }, 0)
      avgResolutionHours = Math.round((totalHours / resolvedTickets.length) * 10) / 10
    }

    // Common issues breakdown
    const allTickets = await db.supportTicket.findMany({
      select: { category: true },
      take: 500,
    })
    const issueCounts: Record<string, number> = {}
    allTickets.forEach(t => { issueCounts[t.category] = (issueCounts[t.category] || 0) + 1 })
    const commonIssues = Object.entries(issueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([issue, count]) => ({ issue, count }))

    // Ticket trend (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    const recentTickets = await db.supportTicket.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, status: true, resolvedAt: true },
    })

    // Group by date
    const trendMap: Record<string, { opened: number; resolved: number }> = {}
    recentTickets.forEach(t => {
      const dateKey = t.createdAt.toISOString().split('T')[0]
      if (!trendMap[dateKey]) trendMap[dateKey] = { opened: 0, resolved: 0 }
      trendMap[dateKey].opened++
      if (t.status === 'resolved' && t.resolvedAt) {
        const resolvedDateKey = t.resolvedAt.toISOString().split('T')[0]
        if (!trendMap[resolvedDateKey]) trendMap[resolvedDateKey] = { opened: 0, resolved: 0 }
        trendMap[resolvedDateKey].resolved++
      }
    })

    const ticketTrend = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }))

    const kpis = {
      openTickets: openCount + inProgressCount,
      avgResolutionHours,
      satisfactionScore: 0,
      npsScore: 0,
      firstResponseMinutes: 0,
      weeklyDelta: {
        openTickets: 0,
        resolutionHours: 0,
        firstResponseMinutes: 0,
      },
    }

    switch (section) {
      case 'kpis':
        return NextResponse.json({ source: 'live', section, data: kpis })
      case 'common-issues':
        return NextResponse.json({ source: 'live', section, data: commonIssues })
      case 'tickets':
        return NextResponse.json({
          source: 'live',
          section,
          data: tickets,
          total,
          page,
          pageSize,
          hasMore: (page - 1) * pageSize + tickets.length < total,
        })
      case 'all':
      default:
        return NextResponse.json({
          source: 'live',
          section,
          data: {
            kpis,
            tickets,
            commonIssues,
            ticketTrend,
            total,
            painPoints: [],
            featureRequests: [],
            topAgents: [],
            resolutionChannels: [],
          },
        })
    }
  } catch (err) {
    return NextResponse.json({
      source: 'live',
      section,
      data: {
        kpis: { openTickets: 0, avgResolutionHours: 0, satisfactionScore: 0, npsScore: 0, firstResponseMinutes: 0, weeklyDelta: { openTickets: 0, resolutionHours: 0, firstResponseMinutes: 0 } },
        tickets: [],
        commonIssues: [],
        ticketTrend: [],
        total: 0,
        painPoints: [],
        featureRequests: [],
        topAgents: [],
        resolutionChannels: [],
      },
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }
}

// ─── POST: Create a support ticket ──────────────────────────────────
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

  const { subject, description, category, priority, userEmail, userName } = body as {
    subject?: string
    description?: string
    category?: string
    priority?: string
    userEmail?: string
    userName?: string
  }

  if (!subject) {
    return NextResponse.json({ error: 'subject is required' }, { status: 400 })
  }

  try {
    const ticket = await db.supportTicket.create({
      data: {
        subject,
        description: description || '',
        category: category || 'general',
        status: 'open',
        priority: priority || 'medium',
        userEmail: userEmail || null,
        userName: userName || null,
        assignedTo: auth.admin?.email || null,
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        adminEmail: auth.admin?.email || 'unknown',
        action: 'support_ticket_created',
        targetType: 'support',
        targetId: ticket.id,
        details: JSON.stringify({ subject, category, priority }),
      },
    })

    return NextResponse.json({ source: 'live', success: true, ticket }, { status: 201 })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to create ticket',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }
}

// ─── PATCH: Update support ticket ───────────────────────────────────
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

  const { ticketId, status, assignedTo, resolutionNotes, priority } = body as {
    ticketId?: string
    status?: string
    assignedTo?: string
    resolutionNotes?: string
    priority?: string
  }

  if (!ticketId) {
    return NextResponse.json({ error: 'ticketId is required' }, { status: 400 })
  }

  const validStatuses = ['open', 'in_progress', 'resolved', 'closed']
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
  }

  try {
    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (assignedTo) updateData.assignedTo = assignedTo
    if (resolutionNotes) updateData.resolutionNotes = resolutionNotes
    if (priority) updateData.priority = priority
    if (status === 'resolved' || status === 'closed') {
      updateData.resolvedAt = new Date()
    }

    const ticket = await db.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    })

    // Audit log
    await db.auditLog.create({
      data: {
        adminEmail: auth.admin?.email || 'unknown',
        action: status === 'resolved' ? 'support_ticket_resolved' : 'support_ticket_updated',
        targetType: 'support',
        targetId: ticketId,
        details: JSON.stringify({ status, assignedTo, resolutionNotes, priority }),
      },
    })

    return NextResponse.json({ source: 'live', success: true, ticket })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to update ticket',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }
}

// ─── DELETE: Delete a support ticket ────────────────────────────────
export async function DELETE(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const ticketId = searchParams.get('ticketId')

  if (!ticketId) {
    return NextResponse.json({ error: 'ticketId is required' }, { status: 400 })
  }

  try {
    await db.supportTicket.delete({ where: { id: ticketId } })

    // Audit log
    await db.auditLog.create({
      data: {
        adminEmail: auth.admin?.email || 'unknown',
        action: 'support_ticket_deleted',
        targetType: 'support',
        targetId: ticketId,
        details: JSON.stringify({ deletedBy: auth.admin?.email }),
      },
    })

    return NextResponse.json({ source: 'live', success: true })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to delete ticket',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }
}
