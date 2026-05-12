-- ============================================================
-- USRA PLUS — Business Control Mode Migration
-- ============================================================
-- This migration adds all tables needed for the FULL BUSINESS
-- CONTROL MODE upgrade across all 6 phases:
--
-- Phase 2: Subscription + Free Trial System
--   - user_trials (3-day free trial with abuse prevention)
--   - device_fingerprints (duplicate trial prevention)
--
-- Phase 3: Ultimate Super Admin Control Center
--   - user_notes (admin notes on users)
--   - feature_flag_overrides (per-user/family flag overrides)
--   - system_announcements (in-app announcements with targeting)
--   - maintenance_windows (scheduled maintenance)
--
-- Phase 4: Trust, Safety, Fraud + Ban System
--   - user_bans (warnings, suspensions, shadow bans, permanent bans)
--   - fraud_alerts (automated fraud detection alerts)
--   - abuse_reports (user-submitted abuse reports)
--   - moderation_queue (content/action review queue)
--   - user_trust_scores (trust/fraud scoring)
--
-- Phase 5: Bug Detection + Platform Intelligence
--   - error_logs (real-time error logging from server and client)
--   - performance_metrics (API response times, DB health)
--   - user_sessions (session tracking for churn analytics)
--
-- Phase 6: Ultimate Control Suggestions
--   - coupons (coupon engine with codes, limits, expiry)
--   - coupon_redemptions (tracking coupon usage)
--   - referrals (referral system with rewards)
--   - referral_rewards (tracking referral rewards)
--   - email_campaigns (email campaign management)
--   - push_notifications (push notification logs)
--   - user_segments (user segmentation for targeting)
--   - ab_tests (A/B feature testing)
--   - ab_test_assignments (user assignment to A/B tests)
--   - vip_users (VIP user tagging)
--   - revenue_transactions (detailed revenue tracking)
--   - refunds (refund management)
--
-- Prerequisites: complete-migration.sql and additional-tables.sql
-- must already be applied.
-- ============================================================


-- ============================================================
-- PHASE 2: SUBSCRIPTION + FREE TRIAL
-- ============================================================

-- -------------------------------------------
-- USER_TRIALS
-- -------------------------------------------
-- Tracks free trial state per user. Once a trial is used,
-- it cannot be reused (enforced at DB level + application level).
CREATE TABLE IF NOT EXISTS public.user_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'converted')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL, -- started_at + 72 hours
  converted_at TIMESTAMPTZ,        -- When user upgraded to paid
  converted_to_plan TEXT,           -- Which plan they converted to
  ip_address INET,                  -- IP at trial start (abuse tracking)
  device_fingerprint TEXT,          -- Device hash at trial start
  was_abuse_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_trials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trial" ON public.user_trials
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage trials" ON public.user_trials
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- DEVICE_FINGERPRINTS
-- -------------------------------------------
-- Stores device fingerprints for duplicate trial detection.
-- If a fingerprint already has an active/expired trial on a
-- different user_id, the new trial is blocked.
CREATE TABLE IF NOT EXISTS public.device_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fingerprint_hash TEXT NOT NULL,     -- SHA-256 of device characteristics
  user_agent TEXT,
  screen_resolution TEXT,
  timezone TEXT,
  language TEXT,
  platform TEXT,                       -- web/ios/android
  ip_address INET,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own fingerprint" ON public.device_fingerprints
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role can manage fingerprints" ON public.device_fingerprints
  FOR ALL USING (auth.role() = 'service_role');

-- Add trial-related columns to subscriptions table
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime'));
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS discount_code TEXT;

-- Add status column to profiles for ban/suspend support
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned', 'shadow_banned', 'flagged'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vip_tag TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS beta_tester BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Update plan_configs to include new tiers and regional pricing
ALTER TABLE public.plan_configs ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10,2);
ALTER TABLE public.plan_configs ADD COLUMN IF NOT EXISTS yearly_price DECIMAL(10,2);
ALTER TABLE public.plan_configs ADD COLUMN IF NOT EXISTS lifetime_price DECIMAL(10,2);
ALTER TABLE public.plan_configs ADD COLUMN IF NOT EXISTS regional_pricing JSONB DEFAULT '{}';  -- {"SA": 29.99, "AE": 34.99, "US": 9.99}
ALTER TABLE public.plan_configs ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0;
ALTER TABLE public.plan_configs ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT FALSE;
ALTER TABLE public.plan_configs ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.plan_configs ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT '';

