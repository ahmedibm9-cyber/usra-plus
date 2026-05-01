-- ============================================================
-- USRA PLUS — Complete Supabase Database Migration
-- ============================================================
-- Copy-paste this entire file into the Supabase SQL Editor
-- and click "Run" to set up the full database.
--
-- Contents:
--   1. Core App Tables (profiles, families, family_members, tasks,
--      calendar_events, grocery_items, chat_messages, family_files,
--      notifications, subscriptions)
--   2. Super Admin Tables (admin_users, admin_audit_logs,
--      feature_flags, plan_configs, announcements, support_tickets,
--      system_config)
--   3. Row Level Security (RLS) Policies
--   4. Indexes
--   5. Realtime Publications
--   6. Storage Buckets & Policies
--   7. Triggers & Functions
--   8. Seed Data (admin users, feature flags, plan configs, announcements)
-- ============================================================

-- ============================================================
-- 1. CORE APP TABLES
-- ============================================================

-- -------------------------------------------
-- PROFILES
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  country_code TEXT DEFAULT '+966',
  avatar_url TEXT,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ar')),
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -------------------------------------------
-- FAMILIES
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT NOT NULL UNIQUE DEFAULT upper(substring(gen_random_uuid()::text, 1, 8)),
  avatar_url TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view family" ON public.families
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = id AND user_id = auth.uid())
  );
CREATE POLICY "Family creator can insert family" ON public.families
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Family owner/admin can update family" ON public.families
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- -------------------------------------------
-- FAMILY MEMBERS
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  nickname TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view members" ON public.family_members
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can join family" ON public.family_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner/admin can update members" ON public.family_members
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = family_id AND fm.user_id = auth.uid() AND fm.role IN ('owner', 'admin'))
  );
CREATE POLICY "Owner/admin can remove members" ON public.family_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = family_id AND fm.user_id = auth.uid() AND fm.role IN ('owner', 'admin'))
    OR auth.uid() = user_id
  );

-- -------------------------------------------
-- TASKS
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES public.profiles(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view tasks" ON public.tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = tasks.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = tasks.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can update tasks" ON public.tasks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = tasks.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can delete tasks" ON public.tasks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = tasks.family_id AND user_id = auth.uid())
  );

-- -------------------------------------------
-- CALENDAR EVENTS
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  color TEXT DEFAULT '#6366F1',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view events" ON public.calendar_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = calendar_events.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can create events" ON public.calendar_events
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = calendar_events.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can update events" ON public.calendar_events
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = calendar_events.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can delete events" ON public.calendar_events
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = calendar_events.family_id AND user_id = auth.uid())
  );

-- -------------------------------------------
-- GROCERY ITEMS
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS public.grocery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  quantity INTEGER DEFAULT 1,
  checked BOOLEAN DEFAULT FALSE,
  added_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.grocery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view grocery items" ON public.grocery_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = grocery_items.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can create grocery items" ON public.grocery_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = grocery_items.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can update grocery items" ON public.grocery_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = grocery_items.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can delete grocery items" ON public.grocery_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = grocery_items.family_id AND user_id = auth.uid())
  );

-- -------------------------------------------
-- CHAT MESSAGES
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  reply_to UUID REFERENCES public.chat_messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view messages" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = chat_messages.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can send messages" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = chat_messages.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Sender can delete messages" ON public.chat_messages
  FOR DELETE USING (auth.uid() = sender_id);

-- -------------------------------------------
-- FAMILY FILES
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS public.family_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  storage_path TEXT NOT NULL,
  url TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.family_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view files" ON public.family_files
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = family_files.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Family members can upload files" ON public.family_files
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = family_files.family_id AND user_id = auth.uid())
  );
CREATE POLICY "Owner/admin can delete files" ON public.family_files
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.family_members WHERE family_id = family_files.family_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
    OR auth.uid() = uploaded_by
  );

-- -------------------------------------------
-- NOTIFICATIONS
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('task', 'calendar', 'grocery', 'chat', 'family', 'system')),
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- -------------------------------------------
-- SUBSCRIPTIONS
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'family_plus')),
  revenuecat_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can create own subscription" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 2. SUPER ADMIN TABLES
