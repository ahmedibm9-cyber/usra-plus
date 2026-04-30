'use client'

import { create } from 'zustand'
import type { GroceryItem } from '@/types'

interface RecentItem {
  name: string
  category: string
}

interface GroceryState {
  items: GroceryItem[]
  isLoading: boolean
  searchQuery: string
  filterCategory: string | 'all'
  sortBy: 'created_at' | 'name' | 'category' | 'manual'
  showAddItem: boolean
  recentItems: RecentItem[]
  setItems: (items: GroceryItem[]) => void
  addItem: (item: GroceryItem) => void
  updateItem: (item: GroceryItem) => void
  removeItem: (id: string) => void
  toggleChecked: (id: string) => void
  reorderItems: (fromIndex: number, toIndex: number) => void
  setIsLoading: (loading: boolean) => void
  setSearchQuery: (query: string) => void
  setFilterCategory: (category: string | 'all') => void
  setSortBy: (sort: GroceryState['sortBy']) => void
  setShowAddItem: (show: boolean) => void
  addRecentItem: (name: string, category: string) => void
  getFilteredItems: () => GroceryItem[]
  getProgress: () => { total: number; checked: number; percentage: number }
  getCategoryCount: (category: string) => number
}

export const useGroceryStore = create<GroceryState>((set, get) => ({
  items: [],
  isLoading: false,
  searchQuery: '',
  filterCategory: 'all',
  sortBy: 'created_at',
  showAddItem: false,
  recentItems: [],
  setItems: (items) => set({ items }),
  addItem: (item) => set((s) => ({ items: [item, ...s.items] })),
  updateItem: (item) => set((s) => ({ items: s.items.map((i) => (i.id === item.id ? item : i)) })),
  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  toggleChecked: (id) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)),
    })),
  reorderItems: (fromIndex, toIndex) =>
    set((s) => {
      const newItems = [...s.items]
      const [movedItem] = newItems.splice(fromIndex, 1)
      newItems.splice(toIndex, 0, movedItem)
      return { items: newItems, sortBy: 'manual' }
    }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterCategory: (category) => set({ filterCategory: category }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setShowAddItem: (show) => set({ showAddItem: show }),
  addRecentItem: (name, category) =>
    set((s) => {
      // Remove duplicate by name, then prepend, keep max 8
      const filtered = s.recentItems.filter((r) => r.name.toLowerCase() !== name.toLowerCase())
      const updated = [{ name, category }, ...filtered].slice(0, 8)
      return { recentItems: updated }
    }),
  getFilteredItems: () => {
    const { items, searchQuery, filterCategory, sortBy } = get()
    let filtered = [...items]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((i) => i.name.toLowerCase().includes(q))
    }
    if (filterCategory !== 'all') {
      filtered = filtered.filter((i) => i.category === filterCategory)
    }
    if (sortBy !== 'manual') {
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name)
          case 'category':
            return (a.category ?? 'zzz').localeCompare(b.category ?? 'zzz')
          case 'created_at':
          default:
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
      })
    }
    return filtered
  },
  getProgress: () => {
    const { items } = get()
    const total = items.length
    const checked = items.filter((i) => i.checked).length
    const percentage = total > 0 ? Math.round((checked / total) * 100) : 0
    return { total, checked, percentage }
  },
  getCategoryCount: (category) => {
    const { items } = get()
    return items.filter((i) => i.category === category).length
  },
}))