-- IMPORTANT: Update constraints BEFORE inserting new plan values
-- Update subscription plan constraint to include new plans
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'pro', 'family_plus', 'max', 'ultimate'));

-- Update plan_configs plan constraint to include Max and Ultimate
ALTER TABLE public.plan_configs DROP CONSTRAINT IF EXISTS plan_configs_plan_check;
ALTER TABLE public.plan_configs ADD CONSTRAINT plan_configs_plan_check
  CHECK (plan IN ('Free', 'Pro', 'Family+', 'Max', 'Ultimate'));

-- Now add Max and Ultimate plans
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
-- PHASE 3: SUPER ADMIN CONTROL CENTER
-- ============================================================

-- -------------------------------------------
-- USER_NOTES
-- -------------------------------------------
-- Admin notes attached to users for internal coordination.
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

CREATE POLICY "Service role can manage user notes" ON public.user_notes
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- FEATURE_FLAG_OVERRIDES
-- -------------------------------------------
-- Per-user or per-family feature flag overrides.
-- Takes precedence over the global feature_flags table.
CREATE TABLE IF NOT EXISTS public.feature_flag_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL REFERENCES public.feature_flags(key) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'family', 'plan', 'beta')),
  target_id TEXT NOT NULL,            -- user_id, family_id, or plan name
  enabled BOOLEAN NOT NULL,
  reason TEXT DEFAULT '',             -- Why the override exists
  created_by UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,            -- Optional: auto-remove after expiry
  UNIQUE(flag_key, target_type, target_id)
);

ALTER TABLE public.feature_flag_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feature flag overrides" ON public.feature_flag_overrides
  FOR SELECT USING (TRUE);
CREATE POLICY "Service role can manage feature flag overrides" ON public.feature_flag_overrides
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- SYSTEM_ANNOUNCEMENTS (enhanced)
-- -------------------------------------------
-- Enhanced announcements with targeting, scheduling, and CTA.
CREATE TABLE IF NOT EXISTS public.system_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'critical', 'update', 'promotion')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  banner BOOLEAN DEFAULT FALSE,         -- Show as persistent banner
  banner_position TEXT DEFAULT 'top' CHECK (banner_position IN ('top', 'bottom')),
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'free', 'pro', 'family_plus', 'max', 'ultimate', 'beta', 'trial', 'vip')),
  cta_text TEXT,                         -- "Upgrade Now", "Learn More"
  cta_url TEXT,                          -- Where the CTA button links
  dismissible BOOLEAN DEFAULT TRUE,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  priority INTEGER DEFAULT 0,            -- Higher = shown first
  created_by UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active announcements" ON public.system_announcements
  FOR SELECT USING (TRUE);
CREATE POLICY "Service role can manage system announcements" ON public.system_announcements
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- MAINTENANCE_WINDOWS
-- -------------------------------------------
-- Scheduled maintenance windows that show banners to users.
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

CREATE POLICY "Anyone can read maintenance windows" ON public.maintenance_windows
  FOR SELECT USING (TRUE);
CREATE POLICY "Service role can manage maintenance windows" ON public.maintenance_windows
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- PHASE 4: TRUST, SAFETY, FRAUD + BAN SYSTEM
-- ============================================================

