# Task 10 — Admin Auth Agent

## Task: Add authentication to ALL admin API routes

Previously, all /api/admin/* routes were completely unauthenticated — anyone who discovered the URLs could read all user PII and platform metrics.

## Changes Made

### 1. Server-side auth verification utility
- **File**: `src/lib/admin-auth.ts`
- Exports `verifyAdminAuth(request)` that validates admin identity
- Two auth methods: Bearer token (Authorization header) and session cookie
- Cookie validation: checks required fields, session expiry, known admin email, role match

### 2. Environment variable
- **File**: `.env`
- Added `ADMIN_SECRET_KEY=usra-plus-admin-2024-secure-key-f8a3b7c9d1e2`

### 3. All 9 admin API routes updated
- `src/app/api/admin/route.ts`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/analytics/route.ts`
- `src/app/api/admin/features/route.ts`
- `src/app/api/admin/families/route.ts`
- `src/app/api/admin/subscriptions/route.ts`
- `src/app/api/admin/overview/route.ts`
- `src/app/api/admin/infrastructure/route.ts`
- `src/app/api/admin/support/route.ts`
- All return 401 Unauthorized if no valid auth is present

### 4. Admin auth store cookie management
- **File**: `src/stores/admin-auth-store.ts`
- Cookie `usra-admin-session` set on login, cleared on logout
- Cookie synced on rehydration from localStorage
- Session extension updates the cookie expiry

### 5. Hooks updated
- **File**: `src/hooks/use-admin-data.ts`
- All fetch calls include `credentials: 'same-origin'`
- 401 responses trigger automatic logout via `useAdminAuthStore.getState().logoutAdmin()`

### 6. Admin page components updated
- `admin-families.tsx`, `admin-support.tsx`, `admin-users.tsx`, `admin-infrastructure.tsx`, `admin-features.tsx`
- Same pattern: `credentials: 'same-origin'`, 401 → force logout

## Test Results
- `bun run lint` — 0 errors, 0 warnings
- All 9 admin routes return 401 without auth
- All admin routes return 200 with valid Bearer token
- All admin routes return 200 with valid session cookie
- Expired cookies → 401
- Unknown admin email → 401
- Role mismatch → 401
