'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/i18n/use-translation'
import type { Task, CalendarEvent, GroceryItem, FamilyMember } from '@/types'
import { isToday, parseISO, format } from 'date-fns'

// ─── Smart Fallback Summary Generator ──────────────────────────

function generateSmartSummary(
 tasks: Task[],
 groceryItems: GroceryItem[],
 events: CalendarEvent[],
 members: FamilyMember[],
 isRTL: boolean
): string {
 const now = new Date()
 const totalTasks = tasks.length
 const completedTasks = tasks.filter((t) => t.status === 'done').length
 const pendingTasks = tasks.filter((t) => t.status !== 'done').length
 const overdueTasks = tasks.filter(
  (t) => t.status !== 'done' && t.due_date && parseISO(t.due_date) < now
 ).length
 const urgentTasks = tasks.filter((t) => t.status !== 'done' && t.priority === 'urgent').length
 const todayDueTasks = tasks.filter(
  (t) => t.status !== 'done' && t.due_date && isToday(parseISO(t.due_date))
 ).length

 const groceryTotal = groceryItems.length
 const groceryChecked = groceryItems.filter((i) => i.checked).length
 const groceryUnchecked = groceryTotal - groceryChecked
 const groceryPercentage = groceryTotal > 0 ? Math.round((groceryChecked / groceryTotal) * 100) : 0

 const todayEvents = events.filter((e) => isToday(parseISO(e.start_time)))
 const upcomingEventsCount = events.length

 if (isRTL) {
  const parts: string[] = []

  if (todayDueTasks > 0) {
   parts.push(`لديك ${todayDueTasks} مهمة مستحقة اليوم${urgentTasks > 0 ? `، منها ${urgentTasks} عاجلة` : ''}.`)
  } else if (pendingTasks > 0) {
   parts.push(`لديك ${pendingTasks} مهام قيد الانتظار${overdueTasks > 0 ? ` و${overdueTasks} متأخرة` : ''}.`)
  }

  if (totalTasks > 0) {
   const completionRate = Math.round((completedTasks / totalTasks) * 100)
   parts.push(`تم إنجاز ${completionRate}% من المهام${groceryTotal > 0 ? ` و${groceryPercentage}% من قائمة البقالة` : ''}.`)
  }

  if (todayEvents.length > 0) {
   const eventNames = todayEvents.map((e) => `${e.title} الساعة ${format(parseISO(e.start_time), 'h:mm a')}`).join(' و')
   parts.push(`لا تنسَ: ${eventNames}!`)
  } else if (upcomingEventsCount > 0) {
   parts.push(`لديك ${upcomingEventsCount} أحداث قادمة هذا الأسبوع.`)
  }

  if (overdueTasks > 0) {
   parts.push(`نقترح إعطاء الأولوية للمهام المتأخرة لإبقاء العائلة على المسار الصحيح.`)
  } else if (groceryUnchecked > 0 && groceryUnchecked <= 3) {
   parts.push(`متبقي ${groceryUnchecked} عناصر فقط في قائمة البقالة - يمكنك إنهاؤها بسرعة!`)
  }

  if (parts.length === 0) {
   return 'مرحبًا بك في USRA PLUS! ابدأ بإضافة المهام والأحداث لمتابعة نشاط عائلتك.'
  }
  return parts.join(' ')
 } else {
  const parts: string[] = []

  if (todayDueTasks > 0) {
   parts.push(`You have ${todayDueTasks} task${todayDueTasks > 1 ? 's' : ''} due today${urgentTasks > 0 ? `, including ${urgentTasks} urgent` : ''}.`)
  } else if (pendingTasks > 0) {
   parts.push(`You have ${pendingTasks} pending task${pendingTasks > 1 ? 's' : ''}${overdueTasks > 0 ? ` and ${overdueTasks} overdue` : ''}.`)
  }

  if (totalTasks > 0) {
   const completionRate = Math.round((completedTasks / totalTasks) * 100)
   parts.push(`${completionRate}% of tasks completed${groceryTotal > 0 ? ` and ${groceryPercentage}% of your grocery list checked off` : ''}.`)
  }

  if (todayEvents.length > 0) {
   const eventNames = todayEvents.map((e) => `${e.title} at ${format(parseISO(e.start_time), 'h:mm a')}`).join(' and ')
   parts.push(`Don't forget: ${eventNames}!`)
  } else if (upcomingEventsCount > 0) {
   parts.push(`You have ${upcomingEventsCount} upcoming event${upcomingEventsCount > 1 ? 's' : ''} this week.`)
  }

  if (overdueTasks > 0) {
   parts.push(`Consider prioritizing overdue tasks to keep the family on track.`)
  } else if (groceryUnchecked > 0 && groceryUnchecked <= 3) {
   parts.push(`Only ${groceryUnchecked} grocery items left — you can wrap those up quickly!`)
  }

  if (parts.length === 0) {
   return 'Welcome to USRA PLUS! Start by adding tasks and events to track your family activity.'
  }
  return parts.join(' ')
 }
}