-- -------------------------------------------
-- USER_BANS
-- -------------------------------------------
-- Comprehensive ban/warning system with multiple levels.
-- Permanent bans require super_admin approval.
CREATE TABLE IF NOT EXISTS public.user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ban_type TEXT NOT NULL CHECK (ban_type IN ('warning', 'temporary_suspension', 'shadow_ban', 'permanent_ban')),
  reason TEXT NOT NULL,
  details JSONB DEFAULT '{}',           -- Supporting evidence/details
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'appealed', 'upheld', 'revoked', 'expired')),
  issued_by UUID NOT NULL REFERENCES public.admin_users(id),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,               -- NULL for permanent bans
  -- Approval workflow for permanent bans
  approval_required BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES public.admin_users(id),
  approved_at TIMESTAMPTZ,
  -- Revocation
  revoked_by UUID REFERENCES public.admin_users(id),
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  -- Appeal tracking
  appeal_text TEXT,
  appeal_submitted_at TIMESTAMPTZ,
  appeal_resolved_at TIMESTAMPTZ,
  appeal_resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bans" ON public.user_bans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage bans" ON public.user_bans
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- FRAUD_ALERTS
-- -------------------------------------------
-- Automated fraud detection alerts for admin review.
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
  evidence JSONB DEFAULT '{}',           -- IPs, timestamps, patterns, etc.
  risk_score INTEGER DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100),
  auto_action TEXT,                      -- Any automated action taken
  assigned_to UUID REFERENCES public.admin_users(id),
  resolved_by UUID REFERENCES public.admin_users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage fraud alerts" ON public.fraud_alerts
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- ABUSE_REPORTS
-- -------------------------------------------
-- Reports submitted by users about other users or content.
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

CREATE POLICY "Users can create abuse reports" ON public.abuse_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON public.abuse_reports
  FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Service role can manage abuse reports" ON public.abuse_reports
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- MODERATION_QUEUE
-- -------------------------------------------
-- Queue of items requiring admin review (bans, reports, flagged content).
CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL CHECK (item_type IN ('ban_review', 'abuse_report', 'fraud_alert', 'appeal', 'content_flag')),
  item_id UUID NOT NULL,                -- Reference to the related record
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

CREATE POLICY "Service role can manage moderation queue" ON public.moderation_queue
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- USER_TRUST_SCORES
-- -------------------------------------------
-- Trust and fraud scoring for each user.
CREATE TABLE IF NOT EXISTS public.user_trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  trust_score INTEGER NOT NULL DEFAULT 100 CHECK (trust_score >= 0 AND trust_score <= 100),
  fraud_score INTEGER NOT NULL DEFAULT 0 CHECK (fraud_score >= 0 AND fraud_score <= 100),
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  factors JSONB DEFAULT '{}',            -- {"failed_logins": 3, "duplicate_trials": 0, "reports_against": 0, ...}
  last_evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage trust scores" ON public.user_trust_scores
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- PHASE 5: BUG DETECTION + PLATFORM INTELLIGENCE
-- ============================================================

-- -------------------------------------------
-- ERROR_LOGS
-- -------------------------------------------
-- Real-time error logging from both server and client.
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL DEFAULT 'error' CHECK (level IN ('debug', 'info', 'warning', 'error', 'critical')),
  source TEXT NOT NULL CHECK (source IN ('server', 'client', 'api', 'cron', 'migration')),
  error_type TEXT NOT NULL,              -- TypeError, NetworkError, etc.
  message TEXT NOT NULL,
  stack_trace TEXT,
  url TEXT,                              -- Request URL or page URL
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_agent TEXT,
  ip_address INET,
  metadata JSONB DEFAULT '{}',           -- Additional context
  occurrence_count INTEGER DEFAULT 1,    -- How many times this error occurred
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES public.admin_users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage error logs" ON public.error_logs
  FOR ALL USING (auth.role() = 'service_role');
-- Allow client-side error logging (anonymous)
CREATE POLICY "Anyone can insert error logs" ON public.error_logs
  FOR INSERT WITH CHECK (TRUE);

-- -------------------------------------------
-- PERFORMANCE_METRICS
-- -------------------------------------------
-- Platform performance metrics for monitoring.
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('api_response', 'db_query', 'page_load', 'websocket', 'storage', 'auth')),
  metric_name TEXT NOT NULL,             -- "GET /api/admin/overview", "auth.signin", etc.
  duration_ms INTEGER NOT NULL,          -- Duration in milliseconds
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout')),
  metadata JSONB DEFAULT '{}',
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage performance metrics" ON public.performance_metrics
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- USER_SESSIONS
-- -------------------------------------------
-- Session tracking for churn analytics and active user measurement.
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,              -- Browser session identifier
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

