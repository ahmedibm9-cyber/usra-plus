# Task 3-a: Light/Dark Theme Toggle

## Summary
Added a complete light/dark theme system with CSS variables, theme toggle, localStorage persistence, and flash prevention.

## Changes Made

### 1. CSS Variable System (`/src/app/globals.css`)
- Added `.light` and `.dark` class selectors with full variable sets
- Extended theme variables: `--bg-primary`, `--bg-surface`, `--bg-surface-2`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border-subtle`, `--border-medium`, `--accent-primary`, `--accent-secondary`, `--glass-bg`, `--glass-border`
- Added Tailwind `@theme inline` color mappings
- Theme transition on body element
- Theme toggle animation keyframes (`theme-icon-enter`)

### 2. App Store (`/src/stores/app-store.ts`)
- Added `theme` and `setTheme` to Zustand store
- `setTheme` persists to localStorage and applies CSS class to DOM
- `getInitialTheme()` reads from localStorage
- Module-level initialization of theme class

### 3. Root Layout (`/src/app/layout.tsx`)
- Default `className="dark"` on `<html>` element
- Inline `<script>` to apply theme before React hydrates (prevents FOUC)
- Toaster styles use CSS variables

### 4. Settings Preferences Tab
- Uses `useAppStore` for theme state
- `handleThemeChange` updates store, Supabase, and auth store
- Sun/Moon icons with rotation animation
- Bilingual labels

### 5. Component Updates
- Sidebar, Header, Bottom Nav, Dashboard, Page.tsx, Settings all updated to use CSS variables
- Replaced `bg-[#0B0B0F]` → `bg-[--bg-primary]`, `text-[#E5E7EB]` → `text-[--text-primary]`, etc.

### 6. i18n
- Added `light`, `dark`, `system` keys to en.ts and ar.ts

## Verification
- `bun run lint` passes clean
- App serves HTTP 200
- Theme toggle works in Settings > Preferences
