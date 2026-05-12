'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet,
  Plus,
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  Home,
  Car,
  GraduationCap,
  HeartPulse,
  Gamepad2,
  ShoppingBag,
  Zap,
  MoreHorizontal,
  Search,
  Trash2,
  CalendarDays,
  ArrowUpDown,
  Edit3,
  TrendingDown,
  TrendingUp,
  Coins,
  Receipt,
  HandCoins,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { useBudgetStore, type ExpenseCategory, type Expense, type BudgetMonth } from '@/stores/budget-store'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'

// ─── Category config ──────────────────────────────────────────────
const CATEGORIES: { key: ExpenseCategory; icon: React.ElementType; color: string; bg: string }[] = [
  { key: 'food', icon: UtensilsCrossed, color: 'text-orange-400', bg: 'bg-orange-500/15' },
  { key: 'housing', icon: Home, color: 'text-[#E50914]', bg: 'bg-[#E50914]/15' },
  { key: 'transport', icon: Car, color: 'text-[#E50914]', bg: 'bg-[#E50914]/15' },
  { key: 'education', icon: GraduationCap, color: 'text-[#E50914]', bg: 'bg-[#E50914]/15' },
  { key: 'health', icon: HeartPulse, color: 'text-red-400', bg: 'bg-red-500/15' },
  { key: 'entertainment', icon: Gamepad2, color: 'text-pink-400', bg: 'bg-pink-500/15' },
  { key: 'shopping', icon: ShoppingBag, color: 'text-amber-400', bg: 'bg-amber-500/15' },
  { key: 'utilities', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
  { key: 'other', icon: MoreHorizontal, color: 'text-[--text-muted]', bg: 'bg-gray-500/15' },
]

function getCategoryConfig(key: ExpenseCategory) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1]
}

// ─── Progress Ring ─────────────────────────────────────────────────
function ProgressRing({ percent, size = 120, strokeWidth = 10 }: { percent: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const clampedPercent = Math.min(100, Math.max(0, percent))
  const offset = circumference - (clampedPercent / 100) * circumference

  const getColor = (p: number) => {
    if (p >= 90) return '#EF4444'
    if (p >= 70) return '#F59E0B'
    return 'var(--accent-primary)'
  }

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border-subtle)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={getColor(clampedPercent)}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  )
}

