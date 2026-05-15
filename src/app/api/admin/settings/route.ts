import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// GET: Return all system settings grouped by category
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
    if (rateLimitResponse) return rateLimitResponse

    const auth = verifyAdminAuth(request)
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await db.systemSetting.findMany({
      orderBy: [{ key: 'asc' }],
    })

    // Group by extracting category from key prefix (e.g. "general.siteName" → "general")
    const grouped: Record<string, typeof settings> = {}
    for (const setting of settings) {
      const category = setting.key.includes('.') ? setting.key.split('.')[0] : 'general'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(setting)
    }

    return NextResponse.json({
      settings,
      grouped,
      categories: Object.keys(grouped).sort(),
    })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT: Update a setting by key (super_admin only)
export async function PUT(request: NextRequest) {
  try {
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
    if (rateLimitResponse) return rateLimitResponse

    const auth = verifyAdminAuth(request)
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (auth.admin?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden — super_admin role required' }, { status: 403 })
    }

    const body = await request.json()
    const { key, value } = body

    if (!key || value === undefined || value === null) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      )
    }

    const existing = await db.systemSetting.findUnique({ where: { key } })

    if (!existing) {
      return NextResponse.json(
        { error: `Setting with key "${key}" not found` },
        { status: 404 }
      )
    }

    const updated = await db.systemSetting.update({
      where: { key },
      data: { value: String(value) },
    })

    return NextResponse.json({
      setting: updated,
      message: `Setting "${key}" updated successfully`,
    })
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    )
  }
}
