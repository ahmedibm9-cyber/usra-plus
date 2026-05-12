'use client'

import { createBrowserClient } from '@supabase/ssr'

/** Check if we're running without real Supabase credentials (demo/offline mode) */
export function isDemoMode(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

/** Check if a user ID belongs to the demo user (returns false if not applicable) */
export function isDemoUserId(_userId: string): boolean {
  // Demo user IDs start with a known prefix or match the demo seed user
  return _userId.startsWith('demo-') || _userId === 'demo-user'
}

/** Check if a user ID belongs to a local-only user (not from Supabase Auth) */
export function isLocalUserId(_userId: string): boolean {
  // Local user IDs start with 'local-' or are UUIDs generated client-side
  return _userId.startsWith('local-')
}

// ─── No-op Supabase Stub ───────────────────────────────────────────────────────
// When env vars are missing, we return a Proxy-based stub that implements the
// full Supabase client interface but returns safe defaults. This way all 40+
// call sites across the app work without null checks.
//
// IMPORTANT: Every method must return the CORRECT nested shape so that
// destructuring like `const { data: { session } } = await supabase.auth.getSession()`
// works without crashing. That means `data` must be an object with the expected
// keys, NOT null.

// Error returned when Supabase is not configured — tells the UI clearly
// that the backend is unavailable rather than silently returning null.
const DEMO_MODE_ERROR = {
  name: 'DemoModeError',
  message: 'Authentication service is not yet configured. Please contact support.',
  status: 503,
} as const

function createNoOpAuthStub() {
  return {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    // Auth mutations return a clear error so the UI can inform the user
    signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: DEMO_MODE_ERROR }),
    signInWithOAuth: () => Promise.resolve({ data: { user: null, session: null, provider: '', url: null }, error: DEMO_MODE_ERROR }),
    signUp: () => Promise.resolve({ data: { user: null, session: null }, error: DEMO_MODE_ERROR }),
    signOut: () => Promise.resolve({ error: null }),
    resetPasswordForEmail: () => Promise.resolve({ data: {}, error: DEMO_MODE_ERROR }),
    updateUser: () => Promise.resolve({ data: { user: null }, error: DEMO_MODE_ERROR }),
    onAuthStateChange: () => {
      // Return a subscription-like object with unsubscribe
      return { data: { subscription: { unsubscribe: () => {} } } }
    },
    exchangeCodeForSession: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
    refreshSession: () => Promise.resolve({ data: { session: null }, error: null }),
  }
}

function createNoOpFromStub() {
  // Chainable query builder: supabase.from('x').select('*').eq('id', 1).single()
  // Must return { data: null, error: null } when awaited/then'd
  const createChain = (): Record<string, unknown> => {
    const chainHandlers: Record<string, unknown> = {
      then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
      catch: (resolve: (v: unknown) => void) => resolve(null),
    }

    return new Proxy(chainHandlers, {
      get(target, prop: string) {
        if (prop in target) return target[prop]
        // Return a new chain for any method call
        return (..._args: unknown[]) => createChain()
      },
    })
  }

  return (_table: string) => createChain()
}

function createNoOpStorageStub() {
  return {
    from: (_bucket: string) => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      download: () => Promise.resolve({ data: null, error: null }),
      remove: () => Promise.resolve({ data: null, error: null }),
      list: () => Promise.resolve({ data: [], error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  }
}

function createNoOpChannelStub() {
  return {
    channel: (_name: string) => ({
      on: function () { return this },
      subscribe: function () { return this },
      unsubscribe: () => {},
    }),
    removeChannel: () => {},
  }
}

function createNoOpClient(): ReturnType<typeof createBrowserClient> {
  const stub = {
    auth: createNoOpAuthStub(),
    from: createNoOpFromStub(),
    storage: createNoOpStorageStub(),
    ...createNoOpChannelStub(),
  }

  return stub as unknown as ReturnType<typeof createBrowserClient>
}

// ─── Memoized real client ───────────────────────────────────────────────────────
let _cachedClient: ReturnType<typeof createBrowserClient> | null = null
let _cachedNoOpClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient(): ReturnType<typeof createBrowserClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // No env vars — return the no-op stub so the app works in demo mode
    // without crashing on .auth.getSession(), .from(), etc.
    // Memoize to prevent creating a new stub on every render
    if (!_cachedNoOpClient) {
      _cachedNoOpClient = createNoOpClient()
    }
    return _cachedNoOpClient
  }

  // Memoize the real client to avoid creating a new instance per render
  if (!_cachedClient) {
    _cachedClient = createBrowserClient(url, key)
  }

  return _cachedClient
}