CREATE POLICY "Users can manage own sessions" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all sessions" ON public.user_sessions
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- PHASE 6: ULTIMATE CONTROL SUGGESTIONS
-- ============================================================

-- -------------------------------------------
-- COUPONS
-- -------------------------------------------
-- Coupon engine with flexible discount rules.
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,             -- "USRA2024", "RAMADAN30", etc.
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_trial_extension', 'plan_upgrade')),
  discount_value DECIMAL(10,2) NOT NULL, -- 30 = 30% or $30 depending on type
  applicable_plans TEXT[] DEFAULT '{}',  -- Empty = all plans
  max_redemptions INTEGER,               -- NULL = unlimited
  current_redemptions INTEGER DEFAULT 0,
  max_redemptions_per_user INTEGER DEFAULT 1,
  min_purchase_amount DECIMAL(10,2) DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,              -- NULL = no expiry
  is_active BOOLEAN DEFAULT TRUE,
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'new_users', 'existing_users', 'churned_users', 'trial_users', 'vip')),
  auto_apply BOOLEAN DEFAULT FALSE,     -- Auto-apply at checkout
  created_by UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active coupons" ON public.coupons
  FOR SELECT USING (is_active = TRUE AND (valid_until IS NULL OR valid_until > NOW()));
CREATE POLICY "Service role can manage coupons" ON public.coupons
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- COUPON_REDEMPTIONS
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id),
  discount_applied DECIMAL(10,2) NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  UNIQUE(coupon_id, user_id)            -- One redemption per coupon per user
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own redemptions" ON public.coupon_redemptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage redemptions" ON public.coupon_redemptions
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- REFERRALS
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,    -- User's unique referral code
  referred_email TEXT,                   -- Email of the person they're inviting
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

CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Users can create referrals" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);
CREATE POLICY "Service role can manage referrals" ON public.referrals
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- REFERRAL_REWARDS
-- -------------------------------------------
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

CREATE POLICY "Users can view own rewards" ON public.referral_rewards
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage rewards" ON public.referral_rewards
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- EMAIL_CAMPAIGNS
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  template_id TEXT,
  target_segment TEXT DEFAULT 'all',      -- Links to user_segments
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

CREATE POLICY "Service role can manage email campaigns" ON public.email_campaigns
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- PUSH_NOTIFICATIONS
-- -------------------------------------------
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

CREATE POLICY "Users can view own push notifications" ON public.push_notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage push notifications" ON public.push_notifications
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- USER_SEGMENTS
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '{}',     -- {"plan": "free", "days_since_signup": {"gt": 30}, "country": "SA"}
  user_count INTEGER DEFAULT 0,
  is_auto_update BOOLEAN DEFAULT TRUE,   -- Auto-recalculate segment membership
  last_updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage user segments" ON public.user_segments
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- USER_SEGMENT_MEMBERS
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES public.user_segments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(segment_id, user_id)
);

ALTER TABLE public.user_segment_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage segment members" ON public.user_segment_members
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- AB_TESTS
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS public.ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  feature_key TEXT NOT NULL,             -- Which feature is being tested
  variant_a TEXT NOT NULL DEFAULT 'control',
  variant_b TEXT NOT NULL DEFAULT 'treatment',
  traffic_percentage INTEGER DEFAULT 50 CHECK (traffic_percentage >= 1 AND traffic_percentage <= 99),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
  target_segment TEXT DEFAULT 'all',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  winner TEXT,                           -- 'variant_a', 'variant_b', or NULL
  metrics JSONB DEFAULT '{}',            -- Conversion rates, click rates, etc.
  created_by UUID REFERENCES public.admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage A/B tests" ON public.ab_tests
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- AB_TEST_ASSIGNMENTS
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS public.ab_test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,                 -- 'variant_a' or 'variant_b'
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ,             -- When the user completed the desired action
  UNIQUE(test_id, user_id)
);

