# Task 4 - Fix Supabase Realtime Subscription Issues

## Agent: Main Agent
## Status: COMPLETED

## Summary
Fixed all Supabase realtime subscription issues causing "cannot add postgres_changes callbacks after subscribe()" errors, infinite reload loops, and the non-functional Add Chore button.

## Changes Made

### 1. tasks-page.tsx
- **Removed**: Duplicate `tasks-${familyId}` channel subscription (lines 625-634)
- **Reason**: This channel was already created by the global `subscribeToRealtimeUpdates()` in `fetch-family-data.ts`. Calling `.channel('tasks-${familyId}')` returns the SAME channel object (Supabase reuses channels by name), so calling `.on()` after the global subscription already called `.subscribe()` caused the error.
- **Added**: Comment explaining why the page-level subscription was removed

### 2. grocery-page.tsx
- **Removed**: Duplicate `grocery-changes` channel subscription (lines 618-633)
- **Removed**: `channelRef` ref (no longer needed without the subscription)
- **Simplified**: The useEffect now only calls `fetchItems()` on mount, with no realtime subscription
- **Reason**: The global subscription already handles `grocery-${familyId}` for realtime updates

### 3. page.tsx (MainApp component)
- **Fixed**: Changed `fetchInitialData` useEffect dependency from `currentFamily` (object reference) to `currentFamily?.id` (primitive) to prevent unnecessary re-renders when the object reference changes
- **Added**: `dataFetchedForFamilyRef` to prevent double-fetching data when `setCurrentFamily` triggers a re-render
- **Fixed**: Race condition in realtime subscription useEffect by adding `cancelled` flag to prevent subscription creation after component unmount

### 4. chores-page.tsx
- **Fixed**: Add Chore button not working in empty state
- **Bug**: When `chores.length === 0`, the component returned early with empty state UI that did NOT include the `AddChoreDialog` component
- **Fix**: Added `<AddChoreDialog>` to the empty state JSX

## Files Modified
- `/home/z/my-project/src/components/tasks/tasks-page.tsx`
- `/home/z/my-project/src/components/grocery/grocery-page.tsx`
- `/home/z/my-project/src/app/page.tsx`
- `/home/z/my-project/src/components/chores/chores-page.tsx`

## Verification
- `bun run lint` passes with 0 errors, 0 warnings
- Dev server compiles successfully
- No duplicate Supabase channels remain in any page component
