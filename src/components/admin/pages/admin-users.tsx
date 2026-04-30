'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserPlus, Activity, Clock, Search, ChevronUp, ChevronDown,
  MoreHorizontal, Eye, Ban, Flag, RotateCcw, ChevronLeft, ChevronRight,
  TrendingUp, AlertTriangle, Shield, Telescope
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts'
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

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_USERS: UserRecord[] = [
  { id: 'u-001', email: 'ahmed@email.com', name: 'Ahmed Al-Rashid', avatar_url: null, plan: 'Pro', status: 'active', lastLogin: '2025-03-04T14:30:00Z', createdAt: '2024-06-12T08:00:00Z', familyCount: 2, language: 'ar', country: 'SA' },
  { id: 'u-002', email: 'fatima@email.com', name: 'Fatima Hassan', avatar_url: null, plan: 'Free', status: 'active', lastLogin: '2025-03-04T10:15:00Z', createdAt: '2024-08-22T12:00:00Z', familyCount: 1, language: 'ar', country: 'SA' },
  { id: 'u-003', email: 'khalid@email.com', name: 'Khalid Al-Maktoum', avatar_url: null, plan: 'Family+', status: 'active', lastLogin: '2025-03-03T22:45:00Z', createdAt: '2024-04-05T09:00:00Z', familyCount: 3, language: 'ar', country: 'AE' },
  { id: 'u-004', email: 'noura@email.com', name: 'Noura Al-Said', avatar_url: null, plan: 'Free', status: 'flagged', lastLogin: '2025-02-28T06:20:00Z', createdAt: '2024-11-01T14:00:00Z', familyCount: 0, language: 'ar', country: 'SA' },
  { id: 'u-005', email: 'omar@email.com', name: 'Omar Al-Faisal', avatar_url: null, plan: 'Pro', status: 'active', lastLogin: '2025-03-04T16:00:00Z', createdAt: '2024-07-18T11:00:00Z', familyCount: 1, language: 'en', country: 'SA' },
  { id: 'u-006', email: 'sara@email.com', name: 'Sara Al-Qahtani', avatar_url: null, plan: 'Free', status: 'active', lastLogin: '2025-03-04T09:30:00Z', createdAt: '2024-09-30T15:00:00Z', familyCount: 1, language: 'ar', country: 'SA' },
  { id: 'u-007', email: 'mohammed@email.com', name: 'Mohammed Al-Dosari', avatar_url: null, plan: 'Family+', status: 'suspended', lastLogin: '2025-02-10T13:00:00Z', createdAt: '2024-05-20T10:00:00Z', familyCount: 2, language: 'ar', country: 'KW' },
  { id: 'u-008', email: 'layla@email.com', name: 'Layla Al-Harbi', avatar_url: null, plan: 'Pro', status: 'active', lastLogin: '2025-03-04T11:45:00Z', createdAt: '2024-03-14T08:00:00Z', familyCount: 1, language: 'ar', country: 'SA' },
  { id: 'u-009', email: 'aziz@email.com', name: 'Abdulaziz Al-Shammari', avatar_url: null, plan: 'Free', status: 'active', lastLogin: '2025-03-03T18:00:00Z', createdAt: '2024-10-08T16:00:00Z', familyCount: 0, language: 'en', country: 'QA' },
  { id: 'u-010', email: 'huda@email.com', name: 'Huda Al-Ghamdi', avatar_url: null, plan: 'Pro', status: 'active', lastLogin: '2025-03-04T07:30:00Z', createdAt: '2024-06-25T09:00:00Z', familyCount: 1, language: 'ar', country: 'SA' },
  { id: 'u-011', email: 'rashid@email.com', name: 'Rashid Al-Naimi', avatar_url: null, plan: 'Family+', status: 'active', lastLogin: '2025-03-04T20:15:00Z', createdAt: '2024-02-10T07:00:00Z', familyCount: 4, language: 'ar', country: 'AE' },
  { id: 'u-012', email: 'amal@email.com', name: 'Amal Al-Zahrani', avatar_url: null, plan: 'Free', status: 'flagged', lastLogin: '2025-01-20T12:00:00Z', createdAt: '2024-12-05T13:00:00Z', familyCount: 0, language: 'ar', country: 'SA' },
  { id: 'u-013', email: 'yasser@email.com', name: 'Yasser Al-Otaibi', avatar_url: null, plan: 'Pro', status: 'active', lastLogin: '2025-03-02T15:30:00Z', createdAt: '2024-08-01T10:00:00Z', familyCount: 1, language: 'ar', country: 'BH' },
  { id: 'u-014', email: 'maha@email.com', name: 'Maha Al-Khalifa', avatar_url: null, plan: 'Family+', status: 'active', lastLogin: '2025-03-04T13:00:00Z', createdAt: '2024-04-18T08:00:00Z', familyCount: 3, language: 'ar', country: 'BH' },
  { id: 'u-015', email: 'tarek@email.com', name: 'Tarek Al-Suwaidi', avatar_url: null, plan: 'Free', status: 'suspended', lastLogin: '2025-01-15T09:00:00Z', createdAt: '2024-07-22T14:00:00Z', familyCount: 0, language: 'en', country: 'OM' },
  { id: 'u-016', email: 'dina@email.com', name: 'Dina Al-Mutairi', avatar_url: null, plan: 'Pro', status: 'active', lastLogin: '2025-03-04T17:45:00Z', createdAt: '2024-09-10T11:00:00Z', familyCount: 2, language: 'ar', country: 'SA' },
  { id: 'u-017', email: 'faisal@email.com', name: 'Faisal Al-Ahmadi', avatar_url: null, plan: 'Free', status: 'active', lastLogin: '2025-03-01T08:00:00Z', createdAt: '2025-01-05T10:00:00Z', familyCount: 0, language: 'ar', country: 'KW' },
  { id: 'u-018', email: 'reem@email.com', name: 'Reem Al-Enazi', avatar_url: null, plan: 'Pro', status: 'active', lastLogin: '2025-03-04T19:20:00Z', createdAt: '2024-11-20T09:00:00Z', familyCount: 1, language: 'ar', country: 'SA' },
]

