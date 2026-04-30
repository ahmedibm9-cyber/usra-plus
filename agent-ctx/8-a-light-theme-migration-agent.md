# Task 8-a: Light Theme Migration Agent

## Task: Replace 464+ hardcoded dark theme colors with CSS variables across all USRA PLUS components

## Work Log:

### 1. Fixed globals.css
- Replaced `rgba(255, 255, 255, 0.08)` in `.custom-scrollbar::-webkit-scrollbar-thumb` with `var(--border-subtle)`
- Replaced `rgba(255, 255, 255, 0.15)` in `.custom-scrollbar::-webkit-scrollbar-thumb:hover` with `var(--border-medium)`
- Added `.light [data-sonner-toaster]` toast variant with light-appropriate colors (white background, dark text, subtle borders)

### 2. Primary Hardcoded Color Replacements (3 rounds of sed)
Replaced across all component files:

| Pattern | Replacement | Instances |
|---|---|---|
| `bg-[#0B0B0F]` | `bg-[--bg-primary]` | ~60 |
| `bg-[#0B0B0F]/80` | `bg-[--bg-primary]/80` | ~5 |
| `bg-[#111117]` | `bg-[--bg-surface]` | ~90 |
| `bg-[#111117]/80` | `bg-[--bg-surface]/80` | ~5 |
| `bg-[#1A1A22]` | `bg-[--bg-surface-2]` | ~30 |
| `bg-[#14141b]` | `bg-[--bg-surface-2]` | ~3 |
| `text-[#E5E7EB]` | `text-[--text-primary]` | ~80 |
| `text-[#9CA3AF]` | `text-[--text-secondary]` | ~40 |
| `text-[#6B7280]` | `text-[--text-muted]` | ~60 |
| `text-[#6B7280]/40` | `text-[--text-muted]/40` | ~2 |
| `text-[#6B7280]/60` | `text-[--text-muted]/60` | ~2 |
| `border-white/[0.08]` | `border-[--border-subtle]` | ~50 |
| `border-white/[0.12]` | `border-[--border-medium]` | ~10 |
| `border-white/[0.06]` | `border-[--border-subtle]` | ~20 |
| `border-white/[0.04]` | `border-[--border-subtle]` | ~8 |
| `border-white/10` | `border-[--border-subtle]` | ~20 |
| `border-white/20` | `border-[--border-medium]` | ~3 |
| `border-white/30` | `border-[--border-medium]` | ~2 |
| `ring-[#111117]` | `ring-[--bg-surface]` | ~2 |
| `hover:bg-[#1A1A22]` | `hover:bg-[--bg-surface-2]` | ~5 |
| `hover:bg-[#0B0B0F]` | `hover:bg-[--bg-primary]` | ~3 |
| `hover:bg-[#1a1a22]` | `hover:bg-[--bg-surface-2]` | ~4 |
| `bg-white/[0.04]` | `bg-[--border-subtle]` | ~10 |
| `bg-white/[0.06]` | `bg-[--border-subtle]` | ~10 |
| `bg-white/[0.02]` | `bg-[--border-subtle]` | ~3 |
| `bg-white/5` | `bg-[--border-subtle]` | ~12 |
| `bg-white/30` | `bg-[--border-medium]` | ~2 |
| `hover:bg-white/[0.03-0.1]` | `hover:bg-[--border-subtle]` | ~8 |
| `hover:bg-white/20` | `hover:bg-[--border-medium]` | ~3 |
| `hover:text-[#E5E7EB]` | `hover:text-[--text-primary]` | ~5 |
| `placeholder:text-[#6B7280]` | `placeholder:text-[--text-muted]` | ~8 |
| `hover:border-white/[0.12]` | `hover:border-[--border-medium]` | ~2 |
| `hover:border-white/[0.15]` | `hover:border-[--border-medium]` | ~2 |
| `hover:border-white/[0.16]` | `hover:border-[--border-medium]` | ~2 |

### 3. Tailwind Gray Utility Class Replacements
Replaced dark-mode-specific gray utility classes:

| Pattern | Replacement | Instances |
|---|---|---|
| `text-gray-200` | `text-[--text-primary]` | ~8 |
| `text-gray-300` | `text-[--text-secondary]` | ~30 |
| `text-gray-400` | `text-[--text-muted]` | ~20 |
| `text-gray-500` | `text-[--text-muted]` | ~15 |
| `hover:text-gray-200` | `hover:text-[--text-primary]` | ~3 |
| `hover:text-gray-300` | `hover:text-[--text-primary]` | ~2 |
| `hover:text-gray-400` | `hover:text-[--text-secondary]` | ~2 |

### 4. Dashboard-specific Fixes
- `trackColor = 'rgba(255,255,255,0.06)'` → `trackColor = 'var(--border-subtle)'`
- `shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]` → `shadow-[inset_0_1px_0_var(--border-subtle)]`
- `<Cell fill="rgba(255,255,255,0.04)" />` → `<Cell fill="var(--border-subtle)" />`
- `border-[#111117]` → `border-[--bg-surface]`
- `ring-offset-[#111117]` → `ring-offset-[--bg-surface]`
- `ring-offset-[#0B0B0F]` → `ring-offset-[--bg-primary]`
- `border-[#0B0B0F]` → `border-[--bg-primary]`

### 5. Colors Intentionally NOT Changed
- `#6366F1` (primary/accent indigo) - stays same in both themes
- `#A78BFA` (secondary accent violet) - stays same in both themes
- `#22C55E` (green/success) - stays same in both themes
- `#EF4444` (red/destructive) - stays same in both themes
- `#F59E0B` (amber/warning) - stays same in both themes
- `#5558E6` (hover variant of indigo) - stays same in both themes
- `#818CF8` (hover variant of violet) - stays same in both themes
- `bg-white` in family-qr-code.tsx (QR codes need white background for scanning)
- `shadow-black/...` (shadows are black in both themes)
- `border-t-white` in loading spinners (needs white for visibility)

## Verification Results:
- `bun run lint` - PASS (no errors)
- Dev server - HTTP 200, compiles successfully
- Primary hardcoded dark colors remaining: **0**
- Total CSS variable usages across codebase: **906**

## Files Modified:
- src/app/globals.css
- src/components/tasks/tasks-page.tsx
- src/components/calendar/calendar-page.tsx
- src/components/grocery/grocery-page.tsx
- src/components/chat/chat-page.tsx
- src/components/shared/command-palette.tsx
- src/components/files/files-page.tsx
- src/components/shared/upgrade-modal.tsx
- src/components/onboarding/onboarding-flow.tsx
- src/components/auth/signup-form.tsx
- src/components/auth/login-form.tsx
- src/components/auth/forgot-password-form.tsx
- src/components/auth/language-selector.tsx
- src/components/auth/terms-modal.tsx
- src/components/tasks/kanban-board.tsx
- src/components/shared/skeleton-patterns.tsx
- src/components/shared/avatar-generator.tsx
- src/components/dashboard/ai-summary-widget.tsx
- src/components/dashboard/dashboard-page.tsx
- src/components/dashboard/weather-widget.tsx
- src/components/dashboard/activity-feed-widget.tsx
- src/components/shared/page-error-boundary.tsx
- src/components/shared/empty-state.tsx
- src/components/shared/shortcuts-modal.tsx
- src/components/shared/plan-badge.tsx
- src/components/shared/family-qr-code.tsx
- src/components/layout/app-sidebar.tsx
- src/components/layout/app-header.tsx
- src/components/layout/bottom-nav.tsx
- src/components/layout/notification-panel.tsx
- src/components/settings/settings-page.tsx
