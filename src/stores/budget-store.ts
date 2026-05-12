'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

export type ExpenseCategory = 'food' | 'housing' | 'transport' | 'education' | 'health' | 'entertainment' | 'shopping' | 'utilities' | 'other'

export interface Expense {
  id: string
  title: string
  amount: number
  currency: string
  category: ExpenseCategory
  date: string
  paidBy: string
  paidByName: string
  familyId: string
  notes?: string
  createdAt: string
}

export interface BudgetMonth {
  month: string // '2025-01'
  totalBudget: number
  categories: Record<ExpenseCategory, number>
}

interface BudgetStore {
  expenses: Expense[]
  budgetMonth: BudgetMonth | null
  isLoading: boolean
  supabaseAvailable: boolean
  setExpenses: (expenses: Expense[]) => void
  addExpense: (expense: Expense) => void
  removeExpense: (id: string) => void
  setBudgetMonth: (budget: BudgetMonth) => void
  getTotalSpent: () => number
  getSpentByCategory: () => Record<ExpenseCategory, number>
  getRemainingBudget: () => number
  getCategoryRemaining: (cat: ExpenseCategory) => number
  // Supabase-backed operations
  fetchFromSupabase: (familyId: string, userId: string) => Promise<void>
  addExpenseToSupabase: (expense: Expense, userId: string) => Promise<void>
  removeExpenseFromSupabase: (id: string) => Promise<void>
  saveBudgetMonthToSupabase: (budget: BudgetMonth, familyId: string, userId: string) => Promise<void>
}

/** Check if a Supabase error indicates the table doesn't exist (PGRST205) */
function isTableNotFoundError(error: { code?: string; message?: string }): boolean {
  return error.code === 'PGRST205' || (error.message?.includes('PGRST205') ?? false)
}

