# Task 6 - Admin Login Simplification

## Summary
Simplified admin login from 4 separate credentials to a single account with a role selector dropdown.

## Changes Made

### 1. API Route (`/src/app/api/admin/login/route.ts`)
- Removed 4 separate admin accounts (admin@, support@, analytics@, billing@)
- Single credential: `admin@usraplus.com` / `UsraPlus2024!`
- Accepts optional `role` field in request body (defaults to `super_admin`)
- Validates role against allowed list: `super_admin`, `support_admin`, `analytics_admin`, `billing_admin`
- Session token embeds the selected role
- Dynamic bcrypt hash generation for the single password

### 2. Login Component (`/src/components/admin/admin-login.tsx`)
- Added role selector dropdown using shadcn/ui Select component
- Positioned after password field, before submit button
- Options with labels and descriptions:
  - Super Admin (Full Access) — default
  - Support Admin (Tickets & Users)
  - Analytics Admin (Read-only Analytics)
  - Billing Admin (Revenue & Billing)
- Uses Users icon from Lucide
- Dark theme styling matching existing design (emerald accents)
- Selected role sent to login API

### 3. Auth Store (`/src/stores/admin-auth-store.ts`)
- `FOUNDER_EMAILS` reduced to only `admin@usraplus.com`
- `loginAdmin` signature updated: `(email, password, role?) => Promise<boolean>`
- Sends selected role to the API endpoint
- Role from API response drives session state

### 4. Server Auth (`/src/lib/admin-auth.ts`)
- Removed email→role mapping (was 4 accounts with fixed roles)
- Now validates email is `admin@usraplus.com` and role is in valid list
- No strict email→role binding — single account can assume any valid role

### 5. Session Verification (`/src/lib/admin-session.ts`)
- Updated `verifySignedAdminAuth` — validates email + valid role instead of fixed mapping
- Removed 4-account `ADMIN_ACCOUNTS` lookup

### 6. Form Text Updates
- Label: "Access Identifier" → "Admin Email"
- Placeholder: "Enter access identifier" → "admin@usraplus.com"

## Verification
- Lint: passes cleanly
- Dev server: compiles successfully
