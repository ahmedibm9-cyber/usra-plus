-- USRA PLUS - Complete Supabase Database Migration
-- Run this in Supabase SQL Editor

-- ============================================
-- PROFILES TABLE
-- ============================================
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

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FAMILIES TABLE
-- ============================================
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

CREATE POLICY "Family members can view family" ON public.families FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = id AND user_id = auth.uid())
);
CREATE POLICY "Family creator can insert family" ON public.families FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Family owner/admin can update family" ON public.families FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- ============================================
-- FAMILY MEMBERS TABLE
-- ============================================
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

CREATE POLICY "Family members can view members" ON public.family_members FOR SELECT USING (
  family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
);
CREATE POLICY "Users can join family" ON public.family_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner/admin can update members" ON public.family_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = family_id AND fm.user_id = auth.uid() AND fm.role IN ('owner', 'admin'))
);
CREATE POLICY "Owner/admin can remove members" ON public.family_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.family_members fm WHERE fm.family_id = family_id AND fm.user_id = auth.uid() AND fm.role IN ('owner', 'admin'))
  OR auth.uid() = user_id
);

-- ============================================
-- TASKS TABLE
-- ============================================
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

CREATE POLICY "Family members can view tasks" ON public.tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = tasks.family_id AND user_id = auth.uid())
);
CREATE POLICY "Family members can create tasks" ON public.tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = tasks.family_id AND user_id = auth.uid())
);
CREATE POLICY "Family members can update tasks" ON public.tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = tasks.family_id AND user_id = auth.uid())
);
CREATE POLICY "Family members can delete tasks" ON public.tasks FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = tasks.family_id AND user_id = auth.uid())
);

-- ============================================
-- CALENDAR EVENTS TABLE
-- ============================================
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

CREATE POLICY "Family members can view events" ON public.calendar_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = calendar_events.family_id AND user_id = auth.uid())
);
CREATE POLICY "Family members can create events" ON public.calendar_events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = calendar_events.family_id AND user_id = auth.uid())
);
CREATE POLICY "Family members can update events" ON public.calendar_events FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = calendar_events.family_id AND user_id = auth.uid())
);
CREATE POLICY "Family members can delete events" ON public.calendar_events FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = calendar_events.family_id AND user_id = auth.uid())
);

-- ============================================
-- GROCERY ITEMS TABLE
-- ============================================
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

CREATE POLICY "Family members can view grocery items" ON public.grocery_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = grocery_items.family_id AND user_id = auth.uid())
);
CREATE POLICY "Family members can create grocery items" ON public.grocery_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = grocery_items.family_id AND user_id = auth.uid())
);
CREATE POLICY "Family members can update grocery items" ON public.grocery_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = grocery_items.family_id AND user_id = auth.uid())
);
CREATE POLICY "Family members can delete grocery items" ON public.grocery_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = grocery_items.family_id AND user_id = auth.uid())
);

-- ============================================
-- CHAT MESSAGES TABLE
-- ============================================
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

CREATE POLICY "Family members can view messages" ON public.chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = chat_messages.family_id AND user_id = auth.uid())
);
CREATE POLICY "Family members can send messages" ON public.chat_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = chat_messages.family_id AND user_id = auth.uid())
);
CREATE POLICY "Sender can delete messages" ON public.chat_messages FOR DELETE USING (
  auth.uid() = sender_id
);

-- ============================================
-- FAMILY FILES TABLE
-- ============================================
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

CREATE POLICY "Family members can view files" ON public.family_files FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = family_files.family_id AND user_id = auth.uid())
);
CREATE POLICY "Family members can upload files" ON public.family_files FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = family_files.family_id AND user_id = auth.uid())
);
CREATE POLICY "Owner/admin can delete files" ON public.family_files FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.family_members WHERE family_id = family_files.family_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
  OR auth.uid() = uploaded_by
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
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

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
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

CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can create own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================
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

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('family-files', 'family-files', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Family members can upload files" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'family-files' AND
  EXISTS (SELECT 1 FROM public.family_members WHERE user_id = auth.uid())
);

CREATE POLICY "Family members can view files" ON storage.objects FOR SELECT USING (
  bucket_id = 'family-files' AND
  EXISTS (SELECT 1 FROM public.family_members WHERE user_id = auth.uid())
);

CREATE POLICY "Users can upload avatar" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON public.families FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_grocery_items_updated_at BEFORE UPDATE ON public.grocery_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
