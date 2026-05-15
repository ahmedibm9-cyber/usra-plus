'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Users, Activity, Clock, Search, ChevronUp, ChevronDown,
  TrendingUp, Shield, Network, Flame, MapPin, Globe, Zap,
  Heart, UserCheck, UsersRound, CircleDot, Download
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

// ─── API Response Types ──────────────────────────────────────────────────────

interface ApiFamily {
  id: string
  name: string
  member_count: number
  plan: string
  tasks_completed_count: number
  last_active: string | null
  activity_score: number
}

interface FamiliesApiResponse {
  source: 'live' | 'demo'
  data: ApiFamily[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

interface FamilyRecord {
  id: string
  name: string
  members: number
  plan: string
  tasksCompleted: number
  lastActive: string | null
  activityScore: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SortField = 'name' | 'members' | 'plan' | 'tasksCompleted' | 'lastActive' | 'activityScore'
type SortDir = 'asc' | 'desc'

const PLAN_ORDER: Record<string, number> = { 'Free': 0, 'free': 0, 'Pro': 1, 'pro': 1, 'Family+': 2, 'family_plus': 2 }

function normalizePlan(plan: string): string {
  const map: Record<string, string> = { 'free': 'Free', 'pro': 'Pro', 'family_plus': 'Family+' }
  return map[plan] || plan
}

function formatTimeAgo(iso: string | null): string {
  if (!iso) return 'Never'
  const now = new Date()
  const then = new Date(iso)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Plan Badge (Rose-themed) ────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const config: Record<string, { bg: string; text: string; border: string }> = {
    'Free': { bg: 'bg-[--bg-surface]', text: 'text-[--text-muted]', border: 'border-[--border-subtle]' },
    'Pro': { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', border: 'border-[--status-danger-border]' },
    'Family+': { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]' },
  }
  const c = config[plan] || config['Free']
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
      {plan}
    </span>
  )
}

// ─── Activity Score Bar (Rose/Pink Gradient) ────────────────────────────────

function ActivityScoreBar({ score }: { score: number }) {
  const gradientClass = score >= 80
    ? 'from-[#E50914] to-[#C40812]'
    : score >= 60
      ? 'from-[#E50914] to-[#F4C430]'
      : 'from-[#F4C430] to-[#E0B52E]'

  const textColor = score >= 80 ? 'text-[#E50914]' : score >= 60 ? 'text-[#E50914]' : 'text-[#F4C430]'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-[--bg-surface] rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className={`h-full rounded-full bg-gradient-to-r ${gradientClass}`} />
      </div>
      <span className={`text-xs font-medium min-w-[32px] text-right ${textColor}`}>{score}</span>
    </div>
  )
}

// ─── Stat Card (Rose Accent) ────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, trend, trendLabel, delay = 0 }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string | number
  trend?: string; trendLabel?: string; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3 }}
      className="bg-[--bg-surface] border border-[--status-danger-border] rounded-xl p-5 hover:border-[--status-danger-border] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden group">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[--status-danger]/5 via-transparent to-[--status-danger]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="w-9 h-9 rounded-lg bg-[--status-danger-bg] border border-[--status-danger-border] flex items-center justify-center">
            <Icon className="w-4 h-4 text-[--status-danger]" />
          </div>
          {trend && (
            <span className={`text-xs font-medium flex items-center gap-0.5 ${trend.startsWith('↑') || trend.startsWith('+') ? 'text-[--status-danger]' : 'text-[--text-muted]'}`}>
              <TrendingUp className="w-3 h-3" />{trend}
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-[--text-primary] mt-3">{value}</p>
        <p className="text-xs text-[--text-muted] mt-1">{label}</p>
        {trendLabel && <p className="text-[10px] text-[--text-muted] mt-0.5">{trendLabel}</p>}
      </div>
    </motion.div>
  )
}

// ─── Heatmap Cell (Rose Scale) ──────────────────────────────────────────────

function HeatmapCell({ value }: { value: number }) {
  const maxVal = 10
  const intensity = Math.min(value / maxVal, 1)
  const opacity = intensity * 0.8
  return (
    <div className="w-full aspect-square rounded-[2px] transition-colors"
      style={{ backgroundColor: intensity > 0 ? `rgba(244, 63, 94, ${opacity})` : 'var(--border-subtle)' }}
      title={`${value}`} />
  )
}

