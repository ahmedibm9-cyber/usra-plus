# Task 4 - Tour System Reorganization Agent

## Summary
Reorganized, refined animations, and generalized the guided tour system in USRA PLUS.

## Files Created
- `src/lib/tour-config.ts` — TourConfig/TourStepConfig types and default usraPlusTour config

## Files Modified
- `src/stores/tour-store.ts` — Multi-tour support with activeTourId, completedTours Record, isCompleting state
- `src/i18n/en.ts` — Added 4 new tour keys (completionTitle, completionDesc, keyboardHints, progressLabel)
- `src/i18n/ar.ts` — Added 4 matching Arabic tour keys
- `src/components/shared/guided-tour.tsx` — Complete rewrite with smooth spotlight transitions, better welcome/tooltip/celebration screens, RTL support, CSS variables
- `src/app/globals.css` — Added confetti-rise and confetti-float keyframes

## Key Decisions
- Used Framer Motion `animate` prop on clip-path for smooth spotlight transitions
- CSS-only confetti particles using --confetti-x custom property for varied spread
- isCompleting state keeps tour active during celebration, then setCompleting(false) fully deactivates
- All colors use CSS variables (var(--accent-primary), etc.) for light/dark theme support
- Arrow key navigation swapped for RTL (Left=next, Right=prev)

## Lint Status
PASS - All files compile without errors
