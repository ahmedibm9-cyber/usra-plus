# Task 8-b: Data Export/Import Feature Agent

## Task
Add comprehensive Data Export and Import capabilities to Settings "Data Control" tab

## Work Completed

### 1. i18n Keys Added
- Added `dataControl` namespace to `/src/i18n/en.ts` with 24 keys covering:
  - Export: title, format (JSON/CSV), selectData, tasks, events, grocery, messages, fullExport, exportSuccess, exporting, selectAll, deselectAll, noDataToExport
  - Import: importData, importSuccess, importWarning (with {count} template), dropzone, supportedFormats, preview, invalidFile, importFailed, importPreviewTitle, itemCount, applying
  - Clear: clearData, clearWarning, clearSuccess, clearAll
- Added matching Arabic translations to `/src/i18n/ar.ts`

### 2. DataControlTab Rewrite
Completely rewrote the `DataControlTab` function in `/src/components/settings/settings-page.tsx`:

**Export Feature:**
- Format toggle buttons (JSON/CSV) with FileJson and FileSpreadsheet icons
- Data type selection with checkboxes (Tasks, Events, Grocery, Messages)
- Select All / Deselect All toggle
- Badge showing item count per data type
- JSON export: Pretty-printed with version, app name, and timestamp metadata
- CSV export: UTF-8 BOM for Arabic support, sectioned by data type, comma-separated with quoted strings
- Export button disabled when no data selected or exporting
- Toast notification on success

**Import Feature:**
- Drag-and-drop zone with animated visual feedback (scale, border color change)
- Click-to-browse file input (accepts .json, .csv)
- File validation: JSON structure checking, CSV header detection
- Preview section showing item counts per type with total
- File indicator with name, size, and remove button
- Confirmation AlertDialog with "This will add N items to your existing data. Continue?"
- Merge strategy: adds new items without overwriting existing data
- Proper type casting for imported data matching store interfaces
- Toast notification on success/failure

**Clear Data Feature:**
- Warning Alert with red styling and clearWarning message
- Data type selection with checkboxes (red-themed)
- Select All / Deselect All toggle
- Confirmation AlertDialog with clearWarning
- Clear button disabled when no data selected
- Toast notification on completion

### 3. Store Integration
- Added `useChatStore` import for chat message data
- Reads live data from all 4 stores: task-store, calendar-store, grocery-store, chat-store
- Uses `useStore.getState()` pattern for write operations in callbacks
- Merge strategy preserves existing data when importing

### 4. Component Usage
- Added `Checkbox` from shadcn/ui for data type selection
- Added `Upload`, `FileJson`, `FileSpreadsheet` icons from lucide-react
- Used existing `SectionCard`, `SectionTitle`, `SectionDescription` helper components
- Used existing `AlertDialog`, `Alert`, `Badge`, `Button`, `Label`, `Progress` components
- Used framer-motion for animated transitions (drop zone, file indicator, preview)

### 5. Theme & RTL Support
- All colors use CSS variables (`--bg-surface`, `--text-primary`, `--border-subtle`, etc.)
- Full RTL support via `isRTL` flag from `useI18n()`
- Bilingual labels for storage section, import/export descriptions
- Arabic section headers in CSV export

### Lint Status
- `bun run lint` passes clean with zero errors
- Dev server compiles successfully (HTTP 200)
