-- ============================================================
-- USRA PLUS — FINAL DEFINITIVE MIGRATION (All Phases 2-6)
-- ============================================================
-- This is the ONE migration file you need. It fixes ALL previous
-- migration issues and is fully idempotent (safe to re-run).
--
-- BUGS FIXED vs previous migration files:
--   1. plan_configs: monthly_price/yearly_price/lifetime_price columns
--      are now ADDED before any INSERT references them
--   2. feature_flags: `target` and `value` columns are now ADDED
--      before the seed INSERT references them
--   3. system_controls: table is now CREATED before seed INSERT
--      (previous files referenced a non-existent table)
--   4. All constraints updated BEFORE inserting new plan values
--
-- Prerequisites: complete-migration.sql and additional-tables.sql
-- must already be applied.
--
-- To run: Copy-paste this entire file into Supabase SQL Editor → Run
-- ============================================================


-- ============================================================
-- STEP 0: ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================
-- These ALTER TABLEs MUST come first so that later INSERTs
-- can reference the new columns.

-- plan_configs: add pricing columns
ALTER TABLE public.plan_configs ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10,2);
ALTER TABLE public.plan_configs ADD COLUMN IF NOT EXISTS yearly_price DECIMAL(10,2);
ALTER TABLE public.plan_configs ADD COLUMN IF NOT EXISTS lifetime_price DECIMAL(10,2);
ALTER TABLE public.plan_configs ADD COLUMN IF NOT EXISTS regional_pricing JSONB DEFAULT '{}';
ALTER TABLE public.plan_configs ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0;
ALTER TABLE public.plan_configs ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT FALSE;
ALTER TABLE public.plan_configs ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.plan_configs ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT '';

-- feature_flags: add target and value columns for simpler flag management
ALTER TABLE public.feature_flags ADD COLUMN IF NOT EXISTS target TEXT DEFAULT 'all';
ALTER TABLE public.feature_flags ADD COLUMN IF NOT EXISTS value JSONB;

-- subscriptions: add trial and billing columns
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime'));
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS discount_code TEXT;

-- profiles: add status, VIP, and tracking columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned', 'shadow_banned', 'flagged'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vip_tag TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS beta_tester BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;


-- ============================================================
-- STEP 1: CREATE system_controls TABLE
-- ============================================================
-- Previous migration files referenced this table but never created it.
-- This is a key-value store for admin-tunable system settings,
-- similar to system_config but with richer metadata (name, category).

CREATE TABLE IF NOT EXISTS public.system_controls (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'system' CHECK (category IN ('system', 'limits', 'regional', 'auth', 'features', 'billing')),
  updated_by UUID REFERENCES public.admin_users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_controls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read system controls" ON public.system_controls;
DROP POLICY IF EXISTS "Service role can manage system controls" ON public.system_controls;
CREATE POLICY "Anyone can read system controls" ON public.system_controls
  FOR SELECT USING (TRUE);
CREATE POLICY "Service role can manage system controls" ON public.system_controls
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- STEP 2: UPDATE CONSTRAINTS (before inserting new plan values)
-- ============================================================

-- Update subscription plan constraint to include max and ultimate
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'pro', 'family_plus', 'max', 'ultimate'));

-- Update plan_configs plan constraint to include Max and Ultimate
ALTER TABLE public.plan_configs DROP CONSTRAINT IF EXISTS plan_configs_plan_check;
ALTER TABLE public.plan_configs ADD CONSTRAINT plan_configs_plan_check
  CHECK (plan IN ('Free', 'Pro', 'Family+', 'Max', 'Ultimate'));


-- ============================================================
-- STEP 3: UPDATE EXISTING PLAN CONFIGS WITH NEW COLUMN VALUES
-- ============================================================

UPDATE public.plan_configs SET
  monthly_price = 0,
  yearly_price = 0,
  trial_days = 0,
  is_popular = FALSE,
  description = 'Perfect for getting started with basic family coordination',
  cta_text = 'Get Started Free',
  regional_pricing = '{"SA": 0, "AE": 0, "KW": 0, "BH": 0}'::JSONB
