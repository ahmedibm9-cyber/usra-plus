import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

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
        const { data: { session } } = await supabase.auth.getSession()
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

        return response
      }
    } catch {
      // Auth exchange failed — redirect back
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/`)
}
