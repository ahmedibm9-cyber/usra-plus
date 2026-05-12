-- ============================================================
-- USRA PLUS — Fix Duplicate Policy Errors
-- ============================================================
-- Run this ONLY if you got "policy already exists" errors
-- when running complete-migration.sql.
--
-- This drops conflicting policies and recreates them.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- Fix profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Fix storage policies (common conflict with Supabase defaults)
DROP POLICY IF EXISTS "Family members can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Family members can view files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

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

CREATE POLICY "Users can upload avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