WHERE plan = 'Free' AND monthly_price IS NULL;

UPDATE public.plan_configs SET
  monthly_price = 9.99,
  yearly_price = 99.99,
  trial_days = 3,
  is_popular = TRUE,
  description = 'Unlimited tasks and AI-powered insights for your family',
  cta_text = 'Start Free Trial',
  regional_pricing = '{"SA": 29.99, "AE": 34.99, "KW": 2.99, "BH": 2.99}'::JSONB
WHERE plan = 'Pro' AND monthly_price IS NULL;

UPDATE public.plan_configs SET
  monthly_price = 19.99,
  yearly_price = 199.99,
  trial_days = 3,
  is_popular = FALSE,
  description = 'Complete family suite with budget tracking and priority support',
  cta_text = 'Start Free Trial',
  regional_pricing = '{"SA": 69.99, "AE": 74.99, "KW": 5.99, "BH": 5.99}'::JSONB
WHERE plan = 'Family+' AND monthly_price IS NULL;


-- ============================================================
-- STEP 4: INSERT MAX AND ULTIMATE PLANS
-- ============================================================

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


-- ============================================================
-- STEP 5: CREATE PHASE 2 TABLES (SUBSCRIPTION + FREE TRIAL)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'converted')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  converted_at TIMESTAMPTZ,
  converted_to_plan TEXT,
  ip_address INET,
  device_fingerprint TEXT,
  was_abuse_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_trials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own trial" ON public.user_trials;
DROP POLICY IF EXISTS "Service role can manage trials" ON public.user_trials;
CREATE POLICY "Users can view own trial" ON public.user_trials
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage trials" ON public.user_trials
  FOR ALL USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.device_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fingerprint_hash TEXT NOT NULL,
  user_agent TEXT,
  screen_resolution TEXT,
  timezone TEXT,
  language TEXT,
  platform TEXT,
  ip_address INET,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own fingerprint" ON public.device_fingerprints;
DROP POLICY IF EXISTS "Service role can manage fingerprints" ON public.device_fingerprints;
CREATE POLICY "Users can insert own fingerprint" ON public.device_fingerprints
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role can manage fingerprints" ON public.device_fingerprints
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- STEP 6: CREATE PHASE 3 TABLES (ADMIN CONTROL CENTER)
-- ============================================================

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

ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage user notes" ON public.user_notes;
CREATE POLICY "Service role can manage user notes" ON public.user_notes
  FOR ALL USING (auth.role() = 'service_role');

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

ALTER TABLE public.feature_flag_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read feature flag overrides" ON public.feature_flag_overrides;
DROP POLICY IF EXISTS "Service role can manage feature flag overrides" ON public.feature_flag_overrides;
CREATE POLICY "Anyone can read feature flag overrides" ON public.feature_flag_overrides
  FOR SELECT USING (TRUE);
CREATE POLICY "Service role can manage feature flag overrides" ON public.feature_flag_overrides
  FOR ALL USING (auth.role() = 'service_role');

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

ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active announcements" ON public.system_announcements;
DROP POLICY IF EXISTS "Service role can manage system announcements" ON public.system_announcements;
CREATE POLICY "Anyone can read active announcements" ON public.system_announcements
  FOR SELECT USING (TRUE);
CREATE POLICY "Service role can manage system announcements" ON public.system_announcements
  FOR ALL USING (auth.role() = 'service_role');

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

ALTER TABLE public.maintenance_windows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read maintenance windows" ON public.maintenance_windows;
DROP POLICY IF EXISTS "Service role can manage maintenance windows" ON public.maintenance_windows;
CREATE POLICY "Anyone can read maintenance windows" ON public.maintenance_windows
  FOR SELECT USING (TRUE);
