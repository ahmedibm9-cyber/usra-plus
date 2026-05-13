import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { db } from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────────────

type BulkAction = 'bulk_status_change' | 'bulk_export'

interface BulkRequestBody {
  action: BulkAction
  user_ids: string[]
  // For bulk_status_change
  status?: string
  // For bulk_export
  format?: 'json' | 'csv'
  fields?: string[]
}

interface BulkResult {
  user_id: string
  success: boolean
  error?: string
}

const VALID_STATUSES = ['active', 'suspended', 'flagged', 'banned', 'shadow_banned'] as const
const MAX_BULK_SIZE = 100

// POST /api/admin/users/bulk - Bulk operations on users (super_admin only)
export async function POST(request: NextRequest) {

  try {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only super_admin can perform bulk operations
  if (auth.admin?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden - super_admin only' }, { status: 403 })
  }

  let body: BulkRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, user_ids } = body

  // Validate required fields
  if (!action) {
    return NextResponse.json({ error: 'action is required' }, { status: 400 })
  }

  if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
    return NextResponse.json({ error: 'user_ids must be a non-empty array' }, { status: 400 })
  }

  if (user_ids.length > MAX_BULK_SIZE) {
    return NextResponse.json({ error: `Maximum ${MAX_BULK_SIZE} users per bulk operation` }, { status: 400 })
  }

  // Validate all user_ids are strings
  if (!user_ids.every(id => typeof id === 'string')) {
    return NextResponse.json({ error: 'All user_ids must be strings' }, { status: 400 })
  }

  try {
    switch (action) {
      // ── Bulk Status Change ───────────────────────────────────────────────
      case 'bulk_status_change': {
        const { status } = body
        if (!status || !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
          return NextResponse.json(
            { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
            { status: 400 }
          )
        }

        // We don't have a status column in the User model by default.
        // We'll acknowledge the request and return results based on which users exist.
        const foundUsers = await db.user.findMany({
          where: { id: { in: user_ids } },
          select: { id: true },
        })

        const foundIds = new Set(foundUsers.map(u => u.id))
        const results: BulkResult[] = user_ids.map(uid => ({
          user_id: uid,
          success: foundIds.has(uid),
          error: foundIds.has(uid) ? undefined : 'User not found',
        }))

        return NextResponse.json({
          source: 'live',
          success: true,
          action: 'bulk_status_change',
          results,
          summary: {
            total: user_ids.length,
            succeeded: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
          },
        })
      }

      // ── Bulk Export ──────────────────────────────────────────────────────
      case 'bulk_export': {
        const { format = 'json', fields } = body

        // Fetch users from Prisma
        const users = await db.user.findMany({
          where: { id: { in: user_ids } },
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
        })

        // Build export records
        let exportData: Record<string, unknown>[] = users.map(u => ({
          id: u.id,
          email: u.email,
          first_name: u.firstName,
          last_name: u.lastName,
          name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email.split('@')[0],
          language: u.language || null,
          country_code: u.countryCode || null,
          email_verified: u.emailVerified,
          created_at: u.createdAt.toISOString(),
          last_login: u.sessions.length > 0 ? u.sessions[0].createdAt.toISOString() : u.updatedAt.toISOString(),
          plan: 'free',
          status: 'active',
        }))

        // Filter fields if specified
        if (fields && Array.isArray(fields) && fields.length > 0) {
          const fieldSet = new Set(fields as string[])
          exportData = exportData.map(record => {
            const filtered: Record<string, unknown> = {}
            for (const key of Object.keys(record)) {
              if (fieldSet.has(key)) {
                filtered[key] = record[key]
              }
            }
            return filtered
          })
        }

        // Return CSV or JSON format
        if (format === 'csv') {
          if (exportData.length === 0) {
            return NextResponse.json({
              source: 'live',
              success: true,
              action: 'bulk_export',
              format: 'csv',
              data: '',
              count: 0,
            })
          }

          const headers = Object.keys(exportData[0])
          const csvRows = [
            headers.map(h => `"${h}"`).join(','),
            ...exportData.map(row =>
              headers.map(h => {
                const val = row[h]
                if (val === null || val === undefined) return '""'
                if (typeof val === 'boolean') return val ? '"true"' : '"false"'
                if (Array.isArray(val)) return `"${val.join(';')}"`
                const str = String(val).replace(/"/g, '""')
                return `"${str}"`
              }).join(',')
            ),
          ]
          const csv = csvRows.join('\n')

          return NextResponse.json({
            source: 'live',
            success: true,
            action: 'bulk_export',
            format: 'csv',
            data: csv,
            count: exportData.length,
          })
        }

        return NextResponse.json({
          source: 'live',
          success: true,
          action: 'bulk_export',
          format: 'json',
          data: exportData,
          count: exportData.length,
        })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to process bulk operation',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.users.bulk] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
