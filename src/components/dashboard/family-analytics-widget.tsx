'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  LocalFireDepartment,
  EmojiEvents,
  MilitaryTech,
} from '@mui/icons-material'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'
import {
  Card,
  CardContent,
  Box,
  Typography,
  Avatar,
  alpha,
  createTheme,
  ThemeProvider,
  Grid,
  Stack,
  Button,
} from '@mui/material'

import { useTaskStore } from '@/stores/task-store'
import { useGroceryStore } from '@/stores/grocery-store'
import { useAppStore } from '@/stores/app-store'
import { useI18n } from '@/i18n/use-translation'

// ─── Teal theme ────────────────────────────────────────────────────

const tealTheme = createTheme({
  palette: {
    primary: { main: '#0D6B58' },
    secondary: { main: '#F59E0B' },
  },
  shape: { borderRadius: 16 },
})

// ─── Animated SVG Ring Component ─────────────────────────────────

function ProductivityRing({
  score,
  size = 140,
  strokeWidth = 10,
}: {
  score: number
  size?: number
  strokeWidth?: number
}) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100)
    return () => clearTimeout(timer)
  }, [score])

  const offset = circumference - (animatedScore / 100) * circumference

  // Color based on score - using teal shades instead of red
  const getColor = (s: number) => {
    if (s < 40) return '#4E9C8C' // lighter teal (low)
    if (s < 70) return '#F59E0B' // amber (medium)
    return '#0D6B58' // teal (healthy)
  }

  const color = getColor(score)

  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E0E0E0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s ease-out, stroke 0.5s ease' }}
        />
        {/* Gradient glow */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth + 4}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          opacity={0.15}
          style={{ transition: 'stroke-dashoffset 1.2s ease-out, stroke 0.5s ease', filter: 'blur(4px)' }}
        />
      </svg>
      {/* Center content */}
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4, type: 'spring' }}
        >
          <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1 }}>
            {score}
          </Typography>
        </motion.span>
        <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary', fontSize: 10 }}>
          Score
        </Typography>
      </Box>
    </Box>
  )
}

// ─── Sparkline Chart Component ───────────────────────────────────

