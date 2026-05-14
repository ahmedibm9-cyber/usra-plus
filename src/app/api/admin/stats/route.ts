import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { subHours, startOfDay } from 'date-fns'

export async function GET() {
  try {
    const now = new Date()
    const last24h = subHours(now, 24)
    const todayStart = startOfDay(now)

    // User stats
    const [totalUsers, activeUsersLast24h, newUsersToday] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { lastLoginAt: { gte: last24h } } }),
      db.user.count({ where: { createdAt: { gte: todayStart } } }),
    ])

    // Device stats
    const [totalDevices, activeDevices] = await Promise.all([
      db.device.count(),
      db.device.count({ where: { isActive: true, lastSeenAt: { gte: last24h } } }),
    ])

    // Alert stats
    const [totalAlerts, criticalAlerts] = await Promise.all([
      db.activityLog.count({ where: { category: 'alert' } }),
      db.activityLog.count({ where: { severity: 'critical' } }),
    ])

    // Plan distribution
    const subscriptions = await db.subscription.findMany({
      select: { plan: true },
    })

    const planDistribution: Record<string, number> = {
      free: 0,
      basic: 0,
      premium: 0,
      enterprise: 0,
    }
    for (const sub of subscriptions) {
      if (planDistribution[sub.plan] !== undefined) {
        planDistribution[sub.plan]++
      }
    }

    // Also count users without subscriptions as "free"
    const usersWithoutSub = totalUsers - subscriptions.length
    planDistribution.free += usersWithoutSub

    // Revenue this month — derive from subscriptions
    const planPricing: Record<string, number> = {
      free: 0,
      basic: 9.99,
      premium: 19.99,
      enterprise: 49.99,
    }

    const monthlyRevenue = subscriptions
      .filter(s => s.plan !== 'free')
      .reduce((sum, s) => sum + (planPricing[s.plan] || 0), 0)

    // Activity breakdown by category
    const activityByCategory = await db.activityLog.groupBy({
      by: ['category'],
      _count: { category: true },
    })

    const activityBreakdown: Record<string, number> = {}
    for (const entry of activityByCategory) {
      activityBreakdown[entry.category] = entry._count.category
    }

    return NextResponse.json({
      users: {
        total: totalUsers,
        activeLast24h: activeUsersLast24h,
        newToday: newUsersToday,
      },
      devices: {
        total: totalDevices,
        active: activeDevices,
      },
      alerts: {
        total: totalAlerts,
        critical: criticalAlerts,
      },
      revenue: {
        thisMonth: Math.round(monthlyRevenue * 100) / 100,
      },
      planDistribution,
      activityBreakdown,
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