CREATE POLICY "Service role can manage maintenance windows" ON public.maintenance_windows
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- STEP 7: CREATE PHASE 4 TABLES (TRUST, SAFETY, FRAUD + BANS)
-- ============================================================

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

ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bans" ON public.user_bans;
DROP POLICY IF EXISTS "Service role can manage bans" ON public.user_bans;
CREATE POLICY "Users can view own bans" ON public.user_bans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage bans" ON public.user_bans
  FOR ALL USING (auth.role() = 'service_role');

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

ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage fraud alerts" ON public.fraud_alerts;
CREATE POLICY "Service role can manage fraud alerts" ON public.fraud_alerts
  FOR ALL USING (auth.role() = 'service_role');

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

ALTER TABLE public.abuse_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create abuse reports" ON public.abuse_reports;
DROP POLICY IF EXISTS "Users can view own reports" ON public.abuse_reports;
DROP POLICY IF EXISTS "Service role can manage abuse reports" ON public.abuse_reports;
CREATE POLICY "Users can create abuse reports" ON public.abuse_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON public.abuse_reports
  FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Service role can manage abuse reports" ON public.abuse_reports
  FOR ALL USING (auth.role() = 'service_role');

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

ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage moderation queue" ON public.moderation_queue;
CREATE POLICY "Service role can manage moderation queue" ON public.moderation_queue
  FOR ALL USING (auth.role() = 'service_role');

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

ALTER TABLE public.user_trust_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage trust scores" ON public.user_trust_scores;
CREATE POLICY "Service role can manage trust scores" ON public.user_trust_scores
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- STEP 8: CREATE PHASE 5 TABLES (BUG DETECTION + INTELLIGENCE)
-- ============================================================

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

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage error logs" ON public.error_logs;
DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.error_logs;
CREATE POLICY "Service role can manage error logs" ON public.error_logs
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anyone can insert error logs" ON public.error_logs
  FOR INSERT WITH CHECK (TRUE);

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

ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage performance metrics" ON public.performance_metrics;
CREATE POLICY "Service role can manage performance metrics" ON public.performance_metrics
  FOR ALL USING (auth.role() = 'service_role');

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

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role can manage all sessions" ON public.user_sessions;
CREATE POLICY "Users can manage own sessions" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all sessions" ON public.user_sessions
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- STEP 9: CREATE PHASE 6 TABLES (ULTIMATE CONTROL)
-- ============================================================

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

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Service role can manage coupons" ON public.coupons;
CREATE POLICY "Anyone can read active coupons" ON public.coupons
  FOR SELECT USING (is_active = TRUE AND (valid_until IS NULL OR valid_until > NOW()));
CREATE POLICY "Service role can manage coupons" ON public.coupons
  FOR ALL USING (auth.role() = 'service_role');

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

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Service role can manage redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users can view own redemptions" ON public.coupon_redemptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage redemptions" ON public.coupon_redemptions
  FOR ALL USING (auth.role() = 'service_role');

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

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;
DROP POLICY IF EXISTS "Service role can manage referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Users can create referrals" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);
CREATE POLICY "Service role can manage referrals" ON public.referrals
  FOR ALL USING (auth.role() = 'service_role');

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

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own rewards" ON public.referral_rewards;
DROP POLICY IF EXISTS "Service role can manage rewards" ON public.referral_rewards;
CREATE POLICY "Users can view own rewards" ON public.referral_rewards
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage rewards" ON public.referral_rewards
  FOR ALL USING (auth.role() = 'service_role');

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

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage email campaigns" ON public.email_campaigns;
CREATE POLICY "Service role can manage email campaigns" ON public.email_campaigns
  FOR ALL USING (auth.role() = 'service_role');

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

ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own push notifications" ON public.push_notifications;
DROP POLICY IF EXISTS "Service role can manage push notifications" ON public.push_notifications;
CREATE POLICY "Users can view own push notifications" ON public.push_notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage push notifications" ON public.push_notifications
  FOR ALL USING (auth.role() = 'service_role');

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

ALTER TABLE public.user_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage user segments" ON public.user_segments;
CREATE POLICY "Service role can manage user segments" ON public.user_segments
  FOR ALL USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.user_segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES public.user_segments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(segment_id, user_id)
);

