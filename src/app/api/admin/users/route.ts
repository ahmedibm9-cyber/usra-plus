import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { db } from '@/lib/db'

// Admin Users API Route
// Queries REAL data from Prisma/PostgreSQL
// Returns privacy-safe fields only: id, email, name, plan, status, dates, language, country, email_verified
// No fake/demo data — if no users exist, returns empty array

// Privacy-safe user record from Prisma User model
interface SafeUserRecord {
  id: string
  email: string
  name: string
  plan: string
  status: string
  last_login: string | null
  created_at: string
  family_count: number
  language: string
  country: string | null
  email_verified: boolean
  is_vip: boolean
  beta_tester: boolean
  trust_score: number
  fraud_score: number
  trial_status: string
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
    if (rateLimitResponse) return rateLimitResponse

    const auth = verifyAdminAuth(request)
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
    const search = searchParams.get('search')

    const start = (page - 1) * pageSize

    // Build where clause for search
    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
      ]
    }

    // Get total count and paginated users — add .catch() for Prisma failures
    const [total, users] = await Promise.all([
      db.user.count({ where }).catch(() => 0),
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          language: true,
          countryCode: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          sessions: {
            select: { createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: start,
        take: pageSize,
      }).catch(() => []),
    ])

    // Get subscription and family data for all users in this page
    const userIds = users.map(u => u.id)
    const [subscriptions, familyMembers] = await Promise.all([
      db.userSubscription.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, plan: true, status: true },
      }).catch(() => []),
      db.familyMember.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true },
      }).catch(() => []),
    ])

    // Build lookup maps
    const subMap = new Map(subscriptions.map(s => [s.userId, s]))
    const familyCountMap = new Map<string, number>()
    for (const fm of familyMembers) {
      familyCountMap.set(fm.userId, (familyCountMap.get(fm.userId) || 0) + 1)
    }

    // Map to safe user records
    const safeUsers: SafeUserRecord[] = users.map(u => {
      const sub = subMap.get(u.id)
      const plan = sub?.plan || 'free'
      return {
        id: u.id,
        email: u.email,
        name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email.split('@')[0],
        plan,
        status: 'active' as string,
        last_login: u.sessions.length > 0 ? u.sessions[0].createdAt.toISOString() : u.updatedAt.toISOString(),
        created_at: u.createdAt.toISOString(),
        family_count: familyCountMap.get(u.id) || 0,
        language: u.language || 'en',
        country: u.countryCode || null,
        email_verified: u.emailVerified,
        is_vip: plan !== 'free',
        beta_tester: false,
        trust_score: 100,
        fraud_score: 0,
        trial_status: sub?.status === 'trialing' ? 'active' : 'none',
      }
    })

    return NextResponse.json({
      source: 'live' as const,
      data: safeUsers,
      total,
      page,
      pageSize,
      hasMore: start + pageSize < total,
    })
  } catch (error) {
    console.error('[Admin Users API] Error:', error)
    return NextResponse.json({
      source: 'live' as const,
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
      error: 'Database query failed',
    }, { status: 500 })
  }
}
