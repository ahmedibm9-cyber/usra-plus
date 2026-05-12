# Task 5 - Supabase Unreachability Fix

## Agent: Main Agent
## Task: Fix Supabase unreachability — add reachability check, graceful fallback, offline banner, fix infinite loading

## Summary
All 5 sub-tasks completed successfully:

1. **Supabase client reachability check** - Added async `checkSupabaseReachable()` with 3s timeout, cached `_isReachable` state, `isSupabaseReachable()` and `resetReachability()` exports. No-op client returned when backend is unreachable.

2. **Page.tsx session check hardening** - Added 5-second timeout safety net, profile fetch failures use fallback session data, `console.warn` instead of `console.error`, `OfflineBanner` component added.

3. **Data-fetching pages graceful error handling** - All pages (tasks, calendar, grocery, chat, files, dashboard) now silently set empty data instead of showing toast.error on network failures.

4. **Infinite loading/re-rendering fixes** - Grocery and chat realtime subscription useEffects simplified to only depend on `familyId`, removing unstable callback references from dependency arrays. Try-catch added around channel setup and cleanup.

5. **Global offline banner** - `OfflineBanner` component in page.tsx listens for `supabase-unreachable` custom event and shows amber banner at top of app.

## Files Modified
- `/src/lib/supabase/client.ts`
- `/src/app/page.tsx`
- `/src/components/tasks/tasks-page.tsx`
- `/src/components/calendar/calendar-page.tsx`
- `/src/components/grocery/grocery-page.tsx`
- `/src/components/chat/chat-page.tsx`
- `/src/components/files/files-page.tsx`
- `/home/z/my-project/worklog.md`

## Lint Status
Zero errors, zero warnings after all changes.