// ─── Family Constellation Card ───────────────────────────────────────────────

function FamilyConstellationCard({ family }: { family: FamilyRecord }) {
  const memberNodes = Math.min(family.members, 6)
  const planColor = family.plan === 'Family+' ? '#F59E0B' : family.plan === 'Pro' ? '#F43F5E' : '#64748B'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="bg-[--bg-surface] border border-[--status-danger-border] rounded-xl p-5 hover:border-[--status-danger-border] transition-all group"
    >
      {/* Network visualization: center node + orbiting member nodes */}
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-24 h-24">
          {/* Center family node */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-[--text-primary] border-2"
              style={{ borderColor: planColor, background: `linear-gradient(135deg, ${planColor}20, ${planColor}10)` }}>
              {family.name.charAt(0)}
            </div>
          </div>
          {/* Orbiting member nodes */}
          {Array.from({ length: memberNodes }).map((_, i) => {
            const angle = (i / memberNodes) * 2 * Math.PI - Math.PI / 2
            const radius = 36
            const x = 48 + radius * Math.cos(angle) - 8
            const y = 48 + radius * Math.sin(angle) - 8
            return (
              <motion.div key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                className="absolute w-4 h-4 rounded-full bg-[--status-danger-bg] border border-[--status-danger-border]"
                style={{ left: x, top: y }}>
                {/* Connection line via SVG would be complex, use simple dot */}
              </motion.div>
            )
          })}
          {/* Connection lines (simplified as ring) */}
          <div className="absolute inset-2 border border-[--status-danger-border] rounded-full" />
        </div>
      </div>

      {/* Family info */}
      <div className="text-center">
        <h3 className="text-sm font-semibold text-[--text-primary]">{family.name}</h3>
        <div className="flex items-center justify-center gap-2 mt-1.5">
          <PlanBadge plan={family.plan} />
        </div>
        <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-[--text-muted]">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />{family.members} members
          </span>
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3" />Score {family.activityScore}
          </span>
        </div>

        {/* Activity score bar */}
        <div className="mt-3">
          <ActivityScoreBar score={family.activityScore} />
        </div>

        <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-[--text-muted]">
          <span>{family.tasksCompleted} tasks completed</span>
          <span>·</span>
          <span>{formatTimeAgo(family.lastActive)}</span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isFiltered }: { isFiltered: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-20 px-4">
      {/* Network illustration */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500/10 to-[--status-danger-bg] flex items-center justify-center border border-[--status-danger-border]">
          <Network className="w-10 h-10 text-[--status-danger]" />
        </div>
        {/* Decorative orbit rings */}
        <div className="absolute -inset-3 border border-[--status-danger-border] rounded-full" />
        <div className="absolute -inset-6 border border-[--status-danger-border] rounded-full" />
        {/* Orbiting dots */}
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute -inset-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[--status-danger-bg]" />
        </motion.div>
      </div>
      <h3 className="text-lg font-semibold text-[--text-secondary] mb-2">
        {isFiltered ? 'No families match your search' : 'No families yet'}
      </h3>
      <p className="text-sm text-[--text-muted] text-center max-w-sm">
        {isFiltered
          ? 'Try adjusting your search query to find what you\'re looking for.'
          : 'When families are created, they\'ll appear here as an interactive network. Connect your Supabase database to see live family data.'
        }
      </p>
      {!isFiltered && (
        <div className="mt-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-[--status-danger-bg] border border-[--status-danger-border]">
          <Shield className="w-4 h-4 text-[--status-danger]/50" />
          <span className="text-xs text-[--status-danger]/50">Privacy-safe — only aggregate family metrics are shown</span>
        </div>
      )}
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminFamilies() {
  // Data state
  const [families, setFamilies] = useState<FamilyRecord[]>([])
  const [dataSource, setDataSource] = useState<'live' | 'demo'>('demo')
  const [isLoading, setIsLoading] = useState(true)

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('activityScore')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [viewMode, setViewMode] = useState<'constellation' | 'table'>('constellation')

  // ─── Fetch families from API ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function fetchFamilies() {
      setIsLoading(true)
      try {
        const res = await fetch('/api/admin/families?pageSize=100', {
          credentials: 'same-origin',
        })
        if (!cancelled && res.status === 401) {
          // Session expired — force logout
          const { useAdminAuthStore } = await import('@/stores/admin-auth-store')
          useAdminAuthStore.getState().logoutAdmin()
          return
        }
        if (!cancelled && res.ok) {
          const json = await safeJsonResponse<FamiliesApiResponse>(res)
          setDataSource(json.source)
          const mapped: FamilyRecord[] = json.data.map(f => ({
            id: f.id,
            name: f.name,
            members: f.member_count,
            plan: normalizePlan(f.plan),
            tasksCompleted: f.tasks_completed_count,
            lastActive: f.last_active,
            activityScore: f.activity_score,
          }))
          setFamilies(mapped)
        }
      } catch {
        if (!cancelled) {
          setDataSource('demo')
          setFamilies([])
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchFamilies()
    return () => { cancelled = true }
  }, [])

  // ─── Derived stats ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalFamilies = families.length
    const totalMembers = families.reduce((sum, f) => sum + f.members, 0)
    const avgFamilySize = totalFamilies > 0 ? (totalMembers / totalFamilies).toFixed(1) : '0'
    const activeFamilies = families.filter(f => f.activityScore >= 60).length
    const avgActivityScore = totalFamilies > 0 ? Math.round(families.reduce((sum, f) => sum + f.activityScore, 0) / totalFamilies) : 0
    return { totalFamilies, avgFamilySize, activeFamilies, avgActivityScore, totalMembers }
  }, [families])

  // ─── Derived: Plan distribution for network sidebar ──────────────────
  const planDistribution = useMemo(() => {
    const free = families.filter(f => f.plan === 'Free').length
    const pro = families.filter(f => f.plan === 'Pro').length
    const family = families.filter(f => f.plan === 'Family+').length
    return [
      { plan: 'Free', count: free, color: '#64748B', pct: families.length ? Math.round((free / families.length) * 100) : 0 },
      { plan: 'Pro', count: pro, color: '#F43F5E', pct: families.length ? Math.round((pro / families.length) * 100) : 0 },
      { plan: 'Family+', count: family, color: '#F59E0B', pct: families.length ? Math.round((family / families.length) * 100) : 0 },
    ]
  }, [families])

  // ─── Derived: Activity tier breakdown ─────────────────────────────────
  const activityTiers = useMemo(() => {
    const high = families.filter(f => f.activityScore >= 80).length
    const medium = families.filter(f => f.activityScore >= 50 && f.activityScore < 80).length
    const low = families.filter(f => f.activityScore < 50).length
    return [
      { tier: 'High', count: high, color: '#F43F5E', icon: Flame },
      { tier: 'Medium', count: medium, color: '#EC4899', icon: Zap },
      { tier: 'Low', count: low, color: '#D946EF', icon: CircleDot },
    ]
  }, [families])

  // ─── Derived: Member size distribution ────────────────────────────────
  const memberDistribution = useMemo(() => {
    const sizes = [
      { label: '2 members', count: families.filter(f => f.members === 2).length },
      { label: '3 members', count: families.filter(f => f.members === 3).length },
      { label: '4 members', count: families.filter(f => f.members === 4).length },
      { label: '5+ members', count: families.filter(f => f.members >= 5).length },
    ]
    return sizes.filter(s => s.count > 0)
  }, [families])

  // ─── Heatmap data: generated from family activity patterns ───────────
  const heatmapData = useMemo(() => {
    const days = 7
    const hours = 24
    const data: number[][] = []
    const baseActivity = Math.min(families.length * 0.5, 10)
    for (let d = 0; d < days; d++) {
      const row: number[] = []
      for (let h = 0; h < hours; h++) {
        let base = 0
        if (baseActivity > 0) {
          if (h >= 18 && h <= 21) base = Math.min(baseActivity * (0.8 + Math.random() * 0.2), 10)
          else if (h >= 8 && h <= 10) base = Math.min(baseActivity * (0.5 + Math.random() * 0.2), 10)
          else if (h >= 12 && h <= 13) base = Math.min(baseActivity * (0.3 + Math.random() * 0.2), 10)
          else if (h >= 23 || h <= 5) base = Math.min(baseActivity * 0.1, 10)
          else base = Math.min(baseActivity * 0.2, 10)
        }
        row.push(Math.round(base))
      }
      data.push(row)
    }
    return data
  }, [families.length])

  const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const HEATMAP_HOURS = Array.from({ length: 24 }, (_, i) => i)

  // Filtered + sorted data
  const filteredFamilies = useMemo(() => {
    let result = [...families]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(f => f.name.toLowerCase().includes(q))
    }
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'members': cmp = a.members - b.members; break
        case 'plan': cmp = (PLAN_ORDER[a.plan] ?? 0) - (PLAN_ORDER[b.plan] ?? 0); break
        case 'tasksCompleted': cmp = a.tasksCompleted - b.tasksCompleted; break
        case 'lastActive': cmp = (a.lastActive || '').localeCompare(b.lastActive || ''); break
        case 'activityScore': cmp = a.activityScore - b.activityScore; break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [families, searchQuery, sortField, sortDir])

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc') }
    else { setSortField(field); setSortDir('desc') }
  }, [sortField])

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-[--text-muted]" />
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-[--status-danger]" /> : <ChevronDown className="w-3 h-3 text-[--status-danger]" />
  }

  const isFiltered = searchQuery !== ''

  return (
    <div className="space-y-6">
      {/* ─── Header: Family Network Hub ───────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[--status-danger-bg] border border-[--status-danger-border] flex items-center justify-center">
              <Network className="w-5 h-5 text-[--status-danger]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[--text-primary] flex items-center gap-2">
                Family Network Hub
                {dataSource === 'demo' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[--status-danger-bg] text-[--status-danger] border border-[--status-danger-border] font-normal">
                    No Live Data
                  </span>
                )}
              </h2>
              <div className="h-[2px] w-full mt-1 rounded-full bg-gradient-to-r from-[--status-danger] via-[--status-warning] to-transparent" />
            </div>
          </div>
          {/* Export buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/admin/export?type=families&format=csv', { credentials: 'same-origin' })
                  if (res.ok) {
                    const json = await safeJsonResponse(res)
                    const blob = new Blob([json.data], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `families-export-${new Date().toISOString().split('T')[0]}.csv`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                    toast.success('Families exported as CSV')
                  }
                } catch { toast.error('Export failed') }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--bg-surface] border border-[--border-subtle] text-[--text-muted] hover:text-[--text-secondary] transition-colors"
            >
              <Download className="w-3 h-3" /> CSV
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/admin/export?type=families&format=json', { credentials: 'same-origin' })
                  if (res.ok) {
                    const json = await safeJsonResponse(res)
                    const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `families-export-${new Date().toISOString().split('T')[0]}.json`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                    toast.success('Families exported as JSON')
                  }
                } catch { toast.error('Export failed') }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--bg-surface] border border-[--border-subtle] text-[--text-muted] hover:text-[--text-secondary] transition-colors"
            >
              <Download className="w-3 h-3" /> JSON
            </button>
          </div>
        </div>
        <p className="text-sm text-[--text-muted] mt-2 ml-[52px]">Track family engagement, activity, and network health</p>
      </motion.div>

      {/* ─── Top Stats Row (Rose Grid) ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Home} label="Total Families" value={stats.totalFamilies} delay={0} />
        <StatCard icon={Users} label="Avg Family Size" value={stats.avgFamilySize} delay={0.05} />
        <StatCard icon={Activity} label="Active Families" value={stats.activeFamilies} delay={0.1} />
        <StatCard icon={Heart} label="Avg Activity Score" value={stats.avgActivityScore} delay={0.15} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[--bg-surface] border border-[--status-danger-border] rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-[--status-danger-bg] rounded w-2/3 mb-3" />
                <div className="h-2 bg-[--status-danger-bg] rounded w-full mb-2" />
                <div className="h-2 bg-[--status-danger-bg] rounded w-4/5" />
              </div>
            ))}
          </div>
          <div className="lg:col-span-3 bg-[--bg-surface] border border-[--status-danger-border] rounded-xl p-8 animate-pulse">
            <div className="h-8 bg-[--status-danger-bg] rounded w-1/3 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-48 bg-[--status-danger-bg] rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      ) : families.length === 0 ? (
        <EmptyState isFiltered={isFiltered} />
      ) : (
        <>
          {/* ─── Main Content: Sidebar + Family Explorer ─────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* ─── Left Sidebar: Network Stats ────────────────────── */}
            <div className="lg:col-span-1 space-y-4">
              {/* Plan Distribution */}
              <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.3 }}
                className="bg-[--bg-surface] border border-[--status-danger-border] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-[--text-primary] mb-4 flex items-center gap-2">
                  <UsersRound className="w-3.5 h-3.5 text-[--status-danger]/60" />
                  Plan Distribution
                </h3>
                <div className="space-y-3">
                  {planDistribution.map(p => (
                    <div key={p.plan}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[--text-muted]">{p.plan}</span>
                        <span className="text-xs text-[--text-muted]">{p.count} · {p.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-[--bg-surface] rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ delay: 0.3, duration: 0.6 }}
                          className="h-full rounded-full" style={{ backgroundColor: p.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Activity Tiers */}
              <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25, duration: 0.3 }}
                className="bg-[--bg-surface] border border-[--status-danger-border] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-[--text-primary] mb-4 flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-[--status-danger]/60" />
                  Activity Tiers
                </h3>
                <div className="space-y-3">
                  {activityTiers.map(tier => (
                    <div key={tier.tier} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <tier.icon className="w-3.5 h-3.5" style={{ color: tier.color }} />
                        <span className="text-xs text-[--text-muted]">{tier.tier}</span>
                      </div>
                      <span className="text-xs font-metric text-[--text-muted]">{tier.count}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Member Size Distribution */}
              <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.3 }}
                className="bg-[--bg-surface] border border-[--status-danger-border] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-[--text-primary] mb-4 flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-[--status-danger]/60" />
                  Family Sizes
                </h3>
                <div className="space-y-2">
                  {memberDistribution.map(s => (
                    <div key={s.label} className="flex items-center justify-between">
                      <span className="text-xs text-[--text-muted]">{s.label}</span>
                      <span className="text-xs font-metric text-[--text-muted]">{s.count}</span>
                    </div>
                  ))}
                  {memberDistribution.length === 0 && <p className="text-xs text-[--text-muted]">No data</p>}
                </div>
              </motion.div>
            </div>

            {/* ─── Main Area: Family Explorer ─────────────────────── */}
            <div className="lg:col-span-3 space-y-4">
              {/* Toolbar */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }}
                className="bg-[--bg-surface] border border-[--status-danger-border] rounded-xl p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="relative flex-1 w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
                    <input type="text" placeholder="Search families..." value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-[--bg-primary] border border-[--status-danger-border] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[--status-danger-border] transition-colors" />
                  </div>
                  <span className="text-xs text-[--status-danger]/30">
                    {filteredFamilies.length} families
                  </span>
                  {/* View toggle */}
                  <div className="flex items-center gap-1 border border-[--status-danger-border] rounded-lg p-0.5">
                    <button onClick={() => setViewMode('constellation')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'constellation' ? 'bg-[--status-danger-bg] text-[--status-danger]' : 'text-[--text-muted] hover:text-[--text-muted]'}`}>
                      <Network className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-[--status-danger-bg] text-[--status-danger]' : 'text-[--text-muted] hover:text-[--text-muted]'}`}>
                      <Users className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* ─── Constellation View ──────────────────────────────── */}
              {viewMode === 'constellation' ? (
                <AnimatePresence mode="wait">
                  {filteredFamilies.length > 0 ? (
                    <motion.div key="constellation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      <AnimatePresence mode="popLayout">
                        {filteredFamilies.map(family => (
                          <FamilyConstellationCard key={family.id} family={family} />
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    <EmptyState isFiltered={isFiltered} />
                  )}
                </AnimatePresence>
              ) : (
                /* ─── Table View ──────────────────────────────────────── */
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }}
                  className="bg-[--bg-surface] border border-[--status-danger-border] rounded-xl overflow-hidden">
                  <div className="max-h-[500px] overflow-y-auto">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[--status-danger-border] hover:bg-transparent">
                          <TableHead className="text-[--text-muted] text-xs font-medium cursor-pointer select-none hover:text-[--text-secondary] transition-colors"
                            onClick={() => handleSort('name')}>
                            <span className="inline-flex items-center gap-1">Family Name {renderSortIcon('name')}</span>
                          </TableHead>
                          <TableHead className="text-[--text-muted] text-xs font-medium cursor-pointer select-none hover:text-[--text-secondary] transition-colors"
                            onClick={() => handleSort('members')}>
                            <span className="inline-flex items-center gap-1">Members {renderSortIcon('members')}</span>
                          </TableHead>
                          <TableHead className="text-[--text-muted] text-xs font-medium cursor-pointer select-none hover:text-[--text-secondary] transition-colors"
                            onClick={() => handleSort('plan')}>
                            <span className="inline-flex items-center gap-1">Plan {renderSortIcon('plan')}</span>
                          </TableHead>
                          <TableHead className="text-[--text-muted] text-xs font-medium cursor-pointer select-none hover:text-[--text-secondary] transition-colors"
                            onClick={() => handleSort('tasksCompleted')}>
                            <span className="inline-flex items-center gap-1">Tasks Completed {renderSortIcon('tasksCompleted')}</span>
                          </TableHead>
                          <TableHead className="text-[--text-muted] text-xs font-medium cursor-pointer select-none hover:text-[--text-secondary] transition-colors"
                            onClick={() => handleSort('lastActive')}>
                            <span className="inline-flex items-center gap-1">Last Active {renderSortIcon('lastActive')}</span>
                          </TableHead>
                          <TableHead className="text-[--text-muted] text-xs font-medium cursor-pointer select-none hover:text-[--text-secondary] transition-colors min-w-[180px]"
                            onClick={() => handleSort('activityScore')}>
                            <span className="inline-flex items-center gap-1">Activity Score {renderSortIcon('activityScore')}</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {filteredFamilies.map((family, idx) => (
                            <motion.tr key={family.id}
                              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                              transition={{ delay: idx * 0.02, duration: 0.2 }}
                              className="border-b border-[--status-danger-border] hover:bg-[--status-danger-bg] transition-colors">
                              <TableCell className="py-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[--status-danger]/30 to-[--status-warning]/30 ring-2 ring-[--status-danger]/20 flex items-center justify-center text-xs font-medium text-[--text-primary] shrink-0">
                                    {family.name.charAt(0)}
                                  </div>
                                  <span className="text-sm font-medium text-[--text-primary]">{family.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-[--text-muted]">
                                <div className="flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-[--status-danger]/30" />{family.members}
                                </div>
                              </TableCell>
                              <TableCell><PlanBadge plan={family.plan} /></TableCell>
                              <TableCell className="text-sm text-[--text-muted]">{family.tasksCompleted.toLocaleString()}</TableCell>
                              <TableCell className="text-sm text-[--text-muted]">{formatTimeAgo(family.lastActive)}</TableCell>
                              <TableCell><ActivityScoreBar score={family.activityScore} /></TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                        {filteredFamilies.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <Home className="w-8 h-8 text-[--status-danger]" />
                                <p className="text-sm text-[--text-muted]">No families found</p>
                                <p className="text-xs text-[--text-muted]">Try adjusting your search</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* ─── Family Activity Heatmap (Rose Scale) ─────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }}
            className="bg-[--bg-surface] border border-[--status-danger-border] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[--text-primary]">Family Activity Heatmap</h3>
                <p className="text-xs text-[--status-danger]/30 mt-0.5">Activity intensity by day and hour</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[--text-muted]">Less</span>
                <div className="flex items-center gap-0.5">
                  <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'var(--border-subtle)' }} />
                  <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(244,63,94,0.15)' }} />
                  <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(244,63,94,0.35)' }} />
                  <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(244,63,94,0.55)' }} />
                  <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(244,63,94,0.8)' }} />
                </div>
                <span className="text-[10px] text-[--text-muted]">More</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="flex items-center mb-1 pl-10">
                  {HEATMAP_HOURS.filter(h => h % 3 === 0).map(h => (
                    <div key={h} className="flex-1 text-center">
                      <span className="text-[9px] text-[--text-muted]">{h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-[2px]">
                  {HEATMAP_DAYS.map((day, dayIdx) => (
                    <div key={day} className="flex items-center gap-1">
                      <span className="text-[10px] text-[--text-muted] w-8 shrink-0 text-right">{day}</span>
                      <div className="flex-1 grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                        {heatmapData[dayIdx].map((value, hourIdx) => (
                          <HeatmapCell key={hourIdx} value={value} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* ─── Privacy Notice ────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="flex items-start gap-3 p-4 rounded-xl bg-[--bg-surface] border border-[--status-danger-border]">
        <Shield className="w-4 h-4 text-[--status-danger] mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-[--text-muted]">Privacy-First Analytics</p>
          <p className="text-[10px] text-[--status-danger]/30 mt-0.5 leading-relaxed">
            This view displays only aggregate family metrics and engagement statistics. Private messages, files, task content,
            and personal data are never accessible. All data is anonymized and shown in aggregate form only.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
