import { NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { getDatabaseProvider } from '@/lib/db'

export async function GET(request: Request) {

  try {
  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const provider = getDatabaseProvider()
  const isPostgres = provider === 'postgresql'

  return NextResponse.json({
    provider,
    isPostgres,
    displayBadge: isPostgres ? 'PostgreSQL' : 'SQLite',
    displaySource: isPostgres ? 'Connected to PostgreSQL (Supabase)' : 'Connected to SQLite (Local)',
  })

  } catch (error) {

    console.error('[src.app.api.admin.db-info] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
