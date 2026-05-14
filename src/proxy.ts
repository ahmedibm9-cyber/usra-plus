import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { verifyAdminSessionToken, getAdminCookieName } from '@/lib/admin-session'

// Routes that are public (no auth required) even under /api/admin/
const ADMIN_PUBLIC_ROUTES = ['/api/admin/login', '/api/admin/logout']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  try {
    // ─── Admin API route protection (safety net) ────────────────────────
    if (pathname.startsWith('/api/admin/')) {
      // Allow public admin routes (login, logout)
      if (ADMIN_PUBLIC_ROUTES.some(route => pathname === route)) {
        return NextResponse.next()
      }

      // Check for admin session cookie
      const adminCookieName = getAdminCookieName()
      const sessionCookie = request.cookies.get(adminCookieName)?.value

      if (!sessionCookie) {
        // Also check for Bearer token (API key access)
        const authHeader = request.headers.get('authorization')
        const secretKey = process.env.ADMIN_SECRET_KEY
        if (authHeader) {
          const match = authHeader.match(/^Bearer\s+(.+)$/i)
          if (match && secretKey && match[1] === secretKey) {
            return NextResponse.next()
          }
        }

        return NextResponse.json(
          { error: 'Unauthorized — admin session required', success: false },
          { status: 401 }
        )
      }

      // Verify the signed session token
      const payload = verifyAdminSessionToken(decodeURIComponent(sessionCookie))

      if (!payload) {
        // Token is invalid or expired — clear it and reject
        const response = NextResponse.json(
          { error: 'Session expired or invalid', success: false },
          { status: 401 }
        )
        response.cookies.set(adminCookieName, '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 0,
        })
        return response
      }

      // Admin is authenticated — pass through with admin info in headers
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-admin-email', payload.email)
      requestHeaders.set('x-admin-role', payload.role)

      return NextResponse.next({
        request: { headers: requestHeaders },
      })
    }

    // ─── Non-admin routes: refresh Supabase session ─────────────────────
    // 1. Refresh the Supabase session (sets/auth cookies, validates token)
    const response = await updateSession(request)

    // 2. Check for the usra-auth-token cookie — if it exists, the user is
    //    authenticated via our API-route-based session system.
    const hasAuthToken = request.cookies.has('usra-auth-token')

    // Optionally expose auth state as a request header so server components
    // can read it without re-fetching.
    if (hasAuthToken) {
      response.headers.set('x-usra-authenticated', '1')
    }

    return response
  } catch (error) {
    // If proxy fails for any reason, just pass through
    // This prevents chunk loading errors from being caused by proxy failures
    console.error('[Proxy] Error:', error)
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static        (static files)
     * - _next/image         (image optimization)
     * - favicon.ico         (favicon)
     * - public folder files  (svg, png, etc.)
     * - api routes that are purely public (webhooks, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|woff2?)$).*)',
    // Also match admin API routes for protection
    '/api/admin/:path*',
  ],
}
