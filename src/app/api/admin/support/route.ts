import { NextRequest, NextResponse } from 'next/server'

// Admin Support API Route
// Fetches support ticket data, feature requests, pain points, and agent metrics
// Returns empty data structures when no records exist in the database

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const section = searchParams.get('section') || 'all'

  try {
    // In production, this would query Supabase with service role key
    // Example:
    // const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    // const { data: tickets } = await supabase.from('support_tickets').select('*')
    // const { data: featureRequests } = await supabase.from('feature_requests').select('*')

    // For now, return empty data structures indicating no records
    // The frontend will show appropriate empty states
    const data = getEmptySupportData(section)

    return NextResponse.json({
      success: true,
      section,
      data,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Admin Support API] Error fetching support data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch support data' },
      { status: 500 }
    )
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
