'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Flame, Trophy, Medal } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'

import { useTaskStore } from '@/stores/task-store'
import { useGroceryStore } from '@/stores/grocery-store'
import { useAppStore } from '@/stores/app-store'
import { useI18n } from '@/i18n/use-translation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

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

 // Color based on score
 const getColor = (s: number) => {
  if (s < 40) return '#EF4444' // red
  if (s < 70) return 'var(--accent)' // yellow (premium warning)
  return 'var(--primary)' // signal red (active/healthy)
 }

 const color = getColor(score)

 return (
  <div className="relative" style={{ width: size, height: size }}>
   <svg width={size} height={size} className="transform -rotate-90">
    {/* Track */}
    <circle
     cx={size / 2}
     cy={size / 2}
     r={radius}
     stroke="var(--border)"
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
     style={{ transition: 'stroke-dashoffset 1.2s ease-out, stroke 0.5s ease' }}
     className="blur-sm"
    />
   </svg>
   {/* Center content */}
   <div className="absolute inset-0 flex flex-col items-center justify-center">
    <motion.span
     className="text-3xl font-bold text-foreground"
     initial={{ opacity: 0, scale: 0.5 }}
     animate={{ opacity: 1, scale: 1 }}
     transition={{ delay: 0.5, duration: 0.4, type: 'spring' }}
    >
     {score}
    </motion.span>
    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
     Score
    </span>
   </div>
  </div>
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
  <div className="flex-1 min-w-0">
   <div className="flex items-center justify-between mb-1.5">
    <span className="text-xs text-muted-foreground truncate">{label}</span>
    <span className="text-sm font-semibold text-foreground">{currentValue}</span>
   </div>
   <div className="h-8 w-full">
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
   </div>
   <div className="flex items-center gap-1 mt-1">
    {diff !== 0 && (
     <>
      {isUp ? (
       <TrendingUp className="size-3 text-primary" />
      ) : (
       <TrendingDown className="size-3 text-red-400" />
      )}
      <span className={`text-[10px] font-medium ${isUp ? 'text-primary' : 'text-red-400'}`}>
       {isUp ? '+' : ''}{diff}
      </span>
      <span className="text-[10px] text-muted-foreground">
       {isRTL ? 'مقارنة بالأسبوع الماضي' : 'vs last week'}
      </span>
     </>
    )}
    {diff === 0 && (
     <span className="text-[10px] text-muted-foreground">
      {isRTL ? 'مثل الأسبوع الماضي' : 'Same as last week'}
     </span>
    )}
   </div>
  </div>
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
 // Demo leaderboard data
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
  1: { color: 'text-accent', bgColor: 'bg-accent/15', icon: Trophy },
  2: { color: 'text-muted-foreground', bgColor: 'bg-gray-500/15', icon: Medal },
  3: { color: 'text-orange-400', bgColor: 'bg-orange-500/15', icon: Medal },
 }

 return (
  <div>
   <div className="flex items-center justify-between mb-3">
    <span className="text-xs font-semibold text-foreground">{leaderboardLabel}</span>
    <button className="text-[10px] text-primary hover:underline">
     {viewAllLabel}
    </button>
   </div>
   <div className="space-y-2">
    {members.map((member) => {
     const style = rankStyles[member.rank]
     const RankIcon = style.icon
     return (
      <motion.div
       key={member.id}
       initial={{ opacity: 0, x: isRTL ? 8 : -8 }}
       animate={{ opacity: 1, x: 0 }}
       transition={{ delay: member.rank * 0.1 }}
       className="flex items-center gap-2.5 rounded-lg border border-border bg-muted p-2"
      >
       {/* Rank badge */}
       <div className={`flex size-6 items-center justify-center rounded-full ${style.bgColor}`}>
        <RankIcon className={`size-3.5 ${style.color}`} />
       </div>
       {/* Avatar */}
       <Avatar className="h-6 w-6">
        <AvatarImage src={member.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/20 text-[8px] text-primary">
         {member.name.charAt(0)}
        </AvatarFallback>
       </Avatar>
       {/* Name */}
       <span className="text-xs font-medium text-foreground flex-1 truncate">
        {member.name}
       </span>
       {/* Tasks count */}
       <span className="text-[10px] text-muted-foreground">
        {member.tasksCompleted} {isRTL ? 'مهمة' : 'tasks'}
       </span>
      </motion.div>
     )
    })}
   </div>
  </div>
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
   className="flex items-center gap-3 rounded-xl border border-border bg-muted p-3"
  >
   <div className="flex size-10 items-center justify-center rounded-xl bg-accent/15 shrink-0">
    <Flame className="size-5 text-accent" />
   </div>
   <div className="min-w-0">
    <div className="flex items-center gap-1.5">
     <span className="text-lg font-bold text-foreground">{streakDays}</span>
     <span className="text-xs text-muted-foreground">{streakLabel}</span>
    </div>
    <p className="text-[10px] text-primary font-medium mt-0.5">
     🔥 {keepGoingLabel}
    </p>
   </div>
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
   color: 'var(--primary)',
   label: isRTL ? 'المهام' : 'Tasks',
  },
  events: {
   data: [1, 2, 1, 0, 2, 1, 1],
   current: 1,
   previous: 2,
   color: 'var(--primary)',
   label: isRTL ? 'الأحداث' : 'Events',
  },
  grocery: {
   data: [2, 4, 3, 5, 2, 4, 3],
   current: 3,
   previous: 2,
   color: 'var(--accent)',
   label: isRTL ? 'البقالة' : 'Grocery',
  },
 }), [isRTL])

 // Streak (mock)
 const streakDays = 7

 return (
  <motion.div
   initial={{ opacity: 0, y: 12 }}
   animate={{ opacity: 1, y: 0 }}
   transition={{ duration: 0.4, delay: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
  >
   <div className="glass rounded-2xl border border-border bg-card hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 transition-all duration-200 p-6">
    {/* Header */}
    <div className="mb-5 flex items-center gap-2">
     <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15">
      <TrendingUp className="size-4 text-primary" />
     </div>
     <h3 className="text-sm font-semibold text-foreground">
      {t.activity.analytics}
     </h3>
    </div>

    {/* Content Grid */}
    <div className="grid gap-6 lg:grid-cols-4">
     {/* Productivity Score Ring */}
     <div className="flex flex-col items-center justify-center lg:col-span-1">
      <ProductivityRing score={productivityScore} />
      <p className="mt-3 text-sm font-semibold text-foreground">
       {t.activity.productivityScore}
      </p>
      <p className="mt-0.5 text-[10px] text-muted-foreground text-center">
       {familyMembers.length} {isRTL ? 'أعضاء' : 'members'} {isRTL ? 'يساهمون' : 'contributing'}
      </p>
     </div>

     {/* Sparkline Charts */}
     <div className="lg:col-span-1 flex flex-col gap-4">
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
     </div>

     {/* Member Leaderboard */}
     <div className="lg:col-span-1">
      <MemberLeaderboard
       isRTL={isRTL}
       leaderboardLabel={t.activity.leaderboard}
       viewAllLabel={isRTL ? 'عرض الكل' : 'View all'}
      />
     </div>

     {/* Weekly Streak */}
     <div className="lg:col-span-1 flex flex-col gap-3">
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
       className="flex items-center gap-3 rounded-xl border border-border bg-muted p-3"
      >
       <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 shrink-0">
        <TrendingUp className="size-5 text-primary" />
       </div>
       <div className="min-w-0">
        <div className="flex items-center gap-1.5">
         <span className="text-lg font-bold text-foreground">
          {sparklineData.tasks.data.reduce((a, b) => a + b, 0)}
         </span>
         <span className="text-xs text-muted-foreground">{t.activity.tasksThisWeek}</span>
        </div>
        <p className="text-[10px] text-primary font-medium mt-0.5">
         +{sparklineData.tasks.current - sparklineData.tasks.previous} {t.activity.comparedToLastWeek}
        </p>
       </div>
      </motion.div>
     </div>
    </div>
   </div>
  </motion.div>
 )
}