// ─── Typing Animation Hook ────────────────────────────────────

function useTypingAnimation(text: string, speed: number = 25) {
 const [displayedLength, setDisplayedLength] = useState(0)
 const [isTyping, setIsTyping] = useState(false)
 const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null)
 const textRef = useRef(text)

 // Keep textRef in sync
 textRef.current = text

 useEffect(() => {
  // Reset on text change
  setDisplayedLength(0)
  setIsTyping(text.length > 0)

  if (!text) return

  let currentIndex = 0

  const animate = () => {
   currentIndex++
   if (currentIndex <= textRef.current.length) {
    setDisplayedLength(currentIndex)
    animationRef.current = setTimeout(animate, speed)
   } else {
    setIsTyping(false)
   }
  }

  animationRef.current = setTimeout(animate, speed)

  return () => {
   if (animationRef.current) {
    clearTimeout(animationRef.current)
   }
  }
 }, [text, speed])

 const displayedText = text.slice(0, displayedLength)

 return { displayedText, isTyping }
}

// ─── AI Summary Widget ────────────────────────────────────────

interface AISummaryWidgetProps {
 tasks: Task[]
 groceryItems: GroceryItem[]
 events: CalendarEvent[]
 members: FamilyMember[]
 isLoading: boolean
}

export function AISummaryWidget({
 tasks,
 groceryItems,
 events,
 members,
 isLoading,
}: AISummaryWidgetProps) {
 const { t, isRTL, language } = useI18n()
 const [summary, setSummary] = useState('')
 const [isGenerating, setIsGenerating] = useState(false)
 const [isRefreshing, setIsRefreshing] = useState(false)
 const hasFetchedRef = useRef(false)

 const { displayedText, isTyping } = useTypingAnimation(summary, 22)

 const fetchSummary = useCallback(async () => {
  if (isLoading) return

  setIsGenerating(true)
  setSummary('')

  try {
   const now = new Date()
   const todayEvents = events.filter((e) => isToday(parseISO(e.start_time)))

   const familyData = {
    tasks: {
     total: tasks.length,
     completed: tasks.filter((t) => t.status === 'done').length,
     pending: tasks.filter((t) => t.status !== 'done').length,
     overdue: tasks.filter(
      (t) => t.status !== 'done' && t.due_date && parseISO(t.due_date) < now
     ).length,
     urgent: tasks.filter((t) => t.status !== 'done' && t.priority === 'urgent').length,
     todayDue: tasks.filter(
      (t) => t.status !== 'done' && t.due_date && isToday(parseISO(t.due_date))
     ).length,
     byPriority: {
      low: tasks.filter((t) => t.priority === 'low').length,
      medium: tasks.filter((t) => t.priority === 'medium').length,
      high: tasks.filter((t) => t.priority === 'high').length,
      urgent: tasks.filter((t) => t.priority === 'urgent').length,
     },
    },
    groceries: {
     total: groceryItems.length,
     checked: groceryItems.filter((i) => i.checked).length,
     unchecked: groceryItems.filter((i) => !i.checked).length,
     percentage:
      groceryItems.length > 0
       ? Math.round((groceryItems.filter((i) => i.checked).length / groceryItems.length) * 100)
       : 0,
    },
    events: {
     today: todayEvents.map((e) => ({
      title: e.title,
      time: format(parseISO(e.start_time), 'h:mm a'),
     })),
     upcoming: events.length,
    },
    members: members.length,
    language,
   }

   const response = await fetch('/api/ai/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(familyData),
   })

   if (response.ok) {
    const data = await response.json()
    setSummary(data.summary || generateSmartSummary(tasks, groceryItems, events, members, isRTL))
   } else {
    setSummary(generateSmartSummary(tasks, groceryItems, events, members, isRTL))
   }
  } catch {
   setSummary(generateSmartSummary(tasks, groceryItems, events, members, isRTL))
  } finally {
   setIsGenerating(false)
   setIsRefreshing(false)
  }
 }, [tasks, groceryItems, events, members, isLoading, language, isRTL])

 // Auto-fetch on mount (once) - only depends on isLoading to trigger initial fetch
 // fetchSummary is intentionally excluded from deps to prevent re-render loops
 // from frequently-changing array references (tasks, groceryItems, events, members)
 useEffect(() => {
  if (!isLoading && !hasFetchedRef.current) {
   hasFetchedRef.current = true
   fetchSummary()
  }
 }, [isLoading])

 const handleRegenerate = () => {
  setIsRefreshing(true)
  fetchSummary()
 }

 if (isLoading) {
  return (
   <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
   >
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5">
     <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
       <Skeleton className="size-5 rounded" />
       <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-5 w-8 rounded-full" />
     </div>
     <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
     </div>
    </div>
   </motion.div>
  )
 }

 return (
  <motion.div
   initial={{ opacity: 0, y: 12 }}
   animate={{ opacity: 1, y: 0 }}
   transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
  >
   <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5">
    {/* Gradient border overlay */}
    <div className="pointer-events-none absolute inset-0 rounded-2xl border border-transparent bg-gradient-to-r from-primary/20 to-accent/20 bg-clip-padding p-[1px]">
     <div className="h-full w-full rounded-2xl bg-card" />
    </div>

    {/* Content */}
    <div className="relative z-10">
     {/* Header */}
     <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
       <div className="relative flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
        <Sparkles className="size-4 text-accent animate-pulse" />
       </div>
       <h3 className="text-sm font-semibold text-foreground">
        {t.dashboard.familyInsights}
       </h3>
      </div>
      <div className="flex items-center gap-2">
       <span className="bg-gradient-to-r from-primary to-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
        {t.dashboard.aiPowered}
       </span>
       <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        onClick={handleRegenerate}
        disabled={isGenerating}
       >
        <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
       </Button>
      </div>
     </div>

     {/* Summary content with typing animation */}
     <div className="min-h-[60px]">
      {isGenerating ? (
       <div className="flex items-center gap-2">
        <div className="flex gap-1">
         <span className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
         <span className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
         <span className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-xs text-muted-foreground">{t.dashboard.generating}</span>
       </div>
      ) : (
       <p className="text-sm leading-relaxed text-muted-foreground">
        {displayedText}
        {isTyping && (
         <span className="animate-pulse border-r-2 border-primary ml-0.5">&nbsp;</span>
        )}
       </p>
      )}
     </div>

     {/* Subtle gradient accent at bottom */}
     <div className="pointer-events-none mt-3 h-[1px] w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </div>
   </div>
  </motion.div>
 )
}
