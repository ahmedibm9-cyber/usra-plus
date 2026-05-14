import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET: Return all system settings grouped by category
export async function GET() {
  try {
    const settings = await db.systemSetting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    })

    // Group by category
    const grouped: Record<string, typeof settings> = {}
    for (const setting of settings) {
      if (!grouped[setting.category]) {
        grouped[setting.category] = []
      }
      grouped[setting.category].push(setting)
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

// PUT: Update a setting by key
export async function PUT(request: Request) {
  try {
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