function SparklineChart({
  data,
  color,
  currentValue,
  previousValue,
  label,
  isRTL,
}: {
  data: number[]
  color: string
  currentValue: number
  previousValue: number
  label: string
  isRTL: boolean
}) {
  const chartData = data.map((value, index) => ({ index, value }))
  const diff = currentValue - previousValue
  const isUp = diff > 0

  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{currentValue}</Typography>
      </Box>
      <Box sx={{ height: 32, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              animationBegin={300}
              animationDuration={600}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
        {diff !== 0 && (
          <>
            {isUp ? (
              <TrendingUp sx={{ fontSize: 12, color: 'primary.main' }} />
            ) : (
              <TrendingDown sx={{ fontSize: 12, color: 'primary.main' }} />
            )}
            <Typography variant="caption" sx={{ fontWeight: 500, color: 'primary.main', fontSize: 10 }}>
              {isUp ? '+' : ''}{diff}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
              {isRTL ? 'مقارنة بالأسبوع الماضي' : 'vs last week'}
            </Typography>
          </>
        )}
        {diff === 0 && (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
            {isRTL ? 'مثل الأسبوع الماضي' : 'Same as last week'}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

// ─── Member Leaderboard Component ────────────────────────────────

function MemberLeaderboard({
  isRTL,
  leaderboardLabel,
  viewAllLabel,
}: {
  isRTL: boolean
  leaderboardLabel: string
  viewAllLabel: string
}) {
  const members = [
    {
      id: 'demo-user-001',
      name: isRTL ? 'أحمد' : 'Ahmed',
      avatar_url: null,
      tasksCompleted: 5,
      rank: 1,
    },
    {
      id: 'demo-user-002',
      name: isRTL ? 'نورة' : 'Noura',
      avatar_url: null,
      tasksCompleted: 3,
      rank: 2,
    },
    {
      id: 'demo-user-003',
      name: isRTL ? 'خالد' : 'Khalid',
      avatar_url: null,
      tasksCompleted: 2,
      rank: 3,
    },
  ]

  const rankStyles: Record<number, { color: string; bgColor: string; icon: React.ElementType }> = {
    1: { color: '#F59E0B', bgColor: alpha('#F59E0B', 0.15), icon: EmojiEvents },
    2: { color: '#9E9E9E', bgColor: alpha('#9E9E9E', 0.15), icon: MilitaryTech },
    3: { color: '#0D6B58', bgColor: alpha('#0D6B58', 0.15), icon: MilitaryTech },
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 12 }}>{leaderboardLabel}</Typography>
        <Button size="small" sx={{ fontSize: 10, textTransform: 'none', color: 'primary.main', minWidth: 0, p: 0 }}>
          {viewAllLabel}
        </Button>
      </Box>
      <Stack spacing={1}>
        {members.map((member) => {
          const style = rankStyles[member.rank]
          const RankIcon = style.icon
          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: isRTL ? 8 : -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: member.rank * 0.1 }}
            >
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.25,
                borderRadius: 1, border: '1px solid', borderColor: 'divider',
                bgcolor: 'action.hover', p: 1,
              }}>
                {/* Rank badge */}
                <Box sx={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', bgcolor: style.bgColor }}>
                  <RankIcon sx={{ fontSize: 14, color: style.color }} />
                </Box>
                {/* Avatar */}
                <Avatar
                  src={member.avatar_url || undefined}
                  sx={{ width: 24, height: 24, bgcolor: alpha('#0D6B58', 0.15), fontSize: 8, color: 'primary.main' }}
                >
                  {member.name.charAt(0)}
                </Avatar>
                {/* Name */}
                <Typography variant="caption" sx={{ fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {member.name}
                </Typography>
                {/* Tasks count */}
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                  {member.tasksCompleted} {isRTL ? 'مهمة' : 'tasks'}
                </Typography>
              </Box>
            </motion.div>
          )
        })}
      </Stack>
    </Box>
  )
}

// ─── Weekly Streak Component ─────────────────────────────────────

function WeeklyStreak({
  streakDays,
  isRTL,
  streakLabel,
  keepGoingLabel,
}: {
  streakDays: number
  isRTL: boolean
  streakLabel: string
  keepGoingLabel: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
    >
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        borderRadius: 1.5, border: '1px solid', borderColor: 'divider',
        bgcolor: 'action.hover', p: 1.5,
      }}>
        <Box sx={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1.5, bgcolor: alpha('#F59E0B', 0.15), flexShrink: 0 }}>
          <LocalFireDepartment sx={{ fontSize: 20, color: '#F59E0B' }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>{streakDays}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{streakLabel}</Typography>
          </Box>
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 500, mt: 0.25, display: 'block', fontSize: 10 }}>
            🔥 {keepGoingLabel}
          </Typography>
        </Box>
      </Box>
    </motion.div>
  )
}

// ─── Main Family Analytics Widget ────────────────────────────────

