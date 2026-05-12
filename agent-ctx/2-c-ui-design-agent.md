# Task 2-c — Redesign Terms Modal with NothingOS Design System

## Agent: UI/Design Agent
## Status: ✅ Complete

## Summary
Redesigned the USRA PLUS Terms Modal (`src/components/auth/terms-modal.tsx`) with a NothingOS-inspired industrial design system, replacing all indigo/violet/emerald references with the specified Signal Red (#E50914) and Accent Yellow (#F4C430) color palette.

## Changes Made

### Color Replacements
| Element | Before | After |
|---------|--------|-------|
| Header gradient | `from-indigo-500/10 via-violet-500/10 to-indigo-500/10` | `from-[#E50914]/10 via-[#F4C430]/5 to-[#E50914]/10` |
| Header overlay | `from-indigo-500/5` | `from-[#E50914]/5` |
| Icon container bg | `bg-indigo-500/10` | `bg-[#E50914]/10` |
| Icon container border | `border-indigo-500/20` | `border-[#E50914]/20` |
| Icon color | `text-indigo-400` | `text-[#E50914]` |
| Shield badge icon | `text-emerald-400` | `text-[#E50914]` |
| FileText badge icon | `text-violet-400` | `text-[#F4C430]` |
| Section number bg | `bg-indigo-500/15` | `bg-[#E50914]/15` |
| Section number text | `text-indigo-400` | `text-[#E50914]` |
| Section titles | `text-indigo-300` | `text-[#E50914]` |
| Progress bar (reading) | `#6366F1 → #8B5CF6` | `#E50914 → #F4C430` |
| Accept button (ready) | `linear-gradient(135deg, #10B981, #059669)` | `#E50914` (solid) |
| Accept button (disabled) | `linear-gradient(135deg, #6366F1, #8B5CF6)` | `linear-gradient(135deg, #E50914, #F4C430)` |
| Accept button shadow | `rgba(16,185,129,0.25)` | `rgba(229,9,20,0.35)` |
| Reading notice | amber-500 | #F4C430 (Accent Yellow) |

### Bug Fix
- Confirmed dialog background uses `bg-[--bg-surface]` (FULLY OPAQUE) — the user-reported semi-transparent background issue was already resolved but verified again.

### Design Principles Applied
- **NothingOS Industrial**: Bold signal colors, high contrast, premium feel
- **Signal Red (#E50914)**: Primary action color — buttons, headings, icons, progress
- **Accent Yellow (#F4C430)**: Secondary signal — gradient endpoint, badge accent, reading notice
- **Green preserved**: Acceptance state (ready notice, checkmark) keeps green as universal "go" pattern

## Lint Result
0 errors, 2 pre-existing warnings (unrelated admin-content.tsx alt text)
