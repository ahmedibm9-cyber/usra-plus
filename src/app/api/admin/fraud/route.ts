import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import type { FraudSeverity, FraudStatus, FraudAlertType } from '@/types/admin'

const VALID_SEVERITIES: FraudSeverity[] = ['low', 'medium', 'high', 'critical']
const VALID_STATUSES: FraudStatus[] = ['open', 'investigating', 'resolved', 'false_positive', 'escalated']
const VALID_ALERT_TYPES: FraudAlertType[] = [
  'duplicate_trial', 'suspicious_login', 'payment_fraud', 'api_abuse',
  'spam_detection', 'harassment_pattern', 'account_takeover', 'credential_stuffing',
  'unusual_activity', 'multiple_accounts', 'geo_anomaly',
]

// ─── GET: List fraud alerts with filtering ───────────────────────────────
export async function GET(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({
      source: 'demo',
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
    })
  }

  const { searchParams } = new URL(request.url)
  const severity = searchParams.get('severity') as FraudSeverity | null
  const status = searchParams.get('status') as FraudStatus | null
  const alertType = searchParams.get('alertType') as FraudAlertType | null
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))

  try {
    let query = supabase
      .from('fraud_alerts')
      .select('*', { count: 'exact' })

    if (severity) query = query.eq('severity', severity)
    if (status) query = query.eq('status', status)
    if (alertType) query = query.eq('alert_type', alertType)

    const start = (page - 1) * pageSize
    query = query.range(start, start + pageSize - 1).order('created_at', { ascending: false })

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json({
        source: 'demo',
        data: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      })
    }

    return NextResponse.json({
      source: 'live',
      data: data || [],
      total: count ?? 0,
      page,
      pageSize,
      hasMore: start + pageSize < (count ?? 0),
    })
  } catch (err) {
    return NextResponse.json({
      source: 'demo',
      data: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }
}

// ─── POST: Create a new fraud alert manually ─────────────────────────────
export async function POST(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ source: 'demo', error: 'Database not configured' }, { status: 503 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { userId, alertType, severity, title, description, evidence, riskScore, autoAction } = body as {
    userId?: string | null
    alertType?: string
    severity?: string
    title?: string
    description?: string
    evidence?: Record<string, unknown>
    riskScore?: number
    autoAction?: string | null
  }

  if (!alertType || !title) {
    return NextResponse.json({ error: 'alertType and title are required' }, { status: 400 })
  }

  if (!VALID_ALERT_TYPES.includes(alertType as FraudAlertType)) {
    return NextResponse.json({ error: `Invalid alertType. Must be one of: ${VALID_ALERT_TYPES.join(', ')}` }, { status: 400 })
  }

  if (severity && !VALID_SEVERITIES.includes(severity as FraudSeverity)) {
    return NextResponse.json({ error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}` }, { status: 400 })
  }

  try {
    // Resolve assigned_to admin UUID if provided
    let assignedTo: string | null = null

    const { data, error } = await supabase
      .from('fraud_alerts')
      .insert({
        user_id: userId || null,
        alert_type: alertType,
        severity: severity || 'medium',
        status: 'open',
        title,
        description: description || '',
        evidence: evidence || {},
        risk_score: riskScore || 50,
        auto_action: autoAction || null,
        assigned_to: assignedTo,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create fraud alert', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ source: 'live', success: true, alert: data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to create fraud alert',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }
}

// ─── PATCH: Update alert status ──────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ source: 'demo', error: 'Database not configured' }, { status: 503 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { alertId, action, assignedTo, resolutionNotes } = body as {
    alertId?: string
    action?: 'investigate' | 'resolve' | 'false_positive' | 'escalate'
    assignedTo?: string
    resolutionNotes?: string
  }

  if (!alertId || !action) {
    return NextResponse.json({ error: 'alertId and action are required' }, { status: 400 })
  }

  const statusMap: Record<string, FraudStatus> = {
    investigate: 'investigating',
    resolve: 'resolved',
    false_positive: 'false_positive',
    escalate: 'escalated',
  }

  const newStatus = statusMap[action]
  if (!newStatus) {
    return NextResponse.json({ error: 'action must be "investigate", "resolve", "false_positive", or "escalate"' }, { status: 400 })
  }

  try {
    const updateData: Record<string, unknown> = {
      status: newStatus,
    }

    if (assignedTo) updateData.assigned_to = assignedTo
    if (resolutionNotes) updateData.resolution_notes = resolutionNotes

    if (action === 'resolve' || action === 'false_positive') {
      // Resolve the admin user ID for resolved_by FK
      let adminId: string | null = null
      if (auth.admin?.email) {
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('id')
          .eq('email', auth.admin.email)
          .maybeSingle()
        adminId = (adminUser as Record<string, unknown> | null)?.id as string || null
      }
      updateData.resolved_by = adminId
      updateData.resolved_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('fraud_alerts')
      .update(updateData)
      .eq('id', alertId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update fraud alert', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ source: 'live', success: true, alert: data })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to update fraud alert',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }
}
