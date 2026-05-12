-- ═══════════════════════════════════════════════════════════════════════════════
-- USRA PLUS — PRODUCTION RLS + INDEXES MIGRATION (Idempotent)
-- ═══════════════════════════════════════════════════════════════════════════════
-- This migration hardens the database for production:
-- 1. Strict RLS on subscriptions table (PREVENT self-upgrade)
-- 2. Composite indexes for scaling
-- 3. Optimized RLS policies for all tables
-- 4. Secure default policies
--
-- IDEMPOTENT: Every CREATE POLICY is preceded by DROP POLICY IF EXISTS
-- so this file can be run multiple times without errors.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. SUBSCRIPTIONS TABLE RLS — CRITICAL SECURITY ────────────────────────

-- Enable RLS on subscriptions (if not already enabled)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Remove ALL existing policies (old permissive ones + any from previous migration runs)
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Anyone can insert subscription" ON subscriptions;
DROP POLICY IF EXISTS "Anyone can update subscription" ON subscriptions;
DROP POLICY IF EXISTS "Service role can do everything" ON subscriptions;
DROP POLICY IF EXISTS "Users can read own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Only service role can insert subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Only service role can update subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Only service role can delete subscriptions" ON subscriptions;

-- SELECT: Users can only READ their own subscription (for display purposes)
CREATE POLICY "Users can read own subscription"
  ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: ONLY service role can create subscriptions (payment webhooks, admin)
-- Users CANNOT create their own subscription row
CREATE POLICY "Only service role can insert subscriptions"
  ON subscriptions
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- UPDATE: ONLY service role can update subscriptions
-- This is the CRITICAL fix: users CANNOT self-upgrade their plan
CREATE POLICY "Only service role can update subscriptions"
  ON subscriptions
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- DELETE: ONLY service role can delete subscriptions
CREATE POLICY "Only service role can delete subscriptions"
  ON subscriptions
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ─── 2. PROFILES TABLE RLS ─────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop old + new policies for idempotency
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read profiles" ON profiles;

-- Users can read all profiles (needed for family member display, task assignment)
CREATE POLICY "Users can read profiles"
  ON profiles
  FOR SELECT
  USING (true);

-- Users can update their own profile only
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile on signup
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ─── 3. FAMILIES TABLE RLS ─────────────────────────────────────────────────

ALTER TABLE families ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view families" ON families;
DROP POLICY IF EXISTS "Anyone can insert families" ON families;
DROP POLICY IF EXISTS "Anyone can update families" ON families;
DROP POLICY IF EXISTS "Users can view own families" ON families;
DROP POLICY IF EXISTS "Users can create families" ON families;
DROP POLICY IF EXISTS "Family admins can update family" ON families;

-- Users can view families they belong to
CREATE POLICY "Users can view own families"
  ON families
  FOR SELECT
  USING (
    id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Users can create families (become owner automatically)
CREATE POLICY "Users can create families"
  ON families
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Only family owner/admin can update family details
CREATE POLICY "Family admins can update family"
  ON families
  FOR UPDATE
  USING (
    id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ─── 4. FAMILY_MEMBERS TABLE RLS ────────────────────────────────────────────

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view family members" ON family_members;
DROP POLICY IF EXISTS "Anyone can insert family members" ON family_members;
DROP POLICY IF EXISTS "Users can view own family members" ON family_members;
DROP POLICY IF EXISTS "Users can join families" ON family_members;
DROP POLICY IF EXISTS "Family admins can add members" ON family_members;
DROP POLICY IF EXISTS "Family admins can remove members" ON family_members;

-- Users can view members of families they belong to
CREATE POLICY "Users can view own family members"
  ON family_members
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Users can join a family via invite code (INSERT with role='member')
CREATE POLICY "Users can join families"
  ON family_members
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND role = 'member'
  );

-- Family admins can add members with any role
CREATE POLICY "Family admins can add members"
  ON family_members
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Family admins can remove members
CREATE POLICY "Family admins can remove members"
  ON family_members
  FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ─── 5. TASKS TABLE RLS ────────────────────────────────────────────────────

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view tasks" ON tasks;
DROP POLICY IF EXISTS "Anyone can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Anyone can update tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view family tasks" ON tasks;
DROP POLICY IF EXISTS "Family members can create tasks" ON tasks;
DROP POLICY IF EXISTS "Family members can update tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks or admin can delete" ON tasks;

-- Users can view tasks in their families
CREATE POLICY "Users can view family tasks"
  ON tasks
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Family members can create tasks
CREATE POLICY "Family members can create tasks"
  ON tasks
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Users can update tasks in their families (assign, change status, etc.)
CREATE POLICY "Family members can update tasks"
  ON tasks
  FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own tasks or family admins can delete any
CREATE POLICY "Users can delete own tasks or admin can delete"
  ON tasks
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ─── 6. CHAT_MESSAGES TABLE RLS ────────────────────────────────────────────

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can view family chat" ON chat_messages;
DROP POLICY IF EXISTS "Family members can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON chat_messages;

-- Users can view messages in their family chats
CREATE POLICY "Users can view family chat"
  ON chat_messages
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Family members can send messages
CREATE POLICY "Family members can send messages"
  ON chat_messages
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );

-- Only sender can delete their own messages, or admin
CREATE POLICY "Users can delete own messages"
  ON chat_messages
  FOR DELETE
  USING (
    sender_id = auth.uid()
    OR family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ─── 7. GROCERY_ITEMS TABLE RLS ────────────────────────────────────────────

ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view grocery items" ON grocery_items;
DROP POLICY IF EXISTS "Anyone can insert grocery items" ON grocery_items;
DROP POLICY IF EXISTS "Users can view family groceries" ON grocery_items;
DROP POLICY IF EXISTS "Family members can add groceries" ON grocery_items;
DROP POLICY IF EXISTS "Family members can update groceries" ON grocery_items;
DROP POLICY IF EXISTS "Family members can delete groceries" ON grocery_items;

-- Users can view grocery items in their families
CREATE POLICY "Users can view family groceries"
  ON grocery_items
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Family members can add grocery items
CREATE POLICY "Family members can add groceries"
  ON grocery_items
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Family members can update grocery items
CREATE POLICY "Family members can update groceries"
  ON grocery_items
  FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Family members can delete grocery items
CREATE POLICY "Family members can delete groceries"
  ON grocery_items
  FOR DELETE
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- ─── 8. CALENDAR_EVENTS TABLE RLS ──────────────────────────────────────────

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view calendar events" ON calendar_events;
DROP POLICY IF EXISTS "Users can view family events" ON calendar_events;
DROP POLICY IF EXISTS "Family members can create events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update own events or admin" ON calendar_events;
DROP POLICY IF EXISTS "Users can delete own events or admin" ON calendar_events;

-- Users can view events in their families
CREATE POLICY "Users can view family events"
  ON calendar_events
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Family members can create events
CREATE POLICY "Family members can create events"
  ON calendar_events
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Users can update events they created, or family admins
CREATE POLICY "Users can update own events or admin"
  ON calendar_events
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Users can delete own events, or family admins
CREATE POLICY "Users can delete own events or admin"
  ON calendar_events
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMPOSITE INDEXES FOR SCALING
-- ═══════════════════════════════════════════════════════════════════════════════

-- Chat messages: most common query is by family_id, ordered by time
CREATE INDEX IF NOT EXISTS idx_chat_messages_family_created 
  ON chat_messages (family_id, created_at DESC);

-- Chat messages: lookup by sender
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender 
  ON chat_messages (sender_id);

-- Tasks: query by family + status (kanban board)
CREATE INDEX IF NOT EXISTS idx_tasks_family_status 
  ON tasks (family_id, status);

-- Tasks: query by assigned user
CREATE INDEX IF NOT EXISTS idx_tasks_assigned 
  ON tasks (assigned_to) WHERE assigned_to IS NOT NULL;

-- Tasks: query by due date for overdue detection
CREATE INDEX IF NOT EXISTS idx_tasks_due_date 
  ON tasks (family_id, due_date) WHERE due_date IS NOT NULL;

-- Grocery items: query by family + checked status
CREATE INDEX IF NOT EXISTS idx_grocery_family_checked 
  ON grocery_items (family_id, checked);

-- Calendar events: query by family + time range
CREATE INDEX IF NOT EXISTS idx_calendar_family_time 
  ON calendar_events (family_id, start_time DESC);

-- Family members: lookup by family_id
CREATE INDEX IF NOT EXISTS idx_family_members_family 
  ON family_members (family_id);

-- Family members: lookup by user_id (for "my families" query)
CREATE INDEX IF NOT EXISTS idx_family_members_user 
  ON family_members (user_id);

-- Subscriptions: lookup by user_id (for plan check)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user 
  ON subscriptions (user_id);

-- Notifications: query by user + read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON notifications (user_id, read) WHERE read = false;

-- Profiles: search by email
CREATE INDEX IF NOT EXISTS idx_profiles_email 
  ON profiles (email);

-- Family files: query by family (only if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'family_files') THEN
    CREATE INDEX IF NOT EXISTS idx_family_files_family ON family_files (family_id);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ADDITIONAL SECURITY: Ensure all tables have RLS enabled
-- Uses DO blocks to skip tables that don't exist yet
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'family_files') THEN
    ALTER TABLE family_files ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chores') THEN
    ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meal_plans') THEN
    ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'milestones') THEN
    ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_expenses') THEN
    ALTER TABLE budget_expenses ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comments') THEN
    ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reactions') THEN
    ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS RLS
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Anyone can view notifications" ON notifications;
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
DROP POLICY IF EXISTS "Only service role can create notifications" ON notifications;

CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Only service role can create notifications (from triggers/webhooks)
CREATE POLICY "Only service role can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