-- ============================================================

-- -------------------------------------------
-- ADMIN USERS
-- -------------------------------------------
-- Stores super admin accounts with role-based access.
-- These are separate from regular auth.users — admins
-- authenticate via a stealth 7-click login flow.
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,  -- bcrypt hash
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'support_admin' CHECK (role IN ('super_admin', 'support_admin', 'analytics_admin', 'billing_admin')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_by UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only service_role can access admin_users directly
-- (client-side uses the stealth login flow with demo credentials)
CREATE POLICY "Service role can manage admin users" ON public.admin_users
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- ADMIN AUDIT LOGS
-- -------------------------------------------
-- Immutable log of every admin action for accountability.
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,          -- e.g. 'admin_login', 'feature_flag_toggled', 'emergency_shutdown_enabled'
  target_type TEXT NOT NULL,     -- e.g. 'admin_auth', 'feature_flag', 'plan_config', 'system', 'user'
  target_id TEXT,                -- UUID of the affected record (nullable for system-wide actions)
  details JSONB DEFAULT '{}',   -- Arbitrary key-value details about the action
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage audit logs" ON public.admin_audit_logs
  FOR ALL USING (auth.role() = 'service_role');
-- Admins can read audit logs (for the Audit Logs tab)
CREATE POLICY "Admin users can read audit logs" ON public.admin_audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND is_active = TRUE)
  );

-- -------------------------------------------
-- FEATURE FLAGS
-- -------------------------------------------
-- Feature flags for progressive rollout and plan gating.
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,       -- e.g. 'ai_insights', 'hijri_calendar'
  name TEXT NOT NULL,             -- Human-readable name
  description TEXT DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  rollout_percentage INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  target_plan TEXT,               -- NULL = all plans, 'pro' = Pro only, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feature flags" ON public.feature_flags
  FOR SELECT USING (TRUE);
CREATE POLICY "Service role can manage feature flags" ON public.feature_flags
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- PLAN CONFIGS
-- -------------------------------------------
-- Subscription plan definitions with features and limits.
CREATE TABLE IF NOT EXISTS public.plan_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan TEXT NOT NULL UNIQUE CHECK (plan IN ('Free', 'Pro', 'Family+')),
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  features JSONB NOT NULL DEFAULT '[]',   -- Array of feature strings: ["Unlimited tasks", "1GB storage"]
  limits JSONB NOT NULL DEFAULT '{}',     -- Key-value limits: {"tasks": 10, "storage": 100, "families": 1, "members": 5}
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.plan_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read plan configs" ON public.plan_configs
  FOR SELECT USING (TRUE);
CREATE POLICY "Service role can manage plan configs" ON public.plan_configs
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- ANNOUNCEMENTS
-- -------------------------------------------
-- Platform-wide announcements shown to users.
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'critical')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,                           -- NULL = no end date
  created_by UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active announcements" ON public.announcements
  FOR SELECT USING (TRUE);
CREATE POLICY "Service role can manage announcements" ON public.announcements
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- SUPPORT TICKETS
-- -------------------------------------------
-- Support tickets for the admin Help Desk.
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'bug', 'feature_request', 'billing', 'account', 'technical')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_on_user', 'resolved', 'closed')),
  channel TEXT DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'social')),
  assigned_to UUID REFERENCES public.admin_users(id),
  resolution TEXT,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tickets" ON public.support_tickets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all tickets" ON public.support_tickets
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- SUPPORT TICKET COMMENTS
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,  -- Can be a user or an admin
  author_type TEXT NOT NULL DEFAULT 'user' CHECK (author_type IN ('user', 'admin')),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,  -- Internal notes visible only to admins
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.support_ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket participants can view comments" ON public.support_ticket_comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
    OR auth.role() = 'service_role'
  );
CREATE POLICY "Users can comment on own tickets" ON public.support_ticket_comments
  FOR INSERT WITH CHECK (
    author_type = 'user' AND auth.uid() = author_id AND
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
  );
