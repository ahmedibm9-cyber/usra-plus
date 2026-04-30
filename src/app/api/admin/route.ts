import { NextRequest, NextResponse } from 'next/server'

// Admin Analytics API Route
// Provides aggregate analytics data for the Super Admin Dashboard
// All data is privacy-safe and aggregated - no private content exposed

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const metric = searchParams.get('metric') || 'overview'
  
  // In production, this would query Supabase with service role key
  // For now, returns demo analytics data
  
  const data = getAnalyticsData(metric)
  
  return NextResponse.json({
    success: true,
    metric,
    data,
    generatedAt: new Date().toISOString(),
  })
}

function getAnalyticsData(metric: string) {
  switch (metric) {
    case 'overview':
      return {
        totalUsers: 12847,
        activeUsers: 8429,
        dailyActiveUsers: 2891,
        monthlyActiveUsers: 8429,
        totalFamilies: 3256,
        activeFamilies: 2891,
        newRegistrations: 147,
        churnRate: 0.038,
        upgradeRate: 0.124,
        revenueMRR: 28940,
        revenueARR: 347280,
        freeUsers: 9612,
        paidUsers: 3235,
        serverHealth: 0.999,
        dbUsage: 0.34,
        storageUsage: 0.23,
        errorRate: 0.0012,
      }
      
    case 'users':
      return {
        registrations: generateTimeSeries(12, 680, 1620),
        loginFrequency: generateTimeSeries(12, 4200, 8400),
        avgSessionDuration: 522, // seconds
        retentionRate: 0.78,
        lifecycleStages: {
          new: 1247,
          active: 8429,
          power: 2156,
          churned: 1015,
        },
      }
      
    case 'families':
      return {
        totalFamilies: 3256,
        avgFamilySize: 3.8,
        taskActivity: generateTimeSeries(12, 2100, 4700),
        groceryActivity: generateTimeSeries(12, 1800, 3200),
        calendarActivity: generateTimeSeries(12, 900, 2400),
        chatActivity: generateTimeSeries(12, 1500, 3600),
        familyRetention: 0.87,
        inviteConversionRate: 0.72,
        moduleUsage: [
          { module: 'Tasks', usage: 92, percentage: 92 },
          { module: 'Grocery', usage: 78, percentage: 78 },
          { module: 'Calendar', usage: 65, percentage: 65 },
          { module: 'Chat', usage: 54, percentage: 54 },
          { module: 'Files', usage: 31, percentage: 31 },
          { module: 'Budget', usage: 24, percentage: 24 },
          { module: 'Meal Plan', usage: 18, percentage: 18 },
        ],
      }
      
    case 'features':
      return {
        features: [
          { feature: 'Task Creation', dailyAvg: 8291, adoptionRate: 0.92, dropOffRate: 0.04 },
          { feature: 'Task Completion', dailyAvg: 5420, adoptionRate: 0.78, dropOffRate: 0.08 },
          { feature: 'Grocery List', dailyAvg: 4200, adoptionRate: 0.72, dropOffRate: 0.06 },
          { feature: 'Calendar Events', dailyAvg: 3100, adoptionRate: 0.65, dropOffRate: 0.09 },
          { feature: 'Chat Messages', dailyAvg: 5600, adoptionRate: 0.54, dropOffRate: 0.12 },
          { feature: 'File Uploads', dailyAvg: 1800, adoptionRate: 0.31, dropOffRate: 0.18 },
          { feature: 'Settings Changes', dailyAvg: 2400, adoptionRate: 0.42, dropOffRate: 0.05 },
          { feature: 'Invite Codes', dailyAvg: 890, adoptionRate: 0.28, dropOffRate: 0.22 },
          { feature: 'Language Switch', dailyAvg: 450, adoptionRate: 0.15, dropOffRate: 0.03 },
          { feature: 'Notifications', dailyAvg: 6200, adoptionRate: 0.68, dropOffRate: 0.07 },
        ],
        funnel: [
          { step: 'App Visit', count: 12847, percentage: 100, dropOff: 0 },
          { step: 'Sign Up', count: 3256, percentage: 25.3, dropOff: 74.7 },
          { step: 'Family Create', count: 2891, percentage: 22.5, dropOff: 11.2 },
          { step: 'First Task', count: 2540, percentage: 19.8, dropOff: 12.1 },
          { step: 'First Grocery', count: 1920, percentage: 14.9, dropOff: 24.4 },
          { step: 'First Chat', count: 1340, percentage: 10.4, dropOff: 30.2 },
          { step: 'Upgrade Prompt', count: 680, percentage: 5.3, dropOff: 49.3 },
          { step: 'Subscribe', count: 89, percentage: 0.7, dropOff: 86.9 },
        ],
      }
      
    case 'subscriptions':
      return {
        freeUsers: 9612,
        proUsers: 2158,
        familyPlusUsers: 1077,
        lifetimeUsers: 42,
        trialUsers: 234,
        monthlyRevenue: 28940,
        annualRevenue: 347280,
        failedPayments: 23,
        refunds: 7,
        refundAmount: 69.93,
        avgCLV: 127.40,
        conversionRate: 0.224,
        churnRate: 0.042,
        downgradeRate: 0.018,
        revenueTimeSeries: generateRevenueTimeSeries(),
      }
      
    case 'infrastructure':
      return {
        dbSize: 2.4, // GB
        dbGrowth: 0.05, // GB/day
        storageSize: 4.7, // GB
        storageGrowth: 0.06, // GB/day
        apiRequestVolume: 45000,
        errorRate: 0.0012,
        avgResponseTime: 142, // ms
        uptime: 0.9997,
        activeConnections: 1247,
        securityAlerts: 3,
      }
      
    case 'support':
      return {
        totalTickets: 156,
        openTickets: 23,
        resolvedTickets: 133,
        avgResolutionTime: 4.2, // hours
        satisfactionScore: 4.6,
        npsScore: 72,
        commonIssues: [
          { issue: 'Cannot join family', count: 34 },
          { issue: 'Invite code not working', count: 28 },
          { issue: 'App crashes on upload', count: 22 },
          { issue: 'Subscription not activating', count: 19 },
          { issue: 'Language switch stuck', count: 15 },
        ],
      }
      
    default:
      return { error: 'Unknown metric type' }
  }
}

function generateTimeSeries(months: number, minVal: number, maxVal: number) {
  const data = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const progress = (months - 1 - i) / (months - 1)
    const value = Math.round(minVal + (maxVal - minVal) * progress + (Math.random() - 0.5) * (maxVal - minVal) * 0.1)
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.max(minVal, Math.min(maxVal, value)),
      label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    })
  }
  return data
}

function generateRevenueTimeSeries() {
  const data = []
  const now = new Date()
  let baseRevenue = 14200
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    baseRevenue *= 1.03 + Math.random() * 0.04
    data.push({
      date: date.toISOString().split('T')[0],
      revenue: Math.round(baseRevenue),
      newSubscriptions: Math.round(80 + Math.random() * 120),
      churned: Math.round(20 + Math.random() * 30),
    })
  }
  return data
}
