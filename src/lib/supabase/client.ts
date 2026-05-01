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

    const fromStub = (_table: string) => new Proxy({}, {
      get(_target, method) {
        // Terminal methods that return a promise
        const terminalMethods = ['select', 'insert', 'update', 'delete', 'upsert']
        if (terminalMethods.includes(method as string)) {
          return (..._args: unknown[]) => Promise.resolve({ data: null, error: null })
        }
        // Chainable methods (eq, neq, etc.)
        return (..._args: unknown[]) => new Proxy({}, {
          get(_t2, m2) {
            if (terminalMethods.includes(m2 as string)) {
              return (..._a2: unknown[]) => Promise.resolve({ data: null, error: null })
            }
            return (..._a2: unknown[]) => new Proxy({}, {
              get(_t3, m3) {
                if (['single', 'maybeSingle', 'limit', 'order', 'range'].includes(m3 as string)) {
                  return (..._a3: unknown[]) => Promise.resolve({ data: null, error: null })
                }
                return () => new Proxy({}, this.get as any)
              }
            })
          }
        })
      }
    })

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
