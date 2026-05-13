'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AutoAwesome, Refresh } from '@mui/icons-material'
import {
  Card,
  CardContent,
  Box,
  Typography,
  Skeleton as MuiSkeleton,
  IconButton,
  Chip,
  alpha,
  createTheme,
  ThemeProvider,
  Stack,
} from '@mui/material'
import { useI18n } from '@/i18n/use-translation'
import type { Task, CalendarEvent, GroceryItem, FamilyMember } from '@/types'
import { isToday, parseISO, format } from 'date-fns'

// ─── Teal theme ────────────────────────────────────────────────────

const tealTheme = createTheme({
  palette: {
    primary: { main: '#0D6B58' },
    secondary: { main: '#F59E0B' },
  },
  shape: { borderRadius: 16 },
})

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

  textRef.current = text

  useEffect(() => {
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
      <ThemeProvider theme={tealTheme}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MuiSkeleton variant="rounded" width={20} height={20} />
                  <MuiSkeleton width={112} height={16} />
                </Box>
                <MuiSkeleton variant="rounded" width={32} height={20} sx={{ borderRadius: 5 }} />
              </Box>
              <Stack spacing={1}>
                <MuiSkeleton height={16} />
                <MuiSkeleton width="80%" height={16} />
                <MuiSkeleton width="60%" height={16} />
              </Stack>
            </CardContent>
          </Card>
        </motion.div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={tealTheme}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', position: 'relative', overflow: 'hidden' }}>
          {/* Gradient border overlay */}
          <Box sx={{
            position: 'absolute', inset: 0, borderRadius: 4,
            border: '1px solid transparent',
            background: `linear-gradient(to right, ${alpha('#0D6B58', 0.2)}, ${alpha('#F59E0B', 0.2)}) border-box`,
            WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
          }} />

          <CardContent sx={{ p: 2.5, position: 'relative', zIndex: 1, '&:last-child': { pb: 2.5 } }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box sx={{
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 1.5,
                  background: `linear-gradient(135deg, ${alpha('#0D6B58', 0.15)}, ${alpha('#F59E0B', 0.15)})`,
                }}>
                  <AutoAwesome sx={{ fontSize: 16, color: 'secondary.main', animation: 'pulse 2s infinite' }} />
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {t.dashboard.familyInsights}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  size="small"
                  label={t.dashboard.aiPowered}
                  sx={{
                    height: 18,
                    fontSize: 10,
                    fontWeight: 700,
                    background: 'linear-gradient(to right, #0D6B58, #F59E0B)',
                    color: '#FFFFFF',
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
                <IconButton
                  size="small"
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  sx={{ width: 28, height: 28, color: 'text.secondary' }}
                >
                  <Refresh sx={{ fontSize: 14, animation: isRefreshing ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
                </IconButton>
              </Box>
            </Box>

            {/* Summary content with typing animation */}
            <Box sx={{ minHeight: 60 }}>
              {isGenerating ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {[0, 150, 300].map((delay) => (
                      <Box key={delay} sx={{
                        width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main',
                        animation: 'bounce 1s infinite',
                        animationDelay: `${delay}ms`,
                        '@keyframes bounce': {
                          '0%, 100%': { transform: 'translateY(0)' },
                          '50%': { transform: 'translateY(-4px)' },
                        },
                      }} />
                    ))}
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t.dashboard.generating}</Typography>
                </Box>
              ) : (
                <Typography variant="body2" sx={{ lineHeight: 1.6, color: 'text.secondary' }}>
                  {displayedText}
                  {isTyping && (
                    <Box component="span" sx={{
                      display: 'inline-block', width: 2, height: 14, ml: 0.25,
                      bgcolor: 'primary.main', animation: 'pulse 1s infinite',
                      verticalAlign: 'middle',
                    }} />
                  )}
                </Typography>
              )}
            </Box>

            {/* Subtle gradient accent at bottom */}
            <Box sx={{
              mt: 1.5, height: 1, width: '100%',
              background: `linear-gradient(to right, transparent, ${alpha('#0D6B58', 0.2)}, transparent)`,
              pointerEvents: 'none',
            }} />
          </CardContent>
        </Card>
      </motion.div>
    </ThemeProvider>
  )
}