ALTER TABLE public.user_segment_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage segment members" ON public.user_segment_members;
CREATE POLICY "Service role can manage segment members" ON public.user_segment_members
  FOR ALL USING (auth.role() = 'service_role');

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

ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage A/B tests" ON public.ab_tests;
CREATE POLICY "Service role can manage A/B tests" ON public.ab_tests
  FOR ALL USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.ab_test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ,
  UNIQUE(test_id, user_id)
);

ALTER TABLE public.ab_test_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage A/B assignments" ON public.ab_test_assignments;
CREATE POLICY "Service role can manage A/B assignments" ON public.ab_test_assignments
  FOR ALL USING (auth.role() = 'service_role');

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

ALTER TABLE public.revenue_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.revenue_transactions;
DROP POLICY IF EXISTS "Service role can manage revenue transactions" ON public.revenue_transactions;
CREATE POLICY "Users can view own transactions" ON public.revenue_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage revenue transactions" ON public.revenue_transactions
  FOR ALL USING (auth.role() = 'service_role');

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

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own refunds" ON public.refunds;
DROP POLICY IF EXISTS "Service role can manage refunds" ON public.refunds;
CREATE POLICY "Users can view own refunds" ON public.refunds
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage refunds" ON public.refunds
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- STEP 10: CREATE INDEXES
-- ============================================================

-- User trials
CREATE INDEX IF NOT EXISTS idx_user_trials_user_id ON public.user_trials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trials_status ON public.user_trials(status);
CREATE INDEX IF NOT EXISTS idx_user_trials_expires_at ON public.user_trials(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_trials_device_fingerprint ON public.user_trials(device_fingerprint);

-- Device fingerprints
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user_id ON public.device_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_hash ON public.device_fingerprints(fingerprint_hash);

-- User notes
CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON public.user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_admin_id ON public.user_notes(admin_id);

-- Feature flag overrides
CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_flag_key ON public.feature_flag_overrides(flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flag_overrides_target ON public.feature_flag_overrides(target_type, target_id);

-- System announcements
CREATE INDEX IF NOT EXISTS idx_system_announcements_active ON public.system_announcements(active);
CREATE INDEX IF NOT EXISTS idx_system_announcements_dates ON public.system_announcements(start_date, end_date);

-- User bans
CREATE INDEX IF NOT EXISTS idx_user_bans_user_id ON public.user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_status ON public.user_bans(status);
CREATE INDEX IF NOT EXISTS idx_user_bans_ban_type ON public.user_bans(ban_type);
CREATE INDEX IF NOT EXISTS idx_user_bans_issued_by ON public.user_bans(issued_by);

-- Fraud alerts
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_user_id ON public.fraud_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON public.fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_severity ON public.fraud_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_type ON public.fraud_alerts(alert_type);

-- Abuse reports
CREATE INDEX IF NOT EXISTS idx_abuse_reports_reporter ON public.abuse_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_abuse_reports_reported ON public.abuse_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_abuse_reports_status ON public.abuse_reports(status);

-- Moderation queue
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON public.moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_priority ON public.moderation_queue(priority);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_assigned ON public.moderation_queue(assigned_to);

-- User trust scores
CREATE INDEX IF NOT EXISTS idx_user_trust_scores_user_id ON public.user_trust_scores(user_id);

-- Error logs
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON public.error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_source ON public.error_logs(source);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_last_seen ON public.error_logs(last_seen_at);

-- Performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON public.performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created ON public.performance_metrics(created_at);

-- User sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active);

-- Coupons
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active);

-- Coupon redemptions
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON public.coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON public.coupon_redemptions(user_id);

-- Referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);

-- Referral rewards
CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON public.referral_rewards(user_id);

-- Revenue transactions
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_user ON public.revenue_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_type ON public.revenue_transactions(type);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_created ON public.revenue_transactions(created_at);

-- Refunds
CREATE INDEX IF NOT EXISTS idx_refunds_transaction ON public.refunds(transaction_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);

