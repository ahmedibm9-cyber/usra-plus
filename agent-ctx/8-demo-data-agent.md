# Task 8: Add Demo Data to ALL Sections

## Summary
Completely rewrote the demo data seeding utility (`/src/lib/demo-data.ts`) and updated the demo seed API (`/src/app/api/demo/seed/route.ts`) to provide comprehensive data for ALL sections of the USRA PLUS app.

## Key Changes

### Family Identity
- Family name: "Al-Rashid Family" (آل رشيد)
- 5 members: Omar (father), Fatima (mother), Ahmad (son, 12), Noor (daughter, 8), Ali (son, 5)
- Location: Riyadh, Saudi Arabia

### Data Coverage
| Section | Before | After |
|---------|--------|-------|
| Tasks | 5 | 10 (3 done, 2 in-progress, 3 todo, 2 overdue) |
| Grocery | 6 | 20 (7 categories, mix of checked/unchecked) |
| Calendar | 4 | 6 (dinner, school pickup, doctor, trip, birthday, work) |
| Chat | 10 | 15 (5 members, replies, reactions, images) |
| Notifications | 3 | 10 (6 types, read/unread, different timestamps) |
| Budget | 10 | 10 expenses + 15,000 SAR budget month |
| Meals | 6 | 7 (full week: foul, kabsa, fish, mandi, pancakes, maqluba, shakshuka) |
| Chores | 8 | 8 (with 6 logs, kids get easy chores) |
| Milestones | 6 | 6 (birthdays, anniversary, graduation, school, Quran) |
| Files | 3 | 5 (PDF, JPG, XLSX, PNG) |
| Comments | 6 | 8 |
| Activity | 10+8 | 10+8 (updated member names) |
| Presence | 3 | 4 (Ali offline as young child) |

### Files Modified
- `/src/lib/demo-data.ts` — Complete rewrite
- `/src/app/api/demo/seed/route.ts` — Updated member names and profiles
