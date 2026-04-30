'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sunrise,
  Sun,
  Moon,
  Cookie,
  Clock,
  Flame,
  ShoppingCart,
  Sparkles,
  Trash2,
  Pencil,
  X,
  UtensilsCrossed,
  Link as LinkIcon,
  Users,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useMealStore, type Meal, type MealType } from '@/stores/meal-store'
import { useAppStore } from '@/stores/app-store'
import { useGroceryStore } from '@/stores/grocery-store'
import { useI18n } from '@/i18n/use-translation'
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

const MEAL_TYPE_CONFIG: Record<MealType, { icon: React.ElementType; colorClass: string; bgClass: string; borderClass: string }> = {
  breakfast: { icon: Sunrise, colorClass: 'text-amber-400', bgClass: 'bg-amber-500/10', borderClass: 'border-amber-500/20' },
  lunch: { icon: Sun, colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/20' },
  dinner: { icon: Moon, colorClass: 'text-indigo-400', bgClass: 'bg-indigo-500/10', borderClass: 'border-indigo-500/20' },
  snack: { icon: Cookie, colorClass: 'text-violet-400', bgClass: 'bg-violet-500/10', borderClass: 'border-violet-500/20' },
}

// ─── Meal Card ─────────────────────────────────────────────────────
function MealCard({ meal, onClick }: { meal: Meal; onClick: () => void }) {
  const { t } = useI18n()
  const config = MEAL_TYPE_CONFIG[meal.mealType]
  const Icon = config.icon

  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={`
        w-full text-left rounded-xl p-3 transition-all duration-200
        ${config.bgClass} ${config.borderClass} border
        hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20
        cursor-pointer group
      `}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Icon className={`size-3.5 shrink-0 ${config.colorClass}`} />
          <span className="text-xs font-medium text-[--text-primary] truncate">
            {meal.title}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {meal.prepTime && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-[--bg-surface-2] text-[--text-muted] border-0">
            <Clock className="size-2.5 mr-0.5" />
            {meal.prepTime} {t.mealPlan.minutes}
          </Badge>
        )}
        {meal.calories && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-[--bg-surface-2] text-[--text-muted] border-0">
            <Flame className="size-2.5 mr-0.5" />
            {meal.calories} {t.mealPlan.kcal}
          </Badge>
        )}
      </div>

      {meal.assignedTo.length > 0 && (
        <div className="flex items-center mt-2 -space-x-1.5 rtl:space-x-reverse">
          {meal.assignedTo.slice(0, 3).map((userId) => (
            <Avatar key={userId} className="size-5 ring-1 ring-[--bg-primary]">
              <AvatarFallback className="text-[8px] bg-[--bg-surface-2] text-[--text-muted]">
                {userId.slice(-1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {meal.assignedTo.length > 3 && (
            <span className="text-[9px] text-[--text-muted] ml-2 rtl:mr-2">+{meal.assignedTo.length - 3}</span>
          )}
        </div>
      )}
    </motion.button>
  )
}

// ─── Add Meal Slot ─────────────────────────────────────────────────
function AddMealSlot({ mealType, date, onClick }: { mealType: MealType; date: string; onClick: (mt: MealType, d: string) => void }) {
  const { t } = useI18n()
  const config = MEAL_TYPE_CONFIG[mealType]
  const Icon = config.icon

  return (
    <button
      onClick={() => onClick(mealType, date)}
      className={`
        w-full flex items-center justify-center gap-1.5 rounded-xl p-2.5
        border border-dashed border-[--border-subtle]
        text-[--text-muted] hover:text-[--text-secondary]
        hover:border-[--border-medium] hover:bg-[--bg-surface-2]
        transition-all duration-200 cursor-pointer
      `}
    >
      <Icon className="size-3.5" />
      <span className="text-[10px] font-medium">{t.mealPlan[mealType]}</span>
      <Plus className="size-3" />
    </button>
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
  familyMembers: { id: string; nickname?: string | null; profiles?: { first_name?: string | null } }[]
}) {
  const { t, isRTL } = useI18n()
  const { user } = useAppStore()
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
      id: meal?.id || `meal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
    { value: 'breakfast', icon: Sunrise, label: t.mealPlan.breakfast },
    { value: 'lunch', icon: Sun, label: t.mealPlan.lunch },
    { value: 'dinner', icon: Moon, label: t.mealPlan.dinner },
    { value: 'snack', icon: Cookie, label: t.mealPlan.snack },
  ]

  return (
    <DialogContent className="bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] max-w-lg max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      <DialogHeader>
        <DialogTitle className="text-[--text-primary]">
          {meal ? t.mealPlan.editMeal : t.mealPlan.addMeal}
        </DialogTitle>
      </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-[--text-secondary] text-xs">{t.mealPlan.title_field}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.mealPlan.title_field}
              className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary]"
            />
          </div>

          {/* Meal Type */}
          <div className="space-y-1.5">
            <Label className="text-[--text-secondary] text-xs">{t.mealPlan.mealType}</Label>
            <div className="grid grid-cols-4 gap-2">
              {mealTypeOptions.map((opt) => {
                const Icon = opt.icon
                const config = MEAL_TYPE_CONFIG[opt.value]
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMealType(opt.value)}
                    className={`
                      flex flex-col items-center gap-1 p-2 rounded-xl border transition-all duration-200
                      ${mealType === opt.value
                        ? `${config.bgClass} ${config.borderClass} ${config.colorClass}`
                        : 'border-[--border-subtle] text-[--text-muted] hover:border-[--border-medium]'
                      }
                    `}
                  >
                    <Icon className="size-4" />
                    <span className="text-[10px] font-medium">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-[--text-secondary] text-xs">{t.mealPlan.date}</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary]"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-[--text-secondary] text-xs">{t.mealPlan.description}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.mealPlan.description}
              rows={2}
              className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] resize-none"
            />
          </div>

          {/* Prep Time + Calories */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[--text-secondary] text-xs">{t.mealPlan.prepTime} ({t.mealPlan.minutes})</Label>
              <Input
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="30"
                className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[--text-secondary] text-xs">{t.mealPlan.calories} ({t.mealPlan.kcal})</Label>
              <Input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="450"
                className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary]"
              />
            </div>
          </div>

          {/* Ingredients */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[--text-secondary] text-xs">{t.mealPlan.ingredients}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-[10px] h-6 text-indigo-400 hover:text-indigo-300"
                onClick={() => setShowGroceryImport(!showGroceryImport)}
              >
                <ShoppingCart className="size-3 mr-1" />
                {t.mealPlan.importFromGrocery}
              </Button>
            </div>

            {/* Grocery import panel */}
            <AnimatePresence>
              {showGroceryImport && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-[--border-subtle] bg-[--bg-primary] p-2 space-y-1">
                    {groceryItems.length === 0 ? (
                      <p className="text-xs text-[--text-muted] text-center py-2">{isRTL ? 'لا توجد عناصر' : 'No items'}</p>
                    ) : (
                      groceryItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleImportFromGrocery(item.name)}
                          className={`
                            w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors
                            ${ingredients.includes(item.name)
                              ? 'bg-indigo-500/10 text-indigo-400'
                              : 'text-[--text-secondary] hover:bg-[--bg-surface-2]'
                            }
                          `}
                        >
                          {item.name}
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Ingredient tags */}
            <div className="flex flex-wrap gap-1.5">
              {ingredients.map((ing, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="bg-[--bg-surface-2] text-[--text-secondary] border-0 pr-1 gap-0.5"
                >
                  {ing}
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(idx)}
                    className="hover:text-red-400 transition-colors p-0.5"
                  >
                    <X className="size-2.5" />
                  </button>
                </Badge>
              ))}
            </div>

            {/* Add ingredient input */}
            <div className="flex gap-2">
              <Input
                value={ingredientInput}
                onChange={(e) => setIngredientInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddIngredient()
                  }
                }}
                placeholder={t.mealPlan.addIngredient}
                className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddIngredient}
                className="shrink-0 border-[--border-subtle]"
              >
                <Plus className="size-3" />
              </Button>
            </div>
          </div>

          {/* Assigned To */}
          {familyMembers.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[--text-secondary] text-xs">{t.mealPlan.assignedTo}</Label>
              <div className="flex flex-wrap gap-2">
                {familyMembers.map((member) => {
                  const name = member.nickname || member.profiles?.first_name || member.id
                  const isSelected = assignedTo.includes(member.user_id)
                  return (
                    <label
                      key={member.id}
                      className={`
                        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all
                        ${isSelected
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                          : 'border-[--border-subtle] text-[--text-muted] hover:border-[--border-medium]'
                        }
                      `}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleAssign(member.user_id)}
                        className="size-3"
                      />
                      <span className="text-xs">{name}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recipe URL */}
          <div className="space-y-1.5">
            <Label className="text-[--text-secondary] text-xs">{t.mealPlan.recipeUrl}</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[--text-muted]" />
              <Input
                value={recipeUrl}
                onChange={(e) => setRecipeUrl(e.target.value)}
                placeholder="https://..."
                className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] pl-9"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[--border-subtle]"
          >
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            {t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
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
  familyMembers: { id: string; nickname?: string | null; profiles?: { first_name?: string | null } }[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <MealDialogInner
        key={meal?.id || 'new'}
        meal={meal}
        mealType={defaultMealType}
        date={defaultDate}
        onSave={onSave}
        onOpenChange={onOpenChange}
        familyMembers={familyMembers}
      />
    </Dialog>
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
  const { familyMembers } = useAppStore()

  const handleAddToGrocery = useCallback(() => {
    if (!meal) return
    const count = useMealStore.getState().addIngredientsToGrocery(meal.id)
    toast.success(t.mealPlan.addedToGrocery.replace('{count}', count.toString()))
  }, [meal, t])

  if (!meal) return null

  const config = MEAL_TYPE_CONFIG[meal.mealType]
  const Icon = config.icon

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isRTL ? 'right' : 'bottom'}
        className="bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] max-h-[85vh] overflow-y-auto"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <SheetHeader>
          <SheetTitle className="text-[--text-primary] flex items-center gap-2">
            <div className={`flex items-center justify-center size-8 rounded-lg ${config.bgClass}`}>
              <Icon className={`size-4 ${config.colorClass}`} />
            </div>
            {meal.title}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4 px-1 pb-4">
          {meal.description && (
            <p className="text-sm text-[--text-secondary]">{meal.description}</p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {meal.prepTime && (
              <div className="flex items-center gap-1.5 text-xs text-[--text-muted]">
                <Clock className="size-3.5" />
                {meal.prepTime} {t.mealPlan.minutes}
              </div>
            )}
            {meal.calories && (
              <div className="flex items-center gap-1.5 text-xs text-[--text-muted]">
                <Flame className="size-3.5" />
                {meal.calories} {t.mealPlan.kcal}
              </div>
            )}
            <Badge className={`${config.bgClass} ${config.colorClass} border-0 text-xs`}>
              {t.mealPlan[meal.mealType]}
            </Badge>
          </div>

          {meal.ingredients.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[--text-secondary] uppercase tracking-wider">
                {t.mealPlan.ingredients}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {meal.ingredients.map((ing, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-[--bg-surface-2] text-[--text-secondary] border-0">
                    {ing}
                  </Badge>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddToGrocery}
                className="w-full border-[--border-subtle] text-indigo-400 hover:text-indigo-300 hover:border-indigo-500/30"
              >
                <ShoppingCart className="size-3.5 mr-1.5" />
                {t.mealPlan.addToGrocery}
              </Button>
            </div>
          )}

          {meal.assignedTo.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[--text-secondary] uppercase tracking-wider">
                {t.mealPlan.assignedTo}
              </h4>
              <div className="flex flex-wrap gap-2">
                {meal.assignedTo.map((userId) => {
                  const member = familyMembers.find((m) => m.user_id === userId)
                  const name = member?.nickname || member?.profiles?.first_name || userId
                  return (
                    <div key={userId} className="flex items-center gap-1.5 text-xs text-[--text-secondary]">
                      <Avatar className="size-5">
                        <AvatarFallback className="text-[8px] bg-[--bg-surface-2] text-[--text-muted]">
                          {name[0]}
                        </AvatarFallback>
                      </Avatar>
                      {name}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {meal.recipeUrl && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[--text-secondary] uppercase tracking-wider">
                {t.mealPlan.recipeUrl}
              </h4>
              <a
                href={meal.recipeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <ExternalLink className="size-3" />
                {meal.recipeUrl}
              </a>
            </div>
          )}

          <Separator className="bg-[--border-subtle]" />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onEdit(meal)
                onOpenChange(false)
              }}
              className="flex-1 border-[--border-subtle]"
            >
              <Pencil className="size-3.5 mr-1.5" />
              {t.mealPlan.editMeal}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onDelete(meal.id)
                onOpenChange(false)
              }}
              className="border-red-500/20 text-red-400 hover:text-red-300 hover:border-red-500/30 hover:bg-red-500/10"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
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
  const { items: groceryItems } = useGroceryStore()
  const [suggestions, setSuggestions] = useState<Array<{ title: string; description: string; prepTime: number; calories: number; ingredients: string[] }>>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true)
    try {
      const groceryNames = groceryItems.map((i) => i.name)
      const res = await fetch('/api/ai/meal-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groceryItems: groceryNames,
          mealType: 'any',
          language: isRTL ? 'ar' : 'en',
        }),
      })
      const data = await res.json()
      if (data.suggestions) {
        setSuggestions(data.suggestions)
      }
    } catch {
      // Fallback suggestions
      setSuggestions([
        {
          title: isRTL ? 'كبسة دجاج' : 'Chicken Kabsa',
          description: isRTL ? 'أرز بسمتي مع دجاج متبل بالتوابل العربية' : 'Basmati rice with spiced chicken',
          prepTime: 60,
          calories: 650,
          ingredients: [isRTL ? 'أرز بسمتي' : 'Basmati Rice', isRTL ? 'دجاج' : 'Chicken', isRTL ? 'توابل' : 'Spices'],
        },
        {
          title: isRTL ? 'سلطة خضراء' : 'Green Salad',
          description: isRTL ? 'سلطة طازجة مع خضروات متنوعة' : 'Fresh salad with mixed vegetables',
          prepTime: 10,
          calories: 120,
          ingredients: [isRTL ? 'خضروات' : 'Vegetables', isRTL ? 'زيت زيتون' : 'Olive Oil'],
        },
        {
          title: isRTL ? 'شوربة عدس' : 'Lentil Soup',
          description: isRTL ? 'شوربة عدس دافئة ومغذية' : 'Warm and nutritious lentil soup',
          prepTime: 30,
          calories: 280,
          ingredients: [isRTL ? 'عدس' : 'Lentils', isRTL ? 'بصل' : 'Onion', isRTL ? 'ثوم' : 'Garlic'],
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [groceryItems, isRTL])

  useEffect(() => {
    if (open) {
      fetchSuggestions()
    }
  }, [open, fetchSuggestions])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="text-[--text-primary] flex items-center gap-2">
            <Sparkles className="size-4 text-indigo-400" />
            {t.mealPlan.suggestMeals}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-[--text-muted]">{t.mealPlan.suggestDesc}</p>

        <div className="space-y-3 mt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-2">
                <Sparkles className="size-6 text-indigo-400 animate-pulse" />
                <p className="text-xs text-[--text-muted]">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
              </div>
            </div>
          ) : (
            suggestions.map((suggestion, idx) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => {
                  onSelect(suggestion)
                  onOpenChange(false)
                }}
                className="w-full text-left p-4 rounded-xl border border-[--border-subtle] bg-[--bg-primary] hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium text-[--text-primary]">{suggestion.title}</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    {suggestion.prepTime > 0 && (
                      <Badge variant="secondary" className="text-[10px] bg-[--bg-surface-2] text-[--text-muted] border-0 h-5">
                        <Clock className="size-2.5 mr-0.5" />{suggestion.prepTime} {t.mealPlan.minutes}
                      </Badge>
                    )}
                    {suggestion.calories > 0 && (
                      <Badge variant="secondary" className="text-[10px] bg-[--bg-surface-2] text-[--text-muted] border-0 h-5">
                        <Flame className="size-2.5 mr-0.5" />{suggestion.calories} {t.mealPlan.kcal}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-[--text-muted] mt-1">{suggestion.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {suggestion.ingredients.slice(0, 5).map((ing, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] bg-[--bg-surface-2] text-[--text-muted] border-0">
                      {ing}
                    </Badge>
                  ))}
                  {suggestion.ingredients.length > 5 && (
                    <Badge variant="secondary" className="text-[10px] bg-[--bg-surface-2] text-[--text-muted] border-0">
                      +{suggestion.ingredients.length - 5}
                    </Badge>
                  )}
                </div>
              </motion.button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Meal Plan Page ───────────────────────────────────────────
export default function MealPlanPage() {
  const { t, isRTL } = useI18n()
  const { meals, selectedWeekStart, setSelectedWeek, addMeal, updateMeal, removeMeal, addAllIngredientsToGrocery, getMealsForDate } = useMealStore()
  const { familyMembers } = useAppStore()
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
      return {
        key,
        date: formatDateStr(d),
        label: t.mealPlan[key],
        isToday: formatDateStr(d) === today,
      }
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

  const handleSaveMeal = useCallback((meal: Meal) => {
    if (editingMeal) {
      updateMeal(meal.id, meal)
    } else {
      addMeal(meal)
    }
  }, [editingMeal, addMeal, updateMeal])

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

  const handleDeleteMeal = useCallback((id: string) => {
    removeMeal(id)
    toast.success(t.mealPlan.deleteMeal)
  }, [removeMeal, t])

  const handleAddAllToGrocery = useCallback(() => {
    const count = addAllIngredientsToGrocery()
    if (count > 0) {
      toast.success(t.mealPlan.addedToGrocery.replace('{count}', count.toString()))
    } else {
      toast.info(isRTL ? 'جميع المكونات موجودة بالفعل' : 'All ingredients already exist')
    }
  }, [addAllIngredientsToGrocery, t, isRTL])

  const handleAISuggestion = useCallback((suggestion: { title: string; description: string; prepTime: number; calories: number; ingredients: string[] }) => {
    setEditingMeal(null)
    setDefaultMealType('lunch')
    setDefaultDate(today)
    // Pre-fill with suggestion data
    const prefillMeal: Meal = {
      id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: suggestion.title,
      description: suggestion.description,
      mealType: 'lunch',
      date: today,
      assignedTo: [],
      ingredients: suggestion.ingredients,
      prepTime: suggestion.prepTime,
      calories: suggestion.calories,
      createdBy: 'demo-user-001',
      createdAt: new Date().toISOString(),
    }
    addMeal(prefillMeal)
    toast.success(isRTL ? 'تمت إضافة الوجبة!' : 'Meal added!')
  }, [today, addMeal, isRTL])

  // Week date range label
  const weekEnd = addDays(weekStart, 6)
  const weekLabel = `${weekStart.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}`

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-indigo-500/10">
            <UtensilsCrossed className="size-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[--text-primary]">{t.mealPlan.title}</h1>
            <p className="text-xs text-[--text-muted]">{t.mealPlan.weekOf.replace('{date}', weekLabel)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Week Navigator */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8 border-[--border-subtle]" onClick={handlePrevWeek}>
              {isRTL ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </Button>
            <Button variant="outline" size="sm" className="border-[--border-subtle] text-xs h-8" onClick={handleToday}>
              {t.mealPlan.today}
            </Button>
            <Button variant="outline" size="icon" className="size-8 border-[--border-subtle]" onClick={handleNextWeek}>
              {isRTL ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
            </Button>
          </div>

          {/* AI Suggestions */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAiDialogOpen(true)}
            className="border-indigo-500/20 text-indigo-400 hover:text-indigo-300 hover:border-indigo-500/30 hover:bg-indigo-500/5"
          >
            <Sparkles className="size-3.5 mr-1.5" />
            {t.mealPlan.suggestMeals}
          </Button>

          {/* Add Meal */}
          <Button
            size="sm"
            onClick={handleAddNew}
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            <Plus className="size-3.5 mr-1.5" />
            {t.mealPlan.addMeal}
          </Button>
        </div>
      </div>

      {/* Weekly Grid */}
      {weekMeals.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16"
        >
          <div className="flex items-center justify-center size-16 rounded-2xl bg-[--bg-surface-2] mb-4">
            <UtensilsCrossed className="size-7 text-[--text-muted]" />
          </div>
          <p className="text-sm text-[--text-muted] text-center max-w-sm">{t.mealPlan.noMeals}</p>
          <Button
            size="sm"
            onClick={handleAddNew}
            className="mt-4 bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            <Plus className="size-3.5 mr-1.5" />
            {t.mealPlan.addMeal}
          </Button>
        </motion.div>
      ) : (
        <>
          {/* Desktop: 7-column grid, Mobile: horizontal scroll */}
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <div className="min-w-[700px] md:min-w-0 grid grid-cols-7 gap-2">
              {/* Day Headers */}
              {weekDays.map((day) => (
                <div
                  key={day.key}
                  className={`
                    flex flex-col items-center py-2 px-1 rounded-xl
                    ${day.isToday ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-[--bg-surface-2]'}
                  `}
                >
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${day.isToday ? 'text-indigo-400' : 'text-[--text-muted]'}`}>
                    {day.label}
                  </span>
                  <span className={`text-sm font-bold ${day.isToday ? 'text-indigo-400' : 'text-[--text-primary]'}`}>
                    {new Date(day.date + 'T00:00:00').getDate()}
                  </span>
                  {day.isToday && (
                    <Badge className="text-[8px] px-1 py-0 h-3.5 bg-indigo-500/20 text-indigo-400 border-0 mt-0.5">
                      {t.mealPlan.today}
                    </Badge>
                  )}
                </div>
              ))}

              {/* Meal Slots */}
              {mealTypes.map((mealType) =>
                weekDays.map((day) => {
                  const dayMeals = getMealsForDate(day.date).filter((m) => m.mealType === mealType)
                  return (
                    <div key={`${day.key}-${mealType}`} className="min-h-[70px]">
                      {dayMeals.length > 0 ? (
                        <div className="space-y-1.5">
                          {dayMeals.map((meal) => (
                            <MealCard
                              key={meal.id}
                              meal={meal}
                              onClick={() => handleViewMeal(meal)}
                            />
                          ))}
                        </div>
                      ) : (
                        <AddMealSlot
                          mealType={mealType}
                          date={day.date}
                          onClick={handleAddSlot}
                        />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Week Summary Bar */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3 p-4 rounded-xl bg-[--bg-surface-2] border border-[--border-subtle]"
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <UtensilsCrossed className="size-4 text-indigo-400" />
                <span className="text-xs text-[--text-muted]">{t.mealPlan.totalMeals}:</span>
                <span className="text-sm font-semibold text-[--text-primary]">{weekMeals.length}</span>
              </div>
              <Separator orientation="vertical" className="h-4 bg-[--border-subtle]" />
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="size-4 text-emerald-400" />
                <span className="text-xs text-[--text-muted]">{t.mealPlan.totalIngredients}:</span>
                <span className="text-sm font-semibold text-[--text-primary]">{totalIngredients}</span>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddAllToGrocery}
              className="border-emerald-500/20 text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/30 hover:bg-emerald-500/5"
              disabled={totalIngredients === 0}
            >
              <ShoppingCart className="size-3.5 mr-1.5" />
              {t.mealPlan.addAllToGrocery}
            </Button>
          </motion.div>
        </>
      )}

      {/* Meal Dialog */}
      <MealDialog
        open={mealDialogOpen}
        onOpenChange={setMealDialogOpen}
        meal={editingMeal}
        mealType={defaultMealType}
        date={defaultDate}
        onSave={handleSaveMeal}
        familyMembers={familyMembers}
      />

      {/* Detail Sheet */}
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
    </div>
  )
}
