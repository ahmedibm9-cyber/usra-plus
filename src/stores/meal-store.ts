'use client'

import { create } from 'zustand'
import type { GroceryItem } from '@/types'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface Meal {
  id: string
  title: string
  description?: string
  mealType: MealType
  date: string // '2025-01-15'
  assignedTo: string[] // userIds
  ingredients: string[] // grocery item names
  recipeUrl?: string
  prepTime?: number // minutes
  calories?: number
  createdBy: string
  createdAt: string
}

interface MealPlanStore {
  meals: Meal[]
  isLoading: boolean
  selectedWeekStart: string // Monday of selected week
  setMeals: (meals: Meal[]) => void
  addMeal: (meal: Meal) => void
  updateMeal: (id: string, updates: Partial<Meal>) => void
  removeMeal: (id: string) => void
  getMealsForDate: (date: string) => Meal[]
  getMealsForWeek: (weekStart: string) => Meal[]
  setSelectedWeek: (weekStart: string) => void
  addIngredientsToGrocery: (mealId: string) => Promise<number> // returns count of added items
  addAllIngredientsToGrocery: () => Promise<number> // returns count of added items
}

function getMonday(d: Date): string {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date.setDate(diff))
  return monday.toISOString().split('T')[0]
}

async function addIngredientsToGroceryStore(
  ingredients: string[],
  createdBy: string
): Promise<number> {
  let addedCount = 0
  try {
    const { useGroceryStore } = await import('@/stores/grocery-store')
    const groceryStore = useGroceryStore.getState()
    const existingNames = groceryStore.items.map((i: GroceryItem) => i.name.toLowerCase())

    for (const ingredient of ingredients) {
      if (!existingNames.includes(ingredient.toLowerCase())) {
        groceryStore.addItem({
          id: `grocery-meal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          family_id: 'demo-family-001',
          name: ingredient,
          category: 'food',
          quantity: 1,
          checked: false,
          added_by: createdBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        existingNames.push(ingredient.toLowerCase())
        addedCount++
      }
    }
  } catch {
    // grocery store not available
  }
  return addedCount
}

export const useMealStore = create<MealPlanStore>((set, get) => ({
  meals: [],
  isLoading: false,
  selectedWeekStart: getMonday(new Date()),

  setMeals: (meals) => set({ meals }),

  addMeal: (meal) => set((s) => ({ meals: [...s.meals, meal] })),

  updateMeal: (id, updates) =>
    set((s) => ({
      meals: s.meals.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),

  removeMeal: (id) =>
    set((s) => ({
      meals: s.meals.filter((m) => m.id !== id),
    })),

  getMealsForDate: (date) => {
    return get().meals.filter((m) => m.date === date)
  },

  getMealsForWeek: (weekStart) => {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    const endStr = end.toISOString().split('T')[0]
    return get().meals.filter((m) => m.date >= weekStart && m.date < endStr)
  },

  setSelectedWeek: (weekStart) => set({ selectedWeekStart: weekStart }),

  addIngredientsToGrocery: async (mealId) => {
    const meal = get().meals.find((m) => m.id === mealId)
    if (!meal || meal.ingredients.length === 0) return 0
    return addIngredientsToGroceryStore(meal.ingredients, meal.createdBy)
  },

  addAllIngredientsToGrocery: async () => {
    const weekMeals = get().getMealsForWeek(get().selectedWeekStart)
    let addedCount = 0

    for (const meal of weekMeals) {
      const count = await addIngredientsToGroceryStore(meal.ingredients, meal.createdBy)
      addedCount += count
    }
    return addedCount
  },
}))
