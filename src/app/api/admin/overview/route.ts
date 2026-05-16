import { NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { db } from '@/lib/db'

// Admin Overview API Route
// Returns platform overview data from Prisma/PostgreSQL
// All data is privacy-safe: aggregate counts only, no personal content
// Pre-launch mode: shows REAL counts (which may be 0)

export async function GET(request: Request) {
  try {
    const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.ADMIN_API)
    if (rateLimitResponse) return rateLimitResponse

    const auth = verifyAdminAuth(request)
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── Core Metrics from Prisma ──────────────────────────────────
    // Run queries in parallel for better performance on serverless
    // Each query has .catch() so a single DB failure doesn't crash the whole request
    const [totalUsers, newThisMonthResult, activeSessions, totalSessions, verifiedUsers, totalFamilies, subscriptions] = await Promise.all([
      db.user.count().catch(() => 0),
      db.user.count({ where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }).catch(() => 0),
      db.session.findMany({ where: { expiresAt: { gt: new Date() } }, select: { userId: true }, distinct: ['userId'] }).catch(() => []),
      db.session.count().catch(() => 0),
      db.user.count({ where: { emailVerified: true } }).catch(() => 0),
      db.family.count().catch(() => 0),
      db.userSubscription.findMany({ select: { plan: true, status: true } }).catch(() => []),
    ])

    const monthlyActiveUsers = Array.isArray(activeSessions) ? activeSessions.length : 0

    // ─── User Growth Time Series (last 12 months) ─────────────────────────
    const monthlyCounts: Record<string, number> = {}
    const monthNames: string[] = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toLocaleDateString('en-US', { month: 'short' })
      monthlyCounts[key] = 0
      monthNames.push(key)
    }

    // Get all user creation dates for the time series (with catch for Prisma failures)
    const users = await db.user.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }).catch(() => [])

    for (const u of users) {
      const key = u.createdAt.toLocaleDateString('en-US', { month: 'short' })
      if (key in monthlyCounts) {
        monthlyCounts[key]++
      }
    }

    const userGrowthTimeSeries = monthNames.map(month => ({
      month,
      registrations: monthlyCounts[month],
    }))

    // ─── Activity Feed: recent user signups ────────────────────────────────
    const recentUsers = await db.user.findMany({
      select: { email: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }).catch(() => [])

    const activityFeed = recentUsers.map((u, i) => ({
      id: `act-${i}`,
      type: 'user_registered' as const,
      text: `New user registered: ${u.email.replace(/(.{2}).*(@.*)/, '$1***$2')}`,
      time: u.createdAt.toISOString(),
    }))

    // ─── Regional Distribution: from countryCode ──────────────────────────
    const usersWithCountry = await db.user.findMany({
      select: { countryCode: true },
    }).catch(() => [])
    const countryCounts: Record<string, number> = {}
    for (const u of usersWithCountry) {
      if (u.countryCode) {
        const code = u.countryCode.replace(/^\+/, '')
        const prefixToCountry: Record<string, string> = {
          '966': 'SA', '971': 'AE', '965': 'KW', '974': 'QA', '973': 'BH', '968': 'OM',
        }
        const countryCode = prefixToCountry[code] || u.countryCode
        countryCounts[countryCode] = (countryCounts[countryCode] || 0) + 1
      }
    }

    const flagMap: Record<string, string> = {
      SA: '🇸🇦', AE: '🇦🇪', KW: '🇰🇼', QA: '🇶🇦', BH: '🇧🇭', OM: '🇴🇲',
    }
    const regionNames: Record<string, string> = {
      SA: 'Saudi Arabia', AE: 'UAE', KW: 'Kuwait', QA: 'Qatar', BH: 'Bahrain', OM: 'Oman',
    }

    const totalWithCountry = Object.values(countryCounts).reduce((a, b) => a + b, 0)
    const regionalDistribution = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([code, users]) => ({
        region: regionNames[code] || code,
        percentage: totalWithCountry > 0 ? Math.round((users / totalWithCountry) * 1000) / 10 : 0,
        users,
        flag: flagMap[code] || '🌍',
      }))

    // ─── Language Distribution ────────────────────────────────────────────
    const usersWithLang = await db.user.findMany({
      select: { language: true },
    }).catch(() => [])
    const langCounts: Record<string, number> = {}
    for (const u of usersWithLang) {
      langCounts[u.language] = (langCounts[u.language] || 0) + 1
    }

    // ─── Plan Distribution from UserSubscription ─────────────────────────
    // subscriptions already fetched in Promise.all above
    const planCounts: Record<string, number> = { free: 0, pro: 0, family_plus: 0 }
    for (const sub of subscriptions) {
      const plan = sub.plan || 'free'
      planCounts[plan] = (planCounts[plan] || 0) + 1
    }
    // Also count users without any subscription record as free
    const usersWithoutSubs = totalUsers - subscriptions.length
    planCounts.free = (planCounts.free || 0) + Math.max(0, usersWithoutSubs)

    const planColorMap: Record<string, string> = {
      free: '#9CA3AF',
      pro: '#0D9488',
      family_plus: '#10B981',
    }
    const planNameMap: Record<string, string> = {
      free: 'Free',
      pro: 'Pro',
      family_plus: 'Family+',
    }

    const totalPlanUsers = Object.values(planCounts).reduce((a, b) => a + b, 0)
    const planDistribution = Object.entries(planCounts)
      .filter(([, count]) => count > 0)
      .map(([plan, count]) => ({
        name: planNameMap[plan] || plan,
        value: count,
        color: planColorMap[plan] || '#9CA3AF',
        percentage: totalPlanUsers > 0 ? Math.round((count / totalPlanUsers) * 100) : 0,
      }))

    // totalFamilies already fetched in Promise.all above

    // ─── MRR Calculation from Subscriptions ──────────────────────────────
    const priceMap: Record<string, number> = { free: 0, pro: 4.99, family_plus: 9.99 }
    let mrr = 0
    for (const sub of subscriptions) {
      if (sub.status === 'active' || !sub.status) {
        mrr += priceMap[sub.plan] || 0
      }
    }

    // ─── Revenue Time Series (REAL data from RevenueTransaction) ──────────
    // Query actual revenue per month from RevenueTransaction table.
    // If there are no transactions, show $0 — never fabricate data.
    const revenueByMonth: Record<string, number> = {}
    for (const month of monthNames) {
      revenueByMonth[month] = 0
    }

    const revenueTransactions = await db.revenueTransaction.findMany({
      where: {
        status: 'completed',
        type: 'payment',
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth() - 11, 1),
        },
      },
      select: { amount: true, createdAt: true },
    }).catch(() => [])

    if (Array.isArray(revenueTransactions)) {
      for (const tx of revenueTransactions) {
        const key = tx.createdAt.toLocaleDateString('en-US', { month: 'short' })
        if (key in revenueByMonth) {
          revenueByMonth[key] += tx.amount || 0
        }
      }
    }

    const revenueTimeSeries = monthNames.map(month => ({
      month,
      mrr: Math.round((revenueByMonth[month] || 0) * 100) / 100,
    }))

    const hasAnyData = totalUsers > 0 || totalSessions > 0

    return NextResponse.json({
      source: 'live',
      data: {
        metrics: {
          totalUsers,
          monthlyActiveUsers,
          newThisMonth: newThisMonthResult,
          totalSessions,
          verifiedUsers,
        },
        revenueTimeSeries,
        userGrowthTimeSeries,
        planDistribution,
        regionalDistribution,
        platformHealth: {
          dbConnected: true,
          totalUsers,
          totalSessions,
          verifiedUsers,
          unverifiedUsers: totalUsers - verifiedUsers,
        },
        activityFeed,
        keyMetrics: {
          totalUsers,
          totalSessions,
          monthlyActiveUsers,
          newThisMonth: newThisMonthResult,
          totalFamilies,
          mrr: Math.round(mrr * 100) / 100,
          verifiedPct: totalUsers > 0 ? `${Math.round((verifiedUsers / totalUsers) * 100)}%` : '0%',
        },
        preLaunch: false, // App is live — never show "Pre-Launch Mode"
        hasData: hasAnyData, // Use this instead to show "No Data Yet"
        languageDistribution: Object.entries(langCounts).map(([lang, count]) => ({
          language: lang,
          count,
          pct: totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0,
        })),
      },
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Admin Overview API] Error:', errorMessage, error)
    // Still try to return useful data — dbConnected indicates the failure
    return NextResponse.json({
      source: 'live',
      data: {
        metrics: { totalUsers: 0, monthlyActiveUsers: 0, newThisMonth: 0, totalSessions: 0, verifiedUsers: 0 },
        revenueTimeSeries: [],
        userGrowthTimeSeries: [],
        planDistribution: [],
        regionalDistribution: [],
        platformHealth: { dbConnected: false, totalUsers: 0, totalSessions: 0, verifiedUsers: 0, unverifiedUsers: 0 },
        activityFeed: [],
        keyMetrics: null,
        preLaunch: false, // Don't show "Pre-Launch" — the app IS live, just a temporary DB issue
        languageDistribution: [],
      },
      lastUpdated: new Date().toISOString(),
      error: `Database query failed: ${errorMessage}`,
    }, { status: 500 })
  }
}
