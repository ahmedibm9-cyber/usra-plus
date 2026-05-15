# Task ID: 2 - Onboarding Color Fix Agent

## Task
Replace ALL red (#E50914, #C40812, #8B0000) and yellow (#F4C430, #D4A820, #F59E0B) colors in the onboarding flow with the teal/emerald brand palette.

## File Modified
- `/home/z/my-project/src/components/onboarding/onboarding-flow.tsx`

## Changes Made

### Hex Color Replacements (replace_all)
| Old Color | New Color | Usage |
|-----------|-----------|-------|
| #E50914 | #0D9488 | Primary accent (was red, now teal-600) |
| #C40812 | #0F766E | Dark accent (was dark red, now teal-700) |
| #8B0000 | #065F46 | Very dark accent (was very dark red, now emerald-800) |
| #F4C430 | #10B981 | Secondary accent (was gold/yellow, now emerald-500) |
| #D4A820 | #059669 | Dark secondary (was dark yellow, now emerald-600) |

### RGBA Value Replacements (replace_all)
| Old | New |
|-----|-----|
| rgba(229, 9, 20, ...) | rgba(13, 148, 136, ...) |
| rgba(244, 196, 48, ...) | rgba(16, 185, 129, ...) |

### Tailwind Class Replacements (replace_all)
| Old | New |
|-----|-----|
| amber-500 | emerald-500 |
| amber-400 | emerald-400 |
| amber-300 | emerald-300 |
| rose-500 | teal-500 |
| rose-400 | teal-400 |

### COLOR_OPTIONS Array Rebuilt
| Old Name | New Name | New Hex |
|----------|----------|---------|
| signal (#E50914) | teal | #0D9488 |
| gold (#F4C430) | emerald | #10B981 |
| emerald (#22C55E) | green | #22C55E (renamed to avoid naming conflict) |
| amber (#F59E0B) | jade | #059669 |
| rose (#F43F5E) | mint | #34D399 |
| cyan (wrong #E50914) | cyan | #06B6D4 (fixed to actual cyan) |

### Specific UI Element Fixes
- Join button: text-black → text-white (better contrast on emerald)
- Comments: "Red accent bar" → "Teal accent bar", "Yellow accent bar" → "Emerald accent bar"

## Verification
- `bun run lint` — 0 errors
- `rg '#E50914|#C40812|#F4C430|#D4A820|amber|rose-'` — 0 matches
- Dev server HTTP 200