// Registration trend (last 12 months)
const REGISTRATION_TREND = [
  { month: 'Apr 24', registrations: 42 },
  { month: 'May 24', registrations: 58 },
  { month: 'Jun 24', registrations: 71 },
  { month: 'Jul 24', registrations: 65 },
  { month: 'Aug 24', registrations: 89 },
  { month: 'Sep 24', registrations: 94 },
  { month: 'Oct 24', registrations: 78 },
  { month: 'Nov 24', registrations: 102 },
  { month: 'Dec 24', registrations: 118 },
  { month: 'Jan 25', registrations: 135 },
  { month: 'Feb 25', registrations: 121 },
  { month: 'Mar 25', registrations: 147 },
]

// Retention data (last 12 months)
const RETENTION_DATA = [
  { month: 'Apr 24', rate: 78 },
  { month: 'May 24', rate: 80 },
  { month: 'Jun 24', rate: 79 },
  { month: 'Jul 24', rate: 82 },
  { month: 'Aug 24', rate: 84 },
  { month: 'Sep 24', rate: 83 },
  { month: 'Oct 24', rate: 85 },
  { month: 'Nov 24', rate: 87 },
  { month: 'Dec 24', rate: 86 },
  { month: 'Jan 25', rate: 88 },
  { month: 'Feb 25', rate: 89 },
  { month: 'Mar 25', rate: 91 },
]

// Lifecycle stages
const LIFECYCLE_STAGES = [
  { stage: 'New', count: 38, color: '#06B6D4', pct: 21 },
  { stage: 'Active', count: 89, color: '#14B8A6', pct: 49 },
  { stage: 'Power', count: 42, color: '#0891B2', pct: 23 },
  { stage: 'Churned', count: 14, color: '#0E7490', pct: 7 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SortField = 'name' | 'email' | 'plan' | 'status' | 'lastLogin' | 'createdAt'
type SortDir = 'asc' | 'desc'

const PLAN_ORDER: Record<string, number> = { 'Free': 0, 'Pro': 1, 'Family+': 2 }
const STATUS_ORDER: Record<string, number> = { 'active': 0, 'suspended': 1, 'flagged': 2 }

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

// ─── Custom Tooltips ──────────────────────────────────────────────────────────

function CustomAreaTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-cyan-950/90 border border-cyan-500/20 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-xs text-cyan-300/60 mb-1">{label}</p>
      <p className="text-sm font-semibold text-cyan-200">{payload[0].value} registrations</p>
    </div>
  )
}

function CustomRetentionTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-cyan-950/90 border border-cyan-500/20 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-xs text-cyan-300/60 mb-1">{label}</p>
      <p className="text-sm font-semibold text-cyan-200">{payload[0].value}% retention</p>
    </div>
  )
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
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
    </svg>
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
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative">
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="transition-all duration-700"
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
          />
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

// ─── Stat Card with Radial Progress ──────────────────────────────────────────

function StatCard({ icon: Icon, label, value, trend, trendLabel, delay = 0, ringValue, ringMax, ringColor }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string | number
  trend?: string; trendLabel?: string; delay?: number
  ringValue: number; ringMax?: number; ringColor?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="relative bg-gradient-to-br from-cyan-500/[0.03] to-teal-500/[0.02] border border-cyan-500/[0.12] rounded-xl p-5 hover:border-cyan-500/[0.25] transition-all overflow-hidden group"
    >
      {/* Gradient border glow on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{
        background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(20,184,166,0.04))',
      }} />

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <RadialProgressRing
            value={ringValue}
            max={ringMax}
            size={48}
            strokeWidth={3}
            color={ringColor || '#06B6D4'}
          />
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
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminUsers() {
  const { addAuditLog } = useAdminAuthStore()

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Confirmation dialog
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ user: UserRecord; action: string } | null>(null)

  // Filtered + sorted data
  const filteredUsers = useMemo(() => {
    let result = [...DEMO_USERS]

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }

    // Plan filter
    if (planFilter !== 'all') {
      result = result.filter(u => u.plan === planFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(u => u.status === statusFilter)
    }

    // Sort
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
  }, [searchQuery, planFilter, statusFilter, sortField, sortDir])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Reset page when filters change
  const handleSearchChange = (v: string) => { setSearchQuery(v); setCurrentPage(1) }
  const handlePlanFilterChange = (v: string) => { setPlanFilter(v); setCurrentPage(1) }
  const handleStatusFilterChange = (v: string) => { setStatusFilter(v); setCurrentPage(1) }

  // Sort handler
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }, [sortField])

  // Sort indicator — cyan accent
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-white/20" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-cyan-400" />
      : <ChevronDown className="w-3 h-3 text-cyan-400" />
  }

  // Action handlers
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

  return (
    <div className="space-y-6">
      {/* ─── Page Title: People Observatory ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center border border-cyan-500/20">
            <Telescope className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              People Observatory
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500/50 border border-cyan-500/10 font-normal">
                Simulated
              </span>
            </h2>
            {/* Cyan gradient underline */}
            <div className="h-[2px] w-32 rounded-full bg-gradient-to-r from-cyan-500/80 via-teal-500/60 to-transparent mt-1" />
          </div>
        </div>
        <p className="text-sm text-white/40 mt-1">Monitor user demographics, engagement patterns, and lifecycle stages</p>
      </motion.div>

      {/* ─── Top Stats: 2x2 Grid with Radial Progress ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard icon={Users} label="Total Users" value="1,847" trend="↑ 12%" trendLabel="vs last month" delay={0} ringValue={78} ringMax={100} ringColor="#06B6D4" />
        <StatCard icon={UserPlus} label="New This Month" value="147" trend="↑ 21%" trendLabel="vs last month" delay={0.05} ringValue={147} ringMax={200} ringColor="#14B8A6" />
        <StatCard icon={Activity} label="Active Rate" value="78.4%" trend="↑ 3.2%" trendLabel="vs last month" delay={0.1} ringValue={78.4} ringMax={100} ringColor="#0891B2" />
        <StatCard icon={Clock} label="Avg Session" value="12m 34s" trend="↑ 1m 12s" trendLabel="vs last month" delay={0.15} ringValue={75} ringMax={100} ringColor="#0E7490" />
      </div>

      {/* ─── Charts Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Registration Trend — Cyan AreaChart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="lg:col-span-2 bg-gradient-to-b from-cyan-500/[0.02] to-transparent border border-cyan-500/[0.08] rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Registration Trend</h3>
              <p className="text-xs text-white/30 mt-0.5">Last 12 months</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/15">
              <TrendingUp className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] font-medium text-cyan-400">+24% YoY</span>
            </div>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REGISTRATION_TREND} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cyanRegGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.35} />
                    <stop offset="50%" stopColor="#14B8A6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                />
                <Tooltip content={<CustomAreaTooltip />} />
                <Area
                  type="monotone"
                  dataKey="registrations"
                  stroke="#06B6D4"
                  strokeWidth={2.5}
                  fill="url(#cyanRegGradient)"
                  activeDot={{ r: 5, fill: '#06B6D4', stroke: '#0B0B0F', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Retention Chart — Cyan LineChart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="bg-gradient-to-b from-teal-500/[0.02] to-transparent border border-teal-500/[0.08] rounded-xl p-5"
        >
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">User Retention</h3>
            <p className="text-xs text-white/30 mt-0.5">Monthly retention rate</p>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={RETENTION_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }}
                  dy={8}
                />
                <YAxis
                  domain={[70, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip content={<CustomRetentionTooltip />} />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#14B8A6"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#14B8A6', stroke: '#0B0B0F', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* ─── User Table ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="bg-gradient-to-b from-cyan-500/[0.02] to-transparent border border-cyan-500/[0.08] rounded-xl overflow-hidden"
      >
        {/* Toolbar */}
        <div className="p-4 border-b border-cyan-500/[0.08] flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0B0B0F] border border-cyan-500/[0.08] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/30 transition-colors"
            />
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
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-cyan-500/[0.06] hover:bg-transparent">
                <TableHead
                  className="text-cyan-400/60 text-xs font-medium cursor-pointer select-none hover:text-cyan-400 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <span className="inline-flex items-center gap-1">User {renderSortIcon('name')}</span>
                </TableHead>
                <TableHead
                  className="text-cyan-400/60 text-xs font-medium cursor-pointer select-none hover:text-cyan-400 transition-colors"
                  onClick={() => handleSort('email')}
                >
                  <span className="inline-flex items-center gap-1">Email {renderSortIcon('email')}</span>
                </TableHead>
                <TableHead
                  className="text-cyan-400/60 text-xs font-medium cursor-pointer select-none hover:text-cyan-400 transition-colors"
                  onClick={() => handleSort('plan')}
                >
                  <span className="inline-flex items-center gap-1">Plan {renderSortIcon('plan')}</span>
                </TableHead>
                <TableHead
                  className="text-cyan-400/60 text-xs font-medium cursor-pointer select-none hover:text-cyan-400 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <span className="inline-flex items-center gap-1">Status {renderSortIcon('status')}</span>
                </TableHead>
                <TableHead
                  className="text-cyan-400/60 text-xs font-medium cursor-pointer select-none hover:text-cyan-400 transition-colors"
                  onClick={() => handleSort('lastLogin')}
                >
                  <span className="inline-flex items-center gap-1">Last Login {renderSortIcon('lastLogin')}</span>
                </TableHead>
                <TableHead
                  className="text-cyan-400/60 text-xs font-medium cursor-pointer select-none hover:text-cyan-400 transition-colors"
                  onClick={() => handleSort('createdAt')}
                >
                  <span className="inline-flex items-center gap-1">Created {renderSortIcon('createdAt')}</span>
                </TableHead>
                <TableHead className="text-cyan-400/60 text-xs font-medium text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {paginatedUsers.map((user, idx) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ delay: idx * 0.02, duration: 0.2 }}
                    className="border-b border-cyan-500/[0.04] hover:bg-cyan-500/[0.02] transition-colors group"
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar with cyan ring */}
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
                        <DropdownMenuContent
                          align="end"
                          className="bg-[#1a1a24] border-cyan-500/[0.12] text-white/70 w-48"
                        >
                          <DropdownMenuItem
                            className="text-xs focus:bg-cyan-500/[0.06] focus:text-white cursor-pointer"
                            onClick={() => handleAction(user, 'view')}
                          >
                            <Eye className="w-3.5 h-3.5 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-cyan-500/[0.06]" />
                          <DropdownMenuItem
                            className="text-xs focus:bg-red-500/10 focus:text-red-400 cursor-pointer"
                            onClick={() => handleAction(user, 'suspend')}
                          >
                            <Ban className="w-3.5 h-3.5 mr-2" />
                            Suspend Account
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-xs focus:bg-amber-500/10 focus:text-amber-400 cursor-pointer"
                            onClick={() => handleAction(user, 'flag')}
                          >
                            <Flag className="w-3.5 h-3.5 mr-2" />
                            Flag Abuse
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-cyan-500/[0.06]" />
                          <DropdownMenuItem
                            className="text-xs focus:bg-cyan-500/[0.06] focus:text-white cursor-pointer"
                            onClick={() => handleAction(user, 'reset_subscription')}
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-2" />
                            Reset Subscription
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

        {/* Pagination — Cyan accent */}
        {filteredUsers.length > pageSize && (
          <div className="px-4 py-3 border-t border-cyan-500/[0.08] flex items-center justify-between">
            <p className="text-xs text-white/30">
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md text-white/30 hover:text-cyan-400 hover:bg-cyan-500/[0.04] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 rounded-md text-xs font-medium transition-all ${
                    page === currentPage
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-white/30 hover:text-cyan-400 hover:bg-cyan-500/[0.04]'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md text-white/30 hover:text-cyan-400 hover:bg-cyan-500/[0.04] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ─── User Lifecycle Stages: Individual Progress Rings ──────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3 }}
        className="bg-gradient-to-b from-cyan-500/[0.02] to-transparent border border-cyan-500/[0.08] rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-semibold text-white">User Lifecycle Stages</h3>
            <p className="text-xs text-white/30 mt-0.5">Distribution across engagement stages</p>
          </div>
          <div className="flex items-center gap-3">
            {LIFECYCLE_STAGES.map(stage => (
              <div key={stage.stage} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                <span className="text-[10px] text-white/40">{stage.stage}</span>
              </div>
            ))}
          </div>
        </div>
        {/* 4 Individual Progress Rings */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {LIFECYCLE_STAGES.map((stage, i) => (
            <motion.div
              key={stage.stage}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
              className="flex justify-center"
            >
              <LifecycleRing
                stage={stage.stage}
                count={stage.count}
                color={stage.color}
                pct={stage.pct}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ─── Privacy Notice ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-cyan-500/[0.03] to-transparent border border-cyan-500/[0.08]"
      >
        <Shield className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-white/60">Privacy Compliance</p>
          <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">
            This view displays only account metadata and aggregate metrics. Private messages, files, and sensitive content are never accessible.
            Destructive actions (Suspend, Flag) are audit-logged and require confirmation.
          </p>
        </div>
      </motion.div>

      {/* ─── Confirmation Dialog ────────────────────────────────────────── */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-[#111117] border-cyan-500/[0.12] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Confirm Action
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              {confirmAction && (
                <>
                  You are about to <span className="font-semibold text-white/70">{confirmAction.action}</span> the account for{' '}
                  <span className="font-semibold text-white/70">{confirmAction.user.name}</span> ({confirmAction.user.email}).
                  {confirmAction.action === 'suspend' && ' This will immediately block the user from accessing their account.'}
                  {confirmAction.action === 'flag' && ' This will mark the account for review by the moderation team.'}
                  {confirmAction.action === 'reset_subscription' && ' This will reset the user\'s subscription to the Free plan.'}
                  <br /><br />This action will be logged in the audit trail.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-cyan-500/[0.12] text-white/60 hover:bg-cyan-500/[0.04] hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={`${
                confirmAction?.action === 'suspend'
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30'
                  : confirmAction?.action === 'flag'
                    ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-amber-500/30'
                    : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border-cyan-500/30'
              } border`}
            >
              {confirmAction?.action === 'suspend' && 'Suspend Account'}
              {confirmAction?.action === 'flag' && 'Flag for Review'}
              {confirmAction?.action === 'reset_subscription' && 'Reset Subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
