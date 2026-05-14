# Task 13 — Monetization Fix Agent

## Task: Fix CRITICAL monetization issues in USRA PLUS project

## Work Summary

All 7 monetization issues were fixed across 3 files (1 new, 2 modified):

### Files Modified
1. **`src/stores/subscription-store.ts`** — Complete rewrite with:
   - `resolveEffectivePlan()` replacing raw `isRevenueCatPro` bypass
   - New feature gates: `canUseAISuggestion()`, `canAccessMealPlan()`, `canCustomizeAvatar()`
   - Daily AI suggestion tracking: `getAISuggestionUsageToday()`, `incrementAISuggestionUsage()`
   - Pro families: 1 → 3
   - Max storage: 5GB → 20GB
   - Zustand `persist` middleware with 5-minute TTL

2. **`src/components/subscription/paywall.tsx`** — Added coupon/promo code input:
   - "Have a promo code?" link with animated reveal
   - Text input + Apply button + close button
   - Calls `/api/coupons/redeem`, shows success/error
   - Refreshes subscription state on success

### Files Created
3. **`src/app/api/coupons/redeem/route.ts`** — New coupon redemption API:
   - POST { code, userId }
   - Validates: exists, active, not expired, not max redemptions, per-user limit
   - Creates CouponRedemption record, increments counter
   - Rate limited: 3 attempts/hour/user

### Verification
- ESLint: 0 errors, 0 warnings
- Dev server: HTTP 200
- No breaking changes to existing functionality
