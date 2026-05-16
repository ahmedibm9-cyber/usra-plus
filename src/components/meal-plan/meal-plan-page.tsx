'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Add,
  Schedule,
  LocalFireDepartment,
  ShoppingCart,
  AutoAwesome,
  X,
  Restaurant,
  Link as LinkIcon,
  People,
} from '@mui/icons-material'
import {
  Sunrise,
  Sun,
  Moon,
  Cookie,
  Trash2,
  Pencil,
  ExternalLink,
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
  Avatar,
  Tabs,
  Tab,
  Divider,
  Checkbox,
  FormControlLabel,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import { useMealStore, type Meal, type MealType } from '@/stores/meal-store'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useGroceryStore } from '@/stores/grocery-store'
import { useI18n } from '@/i18n/use-translation'
import { safeJsonResponse } from '@/lib/safe-fetch'
import { toast } from 'sonner'

// ─── Helpers ───────────────────────────────────────────────────────
function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(date.setDate(diff))
}

function formatDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

const MEAL_TYPE_ICON: Record<MealType, React.ElementType> = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: Moon,
  snack: Cookie,
}

const MEAL_TYPE_COLOR: Record<MealType, 'success' | 'primary' | 'secondary' | 'warning'> = {
  breakfast: 'success',
  lunch: 'primary',
  dinner: 'secondary',
  snack: 'warning',
}

