'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserPlus, Activity, Clock, Search, ChevronUp, ChevronDown,
  MoreHorizontal, Eye, Ban, Flag, RotateCcw, ChevronLeft, ChevronRight,
  TrendingUp, Shield, Telescope, MapPin, Globe, Filter, LayoutGrid, List,
  Mail, CalendarDays, AlertTriangle,
} from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAdminAuthStore } from '@/stores/admin-auth-store'
import type { UserRecord } from '@/types/admin'

// ─── API Response Types ──────────────────────────────────────────────────────

interface ApiUser {
  id: string
  email: string
  name: string
  plan: string
  status: string
  last_login: string | null
  created_at: string
  family_count: number
  language: string
  country: string | null
}

interface UsersApiResponse {
  source: 'live' | 'demo'
  data: ApiUser[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SortField = 'name' | 'email' | 'plan' | 'status' | 'lastLogin' | 'createdAt'
type SortDir = 'asc' | 'desc'
type ViewMode = 'cards' | 'table'

const PLAN_ORDER: Record<string, number> = { 'Free': 0, 'free': 0, 'Pro': 1, 'pro': 1, 'Family+': 2, 'family_plus': 2 }
const STATUS_ORDER: Record<string, number> = { 'active': 0, 'suspended': 1, 'flagged': 2 }

// Normalize plan from API (family_plus → Family+, etc.)
function normalizePlan(plan: string): string {
  const map: Record<string, string> = { 'free': 'Free', 'pro': 'Pro', 'family_plus': 'Family+' }
  return map[plan] || plan
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
  return formatDate(iso)
}

// ─── Status Badge (Cyan-tinted) ──────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string }> = {
    active: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', dot: 'bg-cyan-400' },
    suspended: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
    flagged: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  }
  const c = config[status] || config.active
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ─── Plan Badge (Cyan theme) ─────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    'Free': { bg: 'bg-slate-500/10', text: 'text-slate-400' },
    'Pro': { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    'Family+': { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  }
  const c = config[plan] || config['Free']
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {plan}
    </span>
  )
}

// ─── Radial Progress Ring ─────────────────────────────────────────────────────

function RadialProgressRing({ value, max, size = 56, strokeWidth = 4, color = '#06B6D4' }: {
  value: number; max?: number; size?: number; strokeWidth?: number; color?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = max ? (value / max) * 100 : value
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} className="transition-all duration-700" />
    </svg>
  )
}

// ─── Stat Card with Radial Progress ──────────────────────────────────────────

function StatCard({ icon: Icon, label, value, trend, trendLabel, delay = 0, ringValue, ringMax, ringColor }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string | number
  trend?: string; trendLabel?: string; delay?: number
  ringValue: number; ringMax?: number; ringColor?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3 }}
      className="relative bg-gradient-to-br from-cyan-500/[0.03] to-teal-500/[0.02] border border-cyan-500/[0.12] rounded-xl p-5 hover:border-cyan-500/[0.25] transition-all overflow-hidden group"
    >
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(20,184,166,0.04))' }} />
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <RadialProgressRing value={ringValue} max={ringMax} size={48} strokeWidth={3} color={ringColor || '#06B6D4'} />
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Icon className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] text-white/30 uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-2xl font-bold text-cyan-50">{value}</p>
            {trendLabel && <p className="text-[10px] text-white/25 mt-0.5">{trendLabel}</p>}
          </div>
        </div>
        {trend && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${trend.startsWith('+') || trend.startsWith('↑') ? 'text-emerald-400' : 'text-red-400'}`}>
            <TrendingUp className="w-3 h-3" />{trend}
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ─── Lifecycle Progress Ring ──────────────────────────────────────────────────

function LifecycleRing({ stage, count, color, pct }: { stage: string; count: number; color: string; pct: number }) {
  const size = 90
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`} className="transition-all duration-700"
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white">{count}</span>
          <span className="text-[9px] text-white/30">{pct}%</span>
        </div>
      </div>
      <span className="text-xs text-white/50 font-medium">{stage}</span>
    </motion.div>
  )
}

