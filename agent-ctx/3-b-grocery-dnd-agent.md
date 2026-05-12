# Task 3-b: Grocery Drag-and-Drop Reordering

## Agent: Grocery DnD Agent

## Summary
Successfully added drag-and-drop reordering to the grocery list page using @dnd-kit, matching the pattern from the tasks page.

## Changes Made

### 1. `/src/stores/grocery-store.ts`
- Added `sortBy` state (`'created_at' | 'name' | 'category' | 'manual'`)
- Added `reorderItems(fromIndex, toIndex)` method - splices items array and auto-sets sortBy to 'manual'
- Added `setSortBy` method
- Updated `getFilteredItems()` to sort based on `sortBy` state

### 2. `/src/components/grocery/grocery-page.tsx`
- **CategoryIconRender**: Module-level component for rendering category icons (satisfies lint rule)
- **GroceryItemCard**: Reusable card for both normal and drag overlay rendering
  - GripVertical drag handle (hover-visible, cursor-grab/active:cursor-grabbing)
  - RTL support (flex-row-reverse when isRTL)
  - Drag overlay styling (shadow-2xl, ring-1 ring-white/10, scale-[1.02])
  - Checked items: muted, no drag handle, no category badge
- **SortableGroceryItem**: DnD wrapper using useSortable
  - 2px indigo drop indicator line
  - opacity-40 while dragging
  - Smooth CSS transform transitions
- **GroceryPage**: DndContext integration
  - PointerSensor (8px activation) + KeyboardSensor
  - restrictToVerticalAxis modifier
  - SortableContext for unchecked items only
  - DragOverlay with elevated GroceryItemCard
  - Cross-category and cross-checked-group prevention
- Sort dropdown added in header

## Lint: PASS
## Server: HTTP 200
