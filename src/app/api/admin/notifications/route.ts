import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Admin Notifications API
// Aggregates counts for: unresolved critical bugs, pending moderation, open support tickets
// Returns latest items for the notification bell dropdown

export async function GET(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let criticalBugsCount = 0
    let pendingModerationCount = 0
    let openTicketsCount = 0
    let latestBugs: Array<{ id: string; title: string; severity: string; createdAt: string }> = []
    let latestModeration: Array<{ id: string; itemType: string; priority: string; reason: string | null; createdAt: string }> = []
    let latestTickets: Array<{ id: string; subject: string; priority: string; status: string; createdAt: string }> = []

    const supabase = getSupabaseAdmin()

    // Critical bugs - try bug_logs table via Supabase
    try {
      if (supabase) {
        const { count, error } = await supabase
          .from('bug_logs')
          .select('*', { count: 'exact', head: true })
          .eq('severity', 'critical')
          .in('status', ['open', 'investigating'])
        if (!error && count !== null) {
          criticalBugsCount = count
          const { data: bugs } = await supabase
            .from('bug_logs')
            .select('id, title, severity, created_at')
            .eq('severity', 'critical')
            .in('status', ['open', 'investigating'])
            .order('created_at', { ascending: false })
            .limit(5)
          if (bugs) {
            latestBugs = bugs.map(b => ({
              id: b.id,
              title: b.title || 'Bug',
              severity: b.severity || 'critical',
              createdAt: b.created_at || new Date().toISOString(),
            }))
          }
        }
      }
    } catch { /* table may not exist */ }

    // Pending moderation - try via Supabase first, fallback to empty
    try {
      if (supabase) {
        const { count, error } = await supabase
          .from('moderation_items')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
        if (!error && count !== null) {
          pendingModerationCount = count
          const { data: items } = await supabase
            .from('moderation_items')
            .select('id, item_type, priority, reason, created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(5)
          if (items) {
            latestModeration = items.map(m => ({
              id: m.id,
              itemType: m.item_type || 'unknown',
              priority: m.priority || 'medium',
              reason: m.reason || null,
              createdAt: m.created_at || new Date().toISOString(),
            }))
          }
        }
      }
    } catch { /* table may not exist */ }

    // Open support tickets - try via Supabase
    try {
      if (supabase) {
        const { count, error } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .in('status', ['open', 'in_progress'])
        if (!error && count !== null) {
          openTicketsCount = count
          const { data: tickets } = await supabase
            .from('support_tickets')
            .select('id, subject, priority, status, created_at')
            .in('status', ['open', 'in_progress'])
            .order('created_at', { ascending: false })
            .limit(5)
          if (tickets) {
            latestTickets = tickets.map(t => ({
              id: t.id,
              subject: t.subject || 'Ticket',
              priority: t.priority || 'medium',
              status: t.status || 'open',
              createdAt: t.created_at || new Date().toISOString(),
            }))
          }
        }
      }
    } catch { /* table may not exist */ }

    const totalCount = criticalBugsCount + pendingModerationCount + openTicketsCount

    return NextResponse.json({
      source: 'live',
      data: {
        counts: {
          criticalBugs: criticalBugsCount,
          pendingModeration: pendingModerationCount,
          openTickets: openTicketsCount,
          total: totalCount,
        },
        latest: {
          bugs: latestBugs,
          moderation: latestModeration,
          tickets: latestTickets,
        },
      },
    })
  } catch (err) {
    return NextResponse.json({
      source: 'live',
      data: {
        counts: { criticalBugs: 0, pendingModeration: 0, openTickets: 0, total: 0 },
        latest: { bugs: [], moderation: [], tickets: [] },
      },
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }
}
