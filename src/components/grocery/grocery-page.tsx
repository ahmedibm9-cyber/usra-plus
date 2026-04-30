'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Trash2,
  ShoppingBag,
  Check,
  Apple,
  Milk,
  Fish,
  Croissant,
  CupSoda,
  Cookie,
  Snowflake,
  Home,
  Package,
  X,
  Sparkles,
  GripVertical,
  ArrowUpDown,
  ChefHat,
  Clock,
  Users,
  RefreshCw,
  Download,
  Copy,
  Share2,
  FileText,
  Trash,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/app-store'
import { useGroceryStore } from '@/stores/grocery-store'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'
import type { GroceryItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { triggerConfetti } from '@/lib/confetti'
import { EmptyState } from '@/components/shared/empty-state'
import { GroceryItemSkeleton } from '@/components/shared/skeleton-patterns'
import { cn } from '@/lib/utils'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  useDndContext,
} from '@dnd-kit/core'
import type {
  DragStartEvent,
  DragEndEvent,
  DraggableSyntheticListeners,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'

// ─── Recipe Suggestion Type ─────────────────────────────────────────────
interface RecipeSuggestion {
  title: string
  cookTime: string
  servings: number
  difficulty: 'easy' | 'medium' | 'hard'
  ingredients: string[]
  steps: string[]
}

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'fruits', label: 'Fruits & Vegetables', icon: Apple },
  { key: 'dairy', label: 'Dairy & Eggs', icon: Milk },
  { key: 'meat', label: 'Meat & Fish', icon: Fish },
  { key: 'bakery', label: 'Bakery', icon: Croissant },
  { key: 'beverages', label: 'Beverages', icon: CupSoda },
  { key: 'snacks', label: 'Snacks', icon: Cookie },
  { key: 'frozen', label: 'Frozen Foods', icon: Snowflake },
  { key: 'household', label: 'Household', icon: Home },
  { key: 'other', label: 'Other', icon: Package },
] as const

// ─── Smart Category Suggestions Mapping ──────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  dairy: ['milk', 'cheese', 'yogurt', 'eggs', 'butter', 'cream', 'yoghurt'],
  bakery: ['bread', 'croissant', 'cake', 'muffin', 'bagel', 'toast', 'pastry', 'tortilla'],
  meat: ['chicken', 'beef', 'fish', 'lamb', 'turkey', 'pork', 'steak', 'salmon', 'shrimp', 'meat'],
  fruits: ['apple', 'banana', 'tomato', 'onion', 'orange', 'grape', 'strawberry', 'lettuce', 'carrot', 'potato', 'pepper', 'cucumber', 'garlic', 'lemon'],
  beverages: ['water', 'juice', 'soda', 'coffee', 'tea', 'milk', 'drink'],
  snacks: ['chips', 'cookies', 'nuts', 'crackers', 'popcorn', 'candy', 'chocolate', 'pretzel'],
  frozen: ['frozen', 'ice cream', 'pizza', 'fries'],
  household: ['soap', 'detergent', 'tissue', 'paper', 'cleaning', 'shampoo', 'toothpaste'],
}

function suggestCategory(itemName: string): string | null {
  const lower = itemName.toLowerCase().trim()
  if (!lower) return null
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category
      }
    }
  }
  return null
}

// Render a category icon element (avoids creating components during render)
function CategoryIconRender({ category, className }: { category: string | null; className?: string }) {
  const found = CATEGORIES.find((c) => c.key === category)
  const IconComp = found?.icon ?? Package
  return <IconComp className={className} />
}

function getCategoryColor(category: string | null) {
  const colors: Record<string, string> = {
    fruits: 'bg-green-500/20 text-green-400 border-green-500/30',
    dairy: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    meat: 'bg-red-500/20 text-red-400 border-red-500/30',
    bakery: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    beverages: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    snacks: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    frozen: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    household: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    other: 'bg-gray-500/20 text-[--text-muted] border-gray-500/30',
  }
  return colors[category ?? 'other'] ?? colors.other
}

