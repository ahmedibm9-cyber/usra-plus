'use client'

import { createBrowserClient } from '@supabase/ssr'

type SupabaseClient = ReturnType<typeof createBrowserClient>

let cachedClient: SupabaseClient | null = null
let isDemo = false

/**
 * Returns true if Supabase is not configured (demo/offline mode).
 */
export function isDemoMode(): boolean {
  return isDemo
}

/**
 * Creates a Supabase browser client.
 * When env vars are missing, returns a safe no-op stub that
 * won't crash callers — every method returns empty/null results.
 */
export function createClient(): SupabaseClient {
  if (cachedClient) return cachedClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    isDemo = true
    // Return a safe no-op stub so all callers can use .auth, .from(), etc.
    // without null checks. Every method returns a resolved promise with
    // empty/null data so the app works in demo mode.
    const stubHandler: ProxyHandler<object> = {
      get(_target, prop) {
        if (prop === 'then') return undefined // not a thenable
        return (..._args: unknown[]) => {
          // Return a proxy that also intercepts chained calls
          return new Proxy(Promise.resolve({ data: null, error: null }), stubHandler)
        }
      }
    }

    const authStub = {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
      signInWithOAuth: () => Promise.resolve({ data: { provider: '', url: null }, error: { message: 'Supabase not configured' } }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      resetPasswordForEmail: () => Promise.resolve({ data: {}, error: null }),
      updateUser: () => Promise.resolve({ data: { user: null }, error: null }),
    }

    const fromStub = (_table: string) => {
      const createQueryBuilder = () => {
        const builder = {
          select: (..._args: unknown[]) => builder,
          insert: (..._args: unknown[]) => builder,
          update: (..._args: unknown[]) => builder,
          delete: (..._args: unknown[]) => builder,
          upsert: (..._args: unknown[]) => builder,
          eq: (..._args: unknown[]) => builder,
          neq: (..._args: unknown[]) => builder,
          gt: (..._args: unknown[]) => builder,
          gte: (..._args: unknown[]) => builder,
          lt: (..._args: unknown[]) => builder,
          lte: (..._args: unknown[]) => builder,
          like: (..._args: unknown[]) => builder,
          ilike: (..._args: unknown[]) => builder,
          in: (..._args: unknown[]) => builder,
          contains: (..._args: unknown[]) => builder,
          containedBy: (..._args: unknown[]) => builder,
          range: (..._args: unknown[]) => builder,
          order: (..._args: unknown[]) => builder,
          limit: (..._args: unknown[]) => builder,
          single: () => Promise.resolve({ data: null, error: null }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          csv: () => Promise.resolve({ data: null, error: null }),
          explain: () => Promise.resolve({ data: null, error: null }),
        }
        return builder
      }
      return createQueryBuilder()
    }

    const channelStub = (_name: string) => ({
      on: () => channelStub(_name),
      subscribe: () => {},
      unsubscribe: () => {},
    })

    cachedClient = {
      auth: authStub,
      from: fromStub,
      channel: channelStub,
      removeChannel: () => {},
      getChannels: () => [],
      realtime: {} as any,
    } as unknown as SupabaseClient

    return cachedClient
  }

  cachedClient = createBrowserClient(url, key)
  return cachedClient
}
