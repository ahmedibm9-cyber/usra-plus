import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  try {
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
  ],
}
