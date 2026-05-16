# Task 6: Admin Layout MUI Rebuild

## Summary
Rebuilt `/home/z/my-project/src/components/admin/admin-layout.tsx` to use pure MUI — zero className, zero div, zero Tailwind, zero hardcoded colors.

## Key Changes
1. **ThemedIcon helper** — Created `ThemedIcon` component that wraps Lucide icons in a Box with MUI theme color. Lucide icons use `currentColor` by default, so setting color on the wrapper propagates to SVG stroke/fill.

2. **CircularProgress** — Replaced `<Loader2 size={24} className="animate-spin" />` with `<CircularProgress size={24} />`

3. **Theme-aware glow** — Replaced hardcoded `rgba(13, 107, 88, 0.25)` with `0 0 12px ${muiTheme.palette.primary.main}40` (25% alpha)

4. **Fixed Lucide sx prop** — `<Zap size={12} sx={{ ml: 'auto', opacity: 0.3 }} />` → wrapped in `<Box sx={{ ml: 'auto', opacity: 0.3, display: 'inline-flex', color: 'primary.main' }}><Zap size={12} /></Box>`

5. **Removed invalid fullWidth** — `IconButton fullWidth` → `IconButton sx={{ width: '100%' }}`

6. **MUI Avatar** — Replaced Box-as-avatar with proper `<Avatar>` component

7. **InputAdornment** — Replaced inline `style` on Search icon with proper `<InputAdornment>`

8. **useTheme import** — Fixed from `@mui/material/styles/useTheme` to `{ useTheme } from '@mui/material/styles'`

## Files Modified
- `/home/z/my-project/src/components/admin/admin-layout.tsx` — Complete rebuild

## Verification
- Zero `className` occurrences ✓
- Zero `<div>` elements ✓
- Zero hardcoded hex/rgba colors ✓
- Zero Tailwind classes ✓
- `bun run lint` passes ✓
- Dev server compiles successfully ✓
