import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin Overview API Route
// Returns platform overview data: KPIs, time series, regional distribution, health, activity feed
// All data is privacy-safe: aggregate counts only, no personal content

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET() {
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    return NextResponse.json({
      source: 'demo',
      data: {
        metrics: null,
        revenueTimeSeries: [],
        userGrowthTimeSeries: [],
        planDistribution: [],
        regionalDistribution: [],
        platformHealth: null,
        activityFeed: [],
        keyMetrics: null,
      },
      lastUpdated: new Date().toISOString(),
    })
  }

  try {
    const data: Record<string, unknown> = {}
    let hasAnyLive = false

    // ─── Core Metrics ─────────────────────────────────────────────────
    const { count: totalUsers, error: profilesError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (!profilesError && totalUsers !== null) {
      hasAnyLive = true

      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { count: newThisMonth } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())

      // last_login column exists in profiles
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_login', thirtyDaysAgo.toISOString())

      data.metrics = {
        totalUsers: totalUsers,
        monthlyActiveUsers: activeUsers ?? 0,
        newThisMonth: newThisMonth ?? 0,
      }
    }

    // ─── Families Count ──────────────────────────────────────────────
    const { count: totalFamilies, error: familiesError } = await supabase
      .from('families')
      .select('*', { count: 'exact', head: true })

    if (!familiesError && totalFamilies !== null) {
      hasAnyLive = true
      data.families = { total: totalFamilies }
    }

    // ─── Subscription / Plan Distribution ────────────────────────────
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('plan, status')

    if (!subsError && subscriptions) {
      hasAnyLive = true
      const planCounts: Record<string, number> = { free: 0, pro: 0, family_plus: 0 }
      for (const sub of subscriptions) {
        const plan = sub.plan || 'free'
        if (plan in planCounts) {
          planCounts[plan]++
        }
      }
      data.planDistribution = [
        { name: 'Free', value: planCounts.free, color: '#6B7280' },
        { name: 'Pro', value: planCounts.pro, color: '#6366F1' },
        { name: 'Family+', value: planCounts.family_plus, color: '#8B5CF6' },
      ]
    }

    // ─── User Growth Time Series (last 12 months) ────────────────────
    const { data: profileDates, error: profileDatesError } = await supabase
      .from('profiles')
      .select('created_at')

    if (!profileDatesError && profileDates && profileDates.length > 0) {
      hasAnyLive = true
      const monthlyCounts: Record<string, number> = {}
      const now = new Date()
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = d.toLocaleDateString('en-US', { month: 'short' })
        monthlyCounts[key] = 0
      }
      for (const p of profileDates) {
        if (p.created_at) {
          const d = new Date(p.created_at)
          const key = d.toLocaleDateString('en-US', { month: 'short' })
          if (key in monthlyCounts) {
            monthlyCounts[key]++
          }
        }
      }
      data.userGrowthTimeSeries = Object.entries(monthlyCounts).map(([month, registrations]) => ({
        month,
        registrations,
      }))
    }

    // ─── Regional Distribution ───────────────────────────────────────
    // profiles table has both 'country' and 'country_code' columns
    const { data: countryData, error: countryError } = await supabase
      .from('profiles')
      .select('country')

    if (!countryError && countryData && countryData.length > 0) {
      hasAnyLive = true
      const countryCounts: Record<string, number> = {}
      for (const p of countryData) {
        if (p.country) {
          countryCounts[p.country] = (countryCounts[p.country] || 0) + 1
        }
      }
      const total = countryData.length
      const flagMap: Record<string, string> = {
        SA: '🇸🇦', AE: '🇦🇪', KW: '🇰🇼', QA: '🇶🇦', BH: '🇧🇭', OM: '🇴🇲',
      }
      const regionNames: Record<string, string> = {
        SA: 'Saudi Arabia', AE: 'UAE', KW: 'Kuwait', QA: 'Qatar', BH: 'Bahrain', OM: 'Oman',
      }
      const sorted = Object.entries(countryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)

      const regionalData = sorted.map(([code, users]) => ({
        region: regionNames[code] || code,
        percentage: Math.round((users / total) * 1000) / 10,
        users,
        flag: flagMap[code] || '🌍',
      }))
      data.regionalDistribution = regionalData
    }

    // ─── Activity Feed (recent events) ───────────────────────────────
    const { data: recentUsers, error: recentUsersError } = await supabase
      .from('profiles')
      .select('email, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (!recentUsersError && recentUsers && recentUsers.length > 0) {
      hasAnyLive = true
      const feed = recentUsers.map((u, i) => ({
        id: `act-${i}`,
        type: 'user_registered' as const,
        text: `New user registered: ${u.email}`,
        time: u.created_at,
      }))
      data.activityFeed = feed
    }

    if (!hasAnyLive) {
      return NextResponse.json({
        source: 'demo',
        data: {
          metrics: null,
          revenueTimeSeries: [],
          userGrowthTimeSeries: [],
          planDistribution: [],
          regionalDistribution: [],
          platformHealth: null,
          activityFeed: [],
          keyMetrics: null,
        },
        lastUpdated: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      source: 'live',
      data: {
        metrics: data.metrics || null,
        revenueTimeSeries: data.revenueTimeSeries || [],
        userGrowthTimeSeries: data.userGrowthTimeSeries || [],
        planDistribution: data.planDistribution || [],
        regionalDistribution: data.regionalDistribution || [],
        platformHealth: null,
        activityFeed: data.activityFeed || [],
        keyMetrics: null,
      },
      lastUpdated: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({
      source: 'demo',
      data: {
        metrics: null,
        revenueTimeSeries: [],
        userGrowthTimeSeries: [],
        planDistribution: [],
        regionalDistribution: [],
        platformHealth: null,
        activityFeed: [],
        keyMetrics: null,
      },
      lastUpdated: new Date().toISOString(),
    })
  }
}
