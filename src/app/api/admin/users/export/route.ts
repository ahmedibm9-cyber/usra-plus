import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { db } from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────────────

interface ExportUserRecord {
  id: string
  email: string
  name: string
  plan: string
  status: string
  language: string | null
  country: string | null
  email_verified: boolean
  created_at: string
  last_login: string | null
  is_vip: boolean
  beta_tester: boolean
}

// GET /api/admin/users/export - Export all user data (super_admin only)
export async function GET(request: NextRequest) {

  try {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only super_admin can export user data
  if (auth.admin?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden - super_admin only' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'json'
  const plan = searchParams.get('plan')
  const verified = searchParams.get('verified')
  const limit = Math.min(10000, Math.max(1, parseInt(searchParams.get('limit') || '5000', 10)))

  if (format !== 'json' && format !== 'csv') {
    return NextResponse.json({ error: 'format must be json or csv' }, { status: 400 })
  }

  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        language: true,
        countryCode: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        sessions: {
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Build export records
    let exportData: ExportUserRecord[] = users.map(u => ({
      id: u.id,
      email: u.email,
      name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email.split('@')[0],
      plan: 'free',
      status: 'active',
      language: u.language || null,
      country: u.countryCode || null,
      email_verified: u.emailVerified,
      created_at: u.createdAt.toISOString(),
      last_login: u.sessions.length > 0 ? u.sessions[0].createdAt.toISOString() : u.updatedAt.toISOString(),
      is_vip: false,
      beta_tester: false,
    }))

    // Apply filters (post-fetch filtering)
    if (plan) {
      exportData = exportData.filter(u => u.plan === plan)
    }
    if (verified === 'true') {
      exportData = exportData.filter(u => u.email_verified)
    } else if (verified === 'false') {
      exportData = exportData.filter(u => !u.email_verified)
    }

    // Return in requested format
    if (format === 'csv') {
      if (exportData.length === 0) {
        return NextResponse.json({
          source: 'live',
          format: 'csv',
          data: '',
          count: 0,
          exported_at: new Date().toISOString(),
        })
      }

      const headers = Object.keys(exportData[0])
      const csvRows = [
        headers.map(h => `"${h}"`).join(','),
        ...exportData.map(row =>
          headers.map(h => {
            const val = (row as unknown as Record<string, unknown>)[h]
            if (val === null || val === undefined) return '""'
            if (typeof val === 'boolean') return val ? '"true"' : '"false"'
            const str = String(val).replace(/"/g, '""')
            return `"${str}"`
          }).join(',')
        ),
      ]
      const csv = csvRows.join('\n')

      return NextResponse.json({
        source: 'live',
        format: 'csv',
        data: csv,
        count: exportData.length,
        exported_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      source: 'live',
      format: 'json',
      data: exportData,
      count: exportData.length,
      exported_at: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({
      source: 'live',
      error: 'Failed to export user data',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.users.export] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