ALTER TABLE public.ab_test_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage A/B assignments" ON public.ab_test_assignments
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- REVENUE_TRANSACTIONS
-- -------------------------------------------
CREATE TABLE IF NOT EXISTS public.revenue_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id),
  type TEXT NOT NULL CHECK (type IN ('payment', 'refund', 'credit', 'coupon', 'trial', 'upgrade', 'downgrade')),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  original_amount DECIMAL(10,2),         -- Before discount
  discount_amount DECIMAL(10,2) DEFAULT 0,
  coupon_id UUID REFERENCES public.coupons(id),
  payment_provider TEXT,                  -- 'stripe', 'revenuecat', 'manual'
  provider_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'disputed')),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.revenue_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.revenue_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage revenue transactions" ON public.revenue_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------
-- REFUNDS
-- -------------------------------------------
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

CREATE POLICY "Users can view own refunds" ON public.refunds
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage refunds" ON public.refunds
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- INDEXES FOR NEW TABLES
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
CREATE INDEX IF NOT EXISTS idx_user_trust_scores_risk ON public.user_trust_scores(risk_level);

-- Error logs
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON public.error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_source ON public.error_logs(source);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON public.error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);

-- Performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON public.performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON public.performance_metrics(created_at);

-- User sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON public.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON public.user_sessions(started_at);

-- Coupons
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_dates ON public.coupons(valid_from, valid_until);

-- Coupon redemptions
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_id ON public.coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_id ON public.coupon_redemptions(user_id);

-- Referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

-- Revenue transactions
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_user_id ON public.revenue_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_type ON public.revenue_transactions(type);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_status ON public.revenue_transactions(status);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_created_at ON public.revenue_transactions(created_at);

-- Refunds
CREATE INDEX IF NOT EXISTS idx_refunds_transaction_id ON public.refunds(transaction_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON public.refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);

-- AB tests
CREATE INDEX IF NOT EXISTS idx_ab_tests_feature_key ON public.ab_tests(feature_key);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON public.ab_tests(status);

