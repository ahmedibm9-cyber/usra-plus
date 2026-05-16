'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
import {
  Container,
  Stack,
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  LinearProgress,
  Checkbox,
  FormControlLabel,
  Avatar,
  Tooltip,
  Menu,
  Badge,
  useTheme,
} from '@mui/material'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/app-store'
import { useGroceryStore } from '@/stores/grocery-store'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'
import type { TranslationKeys } from '@/i18n/en'
import type { GroceryItem } from '@/types'
import { triggerConfetti } from '@/lib/confetti'
import { safeJsonResponse } from '@/lib/safe-fetch'

const CATEGORIES = [
  { key: 'all', label: 'All', icon: Package, color: 'default' as const },
  { key: 'fruits', label: 'Fruits & Vegetables', icon: Apple, color: 'success' as const },
  { key: 'dairy', label: 'Dairy & Eggs', icon: Milk, color: 'primary' as const },
  { key: 'meat', label: 'Meat & Fish', icon: Fish, color: 'error' as const },
  { key: 'bakery', label: 'Bakery', icon: Croissant, color: 'warning' as const },
  { key: 'beverages', label: 'Beverages', icon: CupSoda, color: 'info' as const },
  { key: 'snacks', label: 'Snacks', icon: Cookie, color: 'secondary' as const },
  { key: 'frozen', label: 'Frozen Foods', icon: Snowflake, color: 'info' as const },
  { key: 'household', label: 'Household', icon: Home, color: 'default' as const },
  { key: 'other', label: 'Other', icon: Package, color: 'default' as const },
] as const

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  dairy: ['milk', 'cheese', 'yogurt', 'eggs', 'butter', 'cream'],
  bakery: ['bread', 'croissant', 'cake', 'muffin', 'bagel', 'toast'],
  meat: ['chicken', 'beef', 'fish', 'lamb', 'turkey', 'pork', 'steak', 'salmon', 'shrimp'],
  fruits: ['apple', 'banana', 'tomato', 'onion', 'orange', 'grape', 'strawberry', 'lettuce', 'carrot', 'potato'],
  beverages: ['water', 'juice', 'soda', 'coffee', 'tea', 'drink'],
  snacks: ['chips', 'cookies', 'nuts', 'crackers', 'popcorn', 'candy', 'chocolate'],
  frozen: ['frozen', 'ice cream', 'pizza', 'fries'],
  household: ['soap', 'detergent', 'tissue', 'paper', 'cleaning', 'shampoo'],
}

function suggestCategory(itemName: string): string | null {
  const lower = itemName.toLowerCase().trim()
  if (!lower) return null
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) return category
    }
  }
  return null
}

function getCategoryChipColor(category: string | null): 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' | 'secondary' {
  const map: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' | 'secondary'> = {
    fruits: 'success',
    dairy: 'primary',
    meat: 'error',
    bakery: 'warning',
    beverages: 'info',
    snacks: 'secondary',
    frozen: 'info',
    household: 'default',
    other: 'default',
  }
  return map[category ?? 'other'] ?? 'default'
}

