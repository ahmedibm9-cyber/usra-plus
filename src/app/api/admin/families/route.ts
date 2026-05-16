import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { db } from '@/lib/db'

// Admin Families API Route
// Queries REAL Family and FamilyMember tables from Prisma

export async function GET(request: NextRequest) {

  try {
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))

  try {
    const [families, total] = await Promise.all([
      db.family.findMany({
        include: {
          _count: { select: { members: true } },
          members: {
            select: { userId: true, role: true },
            take: 1,
            orderBy: { joinedAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.family.count(),
    ])

    const data = families.map(f => ({
      id: f.id,
      name: f.name,
      description: f.description,
      inviteCode: f.inviteCode,
      color: f.color,
      createdBy: f.createdBy,
      member_count: f._count.members,
      plan: 'free',
      tasks_completed_count: 0,
      last_active: f.updatedAt.toISOString(),
      activity_score: Math.min(f._count.members * 25, 100),
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      source: 'live' as const,
      data,
      total,
      page,
      pageSize,
      hasMore: (page - 1) * pageSize + pageSize < total,
    })
  } catch (err) {
    return NextResponse.json({
      source: 'live' as const,
      data: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }

  } catch (error) {

    console.error('[src.app.api.admin.families] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
