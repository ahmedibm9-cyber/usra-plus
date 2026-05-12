# Task 2-a: Simplify Supabase Client — Remove Reachability-Based Client Switching

## Agent: auth-client-fix-agent

## Summary
Simplified the Supabase client to always return the real browser client when env vars are available, removing the reachability-based client switching that caused "Failed to fetch" errors and auth redirect loops.

## Changes Made

### 1. `/home/z/my-project/src/lib/supabase/client.ts`
- **Simplified `createClient()`**: Now always returns `createBrowserClient(url, key)` when env vars are available, regardless of reachability status
- **Removed client switching logic**: Deleted the `if (reachability === 'unreachable')` and `if (reachability === 'unknown')` branches that returned the local auth stub
- **Reachability is diagnostic-only**: `startReachabilityCheck()` still runs and dispatches events, but does NOT invalidate cached clients or affect which client `createClient()` returns
- **Removed client invalidation**: No more `_cachedClient = null` / `_cachedNoOpClient = null` in reachability handlers
- **Kept all helper functions**: `isDemoUserId()`, `isLocalUserId()`, `isDemoMode()`, `isSupabaseUnreachable()`, `resetReachability()`, `createLocalOnlyClient()`
- **Kept local auth stub intact**: Demo account and offline mode systems unchanged

### 2. `/home/z/my-project/src/app/page.tsx`
- **Removed `reachabilityVersion` state**: No more version tracking for client recreation
- **Removed `lastReachabilityRef`**: No longer needed
- **Removed reachability change listener useEffect**: No more client switching on reachability events
- **Stable supabase client**: `useMemo(() => safeCreateClient(), [])` with empty dependency array
- **Reversed session check order**: Supabase first (real auth), then local (demo/offline fallback)
- **Added 5-second timeout**: `Promise.race([sessionCheckPromise(), timeoutPromise])` prevents infinite loading
- **Fixed lint errors**: `queueMicrotask(() => setMounted(true))` and `Promise.resolve().then(hydrate)` for async setState
- **Removed `resetReachability` from imports**: No longer needed in page.tsx

## Key Behavioral Changes
| Before | After |
|--------|-------|
| `createClient()` returned local stub when reachability was 'unknown' | `createClient()` always returns real Supabase client when env vars available |
| Reachability events caused client recreation + re-renders | Reachability events only update OfflineBanner UI |
| Session check: local first, then Supabase | Session check: Supabase first, then local |
| No timeout on session check | 5-second timeout prevents infinite loading |
| Client could switch mid-session (race conditions) | Client is stable throughout session |

## Lint: PASSING ✅