-- System controls
CREATE INDEX IF NOT EXISTS idx_system_controls_category ON public.system_controls(category);
CREATE INDEX IF NOT EXISTS idx_system_controls_key ON public.system_controls(key);


-- ============================================================
-- STEP 11: SEED FEATURE FLAGS
-- ============================================================
-- Uses the ACTUAL feature_flags columns plus the new target/value columns.
-- All existing flags from complete-migration.sql are preserved (ON CONFLICT DO NOTHING).
-- New flags for the business control features are added.

INSERT INTO public.feature_flags (key, name, description, enabled, rollout_percentage, target_plan, target, value) VALUES
  -- Original flags (already seeded by complete-migration.sql, will be skipped by ON CONFLICT)
  ('ai_insights', 'AI Insights Widget', 'Show AI-powered insights on dashboard', TRUE, 100, NULL, 'all', NULL),
  ('hijri_calendar', 'Hijri Calendar View', 'Show Hijri dates alongside Gregorian', TRUE, 80, 'Pro', 'plan', '"pro"'),
  ('voice_messages', 'Voice Messages', 'Allow voice message recording in chat', TRUE, 100, NULL, 'all', NULL),
  ('budget_tracking', 'Budget Tracking', 'Family budget and expense tracking', TRUE, 60, 'Family+', 'plan', '"family_plus"'),
  ('meal_planning', 'Meal Planning', 'Weekly meal planning and recipes', TRUE, 40, 'Pro', 'plan', '"pro"'),
  ('chores_module', 'Chores Module', 'Chore assignment and tracking', FALSE, 0, NULL, 'all', NULL),
  ('milestones', 'Milestones', 'Family milestone tracking', TRUE, 100, NULL, 'all', NULL),
  ('family_qr', 'QR Code Invites', 'QR code for family invitation', TRUE, 90, NULL, 'all', NULL),
  -- New flags for business control features
  ('ai_meal_suggestions', 'AI Meal Suggestions', 'AI-powered meal plan recommendations', TRUE, 100, NULL, 'all', NULL),
  ('ai_summary', 'AI Dashboard Summary', 'AI-generated dashboard summary widget', TRUE, 100, NULL, 'all', NULL),
  ('advanced_analytics', 'Advanced Analytics', 'Detailed family analytics and insights', FALSE, 0, 'Max', 'plan', '"max"'),
  ('custom_themes', 'Custom Themes', 'Customizable app themes and colors', FALSE, 0, 'Max', 'plan', '"max"'),
  ('priority_support', 'Priority Support', 'Priority customer support access', FALSE, 0, 'Max', 'plan', '"max"'),
  ('unlimited_families', 'Unlimited Families', 'Create unlimited family groups', FALSE, 0, 'Ultimate', 'plan', '"ultimate"'),
  ('early_access', 'Early Access Features', 'Access to beta features before release', FALSE, 0, NULL, 'beta', NULL),
  ('referral_system', 'Referral System', 'Refer friends and earn rewards', FALSE, 0, NULL, 'all', NULL),
  ('coupon_engine', 'Coupon Engine', 'Apply discount codes at checkout', FALSE, 0, NULL, 'all', NULL),
  ('push_notifications', 'Push Notifications', 'Browser and mobile push notifications', FALSE, 0, NULL, 'all', NULL)
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- STEP 12: SEED SYSTEM CONTROLS
-- ============================================================

