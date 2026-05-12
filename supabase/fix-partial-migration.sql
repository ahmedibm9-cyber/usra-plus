-- ============================================================
-- USRA PLUS — Fix for Partial Business Control Migration
-- ============================================================
-- Run this ONLY if the original business-control-migration.sql
-- partially failed with the plan_configs constraint error.
--
-- This script:
-- 1. Updates the constraints that the original migration failed to update
-- 2. Inserts the Max and Ultimate plans
-- 3. Checks for and creates any tables that may have been skipped
--    after the error point
-- ============================================================

-- STEP 1: Fix the constraints (this is what failed)
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'pro', 'family_plus', 'max', 'ultimate'));

ALTER TABLE public.plan_configs DROP CONSTRAINT IF EXISTS plan_configs_plan_check;
ALTER TABLE public.plan_configs ADD CONSTRAINT plan_configs_plan_check
  CHECK (plan IN ('Free', 'Pro', 'Family+', 'Max', 'Ultimate'));

-- STEP 2: Insert Max and Ultimate plans
INSERT INTO public.plan_configs (plan, price, monthly_price, yearly_price, lifetime_price, currency, features, limits, active, sort_order, trial_days, is_popular, description, cta_text, regional_pricing) VALUES
  (
    'Max', 14.99, 14.99, 149.99, NULL, 'USD',
    '["Everything in Pro", "5GB storage", "Budget tracking", "Priority support", "Up to 25 members", "Custom themes", "Advanced analytics"]'::JSONB,
    '{"tasks": null, "storage": 5000, "families": 3, "members": 25}'::JSONB,
    TRUE, 3, 3, TRUE,
    'Maximum power for growing families',
    'Start Free Trial',
    '{"SA": 49.99, "AE": 54.99, "KW": 4.99, "BH": 4.99}'::JSONB
  ),
  (
    'Ultimate', 0, NULL, NULL, 199.99, 'USD',
    '["Everything in Max", "Unlimited storage", "Unlimited families", "Unlimited members", "Dedicated support", "Early access features", "Founder badge", "Lifetime updates"]'::JSONB,
    '{"tasks": null, "storage": null, "families": null, "members": null}'::JSONB,
    TRUE, 4, 3, FALSE,
    'One-time payment, lifetime access',
    'Get Lifetime Access',
    '{"SA": 749.99, "AE": 749.99, "KW": 59.99, "BH": 59.99}'::JSONB
  )
ON CONFLICT (plan) DO NOTHING;

-- STEP 3: Create any tables that might have been skipped after the error
-- These use IF NOT EXISTS so it's safe to re-run even if they exist

-- PHASE 3 tables
CREATE TABLE IF NOT EXISTS public.user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  note TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'support', 'billing', 'fraud', 'onboarding', 'technical')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feature_flag_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL REFERENCES public.feature_flags(key) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'family', 'plan', 'beta')),
  target_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL,
  reason TEXT DEFAULT '',
  created_by UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(flag_key, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS public.system_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'critical', 'update', 'promotion')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  banner BOOLEAN DEFAULT FALSE,
  banner_position TEXT DEFAULT 'top' CHECK (banner_position IN ('top', 'bottom')),
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'free', 'pro', 'family_plus', 'max', 'ultimate', 'beta', 'trial', 'vip')),
  cta_text TEXT,
  cta_url TEXT,
  dismissible BOOLEAN DEFAULT TRUE,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  priority INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  message_en TEXT DEFAULT 'Scheduled maintenance in progress. Some features may be temporarily unavailable.',
  message_ar TEXT DEFAULT 'صيانة مجدولة جارية. قد تكون بعض الميزات غير متاحة مؤقتاً.',
  created_by UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PHASE 4 tables