// ─── Main Component ───────────────────────────────────────────────
export default function BudgetPage() {
  // Selector-based subscriptions to avoid unnecessary re-renders
  const expenses = useBudgetStore((s) => s.expenses)
  const budgetMonth = useBudgetStore((s) => s.budgetMonth)
  const isLoading = useBudgetStore((s) => s.isLoading)
  const fetchFromSupabase = useBudgetStore((s) => s.fetchFromSupabase)
  const addExpenseToSupabase = useBudgetStore((s) => s.addExpenseToSupabase)
  const removeExpenseFromSupabase = useBudgetStore((s) => s.removeExpenseFromSupabase)
  const saveBudgetMonthToSupabase = useBudgetStore((s) => s.saveBudgetMonthToSupabase)
  const getTotalSpent = useBudgetStore((s) => s.getTotalSpent)
  const getSpentByCategory = useBudgetStore((s) => s.getSpentByCategory)
  const getRemainingBudget = useBudgetStore((s) => s.getRemainingBudget)
  const familyMembers = useAppStore((s) => s.familyMembers)
  const currentFamily = useAppStore((s) => s.currentFamily)
  const user = useAuthStore((s) => s.user)
  const { t, isRTL } = useI18n()

  // Fetch data from Supabase on mount and when family changes
  const hasFetchedRef = useRef(false)
  useEffect(() => {
    if (!currentFamily?.id || !user?.id) return
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true

    fetchFromSupabase(currentFamily.id, user.id).catch((err) => {
      console.warn('[BudgetPage] Initial fetch failed:', err)
    })
  }, [currentFamily?.id, user?.id, fetchFromSupabase])

  // Re-fetch when family changes
  const prevFamilyRef = useRef(currentFamily?.id)
  useEffect(() => {
    if (!currentFamily?.id || !user?.id) return
    if (prevFamilyRef.current === currentFamily.id) return
    prevFamilyRef.current = currentFamily.id

    fetchFromSupabase(currentFamily.id, user.id).catch((err) => {
      console.warn('[BudgetPage] Re-fetch on family change failed:', err)
    })
  }, [currentFamily?.id, user?.id, fetchFromSupabase])

  // Month navigation
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'all'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')

  // Dialog states
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showSetBudget, setShowSetBudget] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Add expense form
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    category: 'food' as ExpenseCategory,
    date: new Date().toISOString().split('T')[0],
    paidBy: user?.id || '',
    notes: '',
  })

  // Set budget form
  const [budgetForm, setBudgetForm] = useState({
    totalBudget: '',
    food: '',
    housing: '',
    transport: '',
    education: '',
    health: '',
    entertainment: '',
    shopping: '',
    utilities: '',
    other: '',
  })

  // ─── Computed values ─────────────────────────────────────────────
  const totalSpent = getTotalSpent()
  const spentByCategory = getSpentByCategory()
  const remaining = getRemainingBudget()
  const spentPercent = budgetMonth ? Math.round((totalSpent / budgetMonth.totalBudget) * 100) : 0

  const navigateMonth = useCallback((dir: number) => {
    setCurrentMonth((prev) => {
      const [y, m] = prev.split('-').map(Number)
      const d = new Date(y, m - 1 + dir, 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
  }, [])

  const monthLabel = useMemo(() => {
    const [y, m] = currentMonth.split('-').map(Number)
    const d = new Date(y, m - 1, 1)
    return d.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })
  }, [currentMonth, isRTL])

  // Filtered & sorted expenses
  const filteredExpenses = useMemo(() => {
    let result = [...expenses]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.paidByName.toLowerCase().includes(q) ||
          e.notes?.toLowerCase().includes(q)
      )
    }

    if (filterCategory !== 'all') {
      result = result.filter((e) => e.category === filterCategory)
    }

    result.sort((a, b) => {
      if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime()
      return b.amount - a.amount
    })

    return result
  }, [expenses, searchQuery, filterCategory, sortBy])

  // ─── Handlers ────────────────────────────────────────────────────
  const handleAddExpense = useCallback(async () => {
    if (!expenseForm.title.trim() || !expenseForm.amount) return

    const paidByMember = familyMembers.find((m) => m.user_id === expenseForm.paidBy)
    const paidByName = paidByMember?.profiles?.first_name || paidByMember?.nickname || user?.first_name || 'You'
    const familyId = currentFamily?.id || 'demo-family-001'

    // Generate a UUID-like ID for Supabase compatibility
    const expenseId = crypto.randomUUID ? crypto.randomUUID() : `expense-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

    const newExpense: Expense = {
      id: expenseId,
      title: expenseForm.title.trim(),
      amount: parseFloat(expenseForm.amount),
      currency: 'SAR',
      category: expenseForm.category,
      date: expenseForm.date,
      paidBy: expenseForm.paidBy,
      paidByName,
      familyId,
      notes: expenseForm.notes || undefined,
      createdAt: new Date().toISOString(),
    }

    await addExpenseToSupabase(newExpense, user?.id || '')
    setShowAddExpense(false)
    setExpenseForm({
      title: '',
      amount: '',
      category: 'food',
      date: new Date().toISOString().split('T')[0],
      paidBy: user?.id || '',
      notes: '',
    })
  }, [expenseForm, familyMembers, user, currentFamily?.id, addExpenseToSupabase])

  const handleSetBudget = useCallback(async () => {
    const total = parseFloat(budgetForm.totalBudget)
    if (!total || total <= 0) return

    const budget: BudgetMonth = {
      month: currentMonth,
      totalBudget: total,
      categories: {
        food: parseFloat(budgetForm.food) || 0,
        housing: parseFloat(budgetForm.housing) || 0,
        transport: parseFloat(budgetForm.transport) || 0,
        education: parseFloat(budgetForm.education) || 0,
        health: parseFloat(budgetForm.health) || 0,
        entertainment: parseFloat(budgetForm.entertainment) || 0,
        shopping: parseFloat(budgetForm.shopping) || 0,
        utilities: parseFloat(budgetForm.utilities) || 0,
        other: parseFloat(budgetForm.other) || 0,
      },
    }

    const familyId = currentFamily?.id || 'demo-family-001'
    await saveBudgetMonthToSupabase(budget, familyId, user?.id || '')
    setShowSetBudget(false)
  }, [budgetForm, currentMonth, currentFamily?.id, user?.id, saveBudgetMonthToSupabase])

  const handleAutoDistribute = useCallback(() => {
    const total = parseFloat(budgetForm.totalBudget) || 0
    if (total <= 0) return

    const perCategory = Math.round((total / 9) * 100) / 100
    setBudgetForm((prev) => ({
      ...prev,
      food: String(perCategory),
      housing: String(perCategory),
      transport: String(perCategory),
      education: String(perCategory),
      health: String(perCategory),
      entertainment: String(perCategory),
      shopping: String(perCategory),
      utilities: String(perCategory),
      other: String(perCategory),
    }))
  }, [budgetForm.totalBudget])

  const handleDeleteExpense = useCallback(
    async (id: string) => {
      await removeExpenseFromSupabase(id)
      setDeleteConfirmId(null)
    },
    [removeExpenseFromSupabase]
  )

  // Open set budget dialog with current values
  const openSetBudget = useCallback(() => {
    if (budgetMonth) {
      setBudgetForm({
        totalBudget: String(budgetMonth.totalBudget),
        food: String(budgetMonth.categories.food),
        housing: String(budgetMonth.categories.housing),
        transport: String(budgetMonth.categories.transport),
        education: String(budgetMonth.categories.education),
        health: String(budgetMonth.categories.health),
        entertainment: String(budgetMonth.categories.entertainment),
        shopping: String(budgetMonth.categories.shopping),
        utilities: String(budgetMonth.categories.utilities),
        other: String(budgetMonth.categories.other),
      })
    } else {
      setBudgetForm({
        totalBudget: '',
        food: '',
        housing: '',
        transport: '',
        education: '',
        health: '',
        entertainment: '',
        shopping: '',
        utilities: '',
        other: '',
      })
    }
    setShowSetBudget(true)
  }, [budgetMonth])

  const dir = isRTL ? 'rtl' : 'ltr'

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6" dir={dir}>
      {/* ─── Header ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold font-display text-[--text-primary] flex items-center gap-2">
            <Wallet className="size-6 text-[#E50914]" />
            {t.budget.title}
          </h1>
          {/* Month selector */}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-1.5 rounded-lg hover:bg-[--bg-surface-2] text-[--text-muted] hover:text-[--text-secondary] transition-colors"
            >
              {isRTL ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </button>
            <span className="text-sm font-medium text-[--text-secondary] min-w-[140px] text-center">
              {monthLabel}
            </span>
            <button
              onClick={() => navigateMonth(1)}
              className="p-1.5 rounded-lg hover:bg-[--bg-surface-2] text-[--text-muted] hover:text-[--text-secondary] transition-colors"
            >
              {isRTL ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {budgetMonth && (
            <Button
              variant="outline"
              size="sm"
              onClick={openSetBudget}
              className="border-[--border-subtle] bg-[--bg-surface] text-[--text-secondary] hover:bg-[--bg-surface-2] hover:text-[--text-primary] btn-press"
            >
              <Edit3 className="size-3.5 mr-1.5" />
              {t.budget.editBudget}
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => {
              if (!budgetMonth) {
                openSetBudget()
              } else {
                setShowAddExpense(true)
              }
            }}
            className="bg-[#E50914] hover:bg-[#C40812] text-white btn-press"
          >
            <Plus className="size-3.5 mr-1.5" />
            {budgetMonth ? t.budget.addExpense : t.budget.setBudget}
          </Button>
        </div>
      </motion.div>

      {/* ─── No Budget State ──────────────────────────────────── */}
      {!budgetMonth && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-[--bg-surface-2] flex items-center justify-center mb-4">
            <Wallet className="size-10 text-[--text-muted]" />
          </div>
          <h3 className="text-lg font-semibold font-display text-[--text-primary] mb-2">{t.budget.noBudget}</h3>
          <Button
            onClick={openSetBudget}
            className="bg-[#E50914] hover:bg-[#C40812] text-white btn-press mt-2"
          >
            <Coins className="size-4 mr-2" />
            {t.budget.setBudget}
          </Button>
        </motion.div>
      )}

      {/* ─── Budget Content ──────────────────────────────────── */}
      {budgetMonth && (
        <>
          {/* ─── Summary Section with Progress Ring ─────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border border-[--border-subtle] bg-[--bg-surface] p-6 shadow-2xl"
          >
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Progress Ring */}
              <div className="relative flex-shrink-0">
                <ProgressRing percent={spentPercent} size={130} strokeWidth={12} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold font-display text-[--text-primary]">{spentPercent}%</span>
                  <span className="text-[10px] text-[--text-muted]">{t.budget.ofBudget}</span>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                <div className="rounded-2xl bg-[--bg-surface-2] p-4 text-center card-hover">
                  <Coins className="size-5 text-[#E50914] mx-auto mb-2" />
                  <p className="text-xs text-[--text-muted] mb-1">{t.budget.totalBudget}</p>
                  <p className="text-lg font-bold font-metric text-[--text-primary]">
                    {budgetMonth.totalBudget.toLocaleString()}
                    <span className="text-xs text-[--text-muted] ml-1">{t.budget.currency}</span>
                  </p>
                </div>
                <div className="rounded-2xl bg-[--bg-surface-2] p-4 text-center card-hover">
                  <TrendingDown className="size-5 text-orange-400 mx-auto mb-2" />
                  <p className="text-xs text-[--text-muted] mb-1">{t.budget.totalSpent}</p>
                  <p className="text-lg font-bold font-metric text-[--text-primary]">
                    {totalSpent.toLocaleString()}
                    <span className="text-xs text-[--text-muted] ml-1">{t.budget.currency}</span>
                  </p>
                  <p className="text-[10px] text-orange-400 mt-0.5">{spentPercent}% {t.budget.ofBudget}</p>
                </div>
                <div className="rounded-2xl bg-[--bg-surface-2] p-4 text-center card-hover">
                  {remaining >= 0 ? (
                    <TrendingUp className="size-5 text-green-400 mx-auto mb-2" />
                  ) : (
                    <TrendingDown className="size-5 text-red-400 mx-auto mb-2" />
                  )}
                  <p className="text-xs text-[--text-muted] mb-1">{t.budget.remaining}</p>
                  <p className={`text-lg font-bold ${remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {Math.abs(remaining).toLocaleString()}
                    <span className="text-xs text-[--text-muted] ml-1">{t.budget.currency}</span>
                  </p>
                  {remaining < 0 && <p className="text-[10px] text-red-400 mt-0.5">{t.budget.overBudget}</p>}
                </div>
                <div className="rounded-2xl bg-[--bg-surface-2] p-4 text-center card-hover">
                  <Receipt className="size-5 text-[#E50914] mx-auto mb-2" />
                  <p className="text-xs text-[--text-muted] mb-1">{t.budget.transactions}</p>
                  <p className="text-lg font-bold font-metric text-[--text-primary]">{expenses.length}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ─── Spent by Category ────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold font-display text-[--text-primary] mb-3">{t.budget.spentByCategory}</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {CATEGORIES.map((cat) => {
                const spent = spentByCategory[cat.key]
                const budget = budgetMonth.categories[cat.key]
                const percent = budget > 0 ? Math.round((spent / budget) * 100) : 0
                const catRemaining = budget - spent
                const Icon = cat.icon

                return (
                  <motion.div
                    key={cat.key}
                    whileHover={{ y: -2 }}
                    className="min-w-[160px] flex-shrink-0 rounded-2xl border border-[--border-subtle] bg-[--bg-surface] p-4 card-hover"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-8 h-8 rounded-lg ${cat.bg} flex items-center justify-center`}>
                        <Icon className={`size-4 ${cat.color}`} />
                      </div>
                      <span className="text-sm font-medium text-[--text-primary] truncate">
                        {t.budget[cat.key as keyof typeof t.budget]}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-[--text-muted]">{spent.toLocaleString()} / {budget.toLocaleString()}</span>
                        <span className={`${percent >= 100 ? 'text-red-400' : percent >= 80 ? 'text-orange-400' : 'text-green-400'}`}>
                          {percent}%
                        </span>
                      </div>
                      <Progress
                        value={Math.min(100, percent)}
                        className="h-1.5"
                      />
                      <div className="flex justify-between text-[10px]">
                        <span className={catRemaining >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {catRemaining >= 0 ? '' : '-'}{Math.abs(catRemaining).toLocaleString()} {t.budget.currency}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* ─── Recent Expenses ──────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-semibold font-display text-[--text-primary]">{t.budget.recentExpenses}</h2>
              <div className="flex items-center gap-2">
                {/* Sort */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'date' | 'amount')}>
                  <SelectTrigger className="w-[130px] h-8 text-xs bg-[--bg-surface] border-[--border-subtle] text-[--text-secondary]">
                    <ArrowUpDown className="size-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[--bg-surface] border-[--border-subtle]">
                    <SelectItem value="date" className="text-[--text-secondary]">{t.budget.dateSort}</SelectItem>
                    <SelectItem value="amount" className="text-[--text-secondary]">{t.budget.amountSort}</SelectItem>
                  </SelectContent>
                </Select>

                {/* Category Filter */}
                <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as ExpenseCategory | 'all')}>
                  <SelectTrigger className="w-[130px] h-8 text-xs bg-[--bg-surface] border-[--border-subtle] text-[--text-secondary]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[--bg-surface] border-[--border-subtle]">
                    <SelectItem value="all" className="text-[--text-secondary]">
                      {isRTL ? 'كل الفئات' : 'All Categories'}
                    </SelectItem>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.key} value={cat.key} className="text-[--text-secondary]">
                        {t.budget[cat.key as keyof typeof t.budget]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className={`absolute top-1/2 -translate-y-1/2 size-4 text-[--text-muted] ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.budget.searchExpenses}
                className={`h-9 bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] text-sm ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
              />
            </div>

            {/* Expense List */}
            {filteredExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[--bg-surface-2] flex items-center justify-center mb-3">
                  <HandCoins className="size-8 text-[--text-muted]" />
                </div>
                <p className="text-sm text-[--text-muted] max-w-xs">{t.budget.noExpenses}</p>
                <Button
                  onClick={() => setShowAddExpense(true)}
                  size="sm"
                  className="mt-3 bg-[#E50914] hover:bg-[#C40812] text-white btn-press"
                >
                  <Plus className="size-3.5 mr-1.5" />
                  {t.budget.addExpense}
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
                <AnimatePresence mode="popLayout">
                  {filteredExpenses.map((expense, i) => {
                    const catConfig = getCategoryConfig(expense.category)
                    const CatIcon = catConfig.icon
                    const initials = expense.paidByName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)

                    return (
                      <motion.div
                        key={expense.id}
                        layout
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        className="group flex items-center gap-3 rounded-2xl border border-[--border-subtle] bg-[--bg-surface] p-3 card-hover"
                      >
                        {/* Category Icon */}
                        <div className={`w-10 h-10 rounded-xl ${catConfig.bg} flex items-center justify-center shrink-0`}>
                          <CatIcon className={`size-5 ${catConfig.color}`} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[--text-primary] truncate">
                              {expense.title}
                            </span>
                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${catConfig.bg} ${catConfig.color} border-0`}>
                              {t.budget[expense.category as keyof typeof t.budget]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Avatar className="size-4">
                              <AvatarFallback className="text-[8px] bg-[#E50914]/20 text-[#E50914]">
                                {initials}
                              </AvatarFallback>
                              <AvatarImage src={undefined} />
                            </Avatar>
                            <span className="text-xs text-[--text-muted]">{expense.paidByName}</span>
                            <span className="text-xs text-[--text-muted]">·</span>
                            <span className="text-xs text-[--text-muted]">
                              {new Date(expense.date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            {expense.notes && (
                              <>
                                <span className="text-xs text-[--text-muted]">·</span>
                                <span className="text-xs text-[--text-muted] truncate max-w-[100px]">{expense.notes}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Amount & Delete */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold font-metric text-[--text-primary]">
                            {expense.amount.toLocaleString()}
                            <span className="text-[10px] text-[--text-muted] ml-0.5">{t.budget.currency}</span>
                          </span>
                          <button
                            onClick={() => setDeleteConfirmId(expense.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-[--text-muted] hover:text-red-400 transition-all"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* ─── Add Expense Dialog ──────────────────────────────── */}
      <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
        <DialogContent className="bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] max-w-md max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[--text-primary]">{t.budget.addExpense}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-[--text-secondary] text-sm">{t.budget.expenseTitle}</Label>
              <Input
                value={expenseForm.title}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder={isRTL ? 'أدخل عنوان المصروف' : 'Enter expense title'}
                className="bg-[--bg-surface-2] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted]"
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-[--text-secondary] text-sm">{t.budget.amount}</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="0"
                  className={`bg-[--bg-surface-2] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] ${isRTL ? 'pl-14' : 'pr-14'}`}
                />
                <span className={`absolute top-1/2 -translate-y-1/2 text-xs text-[--text-muted] ${isRTL ? 'left-3' : 'right-3'}`}>
                  {t.budget.currency}
                </span>
              </div>
            </div>

            {/* Category Grid */}
            <div className="space-y-1.5">
              <Label className="text-[--text-secondary] text-sm">{t.budget.category}</Label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon
                  const isSelected = expenseForm.category === cat.key
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setExpenseForm((prev) => ({ ...prev, category: cat.key }))}
                      className={`
                        flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs transition-all btn-press
                        ${isSelected
                          ? `border-2 border-[#E50914]/50 bg-[#E50914]/10 text-[--text-primary]`
                          : 'border border-[--border-subtle] bg-[--bg-surface-2] text-[--text-muted] hover:border-[--border-medium]'
                        }
                      `}
                    >
                      <Icon className={`size-4 ${isSelected ? 'text-[#E50914]' : cat.color}`} />
                      <span className="truncate">{t.budget[cat.key as keyof typeof t.budget]}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-[--text-secondary] text-sm">{t.budget.date}</Label>
              <Input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, date: e.target.value }))}
                className="bg-[--bg-surface-2] border-[--border-subtle] text-[--text-primary]"
              />
            </div>

            {/* Paid By */}
            <div className="space-y-1.5">
              <Label className="text-[--text-secondary] text-sm">{t.budget.paidBy}</Label>
              <Select value={expenseForm.paidBy} onValueChange={(v) => setExpenseForm((prev) => ({ ...prev, paidBy: v }))}>
                <SelectTrigger className="bg-[--bg-surface-2] border-[--border-subtle] text-[--text-primary]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[--bg-surface] border-[--border-subtle]">
                  {familyMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id} className="text-[--text-secondary]">
                      {member.profiles?.first_name || member.nickname || member.user_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-[--text-secondary] text-sm">{t.budget.notes} ({isRTL ? 'اختياري' : 'optional'})</Label>
              <Textarea
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder={isRTL ? 'أضف ملاحظات...' : 'Add notes...'}
                rows={2}
                className="bg-[--bg-surface-2] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddExpense(false)}
              className="border-[--border-subtle] bg-[--bg-surface] text-[--text-secondary] hover:bg-[--bg-surface-2] hover:text-[--text-primary]"
            >
              {t.budget.cancel}
            </Button>
            <Button
              onClick={handleAddExpense}
              disabled={!expenseForm.title.trim() || !expenseForm.amount}
              className="bg-[#E50914] hover:bg-[#C40812] text-white"
            >
              {t.budget.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Set Budget Dialog ───────────────────────────────── */}
      <Dialog open={showSetBudget} onOpenChange={setShowSetBudget}>
        <DialogContent className="bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] max-w-md max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[--text-primary]">{budgetMonth ? t.budget.editBudget : t.budget.setBudget}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Total Budget */}
            <div className="space-y-1.5">
              <Label className="text-[--text-secondary] text-sm">{t.budget.totalBudget} ({t.budget.currency})</Label>
              <Input
                type="number"
                value={budgetForm.totalBudget}
                onChange={(e) => setBudgetForm((prev) => ({ ...prev, totalBudget: e.target.value }))}
                placeholder="12000"
                className="bg-[--bg-surface-2] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted]"
              />
            </div>

            {/* Auto Distribute */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoDistribute}
              disabled={!budgetForm.totalBudget}
              className="w-full border-dashed border-[--border-medium] bg-[--bg-surface-2] text-[--text-secondary] hover:bg-[--bg-surface-2] hover:text-[--text-primary] btn-press"
            >
              <Zap className="size-3.5 mr-1.5" />
              {t.budget.autoDistribute}
            </Button>

            {/* Per-category budgets */}
            <div className="space-y-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                return (
                  <div key={cat.key} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${cat.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`size-4 ${cat.color}`} />
                    </div>
                    <span className="text-sm text-[--text-secondary] min-w-[80px]">
                      {t.budget[cat.key as keyof typeof t.budget]}
                    </span>
                    <Input
                      type="number"
                      value={budgetForm[cat.key]}
                      onChange={(e) => setBudgetForm((prev) => ({ ...prev, [cat.key]: e.target.value }))}
                      placeholder="0"
                      className="h-8 bg-[--bg-surface-2] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] text-sm"
                    />
                  </div>
                )
              })}
            </div>

            {/* Total allocated */}
            <div className="flex items-center justify-between text-xs text-[--text-muted] pt-1 border-t border-[--border-subtle]">
              <span>{isRTL ? 'المخصص' : 'Allocated'}</span>
              <span>
                {CATEGORIES.reduce((sum, cat) => sum + (parseFloat(budgetForm[cat.key]) || 0), 0).toLocaleString()} / {parseFloat(budgetForm.totalBudget || '0').toLocaleString()} {t.budget.currency}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSetBudget(false)}
              className="border-[--border-subtle] bg-[--bg-surface] text-[--text-secondary] hover:bg-[--bg-surface-2] hover:text-[--text-primary]"
            >
              {t.budget.cancel}
            </Button>
            <Button
              onClick={handleSetBudget}
              disabled={!budgetForm.totalBudget || parseFloat(budgetForm.totalBudget) <= 0}
              className="bg-[#E50914] hover:bg-[#C40812] text-white"
            >
              {t.budget.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ──────────────────────── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] max-w-sm rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[--text-primary]">{t.budget.delete}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[--text-muted]">
            {isRTL ? 'هل أنت متأكد من حذف هذا المصروف؟' : 'Are you sure you want to delete this expense?'}
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              className="border-[--border-subtle] bg-[--bg-surface] text-[--text-secondary]"
            >
              {t.budget.cancel}
            </Button>
            <Button
              onClick={() => deleteConfirmId && handleDeleteExpense(deleteConfirmId)}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {t.budget.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