export const useBudgetStore = create<BudgetStore>((set, get) => ({
  expenses: [],
  budgetMonth: null,
  isLoading: false,
  supabaseAvailable: true,

  setExpenses: (expenses) => set({ expenses }),

  addExpense: (expense) => set((state) => ({ expenses: [...state.expenses, expense] })),

  removeExpense: (id) => set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) })),

  setBudgetMonth: (budget) => set({ budgetMonth: budget }),

  getTotalSpent: () => {
    const { expenses } = get()
    return expenses.reduce((sum, e) => sum + e.amount, 0)
  },

  getSpentByCategory: () => {
    const { expenses } = get()
    const result: Record<ExpenseCategory, number> = {
      food: 0,
      housing: 0,
      transport: 0,
      education: 0,
      health: 0,
      entertainment: 0,
      shopping: 0,
      utilities: 0,
      other: 0,
    }
    expenses.forEach((e) => {
      result[e.category] += e.amount
    })
    return result
  },

  getRemainingBudget: () => {
    const { budgetMonth } = get()
    if (!budgetMonth) return 0
    return budgetMonth.totalBudget - get().getTotalSpent()
  },

  getCategoryRemaining: (cat: ExpenseCategory) => {
    const { budgetMonth } = get()
    if (!budgetMonth) return 0
    const spent = get().getSpentByCategory()
    return (budgetMonth.categories[cat] ?? 0) - (spent[cat] ?? 0)
  },

  // ─── Supabase-backed CRUD ──────────────────────────────────────────

  fetchFromSupabase: async (familyId: string, userId: string) => {
    set({ isLoading: true })
    try {
      const supabase = createClient()

      // Fetch budget month for this family
      const { data: budgetData, error: budgetError } = await supabase
        .from('budget_months')
        .select('*')
        .eq('family_id', familyId)
        .order('month', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (budgetError) {
        if (isTableNotFoundError(budgetError)) {
          console.warn('[BudgetStore] budget_months table does not exist yet — falling back to local-only mode')
          set({ supabaseAvailable: false, isLoading: false })
          return
        }
        throw budgetError
      }

      if (budgetData) {
        const categories = (budgetData.categories ?? {}) as Record<string, number>
        const budgetMonth: BudgetMonth = {
          month: budgetData.month,
          totalBudget: Number(budgetData.total_budget),
          categories: {
            food: Number(categories.food ?? 0),
            housing: Number(categories.housing ?? 0),
            transport: Number(categories.transport ?? 0),
            education: Number(categories.education ?? 0),
            health: Number(categories.health ?? 0),
            entertainment: Number(categories.entertainment ?? 0),
            shopping: Number(categories.shopping ?? 0),
            utilities: Number(categories.utilities ?? 0),
            other: Number(categories.other ?? 0),
          },
        }
        set({ budgetMonth })
      }

      // Fetch expenses for this family, joining profiles for paidByName
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('id, family_id, budget_month_id, title, amount, currency, category, expense_date, paid_by, notes, created_at, profiles!expenses_paid_by_fkey(first_name, last_name)')
        .eq('family_id', familyId)
        .order('expense_date', { ascending: false })

      if (expenseError) {
        if (isTableNotFoundError(expenseError)) {
          console.warn('[BudgetStore] expenses table does not exist yet — falling back to local-only mode')
          set({ supabaseAvailable: false, isLoading: false })
          return
        }
        throw expenseError
      }

      if (expenseData && expenseData.length > 0) {
        const expenses: Expense[] = expenseData.map((row: Record<string, unknown>) => {
          const profile = row.profiles as Record<string, string | null> | null
          const paidByName = profile
            ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Unknown'
            : 'Unknown'

          return {
            id: row.id as string,
            title: row.title as string,
            amount: Number(row.amount),
            currency: (row.currency as string) || 'SAR',
            category: row.category as ExpenseCategory,
            date: row.expense_date as string,
            paidBy: row.paid_by as string,
            paidByName,
            familyId: row.family_id as string,
            notes: (row.notes as string) || undefined,
            createdAt: row.created_at as string,
          }
        })
        set({ expenses })
      } else {
        set({ expenses: [] })
      }

      set({ supabaseAvailable: true })
    } catch (err) {
      console.warn('[BudgetStore] fetchFromSupabase failed, using local-only mode:', err)
      set({ supabaseAvailable: false })
    } finally {
      set({ isLoading: false })
    }
  },

  addExpenseToSupabase: async (expense: Expense, userId: string) => {
    // Always update local state immediately for responsive UI
    get().addExpense(expense)

    if (!get().supabaseAvailable) return

    try {
      const supabase = createClient()
      // Look up budget_month_id for the expense's family + month
      let budgetMonthId: string | null = null
      const month = expense.date.substring(0, 7) // 'YYYY-MM'
      const { data: bmData } = await supabase
        .from('budget_months')
        .select('id')
        .eq('family_id', expense.familyId)
        .eq('month', month)
        .maybeSingle()

      if (bmData) {
        budgetMonthId = bmData.id as string
      }

      const { error } = await supabase.from('expenses').insert({
        id: expense.id,
        family_id: expense.familyId,
        budget_month_id: budgetMonthId,
        title: expense.title,
        amount: expense.amount,
        currency: expense.currency,
        category: expense.category,
        expense_date: expense.date,
        paid_by: expense.paidBy,
        notes: expense.notes || null,
      })

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('[BudgetStore] expenses table does not exist — local-only mode')
          set({ supabaseAvailable: false })
          return
        }
        throw error
      }
    } catch (err) {
      console.warn('[BudgetStore] addExpenseToSupabase failed:', err)
    }
  },

  removeExpenseFromSupabase: async (id: string) => {
    // Always update local state immediately for responsive UI
    get().removeExpense(id)

    if (!get().supabaseAvailable) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('expenses').delete().eq('id', id)

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('[BudgetStore] expenses table does not exist — local-only mode')
          set({ supabaseAvailable: false })
          return
        }
        throw error
      }
    } catch (err) {
      console.warn('[BudgetStore] removeExpenseFromSupabase failed:', err)
    }
  },

  saveBudgetMonthToSupabase: async (budget: BudgetMonth, familyId: string, userId: string) => {
    // Always update local state immediately for responsive UI
    get().setBudgetMonth(budget)

    if (!get().supabaseAvailable) return

    try {
      const supabase = createClient()

      // Use upsert on the (family_id, month) unique constraint
      const { error } = await supabase.from('budget_months').upsert(
        {
          family_id: familyId,
          month: budget.month,
          total_budget: budget.totalBudget,
          categories: budget.categories as unknown as Record<string, unknown>,
          created_by: userId,
        },
        { onConflict: 'family_id,month' }
      )

      if (error) {
        if (isTableNotFoundError(error)) {
          console.warn('[BudgetStore] budget_months table does not exist — local-only mode')
          set({ supabaseAvailable: false })
          return
        }
        throw error
      }
    } catch (err) {
      console.warn('[BudgetStore] saveBudgetMonthToSupabase failed:', err)
    }
  },
}))
