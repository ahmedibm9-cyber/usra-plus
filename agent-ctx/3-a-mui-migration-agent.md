# Task 3-a: Rewrite layout.tsx and page.tsx using ONLY MUI Components

## Agent: MUI Migration Agent

## Summary
Successfully rewrote both layout.tsx and page.tsx to use ONLY Material UI (MUI) components, replacing all shadcn/ui and Tailwind classes.

## Files Modified
1. `/home/z/my-project/src/app/layout.tsx` — Rewrote with MuiThemeWrapper
2. `/home/z/my-project/src/app/page.tsx` — Complete MUI rewrite (733 lines)
3. `/home/z/my-project/src/components/providers/mui-theme-wrapper.tsx` — New file: MUI ThemeProvider wrapper

## Detailed Changes

### layout.tsx
- **Kept as server component** (still exports metadata + viewport)
- Kept all 4 font definitions (Space Grotesk, Inter, IBM Plex Sans Arabic, JetBrains Mono)
- Kept theme flash prevention script
- Kept ChunkLoadError recovery script
- Removed direct Sonner Toaster import → moved to MuiThemeWrapper
- Wrapped children in new `<MuiThemeWrapper>` client component

### mui-theme-wrapper.tsx (NEW)
- Reads theme mode from localStorage ('usra-theme' key)
- Wraps children in MUI `<ThemeProvider>` + `<CssBaseline>`
- Exports `ThemeContext` + `useThemeMode` hook
- Syncs with app-store theme changes via:
  1. MutationObserver on `<html>` class attribute changes
  2. 1-second localStorage polling
- Includes Sonner Toaster with theme-aware dark/light styling
- Includes @vercel/analytics

### page.tsx
- **Replaced ALL shadcn/ui components** with MUI equivalents
- **Replaced ALL Tailwind className** with MUI `sx` prop styling
- Component mappings:
  - `ChunkLoader`: `CircularProgress` + `LinearProgress`
  - `AuthScreen`: `Box`, `Stack`, `Typography`, `Chip`
  - `LoadingScreen`: `Box`, `Typography`, `LinearProgress`
  - `MainApp`: `Box` with flex layout, fixed-position sidebar
  - `RenderErrorBoundary`: `Box`, `Typography`, `Button`
- Extracted `HexLogo` SVG component for reuse
- Defined keyframe animations via MUI `keyframes` utility
- **FIXED sidebar**: `position: fixed, top: 0, left: 0, height: 100vh`
- Removed all red/yellow colors, using teal/amber from MUI theme
- Skip-to-content link uses inline styles (not Tailwind)
- Screen reader h1 uses inline styles (not sr-only class)
- All business logic preserved (auth, Supabase, family data, realtime, swipe nav)

## Verification
- ✅ Lint passes (0 errors, 0 warnings)
- ✅ No className Tailwind references in page.tsx
- ✅ No red/yellow color references in page.tsx
- ✅ No shadcn/ui imports in page.tsx
- ✅ All existing fonts, metadata, scripts, and business logic preserved