// ─── Grocery Item Card (used for both regular + drag overlay) ────────────
function GroceryItemCard({
  item,
  onToggleChecked,
  onDelete,
  deletingId,
  flashItemId,
  dragHandleProps,
  isDragOverlay,
  isRTL,
  t,
}: {
  item: GroceryItem
  onToggleChecked: (item: GroceryItem) => void
  onDelete: (id: string) => void
  deletingId: string | null
  flashItemId: string | null
  dragHandleProps?: DraggableSyntheticListeners
  isDragOverlay?: boolean
  isRTL: boolean
  t: ReturnType<typeof useI18n>['t']
}) {
  const [hovered, setHovered] = useState(false)
  const colorClass = getCategoryColor(item.category)
  const isChecked = item.checked

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'group bg-[--bg-surface] border border-[--border-subtle] rounded-xl p-3 sm:p-4 transition-all duration-300',
        hovered && !isDragOverlay && 'border-[--border-medium] -translate-y-px shadow-lg shadow-black/20',
        flashItemId === item.id && 'bg-green-500/10',
        isChecked && !isDragOverlay && 'grocery-item-checked',
        isChecked && !isDragOverlay && 'bg-[--bg-surface]/50 border-[--border-subtle]',
        isDragOverlay && 'shadow-2xl ring-1 ring-white/10 scale-[1.02]'
      )}
    >
      <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
        {/* Drag handle */}
        {dragHandleProps && !isChecked && (
          <button
            {...dragHandleProps}
            className={cn(
              'w-5 h-5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-[--text-muted] hover:text-[--text-primary]',
              isRTL ? 'ml-0 mr-0' : 'mr-0 ml-0'
            )}
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-5 h-5" />
          </button>
        )}

        {/* Checkbox */}
        <Checkbox
          checked={item.checked}
          onCheckedChange={() => onToggleChecked(item)}
          className="h-5 w-5 rounded-md border-[--border-medium] data-[state=checked]:bg-[#6366F1] data-[state=checked]:border-[#6366F1] data-[state=checked]:text-white flex-shrink-0"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
            <CategoryIconRender category={item.category} />
            {isChecked ? (
              <span className="text-sm font-medium truncate text-[--text-muted] grocery-strikethrough-text">
                {item.name}
              </span>
            ) : (
              <span className="text-sm font-medium truncate text-[--text-primary]">
                {item.name}
              </span>
            )}
            {isChecked && (
              <span className="grocery-checkmark text-sm">✓</span>
            )}
          </div>
          {item.adder && !isChecked && (
            <p className="text-xs text-[--text-muted] mt-0.5">
              Added by {item.adder.first_name ?? 'Someone'}
            </p>
          )}
        </div>

        {/* Right side: quantity, category badge, delete */}
        <div className={cn('flex items-center gap-2 flex-shrink-0', isRTL && 'flex-row-reverse')}>
          <span
            className={cn(
              'text-xs font-medium',
              isChecked ? 'text-[--text-muted]/60 line-through' : 'text-[--text-muted]'
            )}
          >
            x{item.quantity}
          </span>
          {!isChecked && (
            <Badge
              variant="outline"
              className={cn('text-[10px] px-2 py-0 h-5 border', colorClass)}
            >
              {item.category
                ? t.grocery.categories[item.category as keyof typeof t.grocery.categories] ??
                  item.category
                : 'Other'}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(item.id)}
            disabled={deletingId === item.id}
            className="h-8 w-8 text-[--text-muted] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Sortable Grocery Item (DnD wrapper) ─────────────────────────────────
function SortableGroceryItem({
  item,
  onToggleChecked,
  onDelete,
  deletingId,
  flashItemId,
  isRTL,
  t,
}: {
  item: GroceryItem
  onToggleChecked: (item: GroceryItem) => void
  onDelete: (id: string) => void
  deletingId: string | null
  flashItemId: string | null
  isRTL: boolean
  t: ReturnType<typeof useI18n>['t']
}) {
  const { over, active } = useDndContext()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const isOver = over?.id === item.id && active?.id !== item.id

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn('relative', isDragging && 'opacity-40 z-0')}
    >
      {/* Drop indicator line */}
      {isOver && (
        <div className="absolute -top-[1px] left-4 right-4 h-0.5 bg-indigo-500 rounded-full z-10" />
      )}
      <GroceryItemCard
        item={item}
        onToggleChecked={onToggleChecked}
        onDelete={onDelete}
        deletingId={deletingId}
        flashItemId={flashItemId}
        dragHandleProps={item.checked ? undefined : listeners}
        isRTL={isRTL}
        t={t}
      />
    </div>
  )
}

// ─── Recipe Skeleton Card ──────────────────────────────────────────────
function RecipeSkeletonCard() {
  return (
    <div className="bg-[--border-subtle] border border-[--border-subtle] rounded-xl p-4">
      <Skeleton className="h-5 w-3/5 mb-3" />
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    </div>
  )
}

