import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    let next = searchParams.get('next') ?? '/'

    // Validate next param: must be a safe relative path
    if (!next.startsWith('/') || next.startsWith('//')) {
      next = '/'
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      // Supabase not configured — redirect back without auth
      return NextResponse.redirect(`${origin}${next}`)
    }

    if (code) {
      try {
        const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              )
            },
          },
        })

        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          const response = NextResponse.redirect(`${origin}${next}`)

          // Set auth cookies
          const { data } = await supabase.auth.getSession()
          const session = data?.session ?? null
          if (session) {
            response.cookies.set('sb-access-token', session.access_token, {
              path: '/',
              maxAge: 60 * 60 * 24 * 7,
              sameSite: 'lax',
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
            })
            response.cookies.set('sb-refresh-token', session.refresh_token, {
              path: '/',
              maxAge: 60 * 60 * 24 * 7,
              sameSite: 'lax',
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
            })
          }

          // Forward any cookies that Supabase set on the request
          for (const cookie of request.cookies.getAll()) {
            // Only set if not already set above
            if (!response.cookies.get(cookie.name)) {
              response.cookies.set(cookie.name, cookie.value)
            }
          }

          return response
        }
      } catch {
        // Auth exchange failed — redirect back
      }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/`)
  } catch (error) {
    console.error('[Auth Callback] Error:', error)
    // Redirect to home on any uncaught error
    const origin = new URL(request.url).origin
    return NextResponse.redirect(`${origin}/`)
  }
}
