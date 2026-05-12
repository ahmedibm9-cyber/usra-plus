# Task ID: 1
# Agent: Drag-and-Drop Tasks Agent
# Task: Add Drag-and-Drop Reordering for Tasks

## Work Log

### 1. Installed `@dnd-kit/modifiers` package
- `bun add @dnd-kit/modifiers` (v9.0.0)
- Already had `@dnd-kit/core` (v6.3.1), `@dnd-kit/sortable` (v10.0.0), `@dnd-kit/utilities` (v3.2.2)

### 2. Updated `/src/stores/task-store.ts`
- Added `'manual'` to the `sortBy` type: `'due_date' | 'priority' | 'created_at' | 'status' | 'manual'`
- Added `case 'manual': return 0` to the sort switch in `getFilteredTasks()` — no sorting applied, preserves store order

### 3. Updated `/src/components/tasks/tasks-page.tsx`
- **Imports**: Added dnd-kit imports (`DndContext`, `DragOverlay`, `closestCenter`, `useSensor`, `useSensors`, `PointerSensor`, `KeyboardSensor`, `useDndContext`, `DragStartEvent`, `DragEndEvent`, `DraggableSyntheticListeners`, `SortableContext`, `useSortable`, `verticalListSortingStrategy`, `arrayMove`, `sortableKeyboardCoordinates`, `restrictToVerticalAxis`, `CSS`). Added `GripVertical` to lucide-react imports.

- **TaskCard modifications**:
  - Added `dragHandleProps?: DraggableSyntheticListeners` and `isDragOverlay?: boolean` props
  - Added GripVertical drag handle button that appears on hover (`opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing`)
  - Added `isDragOverlay` conditional styling: `shadow-2xl shadow-indigo-500/10 ring-1 ring-indigo-500/20 scale-[1.03]`
  - Removed `layout` prop from motion.div to prevent conflicts with dnd-kit transforms

- **New SortableTaskCard component**:
  - Uses `useSortable` hook with `task.id`
  - Uses `useDndContext` to detect `over` item for drop indicator
  - Applies CSS transform from `useSortable` via `CSS.Transform.toString()`
  - Shows drop indicator: `absolute -top-[1px] left-4 right-4 h-0.5 bg-indigo-500 rounded-full z-10`
  - Passes `listeners` from `useSortable` as `dragHandleProps` to TaskCard
  - Reduces opacity to 40% when `isDragging`

- **DnD state & handlers in TasksPage**:
  - `activeId` state for tracking dragged item
  - `sensors`: PointerSensor (8px distance constraint) + KeyboardSensor
  - `handleDragStart`: Sets activeId
  - `handleDragEnd`: Validates same-group constraint (status or date group), uses `arrayMove` to reorder in store, switches `sortBy` to `'manual'`
  - `handleDragCancel`: Resets activeId

- **DndContext wrapper**:
  - Wraps the task list section with `DndContext` (sensors, closestCenter collision detection, restrictToVerticalAxis modifier)
  - Each group wrapped with `SortableContext` using `verticalListSortingStrategy`
  - Replaced `TaskCard` with `SortableTaskCard` in both status and date group views
  - Added `DragOverlay` rendering a `TaskCard` with `isDragOverlay` prop for smooth drag preview

- **Sort dropdown**: Added "Manual Order" option (`value="manual"`)

## Stage Summary
- Drag-and-drop reordering fully implemented within task groups
- Works in both "By Status" and "By Date" view modes
- Visual feedback: grip handle on hover, scale+shadow overlay, indigo drop indicator line
- Auto-switches to "Manual Order" sort when reordering to preserve user's custom order
- Keyboard sorting support via KeyboardSensor
- Lint: PASS, Server: HTTP 200
