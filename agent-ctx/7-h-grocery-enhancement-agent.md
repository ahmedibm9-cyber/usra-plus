# Task 7-h: Grocery List Export/Share and AI Recipe Suggestions

## Agent: Grocery Enhancement Agent

## Summary of Changes

### Files Modified:
1. **`/src/i18n/en.ts`** - Added 17 new grocery translation keys for recipe ideas, export, and clear checked features
2. **`/src/i18n/ar.ts`** - Added matching Arabic translations for all new grocery keys
3. **`/src/stores/grocery-store.ts`** - Added `removeItems(ids: string[])` method for batch deletion
4. **`/src/components/grocery/grocery-page.tsx`** - Major update with 4 new features

### Files Created:
1. **`/src/app/api/ai/recipes/route.ts`** - AI-powered recipe suggestion API endpoint

## Features Implemented:

### 1. Recipe Suggestion API Route (`/api/ai/recipes`)
- POST endpoint accepting `items: string[]` and `language: 'en' | 'ar'`
- Uses z-ai-web-dev-sdk LLM to generate 3 recipe suggestions
- Returns structured data: title, cookTime, servings, difficulty, ingredients, steps
- Falls back to static recipes if AI fails (context-aware: chicken+rice → biryani, milk+dates → pudding, etc.)
- Bilingual responses based on language parameter

### 2. Recipe Suggestions Widget
- Tab switcher (List / Recipe Ideas) with ChefHat icon
- 3 recipe cards with title, cook time, servings, difficulty badge
- Ingredient matching with grocery list items (highlighted in indigo)
- Expandable "View Recipe" with numbered steps
- Refresh button with spinning animation
- 3 skeleton cards during loading

### 3. Export/Share Dropdown
- DropdownMenu in header with Download button
- Copy to Clipboard: formatted text list with ✓/✗ marks
- Share via WhatsApp: wa.me link with pre-formatted text
- Download as Text: .txt file generation and download

### 4. Clear Checked Button
- Appears when checked items exist
- AlertDialog confirmation with count
- Undo support via 5-second toast window

## Lint Status: PASS
## Dev Server: HTTP 200
