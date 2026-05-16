import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { db } from '@/lib/db'

// Admin Analytics API Route
// Queries REAL data from Prisma/PostgreSQL
// Returns aggregate counts only — no personal content
// Pre-launch mode: shows actual counts (which may be 0), NO fake data

function getEmptyAnalytics() {
  return {
    users: { total: 0, newThisMonth: 0, active: 0, dailyActive: 0, monthlyActive: 0 },
    families: { total: 0, avgSize: 0, active: 0 },
    tasks: { created: 0, completed: 0, completionRate: 0 },
    groceries: { itemsTracked: 0, completedLists: 0 },
    subscriptions: { mrr: 0, arr: 0, free: 0, pro: 0, familyPlus: 0, max: 0, ultimate: 0, conversionRate: 0 },
    chat: { totalMessages: 0 },
    sessions: { total: 0, active: 0 },
    preLaunch: true,
  }
}

export async function GET(request: NextRequest) {

  try {
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // ─── Users from Prisma ─────────────────────────────────────────────
    const totalUsers = await db.user.count()

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const newThisMonth = await db.user.count({
      where: { createdAt: { gte: startOfMonth } },
    })

    // Monthly active: users with non-expired sessions
    const now = new Date()
    const activeSessionUsers = await db.session.findMany({
      where: { expiresAt: { gt: now } },
      select: { userId: true },
      distinct: ['userId'],
    })
    const monthlyActive = activeSessionUsers.length

    // ─── Sessions from Prisma ──────────────────────────────────────────
    const totalSessions = await db.session.count()
    const activeSessions = await db.session.count({
      where: { expiresAt: { gt: now } },
    })

    // ─── Verified users ────────────────────────────────────────────────
    const verifiedUsers = await db.user.count({
      where: { emailVerified: true },
    })

    // ─── Language distribution ─────────────────────────────────────────
    const usersWithLang = await db.user.findMany({
      select: { language: true },
    })
    const langCounts: Record<string, number> = {}
    for (const u of usersWithLang) {
      langCounts[u.language] = (langCounts[u.language] || 0) + 1
    }

    // ─── Country distribution ─────────────────────────────────────────
    const usersWithCountry = await db.user.findMany({
      select: { countryCode: true },
    })
    const countryCounts: Record<string, number> = {}
    for (const u of usersWithCountry) {
      if (u.countryCode) {
        countryCounts[u.countryCode] = (countryCounts[u.countryCode] || 0) + 1
      }
    }

    const result = {
      users: {
        total: totalUsers,
        newThisMonth,
        active: monthlyActive,
        dailyActive: 0, // Would need real-time session tracking
        monthlyActive,
        verified: verifiedUsers,
        unverified: totalUsers - verifiedUsers,
        languages: langCounts,
        countries: countryCounts,
      },
      families: {
        total: 0, // No Family model in Prisma
        avgSize: 0,
        active: 0,
      },
      tasks: {
        created: 0, // No Task model in Prisma
        completed: 0,
        completionRate: 0,
      },
      groceries: {
        itemsTracked: 0, // No Grocery model in Prisma
        completedLists: 0,
      },
      subscriptions: {
        mrr: 0, // No Subscription model in Prisma
        arr: 0,
        free: totalUsers,
        pro: 0,
        familyPlus: 0,
        max: 0,
        ultimate: 0,
        conversionRate: 0,
      },
      chat: {
        totalMessages: 0, // No Chat model in Prisma
      },
      sessions: {
        total: totalSessions,
        active: activeSessions,
      },
      preLaunch: totalUsers === 0,
    }

    return NextResponse.json({
      source: 'live' as const,
      data: result,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Admin Analytics API] Error:', error)
    return NextResponse.json({
      source: 'live' as const,
      data: getEmptyAnalytics(),
      lastUpdated: new Date().toISOString(),
    })
  }

  } catch (error) {

    console.error('[src.app.api.admin.analytics] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
