# Task 5-c: Design System Agent

## Task
Redesign remaining USRA PLUS feature pages with NothingOS-inspired design system

## Work Completed

### Files Modified (12 total)
1. `src/components/grocery/grocery-page.tsx`
2. `src/components/chat/chat-page.tsx`
3. `src/components/budget/budget-page.tsx`
4. `src/components/meal-plan/meal-plan-page.tsx`
5. `src/components/milestones/milestones-page.tsx`
6. `src/components/chores/chores-page.tsx`
7. `src/components/files/files-page.tsx`
8. `src/components/settings/settings-page.tsx`
9. `src/components/onboarding/onboarding-flow.tsx`
10. `src/components/shared/upgrade-modal.tsx`
11. `src/components/subscription/paywall.tsx`
12. `src/components/subscription/customer-center.tsx`

### Config Changes
- `tailwind.config.ts`: Added `fontFamily.display` (Space Grotesk) and `fontFamily.metric` (JetBrains Mono)

### Global Changes Applied
- All indigo/violet Tailwind classes → Signal Red (#E50914)
- All indigo/violet hex colors → #E50914
- CTA/action buttons → bg-[#E50914] hover:bg-[#C40812]
- Premium/upgrade indicators → Yellow #F4C430
- Section headings → font-display (Space Grotesk)
- Stat numbers → font-metric (JetBrains Mono)
- Input focus → focus:border-[#E50914]/50 focus:ring-[#E50914]/20
- Links → text-[#E50914] hover:text-[#C40812]
- Active/selected states → Red (#E50914)
- Green preserved for success/completed/confirmed states

### Verification
- Zero remaining indigo/violet references across all 12 files
- Lint check passes with 0 new errors
