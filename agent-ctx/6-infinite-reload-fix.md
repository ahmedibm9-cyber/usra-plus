# Task 6: Fix Infinite Page Reload Loops

## Summary
Fixed 5 root causes of infinite reload/re-render loops in the USRA PLUS app.

## Changes Made

### 1. layout.tsx - ChunkLoadError reload counter
- Added max 3 reload attempts using sessionStorage counter
- Counter clears on successful page load
- Prevents infinite page reload when chunks consistently fail

### 2. page.tsx - RootPage auth retry limits  
- Added MAX_AUTH_RETRIES = 3 with retry counter
- Shows persistent error UI after max retries
- "Try Again" button resets counter and retries
- Added cleanup flag to prevent state updates after unmount

### 3. page.tsx + main-app.tsx - onAuthStateChange guard
- Changed from responding to all auth events to only SIGNED_IN
- Prevents TOKEN_REFRESHED from triggering setUser → re-render loops

### 4. dashboard-page.tsx - Fetch retry limits
- Added MAX_FETCH_RETRIES = 3 with exponential backoff (1s, 2s, 4s)
- Changed needMembersFetch to use getState() instead of component subscription
- Error retry button resets counter before retrying

### 5. page.tsx + dashboard-page.tsx + main-app.tsx - Stable Zustand selectors
- Replaced `const { user } = useAuthStore()` with `const user = useAuthStore(s => s.user)`
- Prevents re-renders from unrelated store changes

## Files Modified
- /src/app/layout.tsx
- /src/app/page.tsx
- /src/components/dashboard/dashboard-page.tsx
- /src/components/main-app/main-app.tsx