// ─── Recipe Card ────────────────────────────────────────────────────────
function RecipeCard({
  recipe,
  groceryItemNames,
  isRTL,
  t,
}: {
  recipe: RecipeSuggestion
  groceryItemNames: string[]
  isRTL: boolean
  t: ReturnType<typeof useI18n>['t']
}) {
  const [expanded, setExpanded] = useState(false)

  const difficultyColors: Record<string, string> = {
    easy: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    hard: 'bg-red-500/20 text-red-400 border-red-500/30',
  }

  const difficultyLabels: Record<string, string> = {
    easy: t.grocery.easy,
    medium: t.grocery.medium,
    hard: t.grocery.hard,
  }

  const isMatch = (ingredient: string) => {
    const lower = ingredient.toLowerCase()
    return groceryItemNames.some((name) => lower.includes(name.toLowerCase()) || name.toLowerCase().includes(lower))
  }

  return (
    <div className="bg-[--border-subtle] border border-[--border-subtle] rounded-xl p-4 hover:bg-[--border-subtle] transition-colors">
      {/* Title */}
      <h4 className="text-sm font-bold text-[--text-primary] mb-2">{recipe.title}</h4>

      {/* Meta */}
      <div className={cn('flex items-center gap-3 mb-3 flex-wrap', isRTL && 'flex-row-reverse')}>
        <span className="flex items-center gap-1 text-xs text-[--text-muted]">
          <Clock className="w-3 h-3" />
          {recipe.cookTime}
        </span>
        <span className="flex items-center gap-1 text-xs text-[--text-muted]">
          <Users className="w-3 h-3" />
          {recipe.servings} {t.grocery.servings}
        </span>
        <span className={cn('text-xs px-2 py-0.5 rounded-full border', difficultyColors[recipe.difficulty])}>
          {difficultyLabels[recipe.difficulty]}
        </span>
      </div>

      {/* Key Ingredients */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {recipe.ingredients.slice(0, 4).map((ing, idx) => (
          <span
            key={idx}
            className={cn(
              'text-xs px-2 py-0.5 rounded-md border',
              isMatch(ing)
                ? 'text-[#6366F1] font-medium bg-[#6366F1]/10 border-[#6366F1]/20'
                : 'text-[--text-muted] bg-[--border-subtle] border-[--border-subtle]'
            )}
          >
            {ing}
          </span>
        ))}
      </div>

      {/* View Recipe Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-[#6366F1] hover:text-[#818CF8] p-0 h-auto"
      >
        {expanded ? '−' : '+'} {t.grocery.viewRecipe}
      </Button>

      {/* Expanded Steps */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-[--border-subtle] space-y-2">
              {recipe.steps.map((step, idx) => (
                <div key={idx} className={cn('flex gap-2 text-xs', isRTL && 'flex-row-reverse')}>
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#6366F1]/10 text-[#6366F1] flex items-center justify-center font-medium text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="text-[--text-secondary] leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main Grocery Page ──────────────────────────────────────────────────
export function GroceryPage() {
  const { currentFamily } = useAppStore()
  const { user } = useAuthStore()
  const { t, isRTL: storeIsRTL } = useI18n()
  const isRTL = storeIsRTL
  const {
    items,
    isLoading,
    searchQuery,
    filterCategory,
    sortBy,
    showAddItem,
    recentItems,
    setItems,
    addItem,
    removeItem,
    removeItems,
    toggleChecked,
    reorderItems,
    setIsLoading,
    setSearchQuery,
    setFilterCategory,
    setSortBy,
    setShowAddItem,
    addRecentItem,
    getFilteredItems,
    getProgress,
    getCategoryCount,
  } = useGroceryStore()

  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState(1)
  const [newItemCategory, setNewItemCategory] = useState<string>('other')
  const [isAdding, setIsAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [flashItemId, setFlashItemId] = useState<string | null>(null)
  const [autoDetectedCategory, setAutoDetectedCategory] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  // ─── Recipe Suggestions State ────────────────────────────────────────
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([])
  const [recipesLoading, setRecipesLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'list' | 'recipes'>('list')

  // ─── Clear Checked State ─────────────────────────────────────────────
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const undoItemsRef = useRef<GroceryItem[]>([])

  // ─── DnD State & Handlers ────────────────────────────────────────────
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const fromIndex = items.findIndex((i) => i.id === active.id)
    const toIndex = items.findIndex((i) => i.id === over.id)

    if (fromIndex === -1 || toIndex === -1) return

    // Only reorder within the same category (if filtering)
    const activeItem = items[fromIndex]
    const overItem = items[toIndex]

    // When viewing a specific category, both items must be in that category
    if (filterCategory !== 'all') {
      if (activeItem.category !== overItem.category) return
    }

    // Only reorder within the same checked/unchecked group
    if (activeItem.checked !== overItem.checked) return

    reorderItems(fromIndex, toIndex)
  }, [items, filterCategory, reorderItems])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  const activeItem = useMemo(
    () => (activeId ? items.find((i) => i.id === activeId) : null),
    [activeId, items]
  )

  const familyId = currentFamily?.id
  const userId = user?.id

  // Compute category counts for tabs
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const cat of CATEGORIES) {
      if (cat.key === 'all') {
        counts['all'] = items.length
      } else {
        counts[cat.key] = getCategoryCount(cat.key)
      }
    }
    return counts
  }, [items, getCategoryCount])

  // Smart category suggestion when item name changes
  useEffect(() => {
    if (newItemName.trim()) {
      const suggested = suggestCategory(newItemName)
      if (suggested) {
        setNewItemCategory(suggested)
        setAutoDetectedCategory(suggested)
      } else {
        setAutoDetectedCategory(null)
      }
    } else {
      setAutoDetectedCategory(null)
    }
  }, [newItemName])

  // Fetch items
  const fetchItems = useCallback(async () => {
    if (!familyId) return
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('grocery_items')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setItems(data as GroceryItem[])
    } catch {
      toast.error(t.common.error)
    } finally {
      setIsLoading(false)
    }
  }, [familyId, setItems, setIsLoading, t])

  // Realtime subscription
  useEffect(() => {
    if (!familyId) return
    const supabase = createClient()

    fetchItems()

    const channel = supabase
      .channel('grocery-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grocery_items',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            addItem(payload.new as GroceryItem)
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as GroceryItem
            setItems(
              useGroceryStore.getState().items.map((i) => (i.id === updated.id ? updated : i))
            )
          } else if (payload.eventType === 'DELETE') {
            removeItem((payload.old as GroceryItem).id)
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [familyId, fetchItems, addItem, removeItem, setItems])

  // ─── Recipe Suggestions ─────────────────────────────────────────────
  const fetchRecipes = useCallback(async (showLoading = true) => {
    if (items.length === 0) {
      setRecipes([])
      return
    }
    if (showLoading) setRecipesLoading(true)
    try {
      const itemNames = items.map((i) => i.name)
      const lang = isRTL ? 'ar' : 'en'
      const res = await fetch('/api/ai/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemNames, language: lang }),
      })
      const data = await res.json()
      if (data.recipes) {
        setRecipes(data.recipes)
      }
    } catch {
      // Fallback recipes will come from the API itself
    } finally {
      setRecipesLoading(false)
    }
  }, [items, isRTL])

  // Fetch recipes when items change
  useEffect(() => {
    if (items.length > 0 && activeTab === 'recipes') {
      fetchRecipes()
    }
  }, [items.length, activeTab, fetchRecipes])

  // Add item
  const handleAddItem = async () => {
    if (!familyId || !userId || !newItemName.trim()) return
    setIsAdding(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('grocery_items')
        .insert({
          family_id: familyId,
          name: newItemName.trim(),
          category: newItemCategory,
          quantity: newItemQuantity,
          added_by: userId,
        })
        .select()
        .single()

      if (error) throw error
      if (data) {
        addItem(data as GroceryItem)
        addRecentItem(newItemName.trim(), newItemCategory)
        toast.success(t.common.success)
      }
      setNewItemName('')
      setNewItemQuantity(1)
      setNewItemCategory('other')
      setAutoDetectedCategory(null)
      setShowAddItem(false)
    } catch {
      // Fallback for demo mode
      const demoItem: GroceryItem = {
        id: `demo-grocery-${Date.now()}`,
        family_id: familyId,
        name: newItemName.trim(),
        category: newItemCategory,
        quantity: newItemQuantity,
        checked: false,
        added_by: userId,
        created_at: new Date().toISOString(),
      }
      addItem(demoItem)
      addRecentItem(newItemName.trim(), newItemCategory)
      toast.success(t.common.success)
      setNewItemName('')
      setNewItemQuantity(1)
      setNewItemCategory('other')
      setAutoDetectedCategory(null)
      setShowAddItem(false)
    } finally {
      setIsAdding(false)
    }
  }

  // Handle quick-add from recent items
  const handleQuickAdd = (name: string, category: string) => {
    setNewItemName(name)
    setNewItemCategory(category)
    setShowAddItem(true)
  }

  // Toggle checked
  const handleToggleChecked = async (item: GroceryItem) => {
    const wasChecked = item.checked
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('grocery_items')
        .update({ checked: !item.checked })
        .eq('id', item.id)

      if (error) throw error
      toggleChecked(item.id)

      if (!wasChecked) {
        toast.success('✓ Item checked')
        setFlashItemId(item.id)
        setTimeout(() => setFlashItemId(null), 300)

        const updatedItems = useGroceryStore.getState().items.map((i) =>
          i.id === item.id ? { ...i, checked: true } : i
        )
        const allChecked = updatedItems.length > 0 && updatedItems.every((i) => i.checked)
        if (allChecked) {
          triggerConfetti()
          toast.success('🎉 All items checked off!')
        }
      }
    } catch {
      // Fallback for demo mode
      toggleChecked(item.id)
      if (!wasChecked) {
        toast.success('✓ Item checked')
        setFlashItemId(item.id)
        setTimeout(() => setFlashItemId(null), 300)

        const updatedItems = useGroceryStore.getState().items.map((i) =>
          i.id === item.id ? { ...i, checked: true } : i
        )
        const allChecked = updatedItems.length > 0 && updatedItems.every((i) => i.checked)
        if (allChecked) {
          triggerConfetti()
          toast.success('🎉 All items checked off!')
        }
      }
    }
  }

  // Delete item
  const handleDeleteItem = async (id: string) => {
    setDeletingId(id)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('grocery_items').delete().eq('id', id)
      if (error) throw error
      removeItem(id)
      toast.success(t.common.success)
    } catch {
      // Fallback for demo mode
      removeItem(id)
      toast.success(t.common.success)
    } finally {
      setDeletingId(null)
    }
  }

  // ─── Clear Checked ──────────────────────────────────────────────────
  const checkedItemsList = items.filter((i) => i.checked)
  const checkedCount = checkedItemsList.length

  const handleClearChecked = () => {
    if (checkedCount === 0) return
    setShowClearConfirm(true)
  }

  const confirmClearChecked = () => {
    undoItemsRef.current = [...checkedItemsList]
    const checkedIds = checkedItemsList.map((i) => i.id)
    removeItems(checkedIds)
    setShowClearConfirm(false)
    toast.success(t.grocery.itemsCleared, {
      action: {
        label: t.grocery.undo,
        onClick: () => {
          // Restore items
          const restored = [...useGroceryStore.getState().items, ...undoItemsRef.current]
          setItems(restored)
          undoItemsRef.current = []
        },
      },
      duration: 5000,
    })
  }

  // ─── Export Functions ───────────────────────────────────────────────
  const familyName = currentFamily?.name ?? 'Family'

  const getFormattedList = useCallback(() => {
    const checkedList = items.filter((i) => i.checked)
    const uncheckedList = items.filter((i) => !i.checked)
    const progress = getProgress()

    let text = `🛒 ${t.grocery.groceryListFor} ${familyName}\n`
    text += `═════════════════════════════════\n`

    if (checkedList.length > 0) {
      for (const item of checkedList) {
        text += `✓ ${item.name} (${item.quantity})\n`
      }
    }
    if (uncheckedList.length > 0) {
      for (const item of uncheckedList) {
        text += `✗ ${item.name} (${item.quantity})\n`
      }
    }

    text += `═════════════════════════════════\n`
    text += `${t.grocery.progressItems}: ${progress.checked}/${progress.total} ${t.grocery.itemsLabel} ${t.grocery.checkedLabel}`

    return text
  }, [items, familyName, t, getProgress])

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getFormattedList())
      toast.success(t.common.copied)
    } catch {
      toast.error(t.common.error)
    }
  }

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getFormattedList())
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const handleDownloadText = () => {
    const text = getFormattedList()
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `grocery-list-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(t.common.success)
  }

  const filteredItems = getFilteredItems()
  const progress = getProgress()

  const uncheckedItems = filteredItems.filter((i) => !i.checked)
  const checkedItems = filteredItems.filter((i) => i.checked)

  // Sortable IDs for unchecked items (only these participate in DnD)
  const uncheckedIds = useMemo(() => uncheckedItems.map((i) => i.id), [uncheckedItems])

  // Grocery item names for recipe ingredient matching
  const groceryItemNames = useMemo(() => items.map((i) => i.name), [items])

  return (
    <div className="flex flex-col h-full w-full bg-[--bg-primary]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20">
              <ShoppingBag className="w-5 h-5 text-[#6366F1]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[--text-primary]">
                {t.grocery.title}
              </h1>
              <p className="text-sm text-[--text-muted]">
                {progress.checked}/{progress.total} items checked
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Sort dropdown */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-9 text-xs bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] w-[140px] rounded-lg">
                <ArrowUpDown className="size-3 mr-1 text-[--text-muted]" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[--bg-surface] border-[--border-subtle]">
                <SelectItem value="created_at" className="text-[--text-primary] focus:bg-[--border-subtle] focus:text-[--text-primary]">Created Date</SelectItem>
                <SelectItem value="name" className="text-[--text-primary] focus:bg-[--border-subtle] focus:text-[--text-primary]">Name</SelectItem>
                <SelectItem value="category" className="text-[--text-primary] focus:bg-[--border-subtle] focus:text-[--text-primary]">Category</SelectItem>
                <SelectItem value="manual" className="text-[--text-primary] focus:bg-[--border-subtle] focus:text-[--text-primary]">Manual Order</SelectItem>
              </SelectContent>
            </Select>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 gap-2 bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] hover:bg-[--border-subtle] rounded-lg text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t.grocery.exportList}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[--bg-surface] border-[--border-subtle] rounded-xl" align="end">
                <DropdownMenuItem
                  onClick={handleCopyToClipboard}
                  className="text-[--text-primary] focus:bg-[--border-subtle] focus:text-[--text-primary] cursor-pointer gap-2"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {t.grocery.copyToClipboard}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleShareWhatsApp}
                  className="text-[--text-primary] focus:bg-[--border-subtle] focus:text-[--text-primary] cursor-pointer gap-2"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {t.grocery.shareWhatsApp}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDownloadText}
                  className="text-[--text-primary] focus:bg-[--border-subtle] focus:text-[--text-primary] cursor-pointer gap-2"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {t.grocery.downloadPDF}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() => setShowAddItem(true)}
              className="bg-[#6366F1] hover:bg-[#5558E6] text-white gap-2 rounded-xl h-10 px-4 btn-click-ripple"
            >
              <Plus className="w-4 h-4" />
              {t.grocery.addItem}
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5 bg-[--bg-surface] border border-[--border-subtle] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[--text-primary]">{t.grocery.progress}</span>
            <span className="text-sm font-semibold text-[#A78BFA]">{progress.percentage}%</span>
          </div>
          <Progress
            value={progress.percentage}
            className="h-2.5 bg-[--border-subtle] [&>[data-slot=indicator]]:bg-gradient-to-r [&>[data-slot=indicator]]:from-[#6366F1] [&>[data-slot=indicator]]:to-[#A78BFA]"
          />
        </div>

        {/* Quick Add Section - Recent Items */}
        {recentItems.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" />
              <span className="text-xs font-medium text-[--text-muted]">Quick Add</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentItems.map((recent) => (
                <button
                  key={recent.name}
                  onClick={() => handleQuickAdd(recent.name, recent.category)}
                  className="px-3 py-1.5 rounded-full bg-[--border-subtle] border border-[--border-subtle] text-xs text-[--text-primary] hover:bg-[--border-subtle] transition-all"
                >
                  {recent.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mt-4 relative">
          <Search className={cn(
            'absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]',
            isRTL ? 'right-3' : 'left-3'
          )} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.grocery.search}
            className={cn(
              'bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] rounded-xl h-10 focus-visible:ring-[#6366F1]/30 focus-visible:ring-offset-0',
              isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'
            )}
          />
        </div>

        {/* Category Tabs with Item Count */}
        <div className="mt-4 -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 pb-1 min-w-max">
            {CATEGORIES.map((cat) => {
              const count = categoryCounts[cat.key] ?? 0
              return (
                <button
                  key={cat.key}
                  onClick={() => setFilterCategory(cat.key)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200
                    ${
                      filterCategory === cat.key
                        ? 'bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/25'
                        : 'bg-[--border-subtle] text-[--text-muted] hover:bg-[--border-subtle] hover:text-[--text-primary] border border-[--border-subtle]'
                    }
                  `}
                >
                  {cat.key !== 'all' && <cat.icon className="w-3.5 h-3.5" />}
                  {cat.key === 'all'
                    ? 'All'
                    : t.grocery.categories[cat.key as keyof typeof t.grocery.categories] ?? cat.label}
                  <span className={`ml-0.5 text-[10px] ${filterCategory === cat.key ? 'text-white/70' : 'text-[--text-muted]/70'}`}>
                    ({count})
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tab switcher: List / Recipes */}
      <div className="flex-shrink-0 px-4 sm:px-6">
        <div className="flex gap-1 bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-1">
          <button
            onClick={() => setActiveTab('list')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              activeTab === 'list'
                ? 'bg-[#6366F1] text-white shadow-sm'
                : 'text-[--text-muted] hover:text-[--text-primary]'
            )}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            {isRTL ? 'القائمة' : 'List'}
          </button>
          <button
            onClick={() => {
              setActiveTab('recipes')
              if (recipes.length === 0 && items.length > 0) {
                fetchRecipes()
              }
            }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              activeTab === 'recipes'
                ? 'bg-[#6366F1] text-white shadow-sm'
                : 'text-[--text-muted] hover:text-[--text-primary]'
            )}
          >
            <ChefHat className="w-3.5 h-3.5" />
            {t.grocery.recipeIdeas}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden px-4 sm:px-6 py-4 pb-6">
        {activeTab === 'list' ? (
          isLoading ? (
            <div className="space-y-2">
              <GroceryItemSkeleton count={4} />
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Your list is empty"
              description="Add items to your grocery list"
              action={{ label: 'Add Item', onClick: () => setShowAddItem(true) }}
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {/* Unchecked items - sortable */}
                  <SortableContext
                    items={uncheckedIds}
                    strategy={verticalListSortingStrategy}
                  >
                    <AnimatePresence mode="popLayout">
                      {uncheckedItems.map((item) => (
                        <SortableGroceryItem
                          key={item.id}
                          item={item}
                          onToggleChecked={handleToggleChecked}
                          onDelete={handleDeleteItem}
                          deletingId={deletingId}
                          flashItemId={flashItemId}
                          isRTL={isRTL}
                          t={t}
                        />
                      ))}
                    </AnimatePresence>
                  </SortableContext>

                  {/* Separator between checked and unchecked */}
                  {checkedItems.length > 0 && uncheckedItems.length > 0 && (
                    <Separator className="bg-[--border-subtle] my-3" />
                  )}

                  {/* Checked items (not sortable, display-only) */}
                  <AnimatePresence mode="popLayout">
                    {checkedItems.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="group bg-[--bg-surface]/50 border border-[--border-subtle] rounded-xl p-3 sm:p-4"
                      >
                        <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
                          <Checkbox
                            checked={item.checked}
                            onCheckedChange={() => handleToggleChecked(item)}
                            className="h-5 w-5 rounded-md border-[--border-medium] data-[state=checked]:bg-[#6366F1] data-[state=checked]:border-[#6366F1] data-[state=checked]:text-white flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                              <CategoryIconRender category={item.category} />
                              <span className="text-sm font-medium text-[--text-muted] line-through truncate">
                                {item.name}
                              </span>
                            </div>
                          </div>
                          <div className={cn('flex items-center gap-2 flex-shrink-0', isRTL && 'flex-row-reverse')}>
                            <span className="text-xs text-[--text-muted]/60 font-medium line-through">
                              x{item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteItem(item.id)}
                              disabled={deletingId === item.id}
                              className="h-8 w-8 text-[--text-muted] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Clear Checked Button */}
                  {checkedCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="pt-3"
                    >
                      <button
                        onClick={handleClearChecked}
                        className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-red-400 transition-colors"
                      >
                        <Trash className="w-3.5 h-3.5" />
                        {t.grocery.clearChecked} ({checkedCount})
                      </button>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>

              {/* Drag Overlay */}
              <DragOverlay adjustScale={false} dropAnimation={null}>
                {activeItem ? (
                  <div className="w-full">
                    <GroceryItemCard
                      item={activeItem}
                      onToggleChecked={handleToggleChecked}
                      onDelete={handleDeleteItem}
                      deletingId={deletingId}
                      flashItemId={flashItemId}
                      isDragOverlay
                      isRTL={isRTL}
                      t={t}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )
        ) : (
          /* ─── Recipe Suggestions Tab ────────────────────────────────── */
          <ScrollArea className="h-full">
            <div className="space-y-4">
              {/* Header with Refresh */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-[#6366F1]" />
                  <span className="text-sm font-medium text-[--text-primary]">{t.grocery.recipeIdeas}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchRecipes()}
                  disabled={recipesLoading}
                  className="text-xs text-[#6366F1] hover:text-[#818CF8] gap-1.5"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', recipesLoading && 'animate-spin')} />
                  {t.grocery.refreshSuggestions}
                </Button>
              </div>

              {/* Recipe Cards */}
              {recipesLoading ? (
                <div className="space-y-3">
                  <RecipeSkeletonCard />
                  <RecipeSkeletonCard />
                  <RecipeSkeletonCard />
                </div>
              ) : recipes.length > 0 ? (
                <div className="space-y-3">
                  {recipes.map((recipe, idx) => (
                    <RecipeCard
                      key={idx}
                      recipe={recipe}
                      groceryItemNames={groceryItemNames}
                      isRTL={isRTL}
                      t={t}
                    />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ChefHat className="w-10 h-10 text-[--text-muted]/40 mb-3" />
                  <p className="text-sm text-[--text-muted]">
                    {isRTL ? 'أضف عناصر إلى قائمة البقالة للحصول على اقتراحات وصفات' : 'Add items to your grocery list to get recipe suggestions'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ChefHat className="w-10 h-10 text-[--text-muted]/40 mb-3" />
                  <p className="text-sm text-[--text-muted]">
                    {isRTL ? 'اضغط على تحديث للحصول على اقتراحات' : 'Click refresh to get suggestions'}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Clear Checked Confirmation Dialog */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent className="bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[--text-primary]">
              {t.grocery.clearChecked}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[--text-muted]">
              {t.grocery.removeItems.replace('{n}', String(checkedCount))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[--border-subtle] text-[--text-muted] hover:text-[--text-primary] hover:bg-[--border-subtle] rounded-xl">
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearChecked}
              className="bg-red-500/90 hover:bg-red-600 text-white rounded-xl"
            >
              {t.grocery.clearChecked}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={(open) => {
        setShowAddItem(open)
        if (!open) {
          setNewItemName('')
          setNewItemQuantity(1)
          setNewItemCategory('other')
          setAutoDetectedCategory(null)
        }
      }}>
        <DialogContent className="bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[--text-primary] flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#6366F1]/10">
                <Plus className="w-4 h-4 text-[#6366F1]" />
              </div>
              {t.grocery.addItem}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[--text-primary]">{t.grocery.itemName}</label>
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g. Organic Bananas"
                className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] rounded-xl h-10 focus-visible:ring-[#6366F1]/30 focus-visible:ring-offset-0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newItemName.trim()) handleAddItem()
                }}
              />
            </div>
            <div className="flex gap-4">
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium text-[--text-primary]">{t.grocery.quantity}</label>
                <Input
                  type="number"
                  min={1}
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] rounded-xl h-10 focus-visible:ring-[#6366F1]/30 focus-visible:ring-offset-0"
                />
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-[--text-primary]">{t.grocery.category}</label>
                  {autoDetectedCategory && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#A78BFA] bg-[#6366F1]/10 px-1.5 py-0.5 rounded-md">
                      <Sparkles className="w-2.5 h-2.5" />
                      Auto-detected
                    </span>
                  )}
                </div>
                <Select value={newItemCategory} onValueChange={(v) => {
                  setNewItemCategory(v)
                  setAutoDetectedCategory(null)
                }}>
                  <SelectTrigger className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] rounded-xl h-10 focus:ring-[#6366F1]/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] rounded-xl">
                    {CATEGORIES.filter((c) => c.key !== 'all').map((cat) => (
                      <SelectItem
                        key={cat.key}
                        value={cat.key}
                        className="focus:bg-[#6366F1]/10 focus:text-[--text-primary]"
                      >
                        <div className="flex items-center gap-2">
                          <cat.icon className="w-3.5 h-3.5" />
                          {t.grocery.categories[cat.key as keyof typeof t.grocery.categories] ??
                            cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddItem(false)
                setNewItemName('')
                setNewItemQuantity(1)
                setNewItemCategory('other')
                setAutoDetectedCategory(null)
              }}
              className="text-[--text-muted] hover:text-[--text-primary] rounded-xl"
            >
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={!newItemName.trim() || isAdding}
              className="bg-[#6366F1] hover:bg-[#5558E6] text-white gap-2 rounded-xl min-w-[100px]"
            >
              {isAdding ? (
                <div className="w-4 h-4 border-2 border-[--border-medium] border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {t.common.add}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