CREATE TABLE IF NOT EXISTS public.user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ban_type TEXT NOT NULL CHECK (ban_type IN ('warning', 'temporary_suspension', 'shadow_ban', 'permanent_ban')),
  reason TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'appealed', 'upheld', 'revoked', 'expired')),
  issued_by UUID NOT NULL REFERENCES public.admin_users(id),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  approval_required BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES public.admin_users(id),
  approved_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.admin_users(id),
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  appeal_text TEXT,
  appeal_submitted_at TIMESTAMPTZ,
  appeal_resolved_at TIMESTAMPTZ,
  appeal_resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'duplicate_trial', 'suspicious_login', 'payment_fraud',
    'api_abuse', 'spam_detection', 'harassment_pattern',
    'account_takeover', 'credential_stuffing', 'unusual_activity',
    'multiple_accounts', 'geo_anomaly'
  )),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive', 'escalated')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB DEFAULT '{}',
  risk_score INTEGER DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100),
  auto_action TEXT,
  assigned_to UUID REFERENCES public.admin_users(id),
  resolved_by UUID REFERENCES public.admin_users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.abuse_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL CHECK (report_type IN (
    'harassment', 'spam', 'inappropriate_content', 'fraud',
    'impersonation', 'hate_speech', 'threat', 'other'
  )),
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'actioned', 'dismissed', 'escalated')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES public.admin_users(id),
  action_taken TEXT,
  reviewed_by UUID REFERENCES public.admin_users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL CHECK (item_type IN ('ban_review', 'abuse_report', 'fraud_alert', 'appeal', 'content_flag')),
  item_id UUID NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'escalated')),
  assigned_to UUID REFERENCES public.admin_users(id),
  notes TEXT,
  resolved_by UUID REFERENCES public.admin_users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  trust_score INTEGER NOT NULL DEFAULT 100 CHECK (trust_score >= 0 AND trust_score <= 100),
  fraud_score INTEGER NOT NULL DEFAULT 0 CHECK (fraud_score >= 0 AND fraud_score <= 100),
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  factors JSONB DEFAULT '{}',
  last_evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PHASE 5 tables
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL DEFAULT 'error' CHECK (level IN ('debug', 'info', 'warning', 'error', 'critical')),
  source TEXT NOT NULL CHECK (source IN ('server', 'client', 'api', 'cron', 'migration')),
  error_type TEXT NOT NULL,
  message TEXT NOT NULL,
  stack_trace TEXT,
  url TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_agent TEXT,
  ip_address INET,
  metadata JSONB DEFAULT '{}',
  occurrence_count INTEGER DEFAULT 1,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES public.admin_users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('api_response', 'db_query', 'page_load', 'websocket', 'storage', 'auth')),
  metric_name TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout')),
  metadata JSONB DEFAULT '{}',
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  pages_viewed INTEGER DEFAULT 0,
  device_type TEXT DEFAULT 'web' CHECK (device_type IN ('web', 'ios', 'android')),
  browser TEXT,
  os TEXT,
  country TEXT,
  ip_address INET,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PHASE 6 tables
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_trial_extension', 'plan_upgrade')),
  discount_value DECIMAL(10,2) NOT NULL,
  applicable_plans TEXT[] DEFAULT '{}',
  max_redemptions INTEGER,
  current_redemptions INTEGER DEFAULT 0,
  max_redemptions_per_user INTEGER DEFAULT 1,
  min_purchase_amount DECIMAL(10,2) DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'new_users', 'existing_users', 'churned_users', 'trial_users', 'vip')),
  auto_apply BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id),
  discount_applied DECIMAL(10,2) NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  UNIQUE(coupon_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  referred_email TEXT,
  referred_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'trial_started', 'converted', 'rewarded', 'expired')),
  reward_type TEXT DEFAULT 'trial_extension' CHECK (reward_type IN ('trial_extension', 'discount', 'plan_upgrade', 'credit')),
  reward_value DECIMAL(10,2) DEFAULT 0,
  reward_claimed BOOLEAN DEFAULT FALSE,
  reward_claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL,
  reward_value DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'granted', 'claimed', 'expired')),
  granted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  template_id TEXT,
  target_segment TEXT DEFAULT 'all',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('system', 'announcement', 'promotion', 'reminder', 'alert')),
  data JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '{}',
  user_count INTEGER DEFAULT 0,
  is_auto_update BOOLEAN DEFAULT TRUE,
  last_updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES public.user_segments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(segment_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  feature_key TEXT NOT NULL,
  variant_a TEXT NOT NULL DEFAULT 'control',
  variant_b TEXT NOT NULL DEFAULT 'treatment',
  traffic_percentage INTEGER DEFAULT 50 CHECK (traffic_percentage >= 1 AND traffic_percentage <= 99),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
  target_segment TEXT DEFAULT 'all',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  winner TEXT,
  metrics JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ab_test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ,
  UNIQUE(test_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.revenue_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id),
  type TEXT NOT NULL CHECK (type IN ('payment', 'refund', 'credit', 'coupon', 'trial', 'upgrade', 'downgrade')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  original_amount DECIMAL(10,2),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  coupon_id UUID REFERENCES public.coupons(id),
  payment_provider TEXT,
  provider_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'disputed')),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.revenue_transactions(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  category TEXT DEFAULT 'user_request' CHECK (category IN ('user_request', 'technical_issue', 'billing_error', 'fraud', 'goodwill', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processed', 'rejected', 'disputed')),
  approved_by UUID REFERENCES public.admin_users(id),
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on any tables that might not have it
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abuse_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- Create policies (DROP IF EXISTS first to avoid duplicates)
-- User notes
DROP POLICY IF EXISTS "Service role can manage user notes" ON public.user_notes;
CREATE POLICY "Service role can manage user notes" ON public.user_notes
  FOR ALL USING (auth.role() = 'service_role');

-- Feature flag overrides
DROP POLICY IF EXISTS "Anyone can read feature flag overrides" ON public.feature_flag_overrides;
DROP POLICY IF EXISTS "Service role can manage feature flag overrides" ON public.feature_flag_overrides;
CREATE POLICY "Anyone can read feature flag overrides" ON public.feature_flag_overrides
  FOR SELECT USING (TRUE);
CREATE POLICY "Service role can manage feature flag overrides" ON public.feature_flag_overrides
  FOR ALL USING (auth.role() = 'service_role');

-- System announcements
DROP POLICY IF EXISTS "Anyone can read active announcements" ON public.system_announcements;
DROP POLICY IF EXISTS "Service role can manage system announcements" ON public.system_announcements;
CREATE POLICY "Anyone can read active announcements" ON public.system_announcements
  FOR SELECT USING (TRUE);
CREATE POLICY "Service role can manage system announcements" ON public.system_announcements
  FOR ALL USING (auth.role() = 'service_role');

-- Maintenance windows
DROP POLICY IF EXISTS "Anyone can read maintenance windows" ON public.maintenance_windows;
DROP POLICY IF EXISTS "Service role can manage maintenance windows" ON public.maintenance_windows;
CREATE POLICY "Anyone can read maintenance windows" ON public.maintenance_windows
  FOR SELECT USING (TRUE);
CREATE POLICY "Service role can manage maintenance windows" ON public.maintenance_windows
  FOR ALL USING (auth.role() = 'service_role');

-- User bans
DROP POLICY IF EXISTS "Users can view own bans" ON public.user_bans;
DROP POLICY IF EXISTS "Service role can manage bans" ON public.user_bans;
CREATE POLICY "Users can view own bans" ON public.user_bans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage bans" ON public.user_bans
  FOR ALL USING (auth.role() = 'service_role');

-- Fraud alerts
DROP POLICY IF EXISTS "Service role can manage fraud alerts" ON public.fraud_alerts;
CREATE POLICY "Service role can manage fraud alerts" ON public.fraud_alerts
  FOR ALL USING (auth.role() = 'service_role');

-- Abuse reports
DROP POLICY IF EXISTS "Users can create abuse reports" ON public.abuse_reports;
DROP POLICY IF EXISTS "Users can view own reports" ON public.abuse_reports;
DROP POLICY IF EXISTS "Service role can manage abuse reports" ON public.abuse_reports;
CREATE POLICY "Users can create abuse reports" ON public.abuse_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON public.abuse_reports
  FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Service role can manage abuse reports" ON public.abuse_reports
  FOR ALL USING (auth.role() = 'service_role');

-- Moderation queue
DROP POLICY IF EXISTS "Service role can manage moderation queue" ON public.moderation_queue;
CREATE POLICY "Service role can manage moderation queue" ON public.moderation_queue
  FOR ALL USING (auth.role() = 'service_role');

-- Trust scores
DROP POLICY IF EXISTS "Service role can manage trust scores" ON public.user_trust_scores;
CREATE POLICY "Service role can manage trust scores" ON public.user_trust_scores
  FOR ALL USING (auth.role() = 'service_role');

-- Error logs
DROP POLICY IF EXISTS "Service role can manage error logs" ON public.error_logs;
DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.error_logs;
CREATE POLICY "Service role can manage error logs" ON public.error_logs
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anyone can insert error logs" ON public.error_logs
  FOR INSERT WITH CHECK (TRUE);

-- Performance metrics
DROP POLICY IF EXISTS "Service role can manage performance metrics" ON public.performance_metrics;
CREATE POLICY "Service role can manage performance metrics" ON public.performance_metrics
  FOR ALL USING (auth.role() = 'service_role');

-- User sessions
DROP POLICY IF EXISTS "Users can manage own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role can manage all sessions" ON public.user_sessions;
CREATE POLICY "Users can manage own sessions" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all sessions" ON public.user_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Coupons
DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Service role can manage coupons" ON public.coupons;
CREATE POLICY "Anyone can read active coupons" ON public.coupons
  FOR SELECT USING (is_active = TRUE AND (valid_until IS NULL OR valid_until > NOW()));
CREATE POLICY "Service role can manage coupons" ON public.coupons
  FOR ALL USING (auth.role() = 'service_role');

-- Coupon redemptions
DROP POLICY IF EXISTS "Users can view own redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Service role can manage redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users can view own redemptions" ON public.coupon_redemptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage redemptions" ON public.coupon_redemptions
  FOR ALL USING (auth.role() = 'service_role');

-- Referrals
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;
DROP POLICY IF EXISTS "Service role can manage referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Users can create referrals" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);
CREATE POLICY "Service role can manage referrals" ON public.referrals
  FOR ALL USING (auth.role() = 'service_role');

-- Referral rewards
DROP POLICY IF EXISTS "Users can view own rewards" ON public.referral_rewards;
DROP POLICY IF EXISTS "Service role can manage rewards" ON public.referral_rewards;
CREATE POLICY "Users can view own rewards" ON public.referral_rewards
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage rewards" ON public.referral_rewards
  FOR ALL USING (auth.role() = 'service_role');

-- Email campaigns
DROP POLICY IF EXISTS "Service role can manage email campaigns" ON public.email_campaigns;
CREATE POLICY "Service role can manage email campaigns" ON public.email_campaigns
  FOR ALL USING (auth.role() = 'service_role');

-- Push notifications
DROP POLICY IF EXISTS "Users can view own push notifications" ON public.push_notifications;
DROP POLICY IF EXISTS "Service role can manage push notifications" ON public.push_notifications;
CREATE POLICY "Users can view own push notifications" ON public.push_notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage push notifications" ON public.push_notifications
  FOR ALL USING (auth.role() = 'service_role');

-- User segments
DROP POLICY IF EXISTS "Service role can manage user segments" ON public.user_segments;
CREATE POLICY "Service role can manage user segments" ON public.user_segments
  FOR ALL USING (auth.role() = 'service_role');

-- Segment members
DROP POLICY IF EXISTS "Service role can manage segment members" ON public.user_segment_members;
CREATE POLICY "Service role can manage segment members" ON public.user_segment_members
  FOR ALL USING (auth.role() = 'service_role');

-- A/B tests
DROP POLICY IF EXISTS "Service role can manage A/B tests" ON public.ab_tests;
CREATE POLICY "Service role can manage A/B tests" ON public.ab_tests
  FOR ALL USING (auth.role() = 'service_role');

-- A/B assignments
DROP POLICY IF EXISTS "Service role can manage A/B assignments" ON public.ab_test_assignments;
CREATE POLICY "Service role can manage A/B assignments" ON public.ab_test_assignments
  FOR ALL USING (auth.role() = 'service_role');

-- Revenue transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.revenue_transactions;
DROP POLICY IF EXISTS "Service role can manage revenue transactions" ON public.revenue_transactions;
CREATE POLICY "Users can view own transactions" ON public.revenue_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage revenue transactions" ON public.revenue_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- Refunds
DROP POLICY IF EXISTS "Users can view own refunds" ON public.refunds;
DROP POLICY IF EXISTS "Service role can manage refunds" ON public.refunds;
CREATE POLICY "Users can view own refunds" ON public.refunds
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage refunds" ON public.refunds
  FOR ALL USING (auth.role() = 'service_role');

-- Create indexes (IF NOT EXISTS for safety)
CREATE INDEX IF NOT EXISTS idx_user_trials_user_id ON public.user_trials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trials_status ON public.user_trials(status);
CREATE INDEX IF NOT EXISTS idx_user_trials_expires_at ON public.user_trials(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_trials_device_fingerprint ON public.user_trials(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user_id ON public.device_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_hash ON public.device_fingerprints(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON public.user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_admin_id ON public.user_notes(admin_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_flag_key ON public.feature_flag_overrides(flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_target ON public.feature_flag_overrides(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_system_announcements_active ON public.system_announcements(active);
CREATE INDEX IF NOT EXISTS idx_system_announcements_dates ON public.system_announcements(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_user_bans_user_id ON public.user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_status ON public.user_bans(status);
CREATE INDEX IF NOT EXISTS idx_user_bans_ban_type ON public.user_bans(ban_type);
CREATE INDEX IF NOT EXISTS idx_user_bans_issued_by ON public.user_bans(issued_by);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user_id ON public.fraud_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON public.fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_severity ON public.fraud_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_type ON public.fraud_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_abuse_reports_reporter ON public.abuse_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_abuse_reports_reported ON public.abuse_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_abuse_reports_status ON public.abuse_reports(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON public.moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_priority ON public.moderation_queue(priority);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_assigned ON public.moderation_queue(assigned_to);
CREATE INDEX IF NOT EXISTS idx_user_trust_scores_user_id ON public.user_trust_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON public.error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_source ON public.error_logs(source);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_last_seen ON public.error_logs(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON public.performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created ON public.performance_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON public.coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON public.coupon_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON public.referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_user ON public.revenue_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_type ON public.revenue_transactions(type);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_created ON public.revenue_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_refunds_transaction ON public.refunds(transaction_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);

-- Seed feature flags if they don't exist
INSERT INTO public.feature_flags (key, name, description, enabled, target, value) VALUES
  ('ai_meal_suggestions', 'AI Meal Suggestions', 'AI-powered meal plan recommendations', TRUE, 'all', NULL),
  ('ai_summary', 'AI Dashboard Summary', 'AI-generated dashboard summary widget', TRUE, 'all', NULL),
  ('budget_tracking', 'Budget Tracking', 'Family budget and expense tracking', TRUE, 'plan', '"pro"'),
  ('advanced_analytics', 'Advanced Analytics', 'Detailed family analytics and insights', FALSE, 'plan', '"max"'),
  ('custom_themes', 'Custom Themes', 'Customizable app themes and colors', FALSE, 'plan', '"max"'),
  ('priority_support', 'Priority Support', 'Priority customer support access', FALSE, 'plan', '"max"'),
  ('unlimited_families', 'Unlimited Families', 'Create unlimited family groups', FALSE, 'plan', '"ultimate"'),
  ('early_access', 'Early Access Features', 'Access to beta features before release', FALSE, 'beta', NULL),
  ('hijri_calendar', 'Hijri Calendar', 'Islamic Hijri calendar integration', TRUE, 'all', NULL),
  ('referral_system', 'Referral System', 'Refer friends and earn rewards', FALSE, 'all', NULL),
  ('coupon_engine', 'Coupon Engine', 'Apply discount codes at checkout', FALSE, 'all', NULL),
  ('push_notifications', 'Push Notifications', 'Browser and mobile push notifications', FALSE, 'all', NULL)
ON CONFLICT (key) DO NOTHING;

-- Seed system controls if they don't exist
INSERT INTO public.system_controls (key, name, value, description, category) VALUES
  ('maintenance_mode', 'Maintenance Mode', FALSE, 'Enable maintenance mode (blocks all user access)', 'system'),
  ('registration_enabled', 'Registration Enabled', TRUE, 'Allow new user registrations', 'system'),
  ('force_update', 'Force Update', FALSE, 'Require users to update the app', 'system'),
  ('min_app_version', 'Minimum App Version', '1.0.0', 'Minimum app version required', 'system'),
  ('emergency_shutdown', 'Emergency Shutdown', FALSE, 'Emergency shutdown (immediate access block)', 'system'),
  ('max_free_families', 'Max Free Families', '1', 'Maximum families for free plan', 'limits'),
  ('max_free_members', 'Max Free Members', '5', 'Maximum members per family for free plan', 'limits'),
  ('trial_duration_days', 'Trial Duration (Days)', '3', 'Free trial duration in days', 'limits'),
  ('default_language', 'Default Language', 'ar', 'Default app language', 'regional'),
  ('default_currency', 'Default Currency', 'SAR', 'Default currency for pricing', 'regional'),
  ('allowed_countries', 'Allowed Countries', '["SA","AE","KW","BH","QA","OM"]', 'Allowed country codes', 'regional'),
  ('email_verification_required', 'Email Verification Required', FALSE, 'Require email verification on signup', 'auth'),
  ('max_login_attempts', 'Max Login Attempts', '5', 'Maximum login attempts before lockout', 'auth'),
  ('lockout_duration_minutes', 'Lockout Duration (Minutes)', '15', 'Account lockout duration in minutes', 'auth')
ON CONFLICT (key) DO NOTHING;

-- Done! Verify by running:
-- SELECT plan, price, monthly_price FROM plan_configs ORDER BY sort_order;
-- SELECT key, name, enabled FROM feature_flags ORDER BY key;
-- SELECT key, name, value FROM system_controls ORDER BY category, key;
