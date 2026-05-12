# Task 1: Fix light mode color contrast issues in super-admin dashboard

## Summary
Added semantic status CSS variables to globals.css and replaced all hardcoded dark-mode Tailwind color classes across all 22 admin component files with theme-aware CSS variables.

## Changes Made

### 1. globals.css - Added semantic status CSS variables
- `.light` section: Added 15 variables (5 status categories × 3 variants: text, bg, border)
  - danger: #DC2626, warning: #D97706, success: #16A34A, info: #2563EB, neutral: #6B7280
  - Backgrounds use 8% opacity, borders use 15% opacity
- `.dark` section: Added matching 15 variables
  - danger: #F87171, warning: #FBBF24, success: #4ADE80, info: #60A5FA, neutral: #94A3B8
  - Backgrounds use 10% opacity, borders use 20% opacity
- `@theme inline` section: Mapped all 15 variables as --color-status-* for Tailwind

### 2. All admin components - Replaced hardcoded colors
- admin-login.tsx: 4 replacements (error banner)
- demo-mode-banner.tsx: 9+ replacements (amber warning banner)
- user-detail-drawer.tsx: 40+ replacements (badge config objects, inline)
- All 19 page components: 500+ total replacements via bulk sed

### Key Replacement Mappings
- text-red-400/300 → text-[--status-danger]
- bg-red-500/* → bg-[--status-danger-bg]
- border-red-500/* → border-[--status-danger-border]
- text-amber-400/300 → text-[--status-warning]
- bg-amber-500/* → bg-[--status-warning-bg]
- text-orange-400/300 → text-[--status-warning]
- text-rose-400/300 → text-[--status-danger]
- bg-rose-500/* → bg-[--status-danger-bg]
- text-emerald-400 → text-[--status-success]
- bg-emerald-500/* → bg-[--status-success-bg]
- text-green-400 → text-[--status-success]
- text-blue-400 → text-[--status-info]
- text-slate-400 → text-[--status-neutral]
- text-gray-400 → text-[--status-neutral]
- text-purple-400 → text-[--status-info]
- text-cyan-400 → text-[--status-info]

## Verification
- lint: No new errors (56 errors + 3 warnings all pre-existing)
- Dev server: Running on port 3000, HTTP 200
- Zero remaining hardcoded status color classes in admin components
