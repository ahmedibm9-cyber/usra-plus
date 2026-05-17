-- USRA PLUS - Quick Admin Setup Script
-- Run this in Supabase SQL Editor after deployment
-- Replace 'your-email@example.com' with your actual admin email

-- Step 1: Find your user ID
-- SELECT id, email FROM profiles WHERE email = 'your-email@example.com';

-- Step 2: Grant admin role (uncomment and replace email)
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';

-- Step 3: Verify admin access
SELECT id, email, role, created_at 
FROM profiles 
WHERE role = 'admin'
ORDER BY created_at DESC;

-- Step 4: If no admin exists, create one manually
-- First, sign up through the app, then run:
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-signup-email@example.com';

-- Step 5: Set up default subscription plans (if not seeded)
INSERT INTO subscription_plans (id, slug, name, description, monthly_price, yearly_price, currency, features, limits, trial_days, is_active, is_popular, sort_order, cta_text)
VALUES 
  (gen_random_uuid(), 'free', 'Free', 'Basic family management', 0, NULL, 'SAR', '["5 tasks", "1 family", "Basic calendar"]', '{"maxTasks": 5, "maxFamilies": 1, "maxStorage": 100}', 0, true, false, 0, 'Get Started'),
  (gen_random_uuid(), 'pro', 'Pro', 'Advanced features for growing families', 9.99, 99.99, 'SAR', '["Unlimited tasks", "3 families", "AI meal plans", "Priority support"]', '{"maxTasks": -1, "maxFamilies": 3, "maxStorage": 1000}', 3, true, true, 1, 'Upgrade to Pro'),
  (gen_random_uuid(), 'family-plus', 'Family+', 'Everything for large families', 19.99, 199.99, 'SAR', '["Unlimited everything", "Unlimited families", "AI everything", "24/7 support"]', '{"maxTasks": -1, "maxFamilies": -1, "maxStorage": -1}', 3, true, false, 2, 'Get Family+')
ON CONFLICT (slug) DO NOTHING;

-- Step 6: Set up essential feature flags
INSERT INTO feature_flags (id, key, name, description, enabled, rollout_percentage, target_plan)
VALUES 
  (gen_random_uuid(), 'ai-meal-plans', 'AI Meal Plans', 'AI-powered meal plan suggestions', true, 100, 'pro'),
  (gen_random_uuid(), 'ai-recipes', 'AI Recipes', 'AI-generated recipes', true, 100, 'pro'),
  (gen_random_uuid(), 'whatsapp-export', 'WhatsApp Export', 'Export grocery lists to WhatsApp', true, 100, NULL),
  (gen_random_uuid(), 'family-chat', 'Family Chat', 'Real-time family messaging', true, 100, NULL),
  (gen_random_uuid(), 'file-storage', 'File Storage', 'Family file storage', true, 100, NULL)
ON CONFLICT (key) DO NOTHING;

-- Step 7: Verify everything is set up
SELECT 'Subscription Plans' as check_name, COUNT(*) as count FROM subscription_plans
UNION ALL
SELECT 'Feature Flags', COUNT(*) FROM feature_flags
UNION ALL
SELECT 'Admin Users', COUNT(*) FROM profiles WHERE role = 'admin'
UNION ALL
SELECT 'Total Users', COUNT(*) FROM profiles;
