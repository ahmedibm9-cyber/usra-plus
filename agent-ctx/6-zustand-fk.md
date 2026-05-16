# Task 6-zustand-fk — Zustand Selectors & Prisma FK Fix Agent

## Summary
Fixed two HIGH priority issues: Zustand cascade re-renders and missing Prisma foreign key constraints.

## Issue 1: Zustand Store Selectors
- Created `/src/stores/selectors.ts` with 18 pre-built selector hooks for 5 stores
- Updated 7 consumer files to use selector pattern instead of full-store destructuring
- Files modified: page.tsx, bottom-nav.tsx, app-header.tsx, app-sidebar.tsx, notification-panel.tsx, dashboard-page.tsx

## Issue 2: Prisma Foreign Keys
- Added 7 @relation declarations with onDelete rules
- Added 8 reverse relation fields to User model
- Used named relations for Referral (two User references)
- `bun run db:push` successful
- Zero lint errors

## Files Created
- `/src/stores/selectors.ts`

## Files Modified
- `/src/app/page.tsx`
- `/src/components/layout/bottom-nav.tsx`
- `/src/components/layout/app-header.tsx`
- `/src/components/layout/app-sidebar.tsx`
- `/src/components/layout/notification-panel.tsx`
- `/src/components/dashboard/dashboard-page.tsx`
- `/prisma/schema.prisma`
