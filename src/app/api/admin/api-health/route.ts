import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// API Health Check Route
// Lists all known /api/* routes and tests them by making internal HTTP requests

const API_ROUTES = [
  { path: '/api/admin/overview', method: 'GET', name: 'Overview', category: 'analytics' },
  { path: '/api/admin/users', method: 'GET', name: 'Users', category: 'analytics' },
  { path: '/api/admin/families', method: 'GET', name: 'Families', category: 'analytics' },
  { path: '/api/admin/features', method: 'GET', name: 'Features', category: 'analytics' },
  { path: '/api/admin/analytics', method: 'GET', name: 'Analytics', category: 'analytics' },
  { path: '/api/admin/infrastructure', method: 'GET', name: 'Infrastructure', category: 'operations' },
  { path: '/api/admin/support', method: 'GET', name: 'Support', category: 'operations' },
  { path: '/api/admin/moderation', method: 'GET', name: 'Moderation', category: 'operations' },
  { path: '/api/admin/sessions', method: 'GET', name: 'Sessions', category: 'operations' },
  { path: '/api/admin/audit', method: 'GET', name: 'Audit Log', category: 'operations' },
  { path: '/api/admin/bans', method: 'GET', name: 'Bans', category: 'operations' },
  { path: '/api/admin/bugs', method: 'GET', name: 'Bug Detection', category: 'operations' },
  { path: '/api/admin/performance', method: 'GET', name: 'Performance', category: 'operations' },
  { path: '/api/admin/errors', method: 'GET', name: 'Error Monitor', category: 'operations' },
  { path: '/api/admin/auto-heal', method: 'GET', name: 'Auto-Heal', category: 'operations' },
  { path: '/api/admin/subscriptions', method: 'GET', name: 'Subscriptions', category: 'business' },
  { path: '/api/admin/coupons', method: 'GET', name: 'Coupons', category: 'business' },
  { path: '/api/admin/referrals', method: 'GET', name: 'Referrals', category: 'business' },
  { path: '/api/admin/revenue', method: 'GET', name: 'Revenue', category: 'business' },
  { path: '/api/admin/campaigns', method: 'GET', name: 'Campaigns', category: 'business' },
  { path: '/api/admin/segments', method: 'GET', name: 'Segments', category: 'business' },
  { path: '/api/admin/abtests', method: 'GET', name: 'A/B Tests', category: 'business' },
  { path: '/api/admin/fraud', method: 'GET', name: 'Fraud Detection', category: 'operations' },
  { path: '/api/admin/system', method: 'GET', name: 'System', category: 'operations' },
  { path: '/api/admin/trials', method: 'GET', name: 'Trials', category: 'business' },
  { path: '/api/auth/local/login', method: 'GET', name: 'Auth Login', category: 'core' },
  { path: '/api/auth/local/signup', method: 'GET', name: 'Auth Signup', category: 'core' },
  { path: '/api/auth/me', method: 'GET', name: 'Auth Me', category: 'core' },
]

function getStatusFromResponse(statusCode: number, responseTime: number): 'healthy' | 'degraded' | 'down' {
  if (statusCode >= 200 && statusCode < 300) {
    if (responseTime > 3000) return 'degraded'
    return 'healthy'
  }
  if (statusCode === 401) return 'healthy' // Auth required = route exists and works
  if (statusCode === 429) return 'degraded' // Rate limited
  if (statusCode >= 400 && statusCode < 500) return 'degraded'
  return 'down'
}

export async function GET(request: NextRequest) {

  try {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const testAll = searchParams.get('test') === 'true'
  const category = searchParams.get('category')

  let routes = API_ROUTES
  if (category) {
    routes = routes.filter(r => r.category === category)
  }

  if (!testAll) {
    // Just return the list without testing
    return NextResponse.json({
      source: 'live',
      data: {
        routes: routes.map(r => ({
          ...r,
          status: 'unknown' as const,
          responseTime: null as number | null,
          statusCode: null as number | null,
          lastTested: null as string | null,
          error: null as string | null,
        })),
        totalRoutes: routes.length,
        categories: ['analytics', 'operations', 'business', 'core'],
      },
    })
  }

  // Test all routes
  const baseUrl = new URL(request.url).origin
  const adminToken = request.headers.get('cookie') || ''

  const results = await Promise.allSettled(
    routes.map(async (route) => {
      const start = Date.now()
      try {
        const res = await fetch(`${baseUrl}${route.path}`, {
          method: route.method,
          headers: { cookie: adminToken },
          signal: AbortSignal.timeout(10000), // 10s timeout
        })
        const responseTime = Date.now() - start
        const status = getStatusFromResponse(res.status, responseTime)

        return {
          ...route,
          status,
          responseTime,
          statusCode: res.status,
          lastTested: new Date().toISOString(),
          error: null as string | null,
        }
      } catch (err) {
        const responseTime = Date.now() - start
        return {
          ...route,
          status: 'down' as const,
          responseTime,
          statusCode: null as number | null,
          lastTested: new Date().toISOString(),
          error: err instanceof Error ? err.message : 'Connection failed',
        }
      }
    })
  )

  const testedRoutes = results.map(r =>
    r.status === 'fulfilled' ? r.value : {
      ...routes[0],
      status: 'down' as const,
      responseTime: 0,
      statusCode: null,
      lastTested: new Date().toISOString(),
      error: 'Test failed',
    }
  )

  const healthyCount = testedRoutes.filter(r => r.status === 'healthy').length
  const degradedCount = testedRoutes.filter(r => r.status === 'degraded').length
  const downCount = testedRoutes.filter(r => r.status === 'down').length
  const avgResponseTime = testedRoutes.length > 0
    ? Math.round(testedRoutes.reduce((sum, r) => sum + (r.responseTime || 0), 0) / testedRoutes.length)
    : 0

  return NextResponse.json({
    source: 'live',
    data: {
      routes: testedRoutes,
      summary: {
        total: testedRoutes.length,
        healthy: healthyCount,
        degraded: degradedCount,
        down: downCount,
        avgResponseTime,
      },
      categories: ['analytics', 'operations', 'business', 'core'],
      totalRoutes: routes.length,
      testedAt: new Date().toISOString(),
    },
  })

  } catch (error) {

    console.error('[src.app.api.admin.api-health] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
