import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'

export async function GET(request: Request) {
  // Auth check — activity logs contain admin emails and IPs
  const authResult = await verifyAdminAuth(request)
  if (authResult) return authResult
  try {
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const category = searchParams.get('category') || undefined
    const severity = searchParams.get('severity') || undefined
    const search = searchParams.get('search') || undefined

    const skip = (page - 1) * limit

    // Build where clause - using AuditLog model (maps to admin activity)
    const where: Record<string, unknown> = {}

    if (category) {
      where.targetType = category
    }

    if (severity) {
      where.action = { contains: severity }
    }

    if (search) {
      where.OR = [
        { action: { contains: search } },
        { details: { contains: search } },
        { adminEmail: { contains: search } },
      ]
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ])

    // Map AuditLog to activity format for the frontend
    const mappedLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      category: log.targetType,
      details: log.details,
      severity: log.action.includes('delete') || log.action.includes('ban') ? 'high' : 
                log.action.includes('update') || log.action.includes('create') ? 'medium' : 'low',
      user: {
        id: log.adminEmail,
        name: log.adminEmail,
        email: log.adminEmail,
        role: 'admin',
      },
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
    }))

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      logs: mappedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    })
  } catch (error) {
    console.error('Activity API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    )
  }
}
