# Task 5: Theme Fix Agent

## Task
Fix light/dark theme readability, remove ALL remaining red/yellow colors, ensure dropdown menus are opaque with proper styling.

## Files Modified
1. `src/lib/mui-theme.ts` — Light theme readability, opaque dropdowns, MuiPopover override
2. `src/app/globals.css` — Synced --muted-foreground with new text.secondary
3. `src/components/admin/pages/admin-moderation.tsx` — Replaced #F4C430, #f59e0b, #f97316
4. `src/components/chores/chores-page.tsx` — Replaced #F43F5E in hard difficulty
5. `src/components/milestones/milestones-page.tsx` — Replaced #EC4899, #F43F5E in typeConfig and captions
6. `src/components/calendar/calendar-page.tsx` — Replaced #EC4899 in EVENT_COLORS
7. `src/components/layout/notification-panel.tsx` — Replaced #EC4899 for family type
8. `src/components/onboarding/onboarding-flow.tsx` — Replaced 'rose' option with 'violet'
9. `src/components/files/files-page.tsx` — Replaced #EC4899 for image icons
10. `src/stores/ui-preferences-store.ts` — Default accentColor 'red' → 'teal'
11. `src/stores/app-store.ts` — Default familyColor 'red' → 'teal'

## Key Changes
- Light theme text.secondary darkened from #79747E to #5F5D58 for better contrast
- Light theme primary.light lightened from #4DCAA8 to #A7F3D0 (MD3 primary-container)
- Light theme secondary.light lightened from #5EEAD4 to #CCFBF1 (MD3 secondary-container)
- All dropdown menus have opaque backgrounds via global MuiMenu/MuiPopover overrides
- All garish red/yellow colors replaced with teal/violet equivalents
- MUI error.main (#BA1A1A) preserved for legitimate error/danger states

## Verification
- ESLint: 0 errors, 0 warnings
- Dev server: compiles successfully
- Zero remaining #EF4444, #E50914, #DC2626, #F59E0B, #FBBF24, #F4C430, #F43F5E, #EC4899
