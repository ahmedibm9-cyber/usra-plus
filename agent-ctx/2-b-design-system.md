# Task 2-b: NothingOS Design System — Signup Form

## Agent
design-system

## Task
Redesign the USRA PLUS signup form with NothingOS-inspired design system, replacing all indigo/violet colors with Signal Red #E50914.

## Changes Made

All 10 required changes were applied to `/home/z/my-project/src/components/auth/signup-form.tsx`:

1. **Logo icon**: `bg-gradient-to-br from-indigo-500 to-violet-500` → `bg-[#E50914]`
2. **Shadow**: `shadow-indigo-500/20` → `shadow-[#E50914]/20`
3. **Input focus** (6 inputs): `focus:border-indigo-500/50 focus:ring-indigo-500/20` → `focus:border-[#E50914]/50 focus:ring-[#E50914]/20`
4. **Signup button**: `bg-[#E50914] hover:bg-[#C40812]` with `shadow-[#E50914]/20`
5. **Links** (3 locations): `text-[#E50914] hover:text-[#C40812]`
6. **Checkbox**: `data-[state=checked]:bg-[#E50914] data-[state=checked]:border-[#E50914]`
7. **Select focus**: `focus:ring-[#E50914]/20`
8. **Select items**: `focus:bg-[#E50914]/10 focus:text-[#E50914]`
9. **Card background**: `bg-[--bg-surface]` with full opacity (already correct)
10. **Heading font**: Added `style={{ fontFamily: "'Space Grotesk', sans-serif" }}` to h1

## Verification
- `grep` for indigo/violet references: zero matches
- ESLint: 0 errors, 0 new warnings
- Dev server: running without issues