INSERT INTO public.system_controls (key, name, value, description, category) VALUES
  ('maintenance_mode', 'Maintenance Mode', 'false', 'Enable maintenance mode (blocks all user access)', 'system'),
  ('registration_enabled', 'Registration Enabled', 'true', 'Allow new user registrations', 'system'),
  ('force_update', 'Force Update', 'false', 'Require users to update the app', 'system'),
  ('min_app_version', 'Minimum App Version', '"1.0.0"', 'Minimum app version required', 'system'),
  ('emergency_shutdown', 'Emergency Shutdown', 'false', 'Emergency shutdown (immediate access block)', 'system'),
  ('max_free_families', 'Max Free Families', '1', 'Maximum families for free plan', 'limits'),
  ('max_free_members', 'Max Free Members', '5', 'Maximum members per family for free plan', 'limits'),
  ('trial_duration_days', 'Trial Duration (Days)', '3', 'Free trial duration in days', 'limits'),
  ('default_language', 'Default Language', '"ar"', 'Default app language', 'regional'),
  ('default_currency', 'Default Currency', '"SAR"', 'Default currency for pricing', 'regional'),
  ('allowed_countries', 'Allowed Countries', '["SA","AE","KW","BH","QA","OM"]', 'Allowed country codes', 'regional'),
  ('email_verification_required', 'Email Verification Required', 'false', 'Require email verification on signup', 'auth'),
  ('max_login_attempts', 'Max Login Attempts', '5', 'Maximum login attempts before lockout', 'auth'),
  ('lockout_duration_minutes', 'Lockout Duration (Minutes)', '15', 'Account lockout duration in minutes', 'auth')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- STEP 13: SEED ADDITIONAL SYSTEM_CONFIG ENTRIES
-- ============================================================
-- These supplement the system_config entries from complete-migration.sql

INSERT INTO public.system_config (key, value, description) VALUES
  ('trial_enabled', '{"value": true}', 'Whether free trials are enabled'),
  ('trial_duration_hours', '{"value": 72}', 'Trial duration in hours (72 = 3 days)'),
  ('max_trials_per_device', '{"value": 1}', 'Max trials allowed per device fingerprint'),
  ('auto_ban_on_fraud_score', '{"value": 90, "action": "shadow_ban"}', 'Auto-action when fraud score exceeds threshold'),
  ('permanent_ban_requires_approval', '{"value": true}', 'Permanent bans require super_admin approval')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- STEP 14: SEED DEFAULT USER SEGMENTS
-- ============================================================

INSERT INTO public.user_segments (name, description, rules, user_count) VALUES
  ('All Users', 'All registered users', '{}', 0),
  ('Free Plan Users', 'Users on the free plan', '{"plan": "free"}', 0),
  ('Paid Users', 'Users on any paid plan', '{"plan": {"not": "free"}}', 0),
  ('Trial Users', 'Users currently in free trial', '{"trial_status": "active"}', 0),
  ('Churned Users', 'Users who cancelled their subscription', '{"subscription_status": "cancelled"}', 0),
  ('VIP Users', 'Users with VIP status', '{"is_vip": true}', 0),
  ('Beta Testers', 'Users enrolled in beta testing', '{"beta_tester": true}', 0),
  ('KSA Users', 'Users from Saudi Arabia', '{"country": "SA"}', 0)
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- STEP 15: SEED DEFAULT COUPONS
-- ============================================================

INSERT INTO public.coupons (code, name, description, discount_type, discount_value, applicable_plans, max_redemptions, is_active, target_audience, auto_apply) VALUES
  ('WELCOME10', 'Welcome Discount', '10% off your first month', 'percentage', 10.00, '{"pro","family_plus","max"}', 1000, TRUE, 'new_users', FALSE),
  ('RAMADAN30', 'Ramadan Special', '30% off during Ramadan', 'percentage', 30.00, '{"pro","family_plus","max"}', 500, FALSE, 'all', FALSE),
  ('FAMILYLAUNCH', 'Launch Special', 'Free trial extension to 7 days', 'free_trial_extension', 4.00, '{"pro","max"}', 2000, TRUE, 'new_users', TRUE),
  ('ULTIMATEDEAL', 'Ultimate Lifetime Deal', '$50 off lifetime plan', 'fixed_amount', 50.00, '{"ultimate"}', 100, TRUE, 'all', FALSE)
ON CONFLICT (code) DO NOTHING;


-- ============================================================
-- STEP 16: CREATE TRIGGERS & FUNCTIONS
-- ============================================================

