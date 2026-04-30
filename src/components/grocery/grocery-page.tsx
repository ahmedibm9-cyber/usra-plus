'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

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

function getCategoryIcon(category: string | null) {
  const found = CATEGORIES.find((c) => c.key === category)
  if (!found) return Package
  return found.icon
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
    other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  }
  return colors[category ?? 'other'] ?? colors.other
}

export function GroceryPage() {
  const { currentFamily } = useAppStore()
  const { user } = useAuthStore()
  const { t } = useI18n()
  const {
    items,
    isLoading,
    searchQuery,
    filterCategory,
    showAddItem,
    setItems,
    addItem,
    removeItem,
    toggleChecked,
    setIsLoading,
    setSearchQuery,
    setFilterCategory,
    setShowAddItem,
    getFilteredItems,
    getProgress,
  } = useGroceryStore()

  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState(1)
  const [newItemCategory, setNewItemCategory] = useState<string>('other')
  const [isAdding, setIsAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  const familyId = currentFamily?.id
  const userId = user?.id

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
        toast.success(t.common.success)
      }
      setNewItemName('')
      setNewItemQuantity(1)
      setNewItemCategory('other')
      setShowAddItem(false)
    } catch {
      toast.error(t.common.error)
    } finally {
      setIsAdding(false)
    }
  }

  // Toggle checked
  const handleToggleChecked = async (item: GroceryItem) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('grocery_items')
        .update({ checked: !item.checked })
        .eq('id', item.id)

      if (error) throw error
      toggleChecked(item.id)
    } catch {
      toast.error(t.common.error)
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
      toast.error(t.common.error)
    } finally {
      setDeletingId(null)
    }
  }

  const filteredItems = getFilteredItems()
  const progress = getProgress()

  const uncheckedItems = filteredItems.filter((i) => !i.checked)
  const checkedItems = filteredItems.filter((i) => i.checked)

  return (
    <div className="flex flex-col h-full w-full bg-[#0B0B0F]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20">
              <ShoppingBag className="w-5 h-5 text-[#6366F1]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#E5E7EB]">
                {t.grocery.title}
              </h1>
              <p className="text-sm text-[#6B7280]">
                {progress.checked}/{progress.total} items checked
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddItem(true)}
            className="bg-[#6366F1] hover:bg-[#5558E6] text-white gap-2 rounded-xl h-10 px-4"
          >
            <Plus className="w-4 h-4" />
            {t.grocery.addItem}
          </Button>
        </div>

        {/* Progress bar */}
        <div className="mt-5 bg-[#111117] border border-white/[0.08] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#E5E7EB]">{t.grocery.progress}</span>
            <span className="text-sm font-semibold text-[#A78BFA]">{progress.percentage}%</span>
          </div>
          <Progress
            value={progress.percentage}
            className="h-2.5 bg-white/[0.06] [&>[data-slot=indicator]]:bg-gradient-to-r [&>[data-slot=indicator]]:from-[#6366F1] [&>[data-slot=indicator]]:to-[#A78BFA]"
          />
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.grocery.search}
            className="pl-10 bg-[#111117] border-white/[0.08] text-[#E5E7EB] placeholder:text-[#6B7280] rounded-xl h-10 focus-visible:ring-[#6366F1]/30 focus-visible:ring-offset-0"
          />
        </div>

        {/* Category Tabs */}
        <div className="mt-4 -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 pb-1 min-w-max">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setFilterCategory(cat.key)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200
                  ${
                    filterCategory === cat.key
                      ? 'bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/25'
                      : 'bg-white/[0.04] text-[#6B7280] hover:bg-white/[0.08] hover:text-[#E5E7EB] border border-white/[0.06]'
                  }
                `}
              >
                {cat.key !== 'all' && <cat.icon className="w-3.5 h-3.5" />}
                {cat.key === 'all'
                  ? 'All'
                  : t.grocery.categories[cat.key as keyof typeof t.grocery.categories] ?? cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-hidden px-4 sm:px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#6B7280]">{t.common.loading}</p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-64 text-center"
          >
            <div className="p-4 rounded-2xl bg-[#111117] border border-white/[0.08] mb-4">
              <ShoppingBag className="w-10 h-10 text-[#6B7280]" />
            </div>
            <h3 className="text-lg font-semibold text-[#E5E7EB] mb-1">{t.grocery.noItems}</h3>
            <p className="text-sm text-[#6B7280] max-w-[250px]">{t.grocery.noItemsDesc}</p>
          </motion.div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {/* Unchecked items */}
              <AnimatePresence mode="popLayout">
                {uncheckedItems.map((item, index) => {
                  const Icon = getCategoryIcon(item.category)
                  const colorClass = getCategoryColor(item.category)
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="group bg-[#111117] border border-white/[0.08] rounded-xl p-3 sm:p-4 hover:border-white/[0.12] transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={() => handleToggleChecked(item)}
                          className="h-5 w-5 rounded-md border-white/20 data-[state=checked]:bg-[#6366F1] data-[state=checked]:border-[#6366F1] data-[state=checked]:text-white"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-[#6B7280] flex-shrink-0" />
                            <span className="text-sm font-medium text-[#E5E7EB] truncate">
                              {item.name}
                            </span>
                          </div>
                          {item.adder && (
                            <p className="text-xs text-[#6B7280] mt-0.5">
                              Added by {item.adder.first_name ?? 'Someone'}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-[#6B7280] font-medium">
                            x{item.quantity}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0 h-5 border ${colorClass}`}
                          >
                            {item.category
                              ? t.grocery.categories[
                                  item.category as keyof typeof t.grocery.categories
                                ] ?? item.category
                              : 'Other'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={deletingId === item.id}
                            className="h-8 w-8 text-[#6B7280] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {/* Separator between checked and unchecked */}
              {checkedItems.length > 0 && uncheckedItems.length > 0 && (
                <Separator className="bg-white/[0.06] my-3" />
              )}

              {/* Checked items */}
              <AnimatePresence mode="popLayout">
                {checkedItems.map((item, index) => {
                  const Icon = getCategoryIcon(item.category)
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.5 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="group bg-[#111117]/50 border border-white/[0.04] rounded-xl p-3 sm:p-4"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={() => handleToggleChecked(item)}
                          className="h-5 w-5 rounded-md border-white/20 data-[state=checked]:bg-[#6366F1] data-[state=checked]:border-[#6366F1] data-[state=checked]:text-white"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-[#6B7280] flex-shrink-0" />
                            <span className="text-sm font-medium text-[#6B7280] line-through truncate">
                              {item.name}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-[#6B7280]/60 font-medium line-through">
                            x{item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={deletingId === item.id}
                            className="h-8 w-8 text-[#6B7280] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="bg-[#111117] border-white/[0.08] text-[#E5E7EB] sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#E5E7EB] flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#6366F1]/10">
                <Plus className="w-4 h-4 text-[#6366F1]" />
              </div>
              {t.grocery.addItem}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#E5E7EB]">{t.grocery.itemName}</label>
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g. Organic Bananas"
                className="bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] placeholder:text-[#6B7280] rounded-xl h-10 focus-visible:ring-[#6366F1]/30 focus-visible:ring-offset-0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newItemName.trim()) handleAddItem()
                }}
              />
            </div>
            <div className="flex gap-4">
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium text-[#E5E7EB]">{t.grocery.quantity}</label>
                <Input
                  type="number"
                  min={1}
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] rounded-xl h-10 focus-visible:ring-[#6366F1]/30 focus-visible:ring-offset-0"
                />
              </div>
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium text-[#E5E7EB]">{t.grocery.category}</label>
                <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                  <SelectTrigger className="bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] rounded-xl h-10 focus:ring-[#6366F1]/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111117] border-white/[0.08] text-[#E5E7EB] rounded-xl">
                    {CATEGORIES.filter((c) => c.key !== 'all').map((cat) => (
                      <SelectItem
                        key={cat.key}
                        value={cat.key}
                        className="focus:bg-[#6366F1]/10 focus:text-[#E5E7EB]"
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
              onClick={() => setShowAddItem(false)}
              className="text-[#6B7280] hover:text-[#E5E7EB] rounded-xl"
            >
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={!newItemName.trim() || isAdding}
              className="bg-[#6366F1] hover:bg-[#5558E6] text-white gap-2 rounded-xl min-w-[100px]"
            >
              {isAdding ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
