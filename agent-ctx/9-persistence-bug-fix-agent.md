# Task 9: Fix Partial Persistence Bugs

## Summary
Fixed 4 partial persistence bugs where some features saved to Supabase but others didn't.

## Changes Made

### Bug 1: Grocery Clear Checked
- File: `src/components/grocery/grocery-page.tsx`
- `confirmClearChecked` now async, deletes from Supabase after removing from local store
- Undo action also re-inserts into Supabase

### Bug 2: Calendar Location/Repeat
- File: `src/components/calendar/calendar-page.tsx`
- Added `buildDescriptionWithMetadata()` and `parseDescriptionMetadata()` helpers
- Location and repeat embedded in description field with structured format (📍 / 🔁 prefixes)
- All Supabase insert/update calls and store fallbacks now use combined description

### Bug 3: Task Comments
- File: `src/stores/comment-store.ts` - Added Supabase CRUD with PGRST205 fallback
- File: `src/components/tasks/tasks-page.tsx` - CommentsPanel now fetches from and saves to Supabase
- File: `supabase/additional-tables.sql` - Added task_comments table, RLS, indexes

### Bug 4: Chat File Uploads
- File: `src/components/chat/chat-page.tsx`
- handleSendFiles now uploads to Supabase Storage first, falls back to blob URL

## Verification
- `bun run lint` passes with 0 errors
- Dev server returns HTTP 200