// ─── Main Grocery Page ──────────────────────────────────────────────────
export function GroceryPage() {
  const { currentFamily } = useAppStore()
  const { user } = useAuthStore()
  const { t, isRTL } = useI18n()
  const theme = useTheme()
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
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const undoItemsRef = useRef<GroceryItem[]>([])

  const familyId = currentFamily?.id
  const userId = user?.id

  useEffect(() => {
    if (newItemName.trim()) {
      const suggested = suggestCategory(newItemName)
      if (suggested) { setNewItemCategory(suggested); setAutoDetectedCategory(suggested) }
      else setAutoDetectedCategory(null)
    } else setAutoDetectedCategory(null)
  }, [newItemName])

  const fetchItems = useCallback(async () => {
    if (!familyId) return
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('grocery_items').select('*').eq('family_id', familyId).order('created_at', { ascending: false })
      if (error) throw error
      if (data) setItems(data as GroceryItem[])
    } catch { /* table might not exist */ } finally { setIsLoading(false) }
  }, [familyId, setItems, setIsLoading])

  useEffect(() => {
    if (!familyId) return
    const supabase = createClient()
    fetchItems()
    const channel = supabase
      .channel('grocery-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grocery_items', filter: `family_id=eq.${familyId}` }, (payload) => {
        if (payload.eventType === 'INSERT') addItem(payload.new as GroceryItem)
        else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as GroceryItem
          const currentItems = useGroceryStore.getState().items
          setItems(currentItems.map((i) => (i.id === updated.id ? updated : i)))
        } else if (payload.eventType === 'DELETE') removeItem((payload.old as GroceryItem).id)
      })
      .subscribe()
    channelRef.current = channel
    return () => { if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null } }
  }, [familyId, fetchItems, addItem, removeItem, setItems])

  const handleAddItem = async () => {
    if (!familyId || !userId || !newItemName.trim()) return
    setIsAdding(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('grocery_items').insert({ family_id: familyId, name: newItemName.trim(), category: newItemCategory, quantity: newItemQuantity, added_by: userId }).select().single()
      if (error) throw error
      if (data) { addItem(data as GroceryItem); addRecentItem(newItemName.trim(), newItemCategory); toast.success(t.common.success) }
      setNewItemName(''); setNewItemQuantity(1); setNewItemCategory('other'); setAutoDetectedCategory(null); setShowAddItem(false)
    } catch {
      const demoItem: GroceryItem = { id: `demo-grocery-${Date.now()}`, family_id: familyId, name: newItemName.trim(), category: newItemCategory, quantity: newItemQuantity, checked: false, added_by: userId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      addItem(demoItem); addRecentItem(newItemName.trim(), newItemCategory); toast.success(t.common.success)
      setNewItemName(''); setNewItemQuantity(1); setNewItemCategory('other'); setAutoDetectedCategory(null); setShowAddItem(false)
    } finally { setIsAdding(false) }
  }

  const handleToggleChecked = async (item: GroceryItem) => {
    const wasChecked = item.checked
    try {
      const supabase = createClient()
      const { error } = await supabase.from('grocery_items').update({ checked: !item.checked }).eq('id', item.id)
      if (error) throw error
      toggleChecked(item.id)
      if (!wasChecked) {
        toast.success('✓ Item checked'); setFlashItemId(item.id); setTimeout(() => setFlashItemId(null), 300)
        const updatedItems = useGroceryStore.getState().items.map((i) => i.id === item.id ? { ...i, checked: true } : i)
        if (updatedItems.length > 0 && updatedItems.every((i) => i.checked)) { triggerConfetti(); toast.success('🎉 All items checked off!') }
      }
    } catch {
      toggleChecked(item.id)
      if (!wasChecked) { toast.success('✓ Item checked'); setFlashItemId(item.id); setTimeout(() => setFlashItemId(null), 300) }
    }
  }

  const handleDeleteItem = async (id: string) => {
    setDeletingId(id)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('grocery_items').delete().eq('id', id)
      if (error) throw error
      removeItem(id); toast.success(t.common.success)
    } catch { removeItem(id); toast.success(t.common.success) } finally { setDeletingId(null) }
  }

  const confirmClearChecked = async () => {
    const checkedItemsList = items.filter((i) => i.checked)
    undoItemsRef.current = [...checkedItemsList]
    const checkedIds = checkedItemsList.map((i) => i.id)
    removeItems(checkedIds); setShowClearConfirm(false)
    try { const supabase = createClient(); for (const id of checkedIds) { await supabase.from('grocery_items').delete().eq('id', id) } } catch { /* fallback */ }
    toast.success(t.grocery.itemsCleared, { duration: 5000 })
  }

  const filteredItems = getFilteredItems()
  const progress = getProgress()
  const uncheckedItems = filteredItems.filter((i) => !i.checked)
  const checkedItems = filteredItems.filter((i) => i.checked)

  return (
    <Container maxWidth="lg" sx={{ py: 3 }} dir={isRTL ? 'rtl' : 'ltr'}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${theme.palette.primary.main}15`, border: `1px solid ${theme.palette.primary.main}30` }}>
              <ShoppingBag size={24} style={{ color: theme.palette.primary.main }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700}>{t.grocery.title}</Typography>
              <Typography variant="body2" color="text.secondary">{progress.checked}/{progress.total} items checked</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel><Stack direction="row" alignItems="center" spacing={0.5}><ArrowUpDown size={12} /><Typography variant="caption">Sort</Typography></Stack></InputLabel>
              <Select value={sortBy} label="Sort" onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
                <MenuItem value="created_at">Created Date</MenuItem>
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="category">Category</MenuItem>
                <MenuItem value="manual">Manual Order</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setShowAddItem(true)}>
              {t.grocery.addItem}
            </Button>
          </Stack>
        </Stack>

        {/* Progress bar */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="body2" fontWeight={500}>{t.grocery.progress}</Typography>
            <Typography variant="body2" fontWeight={600} color="primary">{progress.percentage}%</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={progress.percentage} sx={{ height: 10, borderRadius: 5 }} />
        </Paper>

        {/* Recent Items */}
        {recentItems.length > 0 && (
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Sparkles size={14} style={{ color: theme.palette.secondary.main }} />
              <Typography variant="caption" fontWeight={500} color="text.secondary">Quick Add</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {recentItems.map((recent) => (
                <Chip key={recent.name} label={recent.name} size="small" variant="outlined" onClick={() => { setNewItemName(recent.name); setNewItemCategory(recent.category); setShowAddItem(true) }} sx={{ cursor: 'pointer' }} />
              ))}
            </Stack>
          </Stack>
        )}

        {/* Search */}
        <TextField
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.grocery.search}
          size="small"
          fullWidth
          sx={{ '& .MuiInputAdornment-root': { mr: 1 } }}
          InputProps={{ startAdornment: <Search size={18} style={{ color: theme.palette.text.secondary, marginRight: 4 }} /> }}
        />

        {/* Category Tabs */}
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {CATEGORIES.map((cat) => {
            const count = cat.key === 'all' ? items.length : getCategoryCount(cat.key)
            const isActive = filterCategory === cat.key
            const Icon = cat.icon
            return (
              <Chip
                key={cat.key}
                icon={<Icon size={14} />}
                label={`${cat.label} (${count})`}
                size="small"
                variant={isActive ? 'filled' : 'outlined'}
                color={isActive ? 'primary' : 'default'}
                onClick={() => setFilterCategory(cat.key)}
                sx={{ cursor: 'pointer' }}
              />
            )
          })}
        </Stack>

        {/* Item List */}
        <Stack spacing={1}>
          {uncheckedItems.map((item) => (
            <Paper
              key={item.id}
              variant="outlined"
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderRadius: 2,
                transition: 'all 0.3s',
                bgcolor: flashItemId === item.id ? `${theme.palette.success.main}10` : 'transparent',
                '&:hover': { borderColor: theme.palette.divider },
              }}
            >
              <Checkbox checked={item.checked} onChange={() => handleToggleChecked(item)} size="small" />
              <Stack sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={500} noWrap>{item.name}</Typography>
                {item.adder && <Typography variant="caption" color="text.secondary">Added by {item.adder.first_name ?? 'Someone'}</Typography>}
              </Stack>
              <Typography variant="caption" color="text.secondary">x{item.quantity}</Typography>
              <Chip label={item.category ? t.grocery.categories[item.category as keyof typeof t.grocery.categories] ?? item.category : 'Other'} size="small" color={getCategoryChipColor(item.category)} variant="outlined" sx={{ fontSize: 10, height: 20 }} />
              <IconButton size="small" color="error" onClick={() => handleDeleteItem(item.id)} disabled={deletingId === item.id}>
                <Trash2 size={14} />
              </IconButton>
            </Paper>
          ))}

          {checkedItems.length > 0 && (
            <>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary">Checked ({checkedItems.length})</Typography>
                <Button size="small" color="error" variant="text" onClick={() => setShowClearConfirm(true)}>
                  {t.grocery.clearChecked}
                </Button>
              </Stack>
              {checkedItems.map((item) => (
                <Paper key={item.id} variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderRadius: 2, opacity: 0.6 }}>
                  <Checkbox checked={item.checked} onChange={() => handleToggleChecked(item)} size="small" />
                  <Typography variant="body2" sx={{ flex: 1, textDecoration: 'line-through', color: 'text.disabled' }} noWrap>{item.name}</Typography>
                  <Typography variant="caption" color="text.disabled">x{item.quantity}</Typography>
                  <IconButton size="small" color="error" onClick={() => handleDeleteItem(item.id)} disabled={deletingId === item.id}>
                    <Trash2 size={14} />
                  </IconButton>
                </Paper>
              ))}
            </>
          )}

          {filteredItems.length === 0 && (
            <Stack alignItems="center" sx={{ py: 6 }}>
              <ShoppingBag size={48} style={{ color: theme.palette.text.disabled, marginBottom: 4 }} />
              <Typography variant="body2" color="text.secondary">No items found</Typography>
            </Stack>
          )}
        </Stack>
      </Stack>

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onClose={() => setShowAddItem(false)} maxWidth="sm" fullWidth dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogTitle>{t.grocery.addItem}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Item name" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="e.g. Milk" size="small" fullWidth autoFocus />
            <Stack direction="row" spacing={2}>
              <TextField label="Quantity" type="number" value={newItemQuantity} onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)} size="small" fullWidth inputProps={{ min: 1 }} />
              <FormControl size="small" fullWidth>
                <InputLabel>Category</InputLabel>
                <Select value={newItemCategory} label="Category" onChange={(e) => setNewItemCategory(e.target.value)}>
                  {CATEGORIES.filter(c => c.key !== 'all').map((cat) => (
                    <MenuItem key={cat.key} value={cat.key}>{cat.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            {autoDetectedCategory && <Typography variant="caption" color="primary">Auto-detected: {autoDetectedCategory}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowAddItem(false)} color="inherit">{t.common.cancel}</Button>
          <Button onClick={handleAddItem} variant="contained" disabled={!newItemName.trim() || isAdding}>{isAdding ? t.common.loading : t.common.add}</Button>
        </DialogActions>
      </Dialog>

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearConfirm} onClose={() => setShowClearConfirm(false)} maxWidth="xs">
        <DialogTitle>Clear checked items?</DialogTitle>
        <DialogContent><Typography variant="body2">This will remove all checked items from the list.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setShowClearConfirm(false)} color="inherit">Cancel</Button>
          <Button onClick={confirmClearChecked} color="error" variant="contained">Clear</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
