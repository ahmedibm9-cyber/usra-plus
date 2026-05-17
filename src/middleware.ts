import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/verify-email',
  '/reset-password',
  '/privacy',
  '/terms',
  '/cookies',
  '/api/auth',
  '/api/legal',
  '/api/weather',
]

const ADMIN_ROUTES = ['/admin']

const AUTH_ROUTES = ['/api/admin']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check for auth cookie
  const sessionCookie = request.cookies.get('usra-session')
  const hasValidSession = sessionCookie?.value && sessionCookie.value.length > 0

  // Check for admin session cookie
  const adminCookie = request.cookies.get('usra-admin-session')
  const hasAdminSession = adminCookie?.value && adminCookie.value.length > 0

  // Protect admin routes
  if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
    if (!hasAdminSession) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // Protect API admin routes
  if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    if (!hasAdminSession) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  // Protect authenticated routes (everything except public)
  if (!hasValidSession && !pathname.startsWith('/api/')) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Rate limiting headers
  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo-new.png|manifest.json|scripts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
