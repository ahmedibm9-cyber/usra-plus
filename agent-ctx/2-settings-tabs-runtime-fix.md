# Task 2: Settings Tabs UI Fix & Runtime Issues

## Agent: settings-tabs-runtime-fix

## Summary

Fixed 3 issues reported by the user:
1. Settings tabs looking bad on mobile / crammed horizontally
2. Runtime problems causing infinite loading
3. App constantly re-compiling/rendering

## Changes Made

### 1. Settings Tabs UI (`src/components/settings/settings-page.tsx`)

**Problem**: 9 tabs crammed horizontally, breakpoint at `lg` (1024px) was too wide for tablet, desktop sidebar width too large at `w-64`.

**Fix**:
- Changed breakpoint from `lg` to `md` (768px) — vertical sidebar shows earlier on tablets
- Changed desktop sidebar width from `w-64` to `w-56` for better proportions
- Changed mobile scroll container from `ScrollArea` to native `overflow-x-auto` with negative margin trick for edge-to-edge feel
- Updated border style from `border-[--border-medium]` to `border-[--border-subtle]`
- Added `shrink-0` to icons and `<span>` wrappers for better text truncation
- Changed tab styling from `rounded-lg` to `rounded-xl` on mobile for consistency
- Removed unused `Tabs, TabsContent, TabsList, TabsTrigger` imports

### 2. Dashboard Infinite Loop (`src/components/dashboard/dashboard-page.tsx`)

**Problem**: `fetchData` useCallback had `taskStore.tasks` and `groceryStore.items` in its dependency array. Every time the Zustand store updated these arrays (creating new object references), `fetchData` was recreated, triggering the `useEffect([fetchData])` to re-fire, potentially causing infinite data fetching loops.

**Fix**:
- Removed `taskStore.tasks` and `groceryStore.items` from the `useCallback` dependency array
- Changed to read store data via `useTaskStore.getState().tasks` and `useGroceryStore.getState().items` inside the function (avoids reactive closure)
- Removed stale closure reference to `tasks.length` / `groceryItems.length` in catch block
- Changed catch block to silently use existing data instead of setting noisy error state

### 3. Auth State Change Re-compiling (`src/app/page.tsx`)

**Problem**: `onAuthStateChange` listener fired on every auth event including `TOKEN_REFRESHED` (which occurs every ~5 minutes). Each event triggered a Supabase profile fetch and `setUser()`, which created a new user object reference in the store, potentially causing unnecessary re-renders throughout the app.

**Fix**:
- Added early return check for `TOKEN_REFRESHED` events when the user ID hasn't changed
- This prevents redundant profile fetches and `setUser()` calls on token refresh
- Auth events like `SIGNED_IN` and `USER_UPDATED` still trigger profile fetches as expected

### 4. Other Pages (Verified Clean)

- **milestones-page.tsx**: No Supabase queries, uses local Zustand store only — clean
- **chores-page.tsx**: No Supabase queries, uses local Zustand store only — clean
- **meal-plan-page.tsx**: Has AI suggestions fetch with proper try/catch/finally — clean
- **budget-page.tsx**: No Supabase queries, uses local Zustand store only — clean

## Lint Result

```
0 errors, 2 warnings (pre-existing, unrelated to changes)
```

## Dev Server

No compilation errors, server running normally on port 3000.
