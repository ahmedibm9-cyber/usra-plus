'use client'

import { create } from 'zustand'

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
  setExpenses: (expenses: Expense[]) => void
  addExpense: (expense: Expense) => void
  removeExpense: (id: string) => void
  setBudgetMonth: (budget: BudgetMonth) => void
  getTotalSpent: () => number
  getSpentByCategory: () => Record<ExpenseCategory, number>
  getRemainingBudget: () => number
  getCategoryRemaining: (cat: ExpenseCategory) => number
}

export const useBudgetStore = create<BudgetStore>((set, get) => ({
  expenses: [],
  budgetMonth: null,
  isLoading: false,

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
    return budgetMonth.categories[cat] - spent[cat]
  },
}))