export function FamilyAnalyticsWidget() {
  const { t, isRTL } = useI18n()
  const tasks = useTaskStore(s => s.tasks)
  const groceryItems = useGroceryStore(s => s.items)
  const { familyMembers } = useAppStore()

  // Compute productivity score
  const productivityScore = useMemo(() => {
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((task) => task.status === 'done').length
    const groceryTotal = groceryItems.length
    const groceryChecked = groceryItems.filter((i) => i.checked).length

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    return Math.min(100, Math.round(completionRate * 0.7 + (groceryTotal > 0 ? (groceryChecked / groceryTotal) * 30 : 15)))
  }, [tasks, groceryItems])

  // Sparkline data (mock 7-day data)
  const sparklineData = useMemo(() => ({
    tasks: {
      data: [3, 5, 2, 4, 6, 3, 5],
      current: 5,
      previous: 3,
      color: '#0D6B58',
      label: isRTL ? 'المهام' : 'Tasks',
    },
    events: {
      data: [1, 2, 1, 0, 2, 1, 1],
      current: 1,
      previous: 2,
      color: '#0D6B58',
      label: isRTL ? 'الأحداث' : 'Events',
    },
    grocery: {
      data: [2, 4, 3, 5, 2, 4, 3],
      current: 3,
      previous: 2,
      color: '#F59E0B',
      label: isRTL ? 'البقالة' : 'Grocery',
    },
  }), [isRTL])

  // Streak (mock)
  const streakDays = 7

  return (
    <ThemeProvider theme={tealTheme}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
              <Box sx={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1.5, bgcolor: alpha('#0D6B58', 0.12) }}>
                <TrendingUp sx={{ fontSize: 16, color: 'primary.main' }} />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {t.activity.analytics}
              </Typography>
            </Box>

            {/* Content Grid */}
            <Grid container spacing={3}>
              {/* Productivity Score Ring */}
              <Grid size={{ xs: 12, lg: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <ProductivityRing score={productivityScore} />
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 1.5 }}>
                    {t.activity.productivityScore}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center', mt: 0.25, fontSize: 10 }}>
                    {familyMembers.length} {isRTL ? 'أعضاء' : 'members'} {isRTL ? 'يساهمون' : 'contributing'}
                  </Typography>
                </Box>
              </Grid>

              {/* Sparkline Charts */}
              <Grid size={{ xs: 12, lg: 3 }}>
                <Stack spacing={2}>
                  <SparklineChart
                    data={sparklineData.tasks.data}
                    color={sparklineData.tasks.color}
                    currentValue={sparklineData.tasks.current}
                    previousValue={sparklineData.tasks.previous}
                    label={sparklineData.tasks.label}
                    isRTL={isRTL}
                  />
                  <SparklineChart
                    data={sparklineData.events.data}
                    color={sparklineData.events.color}
                    currentValue={sparklineData.events.current}
                    previousValue={sparklineData.events.previous}
                    label={sparklineData.events.label}
                    isRTL={isRTL}
                  />
                  <SparklineChart
                    data={sparklineData.grocery.data}
                    color={sparklineData.grocery.color}
                    currentValue={sparklineData.grocery.current}
                    previousValue={sparklineData.grocery.previous}
                    label={sparklineData.grocery.label}
                    isRTL={isRTL}
                  />
                </Stack>
              </Grid>

              {/* Member Leaderboard */}
              <Grid size={{ xs: 12, lg: 3 }}>
                <MemberLeaderboard
                  isRTL={isRTL}
                  leaderboardLabel={t.activity.leaderboard}
                  viewAllLabel={isRTL ? 'عرض الكل' : 'View all'}
                />
              </Grid>

              {/* Weekly Streak */}
              <Grid size={{ xs: 12, lg: 3 }}>
                <Stack spacing={1.5}>
                  <WeeklyStreak
                    streakDays={streakDays}
                    isRTL={isRTL}
                    streakLabel={t.activity.streak}
                    keepGoingLabel={t.activity.keepGoing}
                  />

                  {/* Tasks this week summary */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      borderRadius: 1.5, border: '1px solid', borderColor: 'divider',
                      bgcolor: 'action.hover', p: 1.5,
                    }}>
                      <Box sx={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1.5, bgcolor: alpha('#0D6B58', 0.12), flexShrink: 0 }}>
                        <TrendingUp sx={{ fontSize: 20, color: 'primary.main' }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                            {sparklineData.tasks.data.reduce((a, b) => a + b, 0)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t.activity.tasksThisWeek}</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 500, mt: 0.25, display: 'block', fontSize: 10 }}>
                          +{sparklineData.tasks.current - sparklineData.tasks.previous} {t.activity.comparedToLastWeek}
                        </Typography>
                      </Box>
                    </Box>
                  </motion.div>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </motion.div>
    </ThemeProvider>
  )
}
