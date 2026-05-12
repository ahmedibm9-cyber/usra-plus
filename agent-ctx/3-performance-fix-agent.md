# Task 3 — Performance Fix Agent

## Task
Fix critical performance and build configuration issues in the USRA PLUS Next.js app.

## Work Summary

### 1. Tailwind content paths (tailwind.config.ts)
- Changed from `./pages/**/*`, `./components/**/*`, `./app/**/*` to `./src/pages/**/*`, `./src/components/**/*`, `./src/app/**/*`
- Added `./src/lib/**/*` for utility classes

### 2. Double-fetch in dashboard-page.tsx
- Now only fetches from Supabase when Zustand store data is empty/stale
- Tasks and grocery skip Supabase if store has data; events always fetch; members skip if already loaded

### 3. CommandPalette lazy store reads
- Replaced 5 reactive store hooks with `getState()` lazy reads gated on `commandPaletteOpen`
- Actions also use `getState()` to avoid subscriptions

### 4. announce() persistent live region
- Single cached `_liveRegion` div, reused on every call
- No more DOM node creation/removal per call

### 5. Geist_Mono font removal
- Removed redundant Geist_Mono import, variable, and className reference
- JetBrains Mono is the sole monospace font

## Lint Result
- 0 errors, 2 pre-existing warnings (alt-text in admin-content.tsx)
