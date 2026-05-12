import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { db } from '@/lib/db'

// Admin Features API Route
// Queries REAL data from Prisma/PostgreSQL
// Since the app is pre-launch and has no feature tracking tables,
// returns what we CAN measure (user counts, session counts) plus a clear pre-launch state
// NO fake data

export async function GET(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data: Record<string, unknown> = {}

    // ─── What we CAN measure from existing Prisma models ───────────────
    const totalUsers = await db.user.count()
    const totalSessions = await db.session.count()

    // Users created in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentUsers = await db.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    })

    // Active sessions (not expired)
    const now = new Date()
    const activeSessions = await db.session.count({
      where: { expiresAt: { gt: now } },
    })

    // Sessions in last 7 days (proxy for "activity")
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const weeklySessions = await db.session.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    })

    // Verified vs unverified
    const verifiedUsers = await db.user.count({
      where: { emailVerified: true },
    })

    data.summary = {
      totalUsers,
      totalSessions,
      activeSessions,
      recentUsers,
      weeklySessions,
      verifiedUsers,
      unverifiedUsers: totalUsers - verifiedUsers,
    }

    // ─── Feature tracking data: NOT available in current schema ─────────
    // The Prisma schema only has User and Session models.
    // Feature-specific tables (tasks, groceries, chat_messages, etc.)
    // do not exist in the local database.
    // We return null for these to indicate "not tracked" rather than 0.

    data.tasks = null
    data.groceries = null
    data.chat = null
    data.calendar = null
    data.invites = null

    data.featureTrackingAvailable = false
    data.preLaunch = totalUsers === 0
    data.message = totalUsers === 0
      ? 'The platform has not launched yet. Feature usage data will appear here once users begin interacting with the application.'
      : 'Feature tracking tables are not yet in the database schema. Only user and session metrics are available. Feature-level analytics (tasks, groceries, chat, calendar) will be available after the corresponding models are added to the database.'

    return NextResponse.json({
      source: 'live' as const,
      data,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Admin Features API] Error:', error)
    return NextResponse.json({
      source: 'live' as const,
      data: null,
      lastUpdated: new Date().toISOString(),
      message: 'Failed to query database for feature data.',
    })
  }
}
