# Task 3: Check and fix all tabs in admin settings page + fix UI color contrast

## Agent: Color Contrast Fix Agent

## Summary
Fixed all remaining low-opacity color contrast issues across ALL admin dashboard pages. The primary issue was that `#F4C430` (gold/yellow brand color) at reduced opacity (20-80%) was completely invisible against white/light backgrounds in light mode.

## Changes Made

### admin-settings.tsx (Primary Focus)
- Fixed `hover:text-[#F4C430]/50` on "Load from DB" button — removed hover text lightening
- Fixed `hover:text-[#E50914]/50` on "Add Flag", "Add Announcement", "Add Admin" buttons — removed hover text lightening
- Fixed `hover:text-[#F4C430]/50` on "Backup Database" button — removed hover text lightening
- Fixed `text-[#E50914]/60` icon in Database tab → `text-[#E50914]`
- Fixed `text-[#F4C430]/60` icon in Database tab → `text-[#F4C430]`
- All 7 tabs verified: Feature Flags, Plan Config, Announcements, Emergency, Audit Logs, Database, Admin Access

### admin-content.tsx
- Fixed `hover:text-[#E50914]/50` on "Add Section" and "Save All" buttons

### All 16 admin page files (batch replacement)
- `text-[#F4C430]/20` → `text-[--text-muted]` (invisible in light mode)
- `text-[#F4C430]/30` → `text-[--text-muted]`
- `text-[#F4C430]/40` → `text-[--text-muted]`
- `text-[#F4C430]/50` → `text-[--text-muted]`
- `text-[#F4C430]/60` → `text-[--text-secondary]`
- `text-[#F4C430]/70` → `text-[--text-secondary]`
- `text-[#F4C430]/80` → `text-[--text-secondary]`
- `hover:text-[#F4C430]/60` → `hover:text-[--text-secondary]`

### admin-families.tsx, admin-bugs.tsx, admin-features.tsx, admin-infrastructure.tsx, admin-bug-detection.tsx
- `text-[--status-danger]/40` → `text-[--text-muted]`
- `text-[--status-warning]/40` → `text-[--text-muted]`
- `hover:text-[--status-danger]/60` → `hover:text-[--text-secondary]`

### admin-bug-detection.tsx
- `text-[--status-success]/40` → `text-[--status-success]`
- `text-[--status-success]/30` → `text-[--text-muted]`

### admin-infrastructure.tsx
- `text-[--status-warning]/60` → `text-[--status-warning]`
- Verified `sizeMB` rendering: properly checks `typeof database?.sizeMB === 'number'` before `.toFixed(2)`

## Files Modified
- admin-settings.tsx
- admin-content.tsx
- admin-bugs.tsx
- admin-support.tsx
- admin-overview.tsx
- admin-users.tsx
- admin-activity.tsx
- admin-referrals.tsx
- admin-moderation.tsx
- admin-features.tsx
- admin-subscriptions.tsx
- admin-campaigns.tsx
- admin-revenue.tsx
- admin-infrastructure.tsx
- admin-audit.tsx
- admin-sessions.tsx
- admin-bug-detection.tsx

## What Was NOT Changed
- `#F4C430` at full opacity (intentional brand color per task instructions)
- `#E50914` at full opacity (intentional brand color per task instructions)
- `bg-[#F4C430]/10` and `bg-[#F4C430]/20` backgrounds (subtle and work in both modes)
- `border-[#F4C430]/20` borders (subtle and work in both modes)
- `hover:text-[#F4C430]` hover states (these transition FROM muted TO brand color, which is correct)

## Verification
- Zero new lint errors introduced
- Dev server running on port 3000