// ─── Meal Card ─────────────────────────────────────────────────────
function MealCard({ meal, onClick }: { meal: Meal; onClick: () => void }) {
  const { t } = useI18n()
  const theme = useTheme()
  const Icon = MEAL_TYPE_ICON[meal.mealType]
  const chipColor = MEAL_TYPE_COLOR[meal.mealType]

  return (
    <Card
      sx={{
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': { transform: 'scale(1.02)', boxShadow: theme.shadows[4] },
        borderLeft: `3px solid ${theme.palette[chipColor].main}`,
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
            <Icon size={14} style={{ flexShrink: 0, color: theme.palette[chipColor].main }} />
            <Typography variant="body2" fontWeight={500} noWrap>{meal.title}</Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          {meal.prepTime && (
            <Chip icon={<Schedule sx={{ fontSize: 12 }} />} label={`${meal.prepTime} ${t.mealPlan.minutes}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
          )}
          {meal.calories && (
            <Chip icon={<LocalFireDepartment sx={{ fontSize: 12 }} />} label={`${meal.calories} ${t.mealPlan.kcal}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
          )}
        </Stack>

        {meal.assignedTo.length > 0 && (
          <Stack direction="row" spacing={-0.5} sx={{ mt: 1 }}>
            {meal.assignedTo.slice(0, 3).map((userId) => (
              <Avatar key={userId} sx={{ width: 20, height: 20, fontSize: 8, border: `1px solid ${theme.palette.background.paper}`, bgcolor: theme.palette.action.hover }}>
                {userId.slice(-1).toUpperCase()}
              </Avatar>
            ))}
            {meal.assignedTo.length > 3 && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                +{meal.assignedTo.length - 3}
              </Typography>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Add Meal Slot ─────────────────────────────────────────────────
function AddMealSlot({ mealType, date, onClick }: { mealType: MealType; date: string; onClick: (mt: MealType, d: string) => void }) {
  const { t } = useI18n()
  const theme = useTheme()
  const Icon = MEAL_TYPE_ICON[mealType]

  return (
    <Button
      variant="outlined"
      fullWidth
      onClick={() => onClick(mealType, date)}
      sx={{
        borderStyle: 'dashed',
        py: 1,
        justifyContent: 'center',
        gap: 0.5,
        color: theme.palette.text.secondary,
        '&:hover': { borderStyle: 'dashed', bgcolor: theme.palette.action.hover },
      }}
    >
      <Icon size={14} />
      <Typography variant="caption" fontWeight={500}>{t.mealPlan[mealType]}</Typography>
      <Add sx={{ fontSize: 12 }} />
    </Button>
  )
}

// ─── Meal Detail Sheet ─────────────────────────────────────────────
function MealDetailSheet({
  meal,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  meal: Meal | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (meal: Meal) => void
  onDelete: (id: string) => void
}) {
  const { t, isRTL } = useI18n()
  const theme = useTheme()
  const { familyMembers } = useAppStore()

  const handleAddToGrocery = useCallback(() => {
    if (!meal) return
    const count = useMealStore.getState().addIngredientsToGrocery(meal.id)
    toast.success(t.mealPlan.addedToGrocery.replace('{count}', count.toString()))
  }, [meal, t])

  if (!meal) return null

  const Icon = MEAL_TYPE_ICON[meal.mealType]
  const chipColor = MEAL_TYPE_COLOR[meal.mealType]

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="sm" fullWidth dir={isRTL ? 'rtl' : 'ltr'}>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: `${theme.palette[chipColor].main}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={16} style={{ color: theme.palette[chipColor].main }} />
          </Box>
          {meal.title}
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {meal.description && (
            <Typography variant="body2" color="text.secondary">{meal.description}</Typography>
          )}

          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            {meal.prepTime && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Schedule sx={{ fontSize: 14 }} color="action" />
                <Typography variant="caption" color="text.secondary">{meal.prepTime} {t.mealPlan.minutes}</Typography>
              </Stack>
            )}
            {meal.calories && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <LocalFireDepartment sx={{ fontSize: 14 }} color="action" />
                <Typography variant="caption" color="text.secondary">{meal.calories} {t.mealPlan.kcal}</Typography>
              </Stack>
            )}
            <Chip label={t.mealPlan[meal.mealType]} size="small" color={chipColor} />
          </Stack>

          {meal.ingredients.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                {t.mealPlan.ingredients}
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {meal.ingredients.map((ing, idx) => (
                  <Chip key={idx} label={ing} size="small" variant="outlined" />
                ))}
              </Stack>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                startIcon={<ShoppingCart sx={{ fontSize: 14 }} />}
                onClick={handleAddToGrocery}
                sx={{ mt: 1 }}
              >
                {t.mealPlan.addToGrocery}
              </Button>
            </Stack>
          )}

          {meal.assignedTo.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                {t.mealPlan.assignedTo}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {meal.assignedTo.map((userId) => {
                  const member = familyMembers.find((m) => m.user_id === userId)
                  const name = member?.nickname || member?.profiles?.first_name || userId
                  return (
                    <Stack key={userId} direction="row" alignItems="center" spacing={0.5}>
                      <Avatar sx={{ width: 20, height: 20, fontSize: 8 }}>
                        {name[0]}
                      </Avatar>
                      <Typography variant="caption" color="text.secondary">{name}</Typography>
                    </Stack>
                  )
                })}
              </Stack>
            </Stack>
          )}

          {meal.recipeUrl && (
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                {t.mealPlan.recipeUrl}
              </Typography>
              <Button
                variant="text"
                size="small"
                startIcon={<ExternalLink size={12} />}
                href={meal.recipeUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ textTransform: 'none' }}
              >
                {meal.recipeUrl}
              </Button>
            </Stack>
          )}

          <Divider />

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Pencil size={14} }/>
              onClick={() => { onEdit(meal); onOpenChange(false) }}
            >
              {t.mealPlan.editMeal}
            </Button>
            <IconButton color="error" onClick={() => { onDelete(meal.id); onOpenChange(false) }}>
              <Trash2 size={14} />
            </IconButton>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

// ─── Add/Edit Meal Dialog ──────────────────────────────────────────
function MealDialogInner({
  meal,
  mealType: defaultMealType,
  date: defaultDate,
  onSave,
  onOpenChange,
  familyMembers,
}: {
  meal?: Meal | null
  mealType?: MealType
  date?: string
  onSave: (meal: Meal) => void
  onOpenChange: (open: boolean) => void
  familyMembers: { id: string; nickname?: string | null; user_id?: string; profiles?: { first_name?: string | null } }[]
}) {
  const { t, isRTL } = useI18n()
  const theme = useTheme()
  const { user } = useAuthStore()
  const { items: groceryItems } = useGroceryStore()
  const [title, setTitle] = useState(meal?.title || '')
  const [description, setDescription] = useState(meal?.description || '')
  const [mealType, setMealType] = useState<MealType>(meal?.mealType || defaultMealType || 'breakfast')
  const [date, setDate] = useState(meal?.date || defaultDate || formatDateStr(new Date()))
  const [prepTime, setPrepTime] = useState(meal?.prepTime?.toString() || '')
  const [calories, setCalories] = useState(meal?.calories?.toString() || '')
  const [ingredients, setIngredients] = useState<string[]>(meal?.ingredients ? [...meal.ingredients] : [])
  const [ingredientInput, setIngredientInput] = useState('')
  const [assignedTo, setAssignedTo] = useState<string[]>(meal?.assignedTo ? [...meal.assignedTo] : [])
  const [recipeUrl, setRecipeUrl] = useState(meal?.recipeUrl || '')
  const [showGroceryImport, setShowGroceryImport] = useState(false)

  const handleAddIngredient = useCallback(() => {
    const trimmed = ingredientInput.trim()
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients((prev) => [...prev, trimmed])
    }
    setIngredientInput('')
  }, [ingredientInput, ingredients])

  const handleRemoveIngredient = useCallback((idx: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const handleImportFromGrocery = useCallback((itemName: string) => {
    if (!ingredients.includes(itemName)) {
      setIngredients((prev) => [...prev, itemName])
    }
  }, [ingredients])

  const handleToggleAssign = useCallback((userId: string) => {
    setAssignedTo((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }, [])

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      toast.error(isRTL ? 'يرجى إدخال اسم الوجبة' : 'Please enter a meal title')
      return
    }
    const now = new Date().toISOString()
    const savedMeal: Meal = {
      id: meal?.id || crypto.randomUUID(),
      title: title.trim(),
      description: description.trim() || undefined,
      mealType,
      date,
      assignedTo,
      ingredients,
      recipeUrl: recipeUrl.trim() || undefined,
      prepTime: prepTime ? parseInt(prepTime) : undefined,
      calories: calories ? parseInt(calories) : undefined,
      createdBy: meal?.createdBy || user?.id || 'demo-user-001',
      createdAt: meal?.createdAt || now,
    }
    onSave(savedMeal)
    onOpenChange(false)
  }, [title, description, mealType, date, assignedTo, ingredients, recipeUrl, prepTime, calories, meal, user, onSave, onOpenChange, isRTL])

  const mealTypeOptions: { value: MealType; icon: React.ElementType; label: string }[] = [
    { value: 'breakfast', icon: WbTwilight, label: t.mealPlan.breakfast },
    { value: 'lunch', icon: WbSunny, label: t.mealPlan.lunch },
    { value: 'dinner', icon: DarkMode, label: t.mealPlan.dinner },
    { value: 'snack', icon: Cookie, label: t.mealPlan.snack },
  ]

  return (
    <Dialog open onClose={() => onOpenChange(false)} maxWidth="sm" fullWidth dir={isRTL ? 'rtl' : 'ltr'}>
      <DialogTitle>{meal ? t.mealPlan.editMeal : t.mealPlan.addMeal}</DialogTitle>
      <DialogContent sx={{ pb: 1 }}>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {/* Title */}
          <TextField label={t.mealPlan.title_field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.mealPlan.title_field} size="small" fullWidth />

          {/* Meal Type */}
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">{t.mealPlan.mealType}</Typography>
            <Stack direction="row" spacing={1}>
              {mealTypeOptions.map((opt) => {
                const Icon = opt.icon
                const isSelected = mealType === opt.value
                return (
                  <Button
                    key={opt.value}
                    variant={isSelected ? 'contained' : 'outlined'}
                    color={MEAL_TYPE_COLOR[opt.value]}
                    size="small"
                    onClick={() => setMealType(opt.value)}
                    startIcon={<Icon size={14} />}
                    sx={{ textTransform: 'none', flex: 1 }}
                  >
                    {opt.label}
                  </Button>
                )
              })}
            </Stack>
          </Stack>

          {/* Date */}
          <TextField type="date" label={t.mealPlan.date} value={date} onChange={(e) => setDate(e.target.value)} size="small" fullWidth InputLabelProps={{ shrink: true }} />

          {/* Description */}
          <TextField label={t.mealPlan.description} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.mealPlan.description} multiline rows={2} size="small" fullWidth />

          {/* Prep Time + Calories */}
          <Stack direction="row" spacing={2}>
            <TextField label={`${t.mealPlan.prepTime} (${t.mealPlan.minutes})`} type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} placeholder="30" size="small" fullWidth />
            <TextField label={`${t.mealPlan.calories} (${t.mealPlan.kcal})`} type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="450" size="small" fullWidth />
          </Stack>

          {/* Ingredients */}
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">{t.mealPlan.ingredients}</Typography>
              <Button size="small" startIcon={<ShoppingCart sx={{ fontSize: 12 }} />} onClick={() => setShowGroceryImport(!showGroceryImport)}>
                {t.mealPlan.importFromGrocery}
              </Button>
            </Stack>

            {showGroceryImport && (
              <Paper variant="outlined" sx={{ maxHeight: 120, overflowY: 'auto', p: 1 }}>
                {groceryItems.length === 0 ? (
                  <Typography variant="caption" color="text.secondary" textAlign="center" display="block" sx={{ py: 1 }}>{isRTL ? 'لا توجد عناصر' : 'No items'}</Typography>
                ) : (
                  groceryItems.map((item) => (
                    <MenuItem
                      key={item.id}
                      onClick={() => handleImportFromGrocery(item.name)}
                      selected={ingredients.includes(item.name)}
                      dense
                    >
                      {item.name}
                    </MenuItem>
                  ))
                )}
              </Paper>
            )}

            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {ingredients.map((ing, idx) => (
                <Chip key={idx} label={ing} size="small" onDelete={() => handleRemoveIngredient(idx)} />
              ))}
            </Stack>

            <Stack direction="row" spacing={1}>
              <TextField
                value={ingredientInput}
                onChange={(e) => setIngredientInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddIngredient() } }}
                placeholder={t.mealPlan.addIngredient}
                size="small"
                fullWidth
              />
              <IconButton onClick={handleAddIngredient} color="primary">
                <Add sx={{ fontSize: 16 }} />
              </IconButton>
            </Stack>
          </Stack>

          {/* Assigned To */}
          {familyMembers.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">{t.mealPlan.assignedTo}</Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {familyMembers.map((member) => {
                  const name = member.nickname || member.profiles?.first_name || member.id
                  const isSelected = assignedTo.includes(member.user_id ?? '')
                  return (
                    <Chip
                      key={member.id}
                      label={name}
                      onClick={() => handleToggleAssign(member.user_id ?? '')}
                      variant={isSelected ? 'filled' : 'outlined'}
                      color={isSelected ? 'primary' : 'default'}
                      sx={{ cursor: 'pointer' }}
                    />
                  )
                })}
              </Stack>
            </Stack>
          )}

          {/* Recipe URL */}
          <TextField label={t.mealPlan.recipeUrl} value={recipeUrl} onChange={(e) => setRecipeUrl(e.target.value)} placeholder="https://..." size="small" fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => onOpenChange(false)} color="inherit">{t.common.cancel}</Button>
        <Button onClick={handleSave} variant="contained">{t.common.save}</Button>
      </DialogActions>
    </Dialog>
  )
}

function MealDialog({
  open,
  onOpenChange,
  meal,
  mealType: defaultMealType,
  date: defaultDate,
  onSave,
  familyMembers,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  meal?: Meal | null
  mealType?: MealType
  date?: string
  onSave: (meal: Meal) => void
  familyMembers: { id: string; nickname?: string | null; user_id?: string; profiles?: { first_name?: string | null } }[]
}) {
  return (
    <MealDialogInner
      key={meal?.id || 'new'}
      meal={meal}
      mealType={defaultMealType}
      date={defaultDate}
      onSave={onSave}
      onOpenChange={onOpenChange}
      familyMembers={familyMembers}
    />
  )
}

// ─── AI Suggestions Dialog ─────────────────────────────────────────
function AISuggestionsDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (suggestion: { title: string; description: string; prepTime: number; calories: number; ingredients: string[] }) => void
}) {
  const { t, isRTL } = useI18n()
  const [suggestions, setSuggestions] = useState<Array<{ title: string; description: string; prepTime: number; calories: number; ingredients: string[] }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const { items: groceryItems } = useGroceryStore()

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true)
    try {
      const groceryNames = groceryItems.map((i) => i.name)
      const res = await fetch('/api/ai/meal-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groceryItems: groceryNames, mealType: 'any', language: isRTL ? 'ar' : 'en' }),
      })
      const data = await safeJsonResponse<{ suggestions?: Array<{ title: string; description: string; prepTime: number; calories: number; ingredients: string[] }> }>(res)
      if (data?.suggestions) setSuggestions(data.suggestions)
    } catch {
      setSuggestions([
        { title: isRTL ? 'كبسة دجاج' : 'Chicken Kabsa', description: isRTL ? 'أرز بسمتي مع دجاج متبل بالتوابل العربية' : 'Basmati rice with spiced chicken', prepTime: 60, calories: 650, ingredients: [isRTL ? 'أرز بسمتي' : 'Basmati Rice', isRTL ? 'دجاج' : 'Chicken', isRTL ? 'توابل' : 'Spices'] },
        { title: isRTL ? 'سلطة خضراء' : 'Green Salad', description: isRTL ? 'سلطة طازجة مع خضروات متنوعة' : 'Fresh salad with mixed vegetables', prepTime: 10, calories: 120, ingredients: [isRTL ? 'خضروات' : 'Vegetables', isRTL ? 'زيت زيتون' : 'Olive Oil'] },
        { title: isRTL ? 'شوربة عدس' : 'Lentil Soup', description: isRTL ? 'شوربة عدس دافئة ومغذية' : 'Warm and nutritious lentil soup', prepTime: 30, calories: 280, ingredients: [isRTL ? 'عدس' : 'Lentils', isRTL ? 'بصل' : 'Onion', isRTL ? 'ثوم' : 'Garlic'] },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [groceryItems, isRTL])

  useEffect(() => {
    if (open) fetchSuggestions()
  }, [open, fetchSuggestions])

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="sm" fullWidth dir={isRTL ? 'rtl' : 'ltr'}>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <AutoAwesome sx={{ fontSize: 16, color: 'primary.main' }} />
          {t.mealPlan.suggestMeals}
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t.mealPlan.suggestDesc}</Typography>
        <Stack spacing={1.5}>
          {isLoading ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <AutoAwesome sx={{ fontSize: 24, color: 'primary.main', animation: 'pulse 2s infinite' }} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>{isRTL ? 'جاري التحميل...' : 'Loading...'}</Typography>
            </Stack>
          ) : (
            suggestions.map((suggestion, idx) => (
              <Paper
                key={idx}
                variant="outlined"
                sx={{ p: 2, cursor: 'pointer', transition: 'all 0.2s', '&:hover': { borderColor: 'primary.light', bgcolor: 'primary.50' } }}
                onClick={() => { onSelect(suggestion); onOpenChange(false) }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Typography variant="body2" fontWeight={500}>{suggestion.title}</Typography>
                  <Stack direction="row" spacing={0.5}>
                    {suggestion.prepTime > 0 && <Chip icon={<Schedule sx={{ fontSize: 10 }} />} label={`${suggestion.prepTime} ${t.mealPlan.minutes}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />}
                    {suggestion.calories > 0 && <Chip icon={<LocalFireDepartment sx={{ fontSize: 10 }} />} label={`${suggestion.calories} ${t.mealPlan.kcal}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />}
                  </Stack>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>{suggestion.description}</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                  {suggestion.ingredients.slice(0, 5).map((ing, i) => (
                    <Chip key={i} label={ing} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                  ))}
                  {suggestion.ingredients.length > 5 && (
                    <Chip label={`+${suggestion.ingredients.length - 5}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                  )}
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Meal Plan Page ───────────────────────────────────────────
export default function MealPlanPage() {
  const { t, isRTL } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const meals = useMealStore((s) => s.meals)
  const selectedWeekStart = useMealStore((s) => s.selectedWeekStart)
  const setSelectedWeek = useMealStore((s) => s.setSelectedWeek)
  const fetchFromSupabase = useMealStore((s) => s.fetchFromSupabase)
  const addMealToSupabase = useMealStore((s) => s.addMealToSupabase)
  const updateMealInSupabase = useMealStore((s) => s.updateMealInSupabase)
  const removeMealFromSupabase = useMealStore((s) => s.removeMealFromSupabase)
  const addAllIngredientsToGrocery = useMealStore((s) => s.addAllIngredientsToGrocery)
  const getMealsForDate = useMealStore((s) => s.getMealsForDate)
  const familyMembers = useAppStore((s) => s.familyMembers)
  const currentFamily = useAppStore((s) => s.currentFamily)
  const user = useAuthStore((s) => s.user)

  const hasFetchedRef = useRef(false)
  useEffect(() => {
    if (!currentFamily?.id || !user?.id) return
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    fetchFromSupabase(currentFamily.id, user.id).catch((err) => {
      console.warn('[MealPlanPage] Initial fetch failed:', err)
    })
  }, [currentFamily?.id, user?.id, fetchFromSupabase])

  const prevFamilyRef = useRef(currentFamily?.id)
  useEffect(() => {
    if (!currentFamily?.id || !user?.id) return
    if (prevFamilyRef.current === currentFamily.id) return
    prevFamilyRef.current = currentFamily.id
    fetchFromSupabase(currentFamily.id, user.id).catch((err) => {
      console.warn('[MealPlanPage] Re-fetch on family change failed:', err)
    })
  }, [currentFamily?.id, user?.id, fetchFromSupabase])

  const [mealDialogOpen, setMealDialogOpen] = useState(false)
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [defaultMealType, setDefaultMealType] = useState<MealType>('breakfast')
  const [defaultDate, setDefaultDate] = useState('')
  const [detailMeal, setDetailMeal] = useState<Meal | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)

  const weekStart = useMemo(() => new Date(selectedWeekStart + 'T00:00:00'), [selectedWeekStart])
  const today = formatDateStr(new Date())

  const weekDays = useMemo(() => {
    return DAY_KEYS.map((key, idx) => {
      const d = addDays(weekStart, idx)
      return { key, date: formatDateStr(d), label: t.mealPlan[key], isToday: formatDateStr(d) === today }
    })
  }, [weekStart, t, today])

  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

  const weekMeals = useMemo(() => {
    const start = selectedWeekStart
    const end = formatDateStr(addDays(weekStart, 7))
    return meals.filter((m) => m.date >= start && m.date < end)
  }, [meals, selectedWeekStart, weekStart])

  const totalIngredients = useMemo(() => {
    const all = new Set<string>()
    weekMeals.forEach((m) => m.ingredients.forEach((i) => all.add(i)))
    return all.size
  }, [weekMeals])

  const handlePrevWeek = useCallback(() => {
    const newStart = addDays(weekStart, -7)
    setSelectedWeek(formatDateStr(newStart))
  }, [weekStart, setSelectedWeek])

  const handleNextWeek = useCallback(() => {
    const newStart = addDays(weekStart, 7)
    setSelectedWeek(formatDateStr(newStart))
  }, [weekStart, setSelectedWeek])

  const handleToday = useCallback(() => {
    setSelectedWeek(formatDateStr(getMonday(new Date())))
  }, [setSelectedWeek])

  const handleAddSlot = useCallback((mealType: MealType, date: string) => {
    setEditingMeal(null)
    setDefaultMealType(mealType)
    setDefaultDate(date)
    setMealDialogOpen(true)
  }, [])

  const handleAddNew = useCallback(() => {
    setEditingMeal(null)
    setDefaultMealType('breakfast')
    setDefaultDate(today)
    setMealDialogOpen(true)
  }, [today])

  const handleSaveMeal = useCallback(async (meal: Meal) => {
    const familyId = currentFamily?.id || 'demo-family-001'
    const userId = user?.id || 'demo-user-001'
    if (editingMeal) {
      await updateMealInSupabase(meal.id, meal, familyId)
    } else {
      await addMealToSupabase(meal, familyId, userId)
    }
  }, [editingMeal, addMealToSupabase, updateMealInSupabase, currentFamily?.id, user?.id])

  const handleViewMeal = useCallback((meal: Meal) => {
    setDetailMeal(meal)
    setDetailOpen(true)
  }, [])

  const handleEditFromDetail = useCallback((meal: Meal) => {
    setEditingMeal(meal)
    setDefaultMealType(meal.mealType)
    setDefaultDate(meal.date)
    setMealDialogOpen(true)
  }, [])

  const handleDeleteMeal = useCallback(async (id: string) => {
    await removeMealFromSupabase(id)
    toast.success(t.mealPlan.deleteMeal)
  }, [removeMealFromSupabase, t])

  const handleAddAllToGrocery = useCallback(async () => {
    const count = await addAllIngredientsToGrocery()
    if (count > 0) {
      toast.success(t.mealPlan.addedToGrocery.replace('{count}', count.toString()))
    } else {
      toast.info(isRTL ? 'جميع المكونات موجودة بالفعل' : 'All ingredients already exist')
    }
  }, [addAllIngredientsToGrocery, t, isRTL])

  const handleAISuggestion = useCallback(async (suggestion: { title: string; description: string; prepTime: number; calories: number; ingredients: string[] }) => {
    setEditingMeal(null)
    setDefaultMealType('lunch')
    setDefaultDate(today)
    const familyId = currentFamily?.id || 'demo-family-001'
    const userId = user?.id || 'demo-user-001'
    const prefillMeal: Meal = {
      id: crypto.randomUUID(),
      title: suggestion.title,
      description: suggestion.description,
      mealType: 'lunch',
      date: today,
      assignedTo: [],
      ingredients: suggestion.ingredients,
      prepTime: suggestion.prepTime,
      calories: suggestion.calories,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    }
    await addMealToSupabase(prefillMeal, familyId, userId)
    toast.success(isRTL ? 'تمت إضافة الوجبة!' : 'Meal added!')
  }, [today, addMealToSupabase, currentFamily?.id, user?.id, isRTL])

  const weekEnd = addDays(weekStart, 6)
  const weekLabel = `${weekStart.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}`

  return (
    <Container maxWidth="lg" sx={{ py: 3 }} dir={isRTL ? 'rtl' : 'ltr'}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: `${theme.palette.primary.main}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Restaurant sx={{ color: 'primary.main' }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700}>{t.mealPlan.title}</Typography>
              <Typography variant="body2" color="text.secondary">{weekLabel}</Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton onClick={handlePrevWeek}><ChevronLeft /></IconButton>
            <Button size="small" variant="outlined" onClick={handleToday}>{isRTL ? 'اليوم' : 'Today'}</Button>
            <IconButton onClick={handleNextWeek}><ChevronRight /></IconButton>
            <Button size="small" variant="outlined" startIcon={<AutoAwesome sx={{ fontSize: 14 }} />} onClick={() => setAiDialogOpen(true)}>
              {t.mealPlan.suggestMeals}
            </Button>
            <Button variant="contained" size="small" startIcon={<Add sx={{ fontSize: 14 }} />} onClick={handleAddNew}>
              {t.mealPlan.addMeal}
            </Button>
          </Stack>
        </Stack>

        {/* Stats */}
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          {[
            { label: t.mealPlan.mealsThisWeek, value: weekMeals.length, color: 'primary' },
            { label: t.mealPlan.ingredients, value: totalIngredients, color: 'secondary' },
          ].map((stat) => (
            <Paper key={stat.label} variant="outlined" sx={{ flex: '1 1 120px', p: 2, textAlign: 'center' }}>
              <Typography variant="h6" fontWeight={700} color={`${stat.color}.main`}>{stat.value}</Typography>
              <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
            </Paper>
          ))}
        </Stack>

        {/* Week Grid */}
        <Paper variant="outlined" sx={{ p: 2, overflowX: 'auto' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 1 : 7}, 1fr)`, gap: 2, minWidth: isMobile ? 0 : 900 }}>
            {weekDays.map((day) => {
              const dayMeals = getMealsForDate(day.date)
              return (
                <Stack key={day.key} spacing={1}>
                  {/* Day header */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                    <Stack>
                      <Typography variant="caption" fontWeight={600} color={day.isToday ? 'primary' : 'text.secondary'}>{day.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{day.date.slice(5)}</Typography>
                    </Stack>
                    {day.isToday && <Chip label="Today" size="small" color="primary" sx={{ fontSize: 10, height: 18 }} />}
                  </Stack>

                  {/* Meal slots */}
                  {mealTypes.map((mt) => {
                    const mtMeals = dayMeals.filter((m) => m.mealType === mt)
                    return (
                      <Stack key={mt} spacing={0.5}>
                        {mtMeals.length > 0 ? (
                          mtMeals.map((meal) => <MealCard key={meal.id} meal={meal} onClick={() => handleViewMeal(meal)} />)
                        ) : (
                          <AddMealSlot mealType={mt} date={day.date} onClick={handleAddSlot} />
                        )}
                      </Stack>
                    )
                  })}
                </Stack>
              )
            })}
          </Box>
        </Paper>

        {/* Actions */}
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button variant="outlined" size="small" startIcon={<ShoppingCart sx={{ fontSize: 14 }} />} onClick={handleAddAllToGrocery}>
            {t.mealPlan.addToGrocery}
          </Button>
        </Stack>
      </Stack>

      {/* Meal Dialog */}
      <MealDialog
        open={mealDialogOpen}
        onOpenChange={(open) => { setMealDialogOpen(open); if (!open) setEditingMeal(null) }}
        meal={editingMeal}
        mealType={defaultMealType}
        date={defaultDate}
        onSave={handleSaveMeal}
        familyMembers={familyMembers}
      />

      {/* Meal Detail Sheet */}
      <MealDetailSheet
        meal={detailMeal}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteMeal}
      />

      {/* AI Suggestions Dialog */}
      <AISuggestionsDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onSelect={handleAISuggestion}
      />
    </Container>
  )
}