-- AB test assignments
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_test_id ON public.ab_test_assignments(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_user_id ON public.ab_test_assignments(user_id);

-- Email campaigns
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON public.email_campaigns(status);

-- Push notifications
CREATE INDEX IF NOT EXISTS idx_push_notifications_user_id ON public.push_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_type ON public.push_notifications(type);

-- User segments
CREATE INDEX IF NOT EXISTS idx_user_segment_members_segment ON public.user_segment_members(segment_id);
CREATE INDEX IF NOT EXISTS idx_user_segment_members_user ON public.user_segment_members(user_id);


-- ============================================================
-- TRIGGERS FOR NEW TABLES
-- ============================================================

-- Updated_at triggers for all new tables
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

DROP TRIGGER IF EXISTS update_ab_tests_updated_at ON public.ab_tests;
CREATE TRIGGER update_ab_tests_updated_at BEFORE UPDATE ON public.ab_tests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_refunds_updated_at ON public.refunds;
CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_system_announcements_updated_at ON public.system_announcements;
CREATE TRIGGER update_system_announcements_updated_at BEFORE UPDATE ON public.system_announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-expire trials trigger
CREATE OR REPLACE FUNCTION expire_user_trials()
RETURNS void AS $$
BEGIN
  UPDATE public.user_trials
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND expires_at < NOW();
  
  -- Auto-downgrade subscriptions for expired trials
  UPDATE public.subscriptions s
  SET plan = 'free', is_trial = FALSE, updated_at = NOW()
  FROM public.user_trials t
  WHERE s.user_id = t.user_id
    AND t.status = 'expired'
    AND s.is_trial = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-expire bans trigger
CREATE OR REPLACE FUNCTION expire_user_bans()
RETURNS void AS $$
BEGIN
  UPDATE public.user_bans
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' 
    AND ban_type IN ('temporary_suspension', 'warning')
    AND expires_at IS NOT NULL 
    AND expires_at < NOW();
    
  -- Restore user profile status when ban expires
  UPDATE public.profiles p
  SET status = 'active', status_reason = NULL, status_updated_at = NOW()
  FROM public.user_bans b
  WHERE p.id = b.user_id
    AND b.status = 'expired'
    AND p.status IN ('suspended', 'flagged');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Require approval for permanent bans
CREATE OR REPLACE FUNCTION check_permanent_ban_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ban_type = 'permanent_ban' AND NEW.approved_by IS NULL THEN
    NEW.approval_required := TRUE;
    NEW.status := 'active'; -- Active but pending approval
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_check_permanent_ban_approval ON public.user_bans;
CREATE TRIGGER trigger_check_permanent_ban_approval
  BEFORE INSERT ON public.user_bans
  FOR EACH ROW EXECUTE FUNCTION check_permanent_ban_approval();

-- Deduplicate error logs (increment occurrence count instead of inserting duplicate)
CREATE OR REPLACE FUNCTION deduplicate_error_log()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.error_logs
  SET occurrence_count = occurrence_count + 1,
      last_seen_at = NEW.last_seen_at,
      metadata = CASE 
        WHEN NEW.metadata::text <> '{}' THEN NEW.metadata 
        ELSE metadata 
      END
  WHERE error_type = NEW.error_type
    AND message = NEW.message
    AND source = NEW.source
    AND resolved = FALSE
    AND created_at > NOW() - INTERVAL '1 hour';
  
  IF FOUND THEN
    RETURN NULL; -- Skip insert, we updated the existing record
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_deduplicate_error_log ON public.error_logs;
CREATE TRIGGER trigger_deduplicate_error_log
  BEFORE INSERT ON public.error_logs
  FOR EACH ROW EXECUTE FUNCTION deduplicate_error_log();


-- ============================================================
-- REALTIME PUBLICATIONS FOR NEW TABLES
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_bans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fraud_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.moderation_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.error_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.push_notifications;


-- ============================================================
-- SEED DATA FOR NEW TABLES
-- ============================================================

-- Default user segments
INSERT INTO public.user_segments (name, description, rules) VALUES
  ('All Users', 'Every registered user', '{}'),
  ('Free Plan Users', 'Users on the Free plan', '{"plan": "free"}'),
  ('Paid Users', 'Users on any paid plan', '{"plan": {"in": ["pro", "family_plus", "max", "ultimate"]}}'),
  ('Trial Users', 'Users currently in free trial', '{"in_trial": true}'),
  ('Churned Users', 'Users who cancelled their subscription', '{"churned": true}'),
  ('New Users (7d)', 'Users who signed up in the last 7 days', '{"days_since_signup": {"lte": 7}}'),
  ('Active Users (30d)', 'Users who logged in within the last 30 days', '{"days_since_last_login": {"lte": 30}}'),
  ('VIP Users', 'Users tagged as VIP', '{"is_vip": true}'),
  ('Beta Testers', 'Users enrolled in the beta program', '{"beta_tester": true}')
ON CONFLICT (name) DO NOTHING;

-- Default system config additions
INSERT INTO public.system_config (key, value, description) VALUES
  ('trial_duration_hours', '{"value": 72}', 'Free trial duration in hours'),
  ('trial_requires_device_fingerprint', '{"value": true}', 'Whether to require device fingerprint for trial abuse prevention'),
  ('max_trials_per_device', '{"value": 1}', 'Maximum number of trials allowed per device fingerprint'),
  ('auto_ban_on_fraud_score', '{"value": 80, "action": "flag"}', 'Auto-action when fraud score exceeds threshold'),
  ('permanent_ban_requires_approval', '{"value": true}', 'Whether permanent bans require super_admin approval'),
  ('error_log_retention_days', '{"value": 90}', 'How many days to retain error logs'),
  ('performance_metrics_retention_days', '{"value": 30}', 'How many days to retain performance metrics')
ON CONFLICT (key) DO NOTHING;

-- Default coupons
INSERT INTO public.coupons (code, name, description, discount_type, discount_value, applicable_plans, max_redemptions, valid_until, target_audience) VALUES
  ('WELCOME20', 'Welcome 20% Off', '20% discount for new users on their first subscription', 'percentage', 20, '{"Pro", "Max"}', 1000, NOW() + INTERVAL '6 months', 'new_users'),
  ('RAMADAN30', 'Ramadan 30% Off', 'Special Ramadan discount', 'percentage', 30, '{"Pro", "Max", "Family+"}', NULL, 'all'),
  ('FOUNDER50', 'Founder Friends 50%', 'Exclusive 50% discount for founder network', 'percentage', 50, '{"Pro", "Max", "Family+"}', 100, NOW() + INTERVAL '3 months', 'all'),
  ('TRIAL_EXT7', '7-Day Trial Extension', 'Extend your free trial by 7 days', 'free_trial_extension', 7, '{}', NULL, 'trial_users')
ON CONFLICT (code) DO NOTHING;


-- ============================================================
-- HELPER VIEWS (for analytics dashboards)
-- ============================================================

-- Trial conversion funnel
CREATE OR REPLACE VIEW public.v_trial_funnel AS
SELECT
  COUNT(*) AS total_trials,
  COUNT(*) FILTER (WHERE status = 'active') AS active_trials,
  COUNT(*) FILTER (WHERE status = 'expired') AS expired_trials,
  COUNT(*) FILTER (WHERE status = 'converted') AS converted_trials,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_trials,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'converted')::NUMERIC /
    NULLIF(COUNT(*)::NUMERIC, 0) * 100,
    1
  ) AS conversion_rate,
  ROUND(
    EXTRACT(EPOCH FROM AVG(
      CASE WHEN converted_at IS NOT NULL 
      THEN converted_at - started_at 
      ELSE NULL 
      END
    )) / 3600,
    1
  ) AS avg_hours_to_convert
