'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
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
  Avatar,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import { useBudgetStore, type ExpenseCategory, type Expense, type BudgetMonth } from '@/stores/budget-store'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'

const CATEGORIES: { key: ExpenseCategory; icon: React.ElementType; chipColor: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'default' }[] = [
  { key: 'food', icon: UtensilsCrossed, chipColor: 'warning' },
  { key: 'housing', icon: Home, chipColor: 'primary' },
  { key: 'transport', icon: Car, chipColor: 'primary' },
  { key: 'education', icon: GraduationCap, chipColor: 'primary' },
  { key: 'health', icon: HeartPulse, chipColor: 'error' },
  { key: 'entertainment', icon: Gamepad2, chipColor: 'secondary' },
  { key: 'shopping', icon: ShoppingBag, chipColor: 'success' },
  { key: 'utilities', icon: Zap, chipColor: 'info' },
  { key: 'other', icon: MoreHorizontal, chipColor: 'default' },
]

function getCategoryConfig(key: ExpenseCategory) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1]
}

export default function BudgetPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
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

  const hasFetchedRef = useRef(false)
  useEffect(() => {
    if (!currentFamily?.id || !user?.id) return
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    fetchFromSupabase(currentFamily.id, user.id).catch(() => {})
  }, [currentFamily?.id, user?.id, fetchFromSupabase])

  const prevFamilyRef = useRef(currentFamily?.id)
  useEffect(() => {
    if (!currentFamily?.id || !user?.id) return
    if (prevFamilyRef.current === currentFamily.id) return
    prevFamilyRef.current = currentFamily.id
    fetchFromSupabase(currentFamily.id, user.id).catch(() => {})
  }, [currentFamily?.id, user?.id, fetchFromSupabase])

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'all'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showSetBudget, setShowSetBudget] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [expenseForm, setExpenseForm] = useState({ title: '', amount: '', category: 'food' as ExpenseCategory, date: new Date().toISOString().split('T')[0], paidBy: user?.id || '', notes: '' })
  const [budgetForm, setBudgetForm] = useState({ totalBudget: '', food: '', housing: '', transport: '', education: '', health: '', entertainment: '', shopping: '', utilities: '', other: '' })

  const totalSpent = getTotalSpent()
  const spentByCategory = getSpentByCategory()
  const remaining = getRemainingBudget()
  const spentPercent = budgetMonth ? Math.round((totalSpent / budgetMonth.totalBudget) * 100) : 0

  const navigateMonth = useCallback((dir: number) => {
    setCurrentMonth((prev) => { const [y, m] = prev.split('-').map(Number); const d = new Date(y, m - 1 + dir, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })
  }, [])

  const monthLabel = useMemo(() => { const [y, m] = currentMonth.split('-').map(Number); const d = new Date(y, m - 1, 1); return d.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' }) }, [currentMonth, isRTL])

  const filteredExpenses = useMemo(() => {
    let result = [...expenses]
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); result = result.filter((e) => e.title.toLowerCase().includes(q) || e.paidByName.toLowerCase().includes(q) || e.notes?.toLowerCase().includes(q)) }
    if (filterCategory !== 'all') result = result.filter((e) => e.category === filterCategory)
    result.sort((a, b) => sortBy === 'date' ? new Date(b.date).getTime() - new Date(a.date).getTime() : b.amount - a.amount)
    return result
  }, [expenses, searchQuery, filterCategory, sortBy])

  const handleAddExpense = useCallback(async () => {
    if (!expenseForm.title.trim() || !expenseForm.amount) return
    const paidByMember = familyMembers.find((m) => m.user_id === expenseForm.paidBy)
    const paidByName = paidByMember?.profiles?.first_name || paidByMember?.nickname || user?.first_name || 'You'
    const familyId = currentFamily?.id || 'demo-family-001'
    const newExpense: Expense = { id: crypto.randomUUID(), title: expenseForm.title.trim(), amount: parseFloat(expenseForm.amount), currency: 'SAR', category: expenseForm.category, date: expenseForm.date, paidBy: expenseForm.paidBy, paidByName, familyId, notes: expenseForm.notes || undefined, createdAt: new Date().toISOString() }
    await addExpenseToSupabase(newExpense, user?.id || '')
    setShowAddExpense(false)
    setExpenseForm({ title: '', amount: '', category: 'food', date: new Date().toISOString().split('T')[0], paidBy: user?.id || '', notes: '' })
  }, [expenseForm, familyMembers, user, currentFamily?.id, addExpenseToSupabase])

  const handleSetBudget = useCallback(async () => {
    const total = parseFloat(budgetForm.totalBudget)
    if (!total || total <= 0) return
    const budget: BudgetMonth = { month: currentMonth, totalBudget: total, categories: { food: parseFloat(budgetForm.food) || 0, housing: parseFloat(budgetForm.housing) || 0, transport: parseFloat(budgetForm.transport) || 0, education: parseFloat(budgetForm.education) || 0, health: parseFloat(budgetForm.health) || 0, entertainment: parseFloat(budgetForm.entertainment) || 0, shopping: parseFloat(budgetForm.shopping) || 0, utilities: parseFloat(budgetForm.utilities) || 0, other: parseFloat(budgetForm.other) || 0 } }
    await saveBudgetMonthToSupabase(budget, currentFamily?.id || 'demo-family-001', user?.id || '')
    setShowSetBudget(false)
  }, [budgetForm, currentMonth, currentFamily?.id, user?.id, saveBudgetMonthToSupabase])

  const handleAutoDistribute = useCallback(() => {
    const total = parseFloat(budgetForm.totalBudget) || 0; if (total <= 0) return
    const perCategory = Math.round((total / 9) * 100) / 100
    setBudgetForm((prev) => ({ ...prev, food: String(perCategory), housing: String(perCategory), transport: String(perCategory), education: String(perCategory), health: String(perCategory), entertainment: String(perCategory), shopping: String(perCategory), utilities: String(perCategory), other: String(perCategory) }))
  }, [budgetForm.totalBudget])

  const handleDeleteExpense = useCallback(async (id: string) => { await removeExpenseFromSupabase(id); setDeleteConfirmId(null) }, [removeExpenseFromSupabase])

  const openSetBudget = useCallback(() => {
    if (budgetMonth) setBudgetForm({ totalBudget: String(budgetMonth.totalBudget), food: String(budgetMonth.categories.food), housing: String(budgetMonth.categories.housing), transport: String(budgetMonth.categories.transport), education: String(budgetMonth.categories.education), health: String(budgetMonth.categories.health), entertainment: String(budgetMonth.categories.entertainment), shopping: String(budgetMonth.categories.shopping), utilities: String(budgetMonth.categories.utilities), other: String(budgetMonth.categories.other) })
    else setBudgetForm({ totalBudget: '', food: '', housing: '', transport: '', education: '', health: '', entertainment: '', shopping: '', utilities: '', other: '' })
    setShowSetBudget(true)
  }, [budgetMonth])

  const dir = isRTL ? 'rtl' : 'ltr'

  return (
    <Container maxWidth="lg" sx={{ py: 3 }} dir={dir}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={2}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Wallet style={{ color: theme.palette.primary.main }} />
              <Typography variant="h5" fontWeight={700}>{t.budget.title}</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
              <IconButton size="small" onClick={() => navigateMonth(-1)}>{isRTL ? <ChevronRight /> : <ChevronLeft />}</IconButton>
              <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ minWidth: 140, textAlign: 'center' }}>{monthLabel}</Typography>
              <IconButton size="small" onClick={() => navigateMonth(1)}>{isRTL ? <ChevronLeft /> : <ChevronRight />}</IconButton>
            </Stack>
          </Box>
          <Stack direction="row" spacing={1}>
            {budgetMonth && <Button variant="outlined" size="small" startIcon={<Edit3 size={14} />} onClick={openSetBudget}>{t.budget.editBudget}</Button>}
            <Button variant="contained" size="small" startIcon={<Plus size={14} />} onClick={() => { if (!budgetMonth) openSetBudget(); else setShowAddExpense(true) }}>
              {budgetMonth ? t.budget.addExpense : t.budget.setBudget}
            </Button>
          </Stack>
        </Stack>

        {!budgetMonth ? (
          <Stack alignItems="center" sx={{ py: 8 }}>
            <Box sx={{ width: 80, height: 80, borderRadius: 3, bgcolor: theme.palette.action.hover, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <Wallet size={40} style={{ color: theme.palette.text.disabled }} />
            </Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>{t.budget.noBudget}</Typography>
            <Button variant="contained" startIcon={<Coins />} onClick={openSetBudget} sx={{ mt: 1 }}>{t.budget.setBudget}</Button>
          </Stack>
        ) : (
          <>
            {/* Summary */}
            <Paper sx={{ p: 3 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
                <Stack alignItems="center" sx={{ position: 'relative', flexShrink: 0 }}>
                  <Typography variant="h3" fontWeight={700}>{spentPercent}%</Typography>
                  <Typography variant="caption" color="text.secondary">{t.budget.ofBudget}</Typography>
                </Stack>
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ flex: 1, width: '100%' }}>
                  {[
                    { label: t.budget.totalBudget, value: budgetMonth.totalBudget.toLocaleString(), icon: <Coins size={20} />, color: 'primary.main' },
                    { label: t.budget.totalSpent, value: totalSpent.toLocaleString(), icon: <TrendingDown size={20} />, color: 'warning.main', sub: `${spentPercent}% ${t.budget.ofBudget}` },
                    { label: t.budget.remaining, value: Math.abs(remaining).toLocaleString(), icon: remaining >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />, color: remaining >= 0 ? 'success.main' : 'error.main', sub: remaining < 0 ? t.budget.overBudget : undefined },
                    { label: t.budget.transactions, value: expenses.length, icon: <Receipt size={20} />, color: 'primary.main' },
                  ].map((stat) => (
                    <Paper key={stat.label} variant="outlined" sx={{ flex: '1 1 120px', p: 2, textAlign: 'center' }}>
                      <Box sx={{ color: stat.color, mb: 1, display: 'flex', justifyContent: 'center' }}>{stat.icon}</Box>
                      <Typography variant="caption" color="text.secondary" display="block">{stat.label}</Typography>
                      <Typography variant="h6" fontWeight={700}>{stat.value}<Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>{t.budget.currency}</Typography></Typography>
                      {stat.sub && <Typography variant="caption" color={stat.color}>{stat.sub}</Typography>}
                    </Paper>
                  ))}
                </Stack>
              </Stack>
            </Paper>

            {/* Spent by Category */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>{t.budget.spentByCategory}</Typography>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                {CATEGORIES.map((cat) => {
                  const spent = spentByCategory[cat.key]
                  const budget = budgetMonth.categories[cat.key]
                  const percent = budget > 0 ? Math.round((spent / budget) * 100) : 0
                  const Icon = cat.icon
                  return (
                    <Card key={cat.key} sx={{ minWidth: 160, flex: '1 1 160px' }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                          <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: `${theme.palette[cat.chipColor].main}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={16} style={{ color: theme.palette[cat.chipColor].main }} />
                          </Box>
                          <Typography variant="body2" fontWeight={500} noWrap>{t.budget[cat.key as keyof typeof t.budget]}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">{spent.toLocaleString()} / {budget.toLocaleString()}</Typography>
                          <Typography variant="caption" color={percent >= 100 ? 'error.main' : percent >= 80 ? 'warning.main' : 'success.main'}>{percent}%</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={Math.min(100, percent)} color={percent >= 100 ? 'error' : percent >= 80 ? 'warning' : 'primary'} sx={{ mt: 0.5, height: 6, borderRadius: 3 }} />
                      </CardContent>
                    </Card>
                  )
                })}
              </Stack>
            </Box>

            {/* Recent Expenses */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={600}>{t.budget.recentExpenses}</Typography>
                <Stack direction="row" spacing={1}>
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Sort</InputLabel>
                    <Select value={sortBy} label="Sort" onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}>
                      <MenuItem value="date">{t.budget.dateSort}</MenuItem>
                      <MenuItem value="amount">{t.budget.amountSort}</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Category</InputLabel>
                    <Select value={filterCategory} label="Category" onChange={(e) => setFilterCategory(e.target.value as ExpenseCategory | 'all')}>
                      <MenuItem value="all">{isRTL ? 'كل الفئات' : 'All Categories'}</MenuItem>
                      {CATEGORIES.map((cat) => <MenuItem key={cat.key} value={cat.key}>{t.budget[cat.key as keyof typeof t.budget]}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>

              <TextField value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t.budget.searchExpenses} size="small" fullWidth sx={{ mb: 2 }}
                InputProps={{ startAdornment: <Search size={16} style={{ color: theme.palette.text.secondary, marginRight: 4 }} /> }}
              />

              {filteredExpenses.length === 0 ? (
                <Stack alignItems="center" sx={{ py: 6 }}>
                  <HandCoins size={48} style={{ color: theme.palette.text.disabled, marginBottom: 4 }} />
                  <Typography variant="body2" color="text.secondary">{t.budget.noExpenses}</Typography>
                  <Button variant="contained" size="small" startIcon={<Plus size={14} />} onClick={() => setShowAddExpense(true)} sx={{ mt: 2 }}>{t.budget.addExpense}</Button>
                </Stack>
              ) : (
                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                  <Stack spacing={1}>
                    {filteredExpenses.map((expense) => {
                      const catConfig = getCategoryConfig(expense.category)
                      const CatIcon = catConfig.icon
                      const initials = expense.paidByName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                      return (
                        <Paper key={expense.id} variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderRadius: 2, '&:hover': { bgcolor: theme.palette.action.hover } }}>
                          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: `${theme.palette[catConfig.chipColor].main}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <CatIcon size={20} style={{ color: theme.palette[catConfig.chipColor].main }} />
                          </Box>
                          <Stack sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Typography variant="body2" fontWeight={500} noWrap>{expense.title}</Typography>
                              <Chip label={t.budget[expense.category as keyof typeof t.budget]} size="small" color={catConfig.chipColor} variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Avatar sx={{ width: 16, height: 16, fontSize: 8, bgcolor: `${theme.palette.primary.main}20`, color: 'primary.main' }}>{initials}</Avatar>
                              <Typography variant="caption" color="text.secondary">{expense.paidByName}</Typography>
                              <Typography variant="caption" color="text.secondary">·</Typography>
                              <Typography variant="caption" color="text.secondary">{new Date(expense.date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}</Typography>
                              {expense.notes && <><Typography variant="caption" color="text.secondary">·</Typography><Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 100 }}>{expense.notes}</Typography></>}
                            </Stack>
                          </Stack>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
                            <Typography variant="body2" fontWeight={600}>{expense.amount.toLocaleString()}<Typography variant="caption" color="text.secondary" sx={{ ml: 0.25 }}>{t.budget.currency}</Typography></Typography>
                            <IconButton size="small" color="error" onClick={() => setDeleteConfirmId(expense.id)}><Trash2 size={14} /></IconButton>
                          </Stack>
                        </Paper>
                      )
                    })}
                  </Stack>
                </Box>
              )}
            </Box>
          </>
        )}

        {/* Add Expense Dialog */}
        <Dialog open={showAddExpense} onClose={() => setShowAddExpense(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t.budget.addExpense}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField label={t.budget.expenseTitle} value={expenseForm.title} onChange={(e) => setExpenseForm((p) => ({ ...p, title: e.target.value }))} placeholder={isRTL ? 'أدخل عنوان المصروف' : 'Enter expense title'} size="small" fullWidth />
              <TextField label={t.budget.amount} type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" size="small" fullWidth InputProps={{ endAdornment: <Typography variant="caption" color="text.secondary">{t.budget.currency}</Typography> }} />
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">{t.budget.category}</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon
                    const isSelected = expenseForm.category === cat.key
                    return (
                      <Chip key={cat.key} icon={<Icon size={14} />} label={t.budget[cat.key as keyof typeof t.budget]} variant={isSelected ? 'filled' : 'outlined'} color={cat.chipColor} onClick={() => setExpenseForm((p) => ({ ...p, category: cat.key }))} sx={{ cursor: 'pointer' }} />
                    )
                  })}
                </Stack>
              </Stack>
              <TextField type="date" label={t.budget.date} value={expenseForm.date} onChange={(e) => setExpenseForm((p) => ({ ...p, date: e.target.value }))} size="small" fullWidth InputLabelProps={{ shrink: true }} />
              <FormControl size="small" fullWidth>
                <InputLabel>{t.budget.paidBy}</InputLabel>
                <Select value={expenseForm.paidBy} label={t.budget.paidBy} onChange={(e) => setExpenseForm((p) => ({ ...p, paidBy: e.target.value }))}>
                  {familyMembers.map((m) => <MenuItem key={m.user_id} value={m.user_id}>{m.profiles?.first_name || m.nickname || m.user_id}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label={`${t.budget.notes} (${isRTL ? 'اختياري' : 'optional'})`} value={expenseForm.notes} onChange={(e) => setExpenseForm((p) => ({ ...p, notes: e.target.value }))} placeholder={isRTL ? 'أضف ملاحظات...' : 'Add notes...'} multiline rows={2} size="small" fullWidth />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setShowAddExpense(false)} color="inherit">{t.budget.cancel}</Button>
            <Button onClick={handleAddExpense} variant="contained" disabled={!expenseForm.title.trim() || !expenseForm.amount}>{t.budget.save}</Button>
          </DialogActions>
        </Dialog>

        {/* Set Budget Dialog */}
        <Dialog open={showSetBudget} onClose={() => setShowSetBudget(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{budgetMonth ? t.budget.editBudget : t.budget.setBudget}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField label={`${t.budget.totalBudget} (${t.budget.currency})`} type="number" value={budgetForm.totalBudget} onChange={(e) => setBudgetForm((p) => ({ ...p, totalBudget: e.target.value }))} placeholder="12000" size="small" fullWidth />
              <Button variant="outlined" size="small" fullWidth startIcon={<Zap size={14} />} onClick={handleAutoDistribute} disabled={!budgetForm.totalBudget}>{t.budget.autoDistribute}</Button>
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                return (
                  <Stack key={cat.key} direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: `${theme.palette[cat.chipColor].main}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={16} style={{ color: theme.palette[cat.chipColor].main }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>{t.budget[cat.key as keyof typeof t.budget]}</Typography>
                    <TextField type="number" value={budgetForm[cat.key]} onChange={(e) => setBudgetForm((p) => ({ ...p, [cat.key]: e.target.value }))} placeholder="0" size="small" fullWidth />
                  </Stack>
                )
              })}
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">{isRTL ? 'المخصص' : 'Allocated'}</Typography>
                <Typography variant="caption" color="text.secondary">{CATEGORIES.reduce((sum, cat) => sum + (parseFloat(budgetForm[cat.key]) || 0), 0).toLocaleString()} / {parseFloat(budgetForm.totalBudget || '0').toLocaleString()}</Typography>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setShowSetBudget(false)} color="inherit">{t.budget.cancel}</Button>
            <Button onClick={handleSetBudget} variant="contained">{t.budget.save}</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirm */}
        <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} maxWidth="xs">
          <DialogTitle>{t.common.delete}</DialogTitle>
          <DialogContent><Typography variant="body2">{t.common.confirmDelete}</Typography></DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmId(null)} color="inherit">{t.common.cancel}</Button>
            <Button onClick={() => deleteConfirmId && handleDeleteExpense(deleteConfirmId)} color="error" variant="contained">{t.common.delete}</Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Container>
  )
}
