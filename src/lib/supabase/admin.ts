import { createClient } from '@supabase/supabase-js'

// We use `any` as the database generic because many tables were created
// AFTER the initial Supabase type-generation step (ab_tests, user_bans,
// coupons, feature_flags, etc.). Without re-running `supabase gen types`,
// those tables resolve to `never` and break `.insert()` / `.update()` calls.
// Runtime values are still validated by Supabase's PostgREST layer.
type AnyDatabase = any

let _adminClient: ReturnType<typeof createClient<AnyDatabase>> | null = null

export function getSupabaseAdmin() {
  if (_adminClient) return _adminClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  _adminClient = createClient<AnyDatabase>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return _adminClient
}

/**
 * Alias for getSupabaseAdmin() — use this for tables that were created
 * after the initial Supabase type-generation step.
 * (Kept for backward compat with routes already using it.)
 */
export function getUntypedAdmin() {
  return getSupabaseAdmin()
}
