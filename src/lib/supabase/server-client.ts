import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client for use in API routes (server-side only).
 * This is a simpler alternative to createServerSupabaseClient() which
 * requires the Next.js cookies() context. Use this for API routes that
 * don't need cookie-based auth.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return null
  }

  return createSupabaseClient(url, key)
}
