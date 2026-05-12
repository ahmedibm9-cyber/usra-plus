import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { db } from '@/lib/db'

// Generic Data Export API
// Supports: users, families, revenue, sessions, audit-logs
// Formats: json, csv

function toCSV(headers: string[], rows: Record<string, unknown>[]): string {
  const headerLine = headers.map(h => `"${h}"`).join(',')
  const dataLines = rows.map(row =>
    headers.map(h => {
      const val = row[h]
      if (val === null || val === undefined) return '""'
      if (typeof val === 'boolean') return val ? '"true"' : '"false"'
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    }).join(',')
  )
  return [headerLine, ...dataLines].join('\n')
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (auth.admin?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden - super_admin only' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'json'
  const type = searchParams.get('type') || 'users'
  const limit = Math.min(10000, Math.max(1, parseInt(searchParams.get('limit') || '5000', 10)))

  if (format !== 'json' && format !== 'csv') {
    return NextResponse.json({ error: 'format must be json or csv' }, { status: 400 })
  }

  const validTypes = ['users', 'families', 'revenue', 'sessions', 'audit-logs']
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: `type must be one of: ${validTypes.join(', ')}` }, { status: 400 })
  }

  try {
    let data: Record<string, unknown>[] = []
    let headers: string[] = []

    switch (type) {
      case 'users': {
        const users = await db.user.findMany({
          select: {
            id: true, email: true, firstName: true, lastName: true,
            phone: true, countryCode: true, language: true, theme: true,
            emailVerified: true, createdAt: true, updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        })
        headers = ['id', 'email', 'firstName', 'lastName', 'phone', 'countryCode', 'language', 'theme', 'emailVerified', 'createdAt', 'updatedAt']
        data = users.map(u => ({
          ...u,
          emailVerified: u.emailVerified,
          createdAt: u.createdAt.toISOString(),
          updatedAt: u.updatedAt.toISOString(),
        }))
        break
      }

      case 'families': {
        const families = await db.family.findMany({
          include: { _count: { select: { members: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
        })
        headers = ['id', 'name', 'description', 'inviteCode', 'color', 'createdBy', 'memberCount', 'createdAt', 'updatedAt']
        data = families.map(f => ({
          id: f.id,
          name: f.name,
          description: f.description || '',
          inviteCode: f.inviteCode,
          color: f.color,
          createdBy: f.createdBy,
          memberCount: f._count.members,
          createdAt: f.createdAt.toISOString(),
          updatedAt: f.updatedAt.toISOString(),
        }))
        break
      }

      case 'revenue': {
        const transactions = await db.revenueTransaction.findMany({
          orderBy: { createdAt: 'desc' },
          take: limit,
        })
        headers = ['id', 'userId', 'type', 'amount', 'currency', 'status', 'description', 'createdAt']
        data = transactions.map(t => ({
          id: t.id,
          userId: t.userId || '',
          type: t.type,
          amount: Number(t.amount),
          currency: t.currency,
          status: t.status,
          description: t.description || '',
          createdAt: t.createdAt.toISOString(),
        }))
        break
      }

      case 'sessions': {
        const sessions = await db.session.findMany({
          include: { user: { select: { email: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
        })
        headers = ['id', 'userId', 'userEmail', 'userName', 'createdAt', 'expiresAt']
        data = sessions.map(s => ({
          id: s.id,
          userId: s.userId,
          userEmail: s.user?.email || '',
          userName: `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim(),
          createdAt: s.createdAt.toISOString(),
          expiresAt: s.expiresAt.toISOString(),
        }))
        break
      }

      case 'audit-logs': {
        const logs = await db.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: limit,
        })
        headers = ['id', 'adminEmail', 'action', 'targetType', 'targetId', 'ipAddress', 'createdAt']
        data = logs.map(l => ({
          id: l.id,
          adminEmail: l.adminEmail,
          action: l.action,
          targetType: l.targetType,
          targetId: l.targetId || '',
          ipAddress: l.ipAddress || '',
          details: l.details,
          createdAt: l.createdAt.toISOString(),
        }))
        break
      }
    }

    if (format === 'csv') {
      const csv = data.length > 0 ? toCSV(headers, data) : ''
      return NextResponse.json({
        source: 'live',
        format: 'csv',
        type,
        data: csv,
        count: data.length,
        exported_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      source: 'live',
      format: 'json',
      type,
      data,
      count: data.length,
      exported_at: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({
      source: 'live',
      error: `Failed to export ${type}`,
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }
}
