# Task R6-R7: Demo Data Seeding & Subscription Plan Gating

## Summary

Successfully completed all three parts of the task:

### Part 1: Demo Data Seeding
- Modified `/src/components/auth/login-form.tsx`
- Added demo task seeding (5 tasks) and grocery item seeding (6 items) after the `appStore.setFamilyMembers([...])` call
- Changed onClick handler from sync to async to support `await import()` for dynamic store imports
- All demo data supports RTL/Arabic translations via the `isRTL` flag

### Part 2: Subscription Plan Store
- Created `/src/stores/subscription-store.ts`
- Zustand store with three plan tiers: free, pro, family_plus
- PLAN_LIMITS configuration per tier
- Methods: setPlan, isPro, isFamilyPlus, canCreateTask, canCreateFamily, getFeatureLimit

### Part 3: Plan Badge Component
- Created `/src/components/shared/plan-badge.tsx`
- `PlanBadge` component: color-coded badge per plan (Free=gray, Pro=indigo with Zap icon, Family+=amber with Crown icon)
- `UpgradePrompt` component: upgrade nudge with count/limit display and "Upgrade to Pro" CTA

### Verification
- `bun run lint` passes clean
- All files follow existing project patterns and TypeScript conventions