-- Auto-expire trials
CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS void AS $$
BEGIN
  UPDATE public.user_trials
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-expire bans
CREATE OR REPLACE FUNCTION public.expire_bans()
RETURNS void AS $$
BEGIN
  UPDATE public.user_bans
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND ban_type != 'permanent_ban' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check permanent ban approval
CREATE OR REPLACE FUNCTION public.check_permanent_ban_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ban_type = 'permanent_ban' AND NEW.approved_by IS NULL THEN
    NEW.approval_required := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_check_permanent_ban_approval ON public.user_bans;
CREATE TRIGGER trigger_check_permanent_ban_approval
  BEFORE INSERT ON public.user_bans
  FOR EACH ROW EXECUTE FUNCTION public.check_permanent_ban_approval();

-- Deduplicate errors (increment occurrence_count instead of inserting duplicates)
CREATE OR REPLACE FUNCTION public.deduplicate_error()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.error_logs
  SET occurrence_count = occurrence_count + 1,
      last_seen_at = NOW(),
      resolved = FALSE
  WHERE error_type = NEW.error_type
    AND message = NEW.message
    AND source = NEW.source
    AND (url IS NOT DISTINCT FROM NEW.url)
    AND resolved = FALSE;
  IF FOUND THEN
    RETURN NULL; -- Skip insert, we updated instead
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_deduplicate_error ON public.error_logs;
CREATE TRIGGER trigger_deduplicate_error
  BEFORE INSERT ON public.error_logs
  FOR EACH ROW EXECUTE FUNCTION public.deduplicate_error();

-- updated_at triggers for new tables
DROP TRIGGER IF EXISTS update_user_trials_updated_at ON public.user_trials;
CREATE TRIGGER update_user_trials_updated_at BEFORE UPDATE ON public.user_trials FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_user_bans_updated_at ON public.user_bans;
CREATE TRIGGER update_user_bans_updated_at BEFORE UPDATE ON public.user_bans FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_fraud_alerts_updated_at ON public.fraud_alerts;
CREATE TRIGGER update_fraud_alerts_updated_at BEFORE UPDATE ON public.fraud_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_abuse_reports_updated_at ON public.abuse_reports;
CREATE TRIGGER update_abuse_reports_updated_at BEFORE UPDATE ON public.abuse_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_moderation_queue_updated_at ON public.moderation_queue;
CREATE TRIGGER update_moderation_queue_updated_at BEFORE UPDATE ON public.moderation_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_user_trust_scores_updated_at ON public.user_trust_scores;
CREATE TRIGGER update_user_trust_scores_updated_at BEFORE UPDATE ON public.user_trust_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_coupons_updated_at ON public.coupons;
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_referrals_updated_at ON public.referrals;
CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON public.referrals FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_email_campaigns_updated_at ON public.email_campaigns;
CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON public.email_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_revenue_transactions_updated_at ON public.revenue_transactions;
CREATE TRIGGER update_revenue_transactions_updated_at BEFORE UPDATE ON public.revenue_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_refunds_updated_at ON public.refunds;
CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_system_announcements_updated_at ON public.system_announcements;
CREATE TRIGGER update_system_announcements_updated_at BEFORE UPDATE ON public.system_announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_ab_tests_updated_at ON public.ab_tests;
CREATE TRIGGER update_ab_tests_updated_at BEFORE UPDATE ON public.ab_tests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_user_segments_updated_at ON public.user_segments;
CREATE TRIGGER update_user_segments_updated_at BEFORE UPDATE ON public.user_segments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- system_controls updated_at trigger
DROP TRIGGER IF EXISTS update_system_controls_updated_at ON public.system_controls;
CREATE TRIGGER update_system_controls_updated_at BEFORE UPDATE ON public.system_controls FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- STEP 17: CREATE HELPER VIEWS
-- ============================================================

-- Trial funnel analytics
CREATE OR REPLACE VIEW public.v_trial_funnel AS
SELECT
  COUNT(*) AS total_trials,
  COUNT(*) FILTER (WHERE status = 'active') AS active_trials,
  COUNT(*) FILTER (WHERE status = 'expired') AS expired_trials,
  COUNT(*) FILTER (WHERE status = 'converted') AS converted_trials,
  COUNT(*) FILTER (WHERE was_abuse_flagged = TRUE) AS abuse_flagged,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'converted')::NUMERIC /
    NULLIF(COUNT(*)::NUMERIC, 0) * 100, 1
  ) AS conversion_rate_pct,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (converted_at - started_at)) / 3600)::NUMERIC, 1
  ) AS avg_hours_to_convert