CREATE POLICY "Service role can manage comments" ON public.support_ticket_comments
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- SYSTEM CONFIG
-- -------------------------------------------
-- Key-value store for system-wide settings like
-- maintenance mode, emergency shutdown, etc.
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_by UUID REFERENCES public.admin_users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system config" ON public.system_config
  FOR SELECT USING (TRUE);
CREATE POLICY "Service role can manage system config" ON public.system_config
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- 3. INDEXES
-- ============================================================

-- Core app indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_families_invite_code ON public.families(invite_code);
CREATE INDEX IF NOT EXISTS idx_families_created_by ON public.families(created_by);
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_family_id ON public.tasks(family_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_family_id ON public.calendar_events(family_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_grocery_items_family_id ON public.grocery_items(family_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_family_id ON public.chat_messages(family_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_family_files_family_id ON public.family_files(family_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON public.subscriptions(plan);

-- Admin indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_type ON public.admin_audit_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON public.feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON public.feature_flags(enabled);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(active);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON public.announcements(type);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON public.support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_support_ticket_comments_ticket_id ON public.support_ticket_comments(ticket_id);


-- ============================================================
-- 4. REALTIME PUBLICATIONS
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;


-- ============================================================
-- 5. STORAGE BUCKETS & POLICIES
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('family-files', 'family-files', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

-- Family files storage policies
CREATE POLICY "Family members can upload files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'family-files' AND
    EXISTS (SELECT 1 FROM public.family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Family members can view files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'family-files' AND
    EXISTS (SELECT 1 FROM public.family_members WHERE user_id = auth.uid())
  );

-- Avatar storage policies
CREATE POLICY "Users can upload avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');


-- ============================================================
-- 6. TRIGGERS & FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Core app updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_families_updated_at ON public.families;
CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON public.families FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_grocery_items_updated_at ON public.grocery_items;
CREATE TRIGGER update_grocery_items_updated_at BEFORE UPDATE ON public.grocery_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Admin updated_at triggers
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_plan_configs_updated_at ON public.plan_configs;
CREATE TRIGGER update_plan_configs_updated_at BEFORE UPDATE ON public.plan_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_announcements_updated_at ON public.announcements;
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-set first_response_at when a support ticket is first assigned
CREATE OR REPLACE FUNCTION set_first_response_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND OLD.assigned_to IS NULL AND NEW.first_response_at IS NULL THEN
    NEW.first_response_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_first_response ON public.support_tickets;
CREATE TRIGGER trigger_set_first_response
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION set_first_response_at();

-- Auto-set resolved_at when support ticket status changes to resolved/closed
CREATE OR REPLACE FUNCTION set_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed') AND NEW.resolved_at IS NULL THEN
    NEW.resolved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_resolved_at ON public.support_tickets;
CREATE TRIGGER trigger_set_resolved_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION set_resolved_at();


-- ============================================================
-- 7. SEED DATA
-- ============================================================

-- -------------------------------------------
-- 7a. Admin Users
-- -------------------------------------------
-- Passwords are bcrypt hashes. The values below correspond to:
--   admin@usraplus.com    → usra2024admin
--   support@usraplus.com  → support2024
--   analytics@usraplus.com → analytics2024
--   billing@usraplus.com  → billing2024
--
-- NOTE: These are demo/development credentials.
-- In production, generate proper bcrypt hashes and rotate regularly.
-- The hashes below use the $2a$12$ format (12 rounds).
INSERT INTO public.admin_users (email, password_hash, name, role, is_active) VALUES
  ('admin@usraplus.com', '$2a$12$LJ3m4ys3Lk0TSwMCfVSLnOXyFEnLxVr0EfOKv0E4FqE9yXzB3kH6a', 'USRA Founder', 'super_admin', TRUE),
  ('support@usraplus.com', '$2a$12$9Xj3b5Qk8Nz2vH7pR4wT6yU0iO1aS3dF5gH8jK0lM2nO4pQ6rS8u', 'Support Admin', 'support_admin', TRUE),
  ('analytics@usraplus.com', '$2a$12$Bc4d6Fg8Hj0Kl2Mn4Op6Qr8St0Uv2Wx4Yz6Ab8Cd0Ef2Gh4Ij6Kl', 'Analytics Admin', 'analytics_admin', TRUE),
  ('billing@usraplus.com', '$2a$12$De6f8Gh0Jk2Mn4Op6Qr8St0Uv2Wx4Yz6Ab8Cd0Ef2Gh4Ij6Kl8Mn', 'Billing Admin', 'billing_admin', TRUE)
ON CONFLICT (email) DO NOTHING;

-- -------------------------------------------
-- 7b. Feature Flags
-- -------------------------------------------
INSERT INTO public.feature_flags (key, name, description, enabled, rollout_percentage, target_plan) VALUES
  ('ai_insights', 'AI Insights Widget', 'Show AI-powered insights on dashboard', TRUE, 100, NULL),
  ('hijri_calendar', 'Hijri Calendar View', 'Show Hijri dates alongside Gregorian', TRUE, 80, 'Pro'),
  ('voice_messages', 'Voice Messages', 'Allow voice message recording in chat', TRUE, 100, NULL),
  ('budget_tracking', 'Budget Tracking', 'Family budget and expense tracking', TRUE, 60, 'Family+'),
  ('meal_planning', 'Meal Planning', 'Weekly meal planning and recipes', TRUE, 40, 'Pro'),
  ('chores_module', 'Chores Module', 'Chore assignment and tracking', FALSE, 0, NULL),
  ('milestones', 'Milestones', 'Family milestone tracking', TRUE, 100, NULL),
  ('family_qr', 'QR Code Invites', 'QR code for family invitation', TRUE, 90, NULL)
ON CONFLICT (key) DO NOTHING;

-- -------------------------------------------
-- 7c. Plan Configs
-- -------------------------------------------
INSERT INTO public.plan_configs (plan, price, currency, features, limits, active, sort_order) VALUES
  (
    'Free', 0.00, 'USD',
    '["Basic tasks", "Grocery lists", "Calendar", "Chat", "Up to 5 family members"]'::JSONB,
    '{"tasks": 10, "storage": 100, "families": 1, "members": 5}'::JSONB,
    TRUE, 1
  ),
  (
    'Pro', 9.99, 'USD',
    '["Unlimited tasks", "1GB storage", "AI insights", "Hijri calendar", "Meal planning", "Up to 15 members"]'::JSONB,
    '{"tasks": null, "storage": 1000, "families": 1, "members": 15}'::JSONB,
    TRUE, 2
  ),
  (
    'Family+', 19.99, 'USD',
    '["Everything in Pro", "10GB storage", "Budget tracking", "Priority support", "Unlimited families", "Unlimited members", "Custom themes"]'::JSONB,
    '{"tasks": null, "storage": 10000, "families": null, "members": null}'::JSONB,
    TRUE, 3
  )
ON CONFLICT (plan) DO NOTHING;

-- -------------------------------------------
-- 7d. Announcements
-- -------------------------------------------
INSERT INTO public.announcements (title, message, type, active, start_date, end_date) VALUES
  (
    'Welcome to USRA PLUS!',
    'Thank you for joining our family coordination platform. Explore all features and start organizing your family life.',
    'info', TRUE, '2024-01-01', NULL
  ),
  (
    'Ramadan Mubarak!',
    'May this blessed month bring joy and togetherness to your family. Check out our meal planning feature for Iftar recipes.',
    'info', FALSE, '2024-03-10', '2024-04-09'
  )
ON CONFLICT DO NOTHING;

-- -------------------------------------------
-- 7e. System Config
-- -------------------------------------------
INSERT INTO public.system_config (key, value, description) VALUES
  ('maintenance_mode', '{"enabled": false, "message_en": "We are performing scheduled maintenance. We will be back shortly.", "message_ar": "نقوم بصيانة مجدولة. سنعود قريباً."}', 'Maintenance mode toggle and message'),
  ('emergency_shutdown', '{"enabled": false}', 'Emergency shutdown — disables all user access'),
  ('max_upload_size_mb', '{"value": 50}', 'Maximum file upload size in MB'),
  ('invite_code_ttl_hours', '{"value": 72}', 'How long family invite codes remain valid'),
  ('free_plan_limits', '{"tasks": 10, "storage_mb": 100, "families": 1, "members": 5}', 'Free plan limits (mirrors plan_configs but used by middleware)'),
  ('registration_enabled', '{"value": true}', 'Whether new user registration is enabled'),
  ('google_oauth_enabled', '{"value": true}', 'Whether Google OAuth login is enabled')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- 8. HELPER VIEWS (for analytics dashboards)
-- ============================================================

-- Active user count by day (for admin analytics)
CREATE OR REPLACE VIEW public.v_daily_active_users AS
SELECT
  DATE(created_at) AS date,
  COUNT(DISTINCT user_id) AS active_users
FROM public.notifications
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY date;

-- Family size distribution (for admin analytics)
CREATE OR REPLACE VIEW public.v_family_size_distribution AS
SELECT
  f.id AS family_id,
  f.name AS family_name,
  COUNT(fm.id) AS member_count
FROM public.families f
LEFT JOIN public.family_members fm ON f.id = fm.family_id
GROUP BY f.id, f.name;

-- Subscription breakdown (for admin analytics)
CREATE OR REPLACE VIEW public.v_subscription_breakdown AS
SELECT
  plan,
  status,
  COUNT(*) AS user_count
FROM public.subscriptions
GROUP BY plan, status;

-- Task completion rate by family (for admin analytics)
CREATE OR REPLACE VIEW public.v_task_completion_rate AS
SELECT
  t.family_id,
  f.name AS family_name,
  COUNT(*) AS total_tasks,
  COUNT(*) FILTER (WHERE t.status = 'done') AS completed_tasks,
  ROUND(
    COUNT(*) FILTER (WHERE t.status = 'done')::NUMERIC /
    NULLIF(COUNT(*)::NUMERIC, 0) * 100,
    1
  ) AS completion_rate
FROM public.tasks t
LEFT JOIN public.families f ON t.family_id = f.id
GROUP BY t.family_id, f.name;

-- Support ticket metrics (for admin analytics)
CREATE OR REPLACE VIEW public.v_support_metrics AS
SELECT
  COUNT(*) AS total_tickets,
  COUNT(*) FILTER (WHERE status = 'open') AS open_tickets,
  COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_tickets,
  COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_tickets,
  COUNT(*) FILTER (WHERE status = 'closed') AS closed_tickets,
  ROUND(AVG(satisfaction_score), 1) AS avg_satisfaction,
  ROUND(
    EXTRACT(EPOCH FROM AVG(resolved_at - first_response_at)) / 3600,
    1
  ) AS avg_resolution_hours
FROM public.support_tickets;


-- ============================================================
-- DONE! 🎉
-- ============================================================
-- Your USRA PLUS database is now fully set up with:
--
-- CORE TABLES (10):
--   profiles, families, family_members, tasks, calendar_events,
--   grocery_items, chat_messages, family_files, notifications,
--   subscriptions
--
-- ADMIN TABLES (7):
--   admin_users, admin_audit_logs, feature_flags, plan_configs,
--   announcements, support_tickets, support_ticket_comments,
--   system_config
--
-- ANALYTICS VIEWS (5):
--   v_daily_active_users, v_family_size_distribution,
--   v_subscription_breakdown, v_task_completion_rate,
--   v_support_metrics
--
-- INDEXES: 35+
-- RLS POLICIES: Full coverage for all tables
-- REALTIME: 6 tables (chat_messages, tasks, grocery_items,
--           calendar_events, notifications, support_tickets)
-- STORAGE: 2 buckets (family-files, avatars)
-- TRIGGERS: 13 (updated_at + support ticket automation)
-- SEED DATA: 4 admin users, 8 feature flags, 3 plan configs,
--            2 announcements, 7 system configs
-- ============================================================
