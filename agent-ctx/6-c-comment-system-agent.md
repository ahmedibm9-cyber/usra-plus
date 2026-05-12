# Task 6-c: Add Task Comments/Notes System with Threaded Replies

## Agent: Comments System Builder

### Work Log:

1. **Created `/src/stores/comment-store.ts`**:
   - `TaskComment` interface with `id`, `task_id`, `parent_id` (null for top-level, id for replies), `author_id`, `author_name`, `author_avatar`, `content`, `created_at`, `updated_at`
   - Zustand store with `comments`, `isLoading` state
   - Actions: `setComments`, `addComment`, `updateComment`, `removeComment`, `setIsLoading`
   - Derived getters: `getCommentsForTask(taskId)`, `getRepliesForComment(commentId)`, `getCommentCountForTask(taskId)`
   - `removeComment` also removes child replies (cascading delete)

2. **Added i18n translations**:
   - **en.ts**: Added `comments` section with 10 keys: `comments`, `addComment`, `reply`, `send`, `cancel`, `noComments`, `startConversation`, `replyTo`, `commentCount`, `delete`
   - **ar.ts**: Added matching Arabic translations for all `comments` section keys

3. **Added CommentsPanel component in `/src/components/tasks/tasks-page.tsx`**:
   - `getRelativeTime()` helper: shows "now"/"5m"/"1h"/"2d" (Arabic: "الآن"/"5د"/"1س"/"2ي")
   - Collapsible/expandable comments section with ▲/▼ toggle
   - Shows comment count badge in header
   - Empty state with MessageCircle icon and bilingual "No comments yet. Start the conversation!" text
   - Each top-level comment shows:
     - Author avatar (h-7 w-7 rounded-full)
     - Author name (text-sm font-medium)
     - Content (text-sm)
     - Relative timestamp
     - "Reply" button (CornerDownRight icon, text-xs, hover:text-[#6366F1])
     - "Delete" button (only for own comments)
   - Inline reply input with auto-resize textarea, Send button (indigo), Cancel button
   - Replies indented with `ml-8 border-l-2 border-[#6366F1]/20 pl-3`
   - Reply avatars are smaller (h-5 w-5)
   - Comment input at bottom with auto-resize textarea and Enter-to-send (Shift+Enter for newline)
   - `max-h-64 overflow-y-auto` for scrollable comments list

4. **Added Comment Count Badge on Task Cards**:
   - Uses `useCommentStore` selector to get comment count per task
   - Shows MessageCircle icon + count number in `text-xs bg-white/[0.04] px-1.5 py-0.5 rounded-full`
   - Only visible when count > 0
   - Positioned next to priority badge

5. **Integrated CommentsPanel into TaskModal**:
   - Shows below task form fields, only when editing an existing task
   - Dialog has `max-h-[85vh]` and scrollable content area for long comment threads

6. **Updated Demo Mode in `/src/components/auth/login-form.tsx`**:
   - After calendar store seeding, added comment store seeding
   - 6 comments across 3 tasks:
     - task-1 (Buy Eid gifts): Ahmed "We should start shopping soon" → Noura reply "I'll get the gifts for the kids" → Khalid "Don't forget greeting cards!"
     - task-4 (Help with homework): Noura "Math homework this week" → Ahmed reply "I'll help after Asr prayer"
     - task-2 (Clean the house): Khalid "I'll clean the kitchen and living room"
   - Full bilingual support (Arabic/English) via isRTL flag
   - Dynamic import: `await import('@/stores/comment-store')`

7. **Lint: PASS** — No errors
8. **Server: HTTP 200** — Compiles successfully

### Stage Summary:
- Comment store created with full CRUD + threaded replies support
- CommentsPanel with collapsible UI, inline reply, auto-resize textarea, relative timestamps
- Comment count badge on task cards (MessageCircle icon)
- Demo mode seeds 6 comments across 3 tasks (some with threaded replies)
- Full Arabic/English bilingual support
- Lint: PASS, Server: HTTP 200
