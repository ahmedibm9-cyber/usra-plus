# Task 3-f: Calendar Page Enhancement

## Agent: Calendar Enhancement Agent
## Date: 2026-03-05

### Task Summary
Enhanced the Calendar page with a mini calendar sidebar, improved event display, upcoming events panel, and enhanced add event dialog.

### Work Log

1. **Added i18n translations** to `src/i18n/en.ts` and `src/i18n/ar.ts`:
   - location, repeat, repeatNone, repeatDaily, repeatWeekly, repeatMonthly, repeatYearly
   - assignTo, upcomingEvents, viewAll, moreEvents, miniCalendar
   - Full Arabic translations for all new keys

2. **Updated EVENT_COLORS** from 6 to 8 preset colors:
   - Added #A78BFA (violet) and #F97316 (orange) to the existing colors
   - Colors: #6366F1, #22C55E, #F59E0B, #EF4444, #A78BFA, #EC4899, #06B6D4, #F97316

3. **Updated EventFormData** with new fields:
   - Added `location: string` field
   - Added `repeat: RepeatOption` field (none/daily/weekly/monthly/yearly)
   - Added `assignTo: string` field for member assignment

4. **Built MiniCalendar sidebar component**:
   - Compact 7-column month grid with ~28px day cells
   - Current date highlighted with indigo circle
   - Selected date highlighted with ring + subtle background
   - Days with events show small indigo dot below the number
   - Click any date to navigate the main calendar
   - Navigation arrows to change month (syncs with main calendar)
   - GlassCard styling with backdrop-blur
   - Desktop only (hidden on < md breakpoint), ~220px width

5. **Built UpcomingEventsPanel component**:
   - Shows next 5 upcoming events sorted by date
   - Each event shows: color dot + title + date/time + assigned member avatar
   - Click to open event detail dialog
   - "View All" button switches to Agenda view
   - Bilingual labels via t() function
   - GlassCard styling with subtle hover effects

6. **Enhanced MonthView event display**:
   - Events shown as colored pills (not just dots) with colored left border
   - Show up to 2 events per cell, with "+N more" indicator for overflow
   - Each pill: colored left border + event title (truncated)
   - Click on pill to open event detail dialog
   - Today's cell has subtle indigo ring border (ring-1 ring-inset)
   - Removed hover tooltip in favor of direct pill display

7. **Enhanced EventModal (Add Event dialog)**:
   - Added "Repeat" dropdown with options: None, Daily, Weekly, Monthly, Yearly (using shadcn Select)
   - Added "Location" text input with MapPin icon
   - Added "Assign to" member selector dropdown with member avatars
   - Updated color picker with 8 preset colors (smaller size-7 buttons)
   - Added icons to labels (MapPin, Repeat, User)
   - Better bilingual labels for all new fields
   - Dialog is scrollable for smaller viewports (max-h-[90vh])
   - Demo mode fallback: creates events in calendar store when Supabase fails

8. **Updated main CalendarPage layout**:
   - Added sidebar with mini calendar + upcoming events (desktop only, md:flex)
   - Main calendar takes full width on mobile
   - Sidebar is hidden on < md breakpoint
   - Family members passed from app store to EventModal and UpcomingEventsPanel
   - handleMiniCalDateSelect syncs mini calendar selection to main calendar
   - handleViewAll switches to agenda view from upcoming events panel
   - Delete event has demo mode fallback (removes from calendar store)

### Stage Summary
- Mini calendar sidebar with compact month grid (desktop only)
- Upcoming events panel below mini calendar
- Month view shows colored event pills with "+N more" overflow
- Add Event dialog has Repeat, Location, Assign To, and 8-color picker
- Full bilingual support (EN/AR) for all new fields
- Demo mode fallbacks for event CRUD operations
- Lint: PASS, Server: compiles successfully