FROM public.user_trials;

-- Revenue summary
CREATE OR REPLACE VIEW public.v_revenue_summary AS
SELECT
  DATE(created_at) AS date,
  type,
  COUNT(*) AS transaction_count,
  SUM(amount) AS total_amount,
  SUM(discount_amount) AS total_discounts
FROM public.revenue_transactions
WHERE status = 'completed'
GROUP BY DATE(created_at), type
ORDER BY date DESC;

-- Moderation queue summary
CREATE OR REPLACE VIEW public.v_moderation_summary AS
SELECT
  COUNT(*) AS total_items,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending,
  COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
  COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
  COUNT(*) FILTER (WHERE priority = 'urgent') AS urgent,
  COUNT(*) FILTER (WHERE priority = 'high') AS high_priority
FROM public.moderation_queue;

-- Trust score distribution
CREATE OR REPLACE VIEW public.v_trust_distribution AS
SELECT
  risk_level,
  COUNT(*) AS user_count,
  ROUND(AVG(trust_score), 1) AS avg_trust,
  ROUND(AVG(fraud_score), 1) AS avg_fraud
FROM public.user_trust_scores
GROUP BY risk_level
ORDER BY avg_trust DESC;

-- Error summary by type
CREATE OR REPLACE VIEW public.v_error_summary AS
SELECT
  error_type,
  source,
  level,
  COUNT(*) AS total_errors,
  SUM(occurrence_count) AS total_occurrences,
  MAX(last_seen_at) AS last_seen,
  COUNT(*) FILTER (WHERE resolved = FALSE) AS unresolved
FROM public.error_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY error_type, source, level
ORDER BY total_occurrences DESC;


-- ============================================================
-- DONE! 🎉
-- ============================================================
-- Business Control Mode migration complete!
--
-- NEW TABLES (28):
--   Phase 2: user_trials, device_fingerprints
--   Phase 3: user_notes, feature_flag_overrides, system_announcements,
--            maintenance_windows
--   Phase 4: user_bans, fraud_alerts, abuse_reports,
--            moderation_queue, user_trust_scores
--   Phase 5: error_logs, performance_metrics, user_sessions
--   Phase 6: coupons, coupon_redemptions, referrals, referral_rewards,
--            email_campaigns, push_notifications, user_segments,
--            user_segment_members, ab_tests, ab_test_assignments,
--            revenue_transactions, refunds
--
-- ALTERED TABLES:
--   subscriptions (added trial_end, is_trial, billing_cycle, cancelled_at, discount_code)
--   profiles (added status, status_reason, is_vip, beta_tester, country, last_seen_at)
--   plan_configs (added monthly/yearly/lifetime pricing, regional_pricing, trial_days)
--
-- NEW VIEWS: v_trial_funnel, v_revenue_summary, v_moderation_summary,
--            v_trust_distribution, v_error_summary
--
-- TRIGGERS: trial auto-expire, ban auto-expire, permanent ban approval,
--           error deduplication
-- ============================================================