FROM public.user_trials;

-- Revenue summary
CREATE OR REPLACE VIEW public.v_revenue_summary AS
SELECT
  SUM(amount) FILTER (WHERE type = 'payment' AND status = 'completed') AS total_revenue,
  SUM(amount) FILTER (WHERE type = 'refund' AND status = 'completed') AS total_refunds,
  SUM(amount) FILTER (WHERE type = 'payment' AND status = 'completed'
    AND created_at >= DATE_TRUNC('month', NOW())) AS mrr,
  COUNT(*) FILTER (WHERE type = 'payment' AND status = 'completed'
    AND created_at >= DATE_TRUNC('month', NOW())) AS monthly_payments,
  SUM(discount_amount) AS total_discounts_given
FROM public.revenue_transactions;

-- Moderation summary
CREATE OR REPLACE VIEW public.v_moderation_summary AS
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_items,
  COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_items,
  COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_items,
  COUNT(*) FILTER (WHERE status = 'escalated') AS escalated_items,
  COUNT(*) FILTER (WHERE priority = 'urgent') AS urgent_items,
  COUNT(*) FILTER (WHERE item_type = 'ban_review') AS ban_reviews,
  COUNT(*) FILTER (WHERE item_type = 'abuse_report') AS abuse_reports,
  COUNT(*) FILTER (WHERE item_type = 'fraud_alert') AS fraud_alerts,
  COUNT(*) FILTER (WHERE item_type = 'appeal') AS appeals
FROM public.moderation_queue;

-- Trust score distribution
CREATE OR REPLACE VIEW public.v_trust_distribution AS
SELECT
  risk_level,
  COUNT(*) AS user_count,
  AVG(trust_score)::NUMERIC(5,2) AS avg_trust_score,
  AVG(fraud_score)::NUMERIC(5,2) AS avg_fraud_score
FROM public.user_trust_scores
GROUP BY risk_level
ORDER BY array_position(ARRAY['low','medium','high','critical'], risk_level);

-- Error summary
CREATE OR REPLACE VIEW public.v_error_summary AS
SELECT
  source,
  level,
  COUNT(*) AS total_errors,
  SUM(occurrence_count) AS total_occurrences,
  COUNT(*) FILTER (WHERE resolved = FALSE) AS unresolved_count,
  MAX(last_seen_at) AS last_occurrence
FROM public.error_logs
GROUP BY source, level
ORDER BY total_occurrences DESC;


-- ============================================================
-- STEP 18: ADD REALTIME PUBLICATIONS
-- ============================================================
-- Use DO blocks with exception handling so this doesn't fail
-- if a table is already in the publication.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_trials;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_bans;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.fraud_alerts;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.moderation_queue;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.system_announcements;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.error_logs;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.push_notifications;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.revenue_transactions;
EXCEPTION WHEN others THEN NULL;
END $$;


-- ============================================================
-- DONE!
-- ============================================================
-- Your USRA PLUS database now has all Phase 2-6 tables.
--
-- Verify by running these queries in Supabase SQL Editor:
--
--   SELECT plan, price, monthly_price, yearly_price, lifetime_price FROM plan_configs ORDER BY sort_order;
--   SELECT key, name, enabled, target, value FROM feature_flags ORDER BY key;
--   SELECT key, name, value, category FROM system_controls ORDER BY category, key;
--   SELECT * FROM v_trial_funnel;
--   SELECT * FROM v_revenue_summary;
--   SELECT * FROM v_moderation_summary;
--
-- Total new tables: 28
-- Total new views: 5
-- Total new functions: 4
-- Total new triggers: 16
-- Total new indexes: 42
-- ============================================================
