import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { startOfDay } from 'date-fns'
import { verifyAdminAuth } from '@/lib/admin-auth'

export async function GET(request: Request) {
  // Auth check — stats contain sensitive platform data
  const authResult = await verifyAdminAuth(request)
  if (authResult) return authResult
  try {
    const now = new Date()
    const todayStart = startOfDay(now)

    // User stats — using only existing User model fields
    const [totalUsers, newUsersToday] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { createdAt: { gte: todayStart } } }),
    ])

    // Active sessions (expiresAt > now means session is still valid)
    const activeSessions = await db.session.findMany({
      where: { expiresAt: { gt: now } },
      select: { userId: true },
      distinct: ['userId'],
    })
    const activeUsersLast24h = activeSessions.length

    // Family stats
    const totalFamilies = await db.family.count()

    // Subscription plan distribution from UserSubscription
    const subscriptions = await db.userSubscription.findMany({
      select: { plan: true, status: true },
    })

    const planDistribution: Record<string, number> = {
      free: 0,
      pro: 0,
      family_plus: 0,
    }
    for (const sub of subscriptions) {
      const plan = sub.plan || 'free'
      if (planDistribution[plan] !== undefined) {
        planDistribution[plan]++
      }
    }

    // Count users without subscriptions as "free"
    const usersWithoutSub = totalUsers - subscriptions.length
    planDistribution.free += Math.max(0, usersWithoutSub)

    // MRR calculation from subscriptions (using plan prices: free=0, pro=4.99, family_plus=9.99)
    const planPricing: Record<string, number> = {
      free: 0,
      pro: 4.99,
      family_plus: 9.99,
    }

    const monthlyRevenue = subscriptions
      .filter(s => s.status === 'active' || !s.status)
      .reduce((sum, s) => sum + (planPricing[s.plan] || 0), 0)

    // Session stats
    const totalSessions = await db.session.count()

    return NextResponse.json({
      users: {
        total: totalUsers,
        activeLast24h: activeUsersLast24h,
        newToday: newUsersToday,
      },
      sessions: {
        total: totalSessions,
        active: activeSessions.length,
      },
      families: {
        total: totalFamilies,
      },
      revenue: {
        thisMonth: Math.round(monthlyRevenue * 100) / 100,
      },
      planDistribution,
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
