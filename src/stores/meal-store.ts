'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
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
  supabaseAvailable: boolean
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
  // Supabase-backed operations
  fetchFromSupabase: (familyId: string, userId: string) => Promise<void>
  addMealToSupabase: (meal: Meal, familyId: string, userId: string) => Promise<void>
  updateMealInSupabase: (id: string, updates: Partial<Meal>, familyId: string) => Promise<void>
  removeMealFromSupabase: (id: string) => Promise<void>
}

/** Check if a Supabase error indicates the table doesn't exist (PGRST205) */
function isTableNotFoundError(error: { code?: string; message?: string }): boolean {
  return error.code === 'PGRST205' || (error.message?.includes('PGRST205') ?? false)
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
    const { useAppStore } = await import('@/stores/app-store')
    const groceryStore = useGroceryStore.getState()
    const currentFamilyId = useAppStore.getState().currentFamily?.id || 'demo-family-001'
    const existingNames = groceryStore.items.map((i: GroceryItem) => i.name.toLowerCase())

    for (const ingredient of ingredients) {
      if (!existingNames.includes(ingredient.toLowerCase())) {
        groceryStore.addItem({
          id: `grocery-meal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          family_id: currentFamilyId,
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
  supabaseAvailable: true,
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

  // ─── Supabase-backed CRUD ──────────────────────────────────────────

  fetchFromSupabase: async (familyId: string, _userId: string) => {
    set({ isLoading: true })
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('family_id', familyId)
        .order('meal_date', { ascending: true })

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('[MealStore] meal_plans table does not exist yet — falling back to local-only mode')
          set({ supabaseAvailable: false, isLoading: false })
          return
        }
        throw error
      }

      if (data && data.length > 0) {
        const meals: Meal[] = (data as Record<string, unknown>[]).map((row) => ({
          id: row.id as string,
          title: row.title as string,
          description: (row.description as string) || undefined,
          mealType: (row.meal_type as MealType) || 'lunch',
          date: row.meal_date as string,
          assignedTo: (row.assigned_to as string[]) || [],
          ingredients: (row.ingredients as string[]) || [],
          recipeUrl: (row.recipe_url as string) || undefined,
          prepTime: (row.prep_time as number) || undefined,
          calories: (row.calories as number) || undefined,
          createdBy: row.created_by as string,
          createdAt: row.created_at as string,
        }))
        set({ meals })
      } else {
        set({ meals: [] })
      }

      set({ supabaseAvailable: true })
    } catch (err) {
      console.warn('[MealStore] fetchFromSupabase failed, using local-only mode:', err)
      set({ supabaseAvailable: false })
    } finally {
      set({ isLoading: false })
    }
  },

  addMealToSupabase: async (meal: Meal, familyId: string, _userId: string) => {
    // Always update local state immediately for responsive UI
    get().addMeal(meal)

    if (!get().supabaseAvailable) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('meal_plans').insert({
        id: meal.id,
        family_id: familyId,
        title: meal.title,
        description: meal.description || null,
        meal_type: meal.mealType,
        meal_date: meal.date,
        assigned_to: meal.assignedTo,
        ingredients: meal.ingredients,
        recipe_url: meal.recipeUrl || null,
        prep_time: meal.prepTime || null,
        calories: meal.calories || null,
        created_by: _userId,
      })

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('[MealStore] meal_plans table does not exist — local-only mode')
          set({ supabaseAvailable: false })
          return
        }
        throw error
      }
    } catch (err) {
      console.warn('[MealStore] addMealToSupabase failed:', err)
    }
  },

  updateMealInSupabase: async (id: string, updates: Partial<Meal>, _familyId: string) => {
    // Always update local state immediately for responsive UI
    get().updateMeal(id, updates)

    if (!get().supabaseAvailable) return

    try {
      const supabase = createClient()
      // Map store field names to DB column names
      const dbUpdates: Record<string, unknown> = {}
      if (updates.title !== undefined) dbUpdates.title = updates.title
      if (updates.description !== undefined) dbUpdates.description = updates.description || null
      if (updates.mealType !== undefined) dbUpdates.meal_type = updates.mealType
      if (updates.date !== undefined) dbUpdates.meal_date = updates.date
      if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo
      if (updates.ingredients !== undefined) dbUpdates.ingredients = updates.ingredients
      if (updates.recipeUrl !== undefined) dbUpdates.recipe_url = updates.recipeUrl || null
      if (updates.prepTime !== undefined) dbUpdates.prep_time = updates.prepTime
      if (updates.calories !== undefined) dbUpdates.calories = updates.calories

      const { error } = await supabase.from('meal_plans').update(dbUpdates).eq('id', id)

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('[MealStore] meal_plans table does not exist — local-only mode')
          set({ supabaseAvailable: false })
          return
        }
        throw error
      }
    } catch (err) {
      console.warn('[MealStore] updateMealInSupabase failed:', err)
    }
  },

  removeMealFromSupabase: async (id: string) => {
    // Always update local state immediately for responsive UI
    get().removeMeal(id)

    if (!get().supabaseAvailable) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('meal_plans').delete().eq('id', id)

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('[MealStore] meal_plans table does not exist — local-only mode')
          set({ supabaseAvailable: false })
          return
        }
        throw error
      }
    } catch (err) {
      console.warn('[MealStore] removeMealFromSupabase failed:', err)
    }
  },
}))
