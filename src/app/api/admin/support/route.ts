import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin Support API Route
// Fetches support ticket data, feature requests, pain points, and agent metrics
// Returns empty data structures when no records exist in the database
// Connects to Supabase to check for support-related tables

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const section = searchParams.get('section') || 'all'

  const supabase = getSupabaseAdmin()

  if (!supabase) {
    return NextResponse.json({
      source: 'demo',
      section,
      data: getEmptySupportData(section),
      generatedAt: new Date().toISOString(),
    })
  }

  try {
    // Check if we can reach the database at all
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (error) {
      return NextResponse.json({
        source: 'demo',
        section,
        data: getEmptySupportData(section),
        generatedAt: new Date().toISOString(),
      })
    }

    // Support tables (support_tickets, feature_requests) may not exist yet
    // Return empty data with source: 'live' to indicate Supabase is connected
    // When support tables are added, this route can be enhanced to query them
    return NextResponse.json({
      source: 'live',
      section,
      data: getEmptySupportData(section),
      generatedAt: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({
      source: 'demo',
      section,
      data: getEmptySupportData(section),
      generatedAt: new Date().toISOString(),
    })
  }
}

function getEmptySupportData(section: string) {
  const kpis = {
    openTickets: 0,
    avgResolutionHours: 0,
    satisfactionScore: 0,
    npsScore: 0,
    firstResponseMinutes: 0,
    weeklyDelta: {
      openTickets: 0,
      resolutionHours: 0,
      firstResponseMinutes: 0,
    },
  }

  const ticketTrend: Array<{ date: string; opened: number; resolved: number }> = []
  const commonIssues: Array<{ issue: string; count: number }> = []
  const featureRequests: Array<{
    feature: string
    votes: number
    status: 'Under Review' | 'Planned' | 'In Progress' | 'Shipped'
    priority: 'High' | 'Medium' | 'Low'
  }> = []
  const painPoints: Array<{
    title: string
    value: string
    description: string
    iconType: 'alert' | 'check' | 'cart' | 'chat'
  }> = []
  const topAgents: Array<{
    name: string
    tickets: number
    avatar: string
  }> = []
  const resolutionChannels: Array<{
    channel: string
    percentage: number
    color: string
  }> = []

  switch (section) {
    case 'kpis':
      return kpis
    case 'ticket-trend':
      return ticketTrend
    case 'common-issues':
      return commonIssues
    case 'feature-requests':
      return featureRequests
    case 'pain-points':
      return painPoints
    case 'top-agents':
      return topAgents
    case 'resolution-channels':
      return resolutionChannels
    case 'all':
    default:
      return {
        kpis,
        ticketTrend,
        commonIssues,
        featureRequests,
        painPoints,
        topAgents,
        resolutionChannels,
      }
  }
}
