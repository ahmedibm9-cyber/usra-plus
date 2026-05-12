# Task 4 - Demo Seeding & Profile Edit Agent

## Task: Add Calendar Event Demo Seeding and Profile Editing in Settings

### Work Completed

#### Part A: Calendar Event Demo Seeding

1. **Created `/src/stores/calendar-store.ts`**:
   - Zustand store following the same pattern as `task-store.ts` and `grocery-store.ts`
   - State: `events: CalendarEvent[]`, `isLoading: boolean`, `searchQuery: string`
   - Actions: `setEvents`, `addEvent`, `updateEvent`, `removeEvent`, `setIsLoading`, `setSearchQuery`
   - Imports `CalendarEvent` type from `@/types`

2. **Added demo calendar event seeding in `/src/components/auth/login-form.tsx`**:
   - After the notification seeding block, added 4 demo events:
     - `event-1`: Family Dinner - today at 7pm-9pm, color #6366F1 (indigo), created by demo-user-001
     - `event-2`: Doctor Appointment - tomorrow at 10am-11am, color #22C55E (green), created by demo-user-002
     - `event-3`: Family Day Out - next Saturday, all_day=true, color #F59E0B (amber), created by demo-user-001
     - `event-4`: School Meeting - next Monday at 3pm-4pm, color #A78BFA (violet), created by demo-user-003
   - Smart date calculation: finds next Saturday and next Monday using day-of-week math
   - Full bilingual support (Arabic/English) for event titles and descriptions
   - Uses dynamic import: `const { useCalendarStore } = await import('@/stores/calendar-store')`

#### Part B: Profile Editing in Settings

1. **Enhanced UserManagementTab in `/src/components/settings/settings-page.tsx`**:
   - Added `countryCodes` array (same as signup form) with 10 countries (Saudi Arabia, UAE, Kuwait, Qatar, Bahrain, Oman, US, UK, Germany, France) with flag emojis
   - **Edit Mode Enhancements**:
     - **Change Photo** section: Shows avatar + "Change Photo" button (placeholder with toast info message)
     - **First Name & Last Name** inputs: Pre-filled from user data, styled with `bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB]`
     - **Email input** (read-only): Grayed out with `cursor-not-allowed`, dimmed border, help text "Email cannot be changed here"
     - **Phone input with country code selector**: Select dropdown for country code (flag + code), plus phone number input
     - **Save and Cancel** buttons: Save updates auth store; Cancel resets all fields to original values
   - **Display Mode Enhancement**:
     - Added email field display alongside first name, last name, and phone
   - **Save Logic**:
     - Combines `countryCode` + `phoneNumber` into full phone string
     - Updates `country_code` field alongside other profile fields
     - Falls back to local-only update if Supabase fails (demo mode)
   - **Cancel Logic**:
     - Properly resets `countryCode` and `phoneNumber` back to original user values
     - Splits phone number back into country code and local number
   - **Animations**: Added `motion.div` wrappers with subtle fade+slide for both edit and display modes
   - **RTL Support**: Added `isRTL` from `useI18n()` for bilingual labels

### Verification
- `bun run lint` passes clean with zero errors
- Dev server compiles successfully (HTTP 200)
- All changes follow existing code patterns and design tokens