// ─── User Card (CRM Explorer Style) ──────────────────────────────────────────

function UserCard({ user, onAction }: { user: UserRecord; onAction: (user: UserRecord, action: string) => void }) {
  const isActive = user.status === 'active'
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-gradient-to-br from-cyan-500/[0.03] to-transparent border border-cyan-500/[0.08] rounded-xl p-4 hover:border-cyan-500/[0.2] transition-all group cursor-pointer"
    >
      <div className="flex items-start gap-3">
        {/* Avatar with activity ring */}
        <div className="relative shrink-0">
          <div className={`w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center text-sm font-medium text-cyan-200 ring-2 ${isActive ? 'ring-cyan-500/30' : 'ring-white/[0.06]'}`}>
            {user.name.charAt(0)}
          </div>
          {/* Online indicator */}
          {isActive && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-cyan-400 ring-2 ring-[#0B0B0F]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-white/90 truncate">{user.name}</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded-md text-white/20 hover:text-cyan-400/60 hover:bg-cyan-500/[0.04] transition-all opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1a1a24] border-cyan-500/[0.12] text-white/70 w-44">
                <DropdownMenuItem className="text-xs focus:bg-cyan-500/[0.06] focus:text-white cursor-pointer" onClick={() => onAction(user, 'view')}>
                  <Eye className="w-3.5 h-3.5 mr-2" />View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-cyan-500/[0.06]" />
                <DropdownMenuItem className="text-xs focus:bg-red-500/10 focus:text-red-400 cursor-pointer" onClick={() => onAction(user, 'suspend')}>
                  <Ban className="w-3.5 h-3.5 mr-2" />Suspend
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs focus:bg-amber-500/10 focus:text-amber-400 cursor-pointer" onClick={() => onAction(user, 'flag')}>
                  <Flag className="w-3.5 h-3.5 mr-2" />Flag Abuse
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-cyan-500/[0.06]" />
                <DropdownMenuItem className="text-xs focus:bg-cyan-500/[0.06] focus:text-white cursor-pointer" onClick={() => onAction(user, 'reset_subscription')}>
                  <RotateCcw className="w-3.5 h-3.5 mr-2" />Reset Sub
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <Mail className="w-3 h-3 text-cyan-400/30" />
            <p className="text-xs text-white/40 truncate">{user.email}</p>
          </div>

          <div className="flex items-center gap-2 mt-2.5">
            <PlanBadge plan={user.plan} />
            <StatusBadge status={user.status} />
          </div>

          <div className="flex items-center gap-3 mt-2.5 text-[10px] text-white/25">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />{user.country || '—'}
            </span>
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />{user.language === 'ar' ? 'العربية' : 'EN'}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />{formatTimeAgo(user.lastLogin)}
            </span>
          </div>
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
      {/* Telescope illustration */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-teal-500/10 flex items-center justify-center border border-cyan-500/15">
          <Telescope className="w-10 h-10 text-cyan-500/30" />
        </div>
        {/* Decorative orbit ring */}
        <div className="absolute -inset-3 border border-cyan-500/[0.06] rounded-full" />
        <div className="absolute -inset-6 border border-cyan-500/[0.03] rounded-full" />
      </div>
      <h3 className="text-lg font-semibold text-white/60 mb-2">
        {isFiltered ? 'No users match your filters' : 'No users yet'}
      </h3>
      <p className="text-sm text-white/30 text-center max-w-sm">
        {isFiltered
          ? 'Try adjusting your search query or clearing filters to find what you\'re looking for.'
          : 'When users sign up, they\'ll appear here. Connect your Supabase database to see live user data.'
        }
      </p>
      {!isFiltered && (
        <div className="mt-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/[0.04] border border-cyan-500/[0.08]">
          <Shield className="w-4 h-4 text-cyan-400/50" />
          <span className="text-xs text-cyan-400/50">Privacy-safe — only aggregate profile data is shown</span>
        </div>
      )}
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminUsers() {
  const { addAuditLog } = useAdminAuthStore()

  // Data state
  const [users, setUsers] = useState<UserRecord[]>([])
  const [dataSource, setDataSource] = useState<'live' | 'demo'>('demo')
  const [isLoading, setIsLoading] = useState(true)

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const pageSize = 12

  // Confirmation dialog
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ user: UserRecord; action: string } | null>(null)

  // ─── Fetch users from API ────────────────────────────────────────────
  useEffect(() => {
    async function fetchUsers() {
      setIsLoading(true)
      try {
        const res = await fetch('/api/admin/users?pageSize=100')
        if (res.ok) {
          const json: UsersApiResponse = await res.json()
          setDataSource(json.source)
          // Map API records to frontend UserRecord format
          const mapped: UserRecord[] = json.data.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            avatar_url: null,
            plan: normalizePlan(u.plan),
            status: u.status as UserRecord['status'],
            lastLogin: u.last_login,
            createdAt: u.created_at,
            familyCount: u.family_count,
            language: u.language,
            country: u.country,
          }))
          setUsers(mapped)
        }
      } catch {
        setDataSource('demo')
        setUsers([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchUsers()
  }, [])

  // ─── Derived data: stats from actual users ───────────────────────────
  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter(u => u.status === 'active').length
    const newThisMonth = users.filter(u => {
      if (!u.createdAt) return false
      const d = new Date(u.createdAt)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    const activeRate = total > 0 ? Math.round((active / total) * 1000) / 10 : 0
    return { total, active, newThisMonth, activeRate }
  }, [users])

  // ─── Derived data: lifecycle stages from actual users ────────────────
  const lifecycleStages = useMemo(() => {
    const now = new Date()
    const newUsers = users.filter(u => {
      if (!u.createdAt) return false
      const d = new Date(u.createdAt)
      return (now.getTime() - d.getTime()) < 30 * 24 * 60 * 60 * 1000
    }).length
    const activeUsers = users.filter(u => u.status === 'active' && u.lastLogin).filter(u => {
      const d = new Date(u.lastLogin!)
      return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000
    }).length
    const powerUsers = users.filter(u => u.familyCount >= 2 && u.status === 'active').length
    const churnedUsers = users.filter(u => u.status === 'suspended' || u.status === 'flagged').length

    const total = users.length || 1
    return [
      { stage: 'New', count: newUsers, color: '#06B6D4', pct: Math.round((newUsers / total) * 100) },
      { stage: 'Active', count: activeUsers, color: '#14B8A6', pct: Math.round((activeUsers / total) * 100) },
      { stage: 'Power', count: powerUsers, color: '#0891B2', pct: Math.round((powerUsers / total) * 100) },
      { stage: 'Churned', count: churnedUsers, color: '#0E7490', pct: Math.round((churnedUsers / total) * 100) },
    ]
  }, [users])

  // ─── Derived data: plan distribution for sidebar ────────────────────
  const planDistribution = useMemo(() => {
    const free = users.filter(u => u.plan === 'Free').length
    const pro = users.filter(u => u.plan === 'Pro').length
    const family = users.filter(u => u.plan === 'Family+').length
    return [
      { plan: 'Free', count: free, color: '#64748B', pct: users.length ? Math.round((free / users.length) * 100) : 0 },
      { plan: 'Pro', count: pro, color: '#06B6D4', pct: users.length ? Math.round((pro / users.length) * 100) : 0 },
      { plan: 'Family+', count: family, color: '#F59E0B', pct: users.length ? Math.round((family / users.length) * 100) : 0 },
    ]
  }, [users])

  // ─── Derived data: country/language breakdown ───────────────────────
  const countryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    users.forEach(u => { const c = u.country || 'Unknown'; counts[c] = (counts[c] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [users])

  const languageBreakdown = useMemo(() => {
    const ar = users.filter(u => u.language === 'ar').length
    const en = users.filter(u => u.language === 'en').length
    return [
      { lang: 'العربية', count: ar, pct: users.length ? Math.round((ar / users.length) * 100) : 0 },
      { lang: 'English', count: en, pct: users.length ? Math.round((en / users.length) * 100) : 0 },
    ]
  }, [users])

  // Filtered + sorted data
  const filteredUsers = useMemo(() => {
    let result = [...users]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }
    if (planFilter !== 'all') {
      result = result.filter(u => u.plan === planFilter)
    }
    if (statusFilter !== 'all') {
      result = result.filter(u => u.status === statusFilter)
    }

    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'email': cmp = a.email.localeCompare(b.email); break
        case 'plan': cmp = (PLAN_ORDER[a.plan] ?? 0) - (PLAN_ORDER[b.plan] ?? 0); break
        case 'status': cmp = (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0); break
        case 'lastLogin': cmp = (a.lastLogin || '').localeCompare(b.lastLogin || ''); break
        case 'createdAt': cmp = (a.createdAt || '').localeCompare(b.createdAt || ''); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [users, searchQuery, planFilter, statusFilter, sortField, sortDir])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleSearchChange = (v: string) => { setSearchQuery(v); setCurrentPage(1) }
  const handlePlanFilterChange = (v: string) => { setPlanFilter(v); setCurrentPage(1) }
  const handleStatusFilterChange = (v: string) => { setStatusFilter(v); setCurrentPage(1) }

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc') }
    else { setSortField(field); setSortDir('asc') }
  }, [sortField])

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-white/20" />
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-cyan-400" /> : <ChevronDown className="w-3 h-3 text-cyan-400" />
  }

  const handleAction = (user: UserRecord, action: string) => {
    if (action === 'view') {
      addAuditLog('view_user_details', 'user', user.id, { userName: user.name, userEmail: user.email })
      return
    }
    setConfirmAction({ user, action })
    setConfirmOpen(true)
  }

  const handleConfirmAction = () => {
    if (!confirmAction) return
    const { user, action } = confirmAction
    addAuditLog(`${action}_user`, 'user', user.id, { userName: user.name, userEmail: user.email })
    setConfirmOpen(false)
    setConfirmAction(null)
  }

  const isFiltered = searchQuery !== '' || planFilter !== 'all' || statusFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* ─── Page Title: People Observatory ──────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center border border-cyan-500/20">
              <Telescope className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                People Observatory
                {dataSource === 'demo' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500/50 border border-cyan-500/10 font-normal">
                    No Live Data
                  </span>
                )}
              </h2>
              <div className="h-[2px] w-32 rounded-full bg-gradient-to-r from-cyan-500/80 via-teal-500/60 to-transparent mt-1" />
            </div>
          </div>
        </div>
        <p className="text-sm text-white/40 mt-1">Explore user demographics, engagement patterns, and lifecycle stages</p>
      </motion.div>

      {/* ─── Top Stats: 2x2 Grid with Radial Progress ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.total} delay={0} ringValue={stats.total} ringMax={Math.max(stats.total * 1.5, 10)} ringColor="#06B6D4" />
        <StatCard icon={UserPlus} label="New This Month" value={stats.newThisMonth} delay={0.05} ringValue={stats.newThisMonth} ringMax={Math.max(stats.total, 10)} ringColor="#14B8A6" />
        <StatCard icon={Activity} label="Active Rate" value={`${stats.activeRate}%`} delay={0.1} ringValue={stats.activeRate} ringMax={100} ringColor="#0891B2" />
        <StatCard icon={Clock} label="Avg Session" value="—" delay={0.15} ringValue={0} ringMax={100} ringColor="#0E7490" />
      </div>

      {/* ─── Main Content: Sidebar + User Explorer ──────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-cyan-500/[0.02] border border-cyan-500/[0.08] rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-cyan-500/10 rounded w-2/3 mb-3" />
                <div className="h-2 bg-cyan-500/5 rounded w-full mb-2" />
                <div className="h-2 bg-cyan-500/5 rounded w-4/5" />
              </div>
            ))}
          </div>
          <div className="lg:col-span-3 bg-cyan-500/[0.02] border border-cyan-500/[0.08] rounded-xl p-8 animate-pulse">
            <div className="h-8 bg-cyan-500/10 rounded w-1/3 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-32 bg-cyan-500/5 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      ) : users.length === 0 ? (
        <EmptyState isFiltered={isFiltered} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* ─── Left Sidebar: Distribution Breakdowns ────────────── */}
          <div className="lg:col-span-1 space-y-4">
            {/* Plan Distribution */}
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.3 }}
              className="bg-gradient-to-b from-cyan-500/[0.02] to-transparent border border-cyan-500/[0.08] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-cyan-400/60" />
                Plan Distribution
              </h3>
              <div className="space-y-3">
                {planDistribution.map(p => (
                  <div key={p.plan}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white/50">{p.plan}</span>
                      <span className="text-xs text-white/30">{p.count} · {p.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ delay: 0.3, duration: 0.6 }}
                        className="h-full rounded-full" style={{ backgroundColor: p.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Country Distribution */}
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25, duration: 0.3 }}
              className="bg-gradient-to-b from-cyan-500/[0.02] to-transparent border border-cyan-500/[0.08] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-cyan-400/60" />
                Countries
              </h3>
              <div className="space-y-2">
                {countryBreakdown.map(([country, count]) => (
                  <div key={country} className="flex items-center justify-between">
                    <span className="text-xs text-white/50">{country}</span>
                    <span className="text-xs font-mono text-cyan-400/40">{count}</span>
                  </div>
                ))}
                {countryBreakdown.length === 0 && <p className="text-xs text-white/20">No data</p>}
              </div>
            </motion.div>

            {/* Language Split */}
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.3 }}
              className="bg-gradient-to-b from-cyan-500/[0.02] to-transparent border border-cyan-500/[0.08] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-cyan-400/60" />
                Languages
              </h3>
              <div className="space-y-2">
                {languageBreakdown.map(l => (
                  <div key={l.lang}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white/50">{l.lang}</span>
                      <span className="text-xs text-white/30">{l.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${l.pct}%` }} transition={{ delay: 0.35, duration: 0.6 }}
                        className="h-full rounded-full bg-cyan-500/40" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ─── Main Area: User Explorer ────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">
            {/* Toolbar */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }}
              className="bg-gradient-to-b from-cyan-500/[0.02] to-transparent border border-cyan-500/[0.08] rounded-xl p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input type="text" placeholder="Search by name or email..." value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#0B0B0F] border border-cyan-500/[0.08] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/30 transition-colors" />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={planFilter} onValueChange={handlePlanFilterChange}>
                    <SelectTrigger className="h-8 text-xs bg-[#0B0B0F] border-cyan-500/[0.08] text-white/70 w-[110px]">
                      <SelectValue placeholder="Plan" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a24] border-cyan-500/[0.12]">
                      <SelectItem value="all" className="text-white/70 text-xs focus:bg-cyan-500/[0.06] focus:text-white">All Plans</SelectItem>
                      <SelectItem value="Free" className="text-white/70 text-xs focus:bg-cyan-500/[0.06] focus:text-white">Free</SelectItem>
                      <SelectItem value="Pro" className="text-white/70 text-xs focus:bg-cyan-500/[0.06] focus:text-white">Pro</SelectItem>
                      <SelectItem value="Family+" className="text-white/70 text-xs focus:bg-cyan-500/[0.06] focus:text-white">Family+</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                    <SelectTrigger className="h-8 text-xs bg-[#0B0B0F] border-cyan-500/[0.08] text-white/70 w-[120px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a24] border-cyan-500/[0.12]">
                      <SelectItem value="all" className="text-white/70 text-xs focus:bg-cyan-500/[0.06] focus:text-white">All Status</SelectItem>
                      <SelectItem value="active" className="text-white/70 text-xs focus:bg-cyan-500/[0.06] focus:text-white">Active</SelectItem>
                      <SelectItem value="suspended" className="text-white/70 text-xs focus:bg-cyan-500/[0.06] focus:text-white">Suspended</SelectItem>
                      <SelectItem value="flagged" className="text-white/70 text-xs focus:bg-cyan-500/[0.06] focus:text-white">Flagged</SelectItem>
                    </SelectContent>
                  </Select>

                  <span className="text-xs text-white/30">
                    {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* View toggle */}
                <div className="flex items-center gap-1 border border-cyan-500/[0.08] rounded-lg p-0.5">
                  <button onClick={() => setViewMode('cards')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'cards' ? 'bg-cyan-500/15 text-cyan-400' : 'text-white/30 hover:text-white/50'}`}>
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-cyan-500/15 text-cyan-400' : 'text-white/30 hover:text-white/50'}`}>
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* ─── Cards View ──────────────────────────────────────── */}
            {viewMode === 'cards' ? (
              <AnimatePresence mode="wait">
                {paginatedUsers.length > 0 ? (
                  <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                      {paginatedUsers.map(user => (
                        <UserCard key={user.id} user={user} onAction={handleAction} />
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
                className="bg-gradient-to-b from-cyan-500/[0.02] to-transparent border border-cyan-500/[0.08] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-cyan-500/[0.06] hover:bg-transparent">
                        <TableHead className="text-cyan-400/60 text-xs font-medium cursor-pointer select-none hover:text-cyan-400 transition-colors" onClick={() => handleSort('name')}>
                          <span className="inline-flex items-center gap-1">User {renderSortIcon('name')}</span>
                        </TableHead>
                        <TableHead className="text-cyan-400/60 text-xs font-medium cursor-pointer select-none hover:text-cyan-400 transition-colors" onClick={() => handleSort('email')}>
                          <span className="inline-flex items-center gap-1">Email {renderSortIcon('email')}</span>
                        </TableHead>
                        <TableHead className="text-cyan-400/60 text-xs font-medium cursor-pointer select-none hover:text-cyan-400 transition-colors" onClick={() => handleSort('plan')}>
                          <span className="inline-flex items-center gap-1">Plan {renderSortIcon('plan')}</span>
                        </TableHead>
                        <TableHead className="text-cyan-400/60 text-xs font-medium cursor-pointer select-none hover:text-cyan-400 transition-colors" onClick={() => handleSort('status')}>
                          <span className="inline-flex items-center gap-1">Status {renderSortIcon('status')}</span>
                        </TableHead>
                        <TableHead className="text-cyan-400/60 text-xs font-medium cursor-pointer select-none hover:text-cyan-400 transition-colors" onClick={() => handleSort('lastLogin')}>
                          <span className="inline-flex items-center gap-1">Last Login {renderSortIcon('lastLogin')}</span>
                        </TableHead>
                        <TableHead className="text-cyan-400/60 text-xs font-medium cursor-pointer select-none hover:text-cyan-400 transition-colors" onClick={() => handleSort('createdAt')}>
                          <span className="inline-flex items-center gap-1">Created {renderSortIcon('createdAt')}</span>
                        </TableHead>
                        <TableHead className="text-cyan-400/60 text-xs font-medium text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence mode="popLayout">
                        {paginatedUsers.map((user, idx) => (
                          <motion.tr key={user.id}
                            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                            transition={{ delay: idx * 0.02, duration: 0.2 }}
                            className="border-b border-cyan-500/[0.04] hover:bg-cyan-500/[0.02] transition-colors group">
                            <TableCell className="py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center text-xs font-medium text-cyan-200 shrink-0 ring-2 ring-cyan-500/20">
                                  {user.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white/90">{user.name}</p>
                                  <p className="text-[10px] text-cyan-400/40">{user.country || 'SA'} · {user.language === 'ar' ? 'العربية' : 'EN'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-white/50">{user.email}</TableCell>
                            <TableCell><PlanBadge plan={user.plan} /></TableCell>
                            <TableCell><StatusBadge status={user.status} /></TableCell>
                            <TableCell className="text-sm text-white/40">
                              <span title={formatDate(user.lastLogin)}>{formatTimeAgo(user.lastLogin)}</span>
                            </TableCell>
                            <TableCell className="text-sm text-white/40">{formatDate(user.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1.5 rounded-md text-white/20 hover:text-cyan-400/60 hover:bg-cyan-500/[0.04] transition-all opacity-0 group-hover:opacity-100">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#1a1a24] border-cyan-500/[0.12] text-white/70 w-48">
                                  <DropdownMenuItem className="text-xs focus:bg-cyan-500/[0.06] focus:text-white cursor-pointer" onClick={() => handleAction(user, 'view')}>
                                    <Eye className="w-3.5 h-3.5 mr-2" />View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-cyan-500/[0.06]" />
                                  <DropdownMenuItem className="text-xs focus:bg-red-500/10 focus:text-red-400 cursor-pointer" onClick={() => handleAction(user, 'suspend')}>
                                    <Ban className="w-3.5 h-3.5 mr-2" />Suspend Account
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs focus:bg-amber-500/10 focus:text-amber-400 cursor-pointer" onClick={() => handleAction(user, 'flag')}>
                                    <Flag className="w-3.5 h-3.5 mr-2" />Flag Abuse
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-cyan-500/[0.06]" />
                                  <DropdownMenuItem className="text-xs focus:bg-cyan-500/[0.06] focus:text-white cursor-pointer" onClick={() => handleAction(user, 'reset_subscription')}>
                                    <RotateCcw className="w-3.5 h-3.5 mr-2" />Reset Subscription
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                      {paginatedUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="h-32 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <Users className="w-8 h-8 text-cyan-500/10" />
                              <p className="text-sm text-white/30">No users found</p>
                              <p className="text-xs text-white/20">Try adjusting your search or filters</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </motion.div>
            )}

            {/* Pagination */}
            {filteredUsers.length > pageSize && (
              <div className="flex items-center justify-between px-2">
                <p className="text-xs text-white/30">
                  Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="p-1.5 rounded-md text-white/30 hover:text-cyan-400 hover:bg-cyan-500/[0.04] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button key={page} onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-md text-xs font-medium transition-all ${page === currentPage ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/30 hover:text-cyan-400 hover:bg-cyan-500/[0.04]'}`}>
                      {page}
                    </button>
                  ))}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md text-white/30 hover:text-cyan-400 hover:bg-cyan-500/[0.04] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── User Lifecycle Stages: Individual Progress Rings ──────── */}
      {users.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.3 }}
          className="bg-gradient-to-b from-cyan-500/[0.02] to-transparent border border-cyan-500/[0.08] rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-white">User Lifecycle Stages</h3>
              <p className="text-xs text-white/30 mt-0.5">Distribution across engagement stages</p>
            </div>
            <div className="flex items-center gap-3">
              {lifecycleStages.map(stage => (
                <div key={stage.stage} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-[10px] text-white/40">{stage.stage}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {lifecycleStages.map((stage, i) => (
              <motion.div key={stage.stage} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }} className="flex justify-center">
                <LifecycleRing stage={stage.stage} count={stage.count} color={stage.color} pct={stage.pct} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── Privacy Notice ────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-cyan-500/[0.02] to-transparent border border-cyan-500/[0.08]">
        <Shield className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-white/50">Privacy-First Observatory</p>
          <p className="text-[10px] text-cyan-300/30 mt-0.5 leading-relaxed">
            This view displays only privacy-safe profile fields: name, email, plan, status, and aggregate engagement metrics.
            Private messages, files, task content, and personal data are never accessible.
          </p>
        </div>
      </motion.div>

      {/* ─── Confirmation Dialog ────────────────────────────────────── */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-[#111117] border-cyan-500/[0.12] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Confirm Action
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              {confirmAction && (
                <>Are you sure you want to <strong className="text-white/70">{confirmAction.action}</strong> user <strong className="text-white/70">{confirmAction.user.name}</strong>?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-cyan-500/[0.12] text-white/60 hover:bg-cyan-500/[0.04] hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className="bg-cyan-600 text-white hover:bg-cyan-700">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
