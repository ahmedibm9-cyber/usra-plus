import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin Subscriptions API Route
// Returns subscription & revenue data: plan distribution, revenue, cohorts, payment health
// All data is privacy-safe: aggregate counts and financial metrics only, no personal content
// subscriptions table: plan values = 'free', 'pro', 'family_plus'; status values = 'active', 'cancelled', 'expired'

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
        planDistribution: [],
        revenueTimeSeries: [],
        monthlyBreakdown: [],
        conversionFunnel: [],
        paymentHealth: null,
        cohortData: [],
        cohortSummary: null,
      },
      lastUpdated: new Date().toISOString(),
    })
  }

  try {
    const data: Record<string, unknown> = {}
    let hasAnyLive = false

    // ─── Plan Distribution ──────────────────────────────────────────
    // subscriptions table: plan = 'free'|'pro'|'family_plus', status = 'active'|'cancelled'|'expired'
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('plan, status, created_at')

    if (!subsError && subscriptions && subscriptions.length > 0) {
      hasAnyLive = true

      const planCounts: Record<string, number> = { free: 0, pro: 0, family_plus: 0 }
      const planStatusCounts: Record<string, { active: number; cancelled: number; expired: number }> = {
        free: { active: 0, cancelled: 0, expired: 0 },
        pro: { active: 0, cancelled: 0, expired: 0 },
        family_plus: { active: 0, cancelled: 0, expired: 0 },
      }

      for (const sub of subscriptions) {
        const plan = sub.plan || 'free'
        if (plan in planCounts) {
          planCounts[plan]++
        }
        const subStatus = sub.status || 'active'
        if (planStatusCounts[plan]) {
          if (subStatus === 'cancelled') planStatusCounts[plan].cancelled++
          else if (subStatus === 'expired') planStatusCounts[plan].expired++
          else planStatusCounts[plan].active++
        }
      }

      const totalSubs = planCounts.free + planCounts.pro + planCounts.family_plus
      const totalPaid = planCounts.pro + planCounts.family_plus

      // MRR estimate: Pro @ $9.99, Family+ @ $19.99 (simplified, based on active subs only)
      const activePro = planStatusCounts.pro.active
      const activeFamilyPlus = planStatusCounts.family_plus.active
      const mrr = Math.round((activePro * 9.99 + activeFamilyPlus * 19.99) * 100) / 100

      data.metrics = {
        mrr,
        arr: Math.round(mrr * 12 * 100) / 100,
        avgCLV: 0, // Requires historical data
        churnRate: totalSubs > 0 ? Math.round((planStatusCounts.pro.cancelled + planStatusCounts.family_plus.cancelled) / totalSubs * 1000) / 1000 : 0,
        conversionRate: totalSubs > 0 ? Math.round((totalPaid / totalSubs) * 1000) / 1000 : 0,
        freeUsers: planCounts.free,
        proUsers: planCounts.pro,
        familyPlusUsers: planCounts.family_plus,
      }

      data.planDistribution = [
        {
          name: 'Free',
          users: planCounts.free,
          percentage: totalSubs > 0 ? Math.round((planCounts.free / totalSubs) * 1000) / 10 : 0,
          price: '$0',
          revenue: '$0',
          pillarColor: '#4B5563',
          pillarGlow: 'rgba(75,85,99,0.15)',
          accentColor: 'text-gray-400',
          active: planStatusCounts.free.active,
          cancelled: planStatusCounts.free.cancelled,
          expired: planStatusCounts.free.expired,
        },
        {
          name: 'Pro',
          users: planCounts.pro,
          percentage: totalSubs > 0 ? Math.round((planCounts.pro / totalSubs) * 1000) / 10 : 0,
          price: '$9.99/mo',
          revenue: `$${(activePro * 9.99).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
          pillarColor: '#10B981',
          pillarGlow: 'rgba(16,185,129,0.25)',
          accentColor: 'text-emerald-400',
          active: planStatusCounts.pro.active,
          cancelled: planStatusCounts.pro.cancelled,
          expired: planStatusCounts.pro.expired,
        },
        {
          name: 'Family+',
          users: planCounts.family_plus,
          percentage: totalSubs > 0 ? Math.round((planCounts.family_plus / totalSubs) * 1000) / 10 : 0,
          price: '$19.99/mo',
          revenue: `$${(activeFamilyPlus * 19.99).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
          pillarColor: '#F59E0B',
          pillarGlow: 'rgba(245,158,11,0.25)',
          accentColor: 'text-amber-400',
          active: planStatusCounts.family_plus.active,
          cancelled: planStatusCounts.family_plus.cancelled,
          expired: planStatusCounts.family_plus.expired,
        },
      ]

      data.conversionFunnel = [
        { from: 'Free', to: 'Pro', rate: planCounts.free > 0 ? Math.round((planCounts.pro / planCounts.free) * 1000) / 10 : 0, color: '#10B981' },
        { from: 'Pro', to: 'Family+', rate: planCounts.pro > 0 ? Math.round((planCounts.family_plus / planCounts.pro) * 1000) / 10 : 0, color: '#F59E0B' },
      ]

      data.paymentHealth = {
        activeSubscriptions: planStatusCounts.pro.active + planStatusCounts.family_plus.active,
        cancelledSubscriptions: planStatusCounts.pro.cancelled + planStatusCounts.family_plus.cancelled,
        expiredSubscriptions: planStatusCounts.pro.expired + planStatusCounts.family_plus.expired,
      }
    }

    // ─── Revenue Time Series (based on subscription created_at) ──────
    if (subscriptions && subscriptions.length > 0) {
      const monthlyRevenue: Record<string, { newSubs: number; cancelled: number }> = {}
      const now = new Date()

      // Initialize last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        monthlyRevenue[key] = { newSubs: 0, cancelled: 0 }
      }

      for (const sub of subscriptions) {
        if (sub.created_at) {
          const d = new Date(sub.created_at)
          const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          if (monthlyRevenue[key]) {
            if (sub.status === 'cancelled') {
              monthlyRevenue[key].cancelled++
            } else {
              monthlyRevenue[key].newSubs++
            }
          }
        }
      }

      // Calculate running MRR based on active subscriptions
      const timeSeriesData = Object.entries(monthlyRevenue).map(([month, vals]) => {
        const estimatedMrr = vals.newSubs * 9.99 // Simplified average
        return {
          month,
          newSubs: vals.newSubs,
          churned: vals.cancelled,
          mrr: Math.round(estimatedMrr * 100) / 100,
        }
      })

      data.revenueTimeSeries = timeSeriesData
      data.monthlyBreakdown = timeSeriesData.map(m => ({
        month: m.month,
        newSubs: m.newSubs,
        churned: m.churned,
        netNew: m.newSubs - m.churned,
        revenue: `$${m.mrr.toLocaleString()}`,
        churnRate: m.newSubs > 0 ? `${Math.round(m.churned / m.newSubs * 100)}%` : '—',
      }))
    }

    if (!hasAnyLive) {
      return NextResponse.json({
        source: 'demo',
        data: {
          metrics: null,
          planDistribution: [],
          revenueTimeSeries: [],
          monthlyBreakdown: [],
          conversionFunnel: [],
          paymentHealth: null,
          cohortData: [],
          cohortSummary: null,
        },
        lastUpdated: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      source: 'live',
      data: {
        metrics: data.metrics || null,
        planDistribution: data.planDistribution || [],
        revenueTimeSeries: data.revenueTimeSeries || [],
        monthlyBreakdown: data.monthlyBreakdown || [],
        conversionFunnel: data.conversionFunnel || [],
        paymentHealth: data.paymentHealth || null,
        cohortData: [],
        cohortSummary: null,
      },
      lastUpdated: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({
      source: 'demo',
      data: {
        metrics: null,
        planDistribution: [],
        revenueTimeSeries: [],
        monthlyBreakdown: [],
        conversionFunnel: [],
        paymentHealth: null,
        cohortData: [],
        cohortSummary: null,
      },
      lastUpdated: new Date().toISOString(),
    })
  }
}
