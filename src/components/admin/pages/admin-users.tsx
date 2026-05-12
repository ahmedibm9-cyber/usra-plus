'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserPlus, Activity, Clock, Search, ChevronUp, ChevronDown,
  MoreHorizontal, Eye, Ban, Flag, RotateCcw, ChevronLeft, ChevronRight,
  TrendingUp, Shield, Telescope, MapPin, Globe, Filter, LayoutGrid, List,
  Mail, CalendarDays, AlertTriangle, Star, Zap, EyeOff, MessageSquare,
  Crown, AlertOctagon, RefreshCw, Download, Trash2, CheckSquare, Square,
  ArrowUpDown, CheckCircle2, XCircle, Edit3, Lock, Loader2,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
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
import { UserDetailDrawer } from '@/components/admin/user-detail-drawer'
import { AdminTablePageSkeleton } from '@/components/shared/skeleton-patterns'
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
  is_vip?: boolean
  beta_tester?: boolean
  trust_score?: number
  fraud_score?: number
  trial_status?: string
  email_verified?: boolean
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

const PLAN_ORDER: Record<string, number> = { 'Free': 0, 'free': 0, 'Pro': 1, 'pro': 1, 'Family+': 2, 'family_plus': 2, 'Max': 3, 'max': 3, 'Ultimate': 4, 'ultimate': 4 }
const STATUS_ORDER: Record<string, number> = { 'active': 0, 'suspended': 1, 'flagged': 2 }

// Normalize plan from API (family_plus → Family+, etc.)
function normalizePlan(plan: string): string {
  const map: Record<string, string> = { 'free': 'Free', 'pro': 'Pro', 'family_plus': 'Family+', 'max': 'Max', 'ultimate': 'Ultimate' }
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
  if (diffMs < 0) return 'Just now'
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
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
    active: { bg: 'bg-[#F4C430]/10', text: 'text-[#F4C430]', dot: 'bg-[#F4C430]' },
    suspended: { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', dot: 'bg-[--status-danger]' },
    flagged: { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', dot: 'bg-[--status-warning]' },
    banned: { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', dot: 'bg-[--status-danger]' },
    shadow_banned: { bg: 'bg-[--status-neutral-bg]', text: 'text-[--status-neutral]', dot: 'bg-[--status-neutral]' },
  }
  const c = config[status] || config.active
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
    </span>
  )
}

// ─── Plan Badge (Cyan theme) ─────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    'Free': { bg: 'bg-[--status-neutral-bg]', text: 'text-[--status-neutral]' },
    'Pro': { bg: 'bg-[#F4C430]/10', text: 'text-[#F4C430]' },
    'Family+': { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]' },
    'Max': { bg: 'bg-[#E50914]/10', text: 'text-[#E50914]' },
    'Ultimate': { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]' },
  }
  const c = config[plan] || config['Free']
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {plan}
    </span>
  )
}

// ─── Verification Badge ──────────────────────────────────────────────────────

function VerificationBadge({ verified }: { verified: boolean }) {
  return verified
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F4C430]/10 text-[#F4C430]"><CheckCircle2 className="w-3 h-3" />Verified</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[--status-danger-bg] text-[--status-danger]"><XCircle className="w-3 h-3" />Unverified</span>
}

// ─── Radial Progress Ring ─────────────────────────────────────────────────────

function RadialProgressRing({ value, max, size = 56, strokeWidth = 4, color = '#F4C430' }: {
  value: number; max?: number; size?: number; strokeWidth?: number; color?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = max ? (value / max) * 100 : value
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} />
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
      className="relative bg-gradient-to-br from-[#F4C430]/[0.03] to-[#F4C430]/[0.02] border border-[#F4C430]/[0.12] rounded-xl p-5 hover:border-[#F4C430]/[0.25] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 overflow-hidden group"
    >
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(20,184,166,0.04))' }} />
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <RadialProgressRing value={ringValue} max={ringMax} size={48} strokeWidth={3} color={ringColor || '#F4C430'} />
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Icon className="w-3.5 h-3.5 text-[#F4C430]" />
              <span className="text-[10px] text-[--text-muted] uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-2xl font-bold text-[#F4C430]">{value}</p>
            {trendLabel && <p className="text-[10px] text-[--text-muted] mt-0.5">{trendLabel}</p>}
          </div>
        </div>
        {trend && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${trend.startsWith('+') || trend.startsWith('↑') ? 'text-[#F4C430]' : 'text-[--status-danger]'}`}>
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
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`} className="transition-all duration-700"
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-[--text-primary]">{count}</span>
          <span className="text-[9px] text-[--text-muted]">{pct}%</span>
        </div>
      </div>
      <span className="text-xs text-[--text-muted] font-medium">{stage}</span>
    </motion.div>
  )
}

// ─── User Card (Enhanced CRM Explorer Style) ──────────────────────────────────

interface EnhancedUserRecord extends UserRecord {
  emailVerified?: boolean
}

function UserCard({ user, onAction, selected, onToggleSelect }: {
  user: EnhancedUserRecord
  onAction: (user: UserRecord, action: string) => void
  selected: boolean
  onToggleSelect: (id: string) => void
}) {
  const isActive = user.status === 'active'
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`bg-gradient-to-br from-[#F4C430]/[0.03] to-transparent border rounded-xl p-4 hover:border-[#F4C430]/[0.2] transition-all group cursor-pointer relative ${selected ? 'border-[#F4C430]/40 bg-[#F4C430]/[0.05]' : 'border-[#F4C430]/[0.08]'}`}
    >
      {/* Selection checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect(user.id) }}
        className="absolute top-3 left-3 z-10 text-[--text-muted] hover:text-[#F4C430] transition-colors"
      >
        {selected ? <CheckSquare className="w-4 h-4 text-[#F4C430]" /> : <Square className="w-4 h-4" />}
      </button>

      <div className="flex items-start gap-3 pl-5">
        {/* Avatar with activity ring */}
        <div className="relative shrink-0" onClick={() => onAction(user, 'view')}>
          <div className={`w-11 h-11 rounded-full bg-gradient-to-br from-[#F4C430]/20 to-[#F4C430]/20 flex items-center justify-center text-sm font-medium text-[#F4C430] ring-2 ${isActive ? 'ring-[#F4C430]/30' : 'ring-white/[0.06]'}`}>
            {user.name.charAt(0)}
          </div>
          {/* Online indicator */}
          {isActive && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#F4C430] ring-2 ring-[var(--bg-primary)]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-[--text-primary] truncate">{user.name}</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded-md text-[--text-muted] hover:text-[--text-secondary] hover:bg-[#F4C430]/[0.04] transition-all opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[--bg-surface] border-[#F4C430]/[0.12] text-[--text-secondary] w-52">
                <DropdownMenuItem className="text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary] cursor-pointer" onClick={() => onAction(user, 'view')}>
                  <Eye className="w-3.5 h-3.5 mr-2" />View Details
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary] cursor-pointer" onClick={() => onAction(user, 'edit_profile')}>
                  <Edit3 className="w-3.5 h-3.5 mr-2" />Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary] cursor-pointer" onClick={() => onAction(user, 'reset_password')}>
                  <Lock className="w-3.5 h-3.5 mr-2" />Reset Password
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#F4C430]/[0.06]" />
                <DropdownMenuItem className="text-xs focus:bg-[--status-warning-bg] focus:text-[--status-warning] cursor-pointer" onClick={() => onAction(user, 'ban_workflow')}>
                  <AlertOctagon className="w-3.5 h-3.5 mr-2" />Issue Warning / Ban
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs focus:bg-[#F4C430]/10 focus:text-[#F4C430] cursor-pointer" onClick={() => onAction(user, 'shadow_ban')}>
                  <EyeOff className="w-3.5 h-3.5 mr-2" />Shadow Ban
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs focus:bg-[--status-danger-bg] focus:text-[--status-danger] cursor-pointer" onClick={() => onAction(user, 'permanent_ban')}>
                  <Ban className="w-3.5 h-3.5 mr-2" />Permanent Ban
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#F4C430]/[0.06]" />
                <DropdownMenuItem className="text-xs focus:bg-[#F4C430]/10 focus:text-[#F4C430] cursor-pointer" onClick={() => onAction(user, user.isVip ? 'remove_vip' : 'add_vip')}>
                  <Crown className="w-3.5 h-3.5 mr-2" />{user.isVip ? 'Remove VIP' : 'Add VIP Tag'}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs focus:bg-[#F4C430]/10 focus:text-[#F4C430] cursor-pointer" onClick={() => onAction(user, user.betaTester ? 'remove_beta' : 'add_beta')}>
                  <Zap className="w-3.5 h-3.5 mr-2" />{user.betaTester ? 'Remove Beta' : 'Add Beta Tester'}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#F4C430]/[0.06]" />
                <DropdownMenuItem className="text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary] cursor-pointer" onClick={() => onAction(user, 'admin_note')}>
                  <MessageSquare className="w-3.5 h-3.5 mr-2" />Add Admin Note
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary] cursor-pointer" onClick={() => onAction(user, 'reset_subscription')}>
                  <RotateCcw className="w-3.5 h-3.5 mr-2" />Reset Subscription
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <Mail className="w-3 h-3 text-[--text-muted]" />
            <p className="text-xs text-[--text-muted] truncate">{user.email}</p>
          </div>

          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <PlanBadge plan={user.plan} />
            <StatusBadge status={user.status} />
            <VerificationBadge verified={user.emailVerified ?? false} />
          </div>

          <div className="flex items-center gap-3 mt-2.5 text-[10px] text-[--text-muted]">
            <span className="flex items-center gap-1" title="Joined">
              <CalendarDays className="w-3 h-3" />{formatDate(user.createdAt)}
            </span>
            <span className="flex items-center gap-1" title="Last active">
              <Activity className="w-3 h-3" />{formatTimeAgo(user.lastLogin)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />{user.country || '—'}
            </span>
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />{user.language === 'ar' ? 'العربية' : 'EN'}
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
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#F4C430]/10 to-[#F4C430]/10 flex items-center justify-center border border-[#F4C430]/15">
          <Telescope className="w-10 h-10 text-[--text-muted]" />
        </div>
        {/* Decorative orbit ring */}
        <div className="absolute -inset-3 border border-[#F4C430]/[0.06] rounded-full" />
        <div className="absolute -inset-6 border border-[#F4C430]/[0.03] rounded-full" />
      </div>
      <h3 className="text-lg font-semibold text-[--text-secondary] mb-2">
        {isFiltered ? 'No users match your filters' : 'No users yet'}
      </h3>
      <p className="text-sm text-[--text-muted] text-center max-w-sm">
        {isFiltered
          ? 'Try adjusting your search query or clearing filters to find what you\'re looking for.'
          : 'When users sign up, they\'ll appear here. Users from your local database are shown in real-time.'
        }
      </p>
      {!isFiltered && (
        <div className="mt-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F4C430]/[0.04] border border-[#F4C430]/[0.08]">
          <Shield className="w-4 h-4 text-[--text-muted]" />
          <span className="text-xs text-[--text-muted]">Privacy-safe — only aggregate profile data is shown</span>
        </div>
      )}
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminUsers() {
  const { addAuditLog } = useAdminAuthStore()

  // Data state
  const [users, setUsers] = useState<EnhancedUserRecord[]>([])
  const [dataSource, setDataSource] = useState<'live' | 'demo'>('demo')
  const [isLoading, setIsLoading] = useState(true)
  const [totalFromApi, setTotalFromApi] = useState(0)

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [verificationFilter, setVerificationFilter] = useState<string>('all')
  const [sortOption, setSortOption] = useState<string>('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const pageSize = 12

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActionOpen, setBulkActionOpen] = useState(false)
  const [bulkAction, setBulkAction] = useState<string>('')

  // Export state
  const [isExporting, setIsExporting] = useState(false)

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Confirmation dialog
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ user: UserRecord; action: string } | null>(null)

  // Ban workflow dialog
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [banTarget, setBanTarget] = useState<UserRecord | null>(null)
  const [banType, setBanType] = useState<'warning' | 'temporary_suspension' | 'shadow_ban' | 'permanent_ban'>('warning')
  const [banReason, setBanReason] = useState('')
  const [banDuration, setBanDuration] = useState('24')
  const [banSubmitting, setBanSubmitting] = useState(false)

  // Admin note dialog
  const [noteDialogOpen, setNoteDialogOpen] = useState(false)
  const [noteTarget, setNoteTarget] = useState<UserRecord | null>(null)
  const [adminNote, setAdminNote] = useState('')

  // User detail drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)

  // Edit profile dialog
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [editProfileTarget, setEditProfileTarget] = useState<UserRecord | null>(null)
  const [editProfileData, setEditProfileData] = useState({
    firstName: '', lastName: '', email: '', phone: '', language: 'en', countryCode: '+966', emailVerified: false,
  })
  const [editProfileSubmitting, setEditProfileSubmitting] = useState(false)

  // Reset password dialog
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)
  const [resetPasswordTarget, setResetPasswordTarget] = useState<UserRecord | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetPasswordSubmitting, setResetPasswordSubmitting] = useState(false)

  // ─── Debounced search ─────────────────────────────────────────────────
  const handleSearchChange = useCallback((v: string) => {
    setSearchQuery(v)
    setCurrentPage(1)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(v)
    }, 250)
  }, [])

  // ─── Fetch users from API ────────────────────────────────────────────
  const fetchUsers = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true)
    else setIsLoading(true)
    try {
      const res = await fetch('/api/admin/users?pageSize=100', {
        credentials: 'same-origin',
      })
      if (res.status === 401) {
        useAdminAuthStore.getState().logoutAdmin()
        return
      }
      if (res.ok) {
        const json: UsersApiResponse = await res.json()
        setDataSource(json.source)
        setTotalFromApi(json.total)
        // Map API records to frontend UserRecord format
        const mapped: EnhancedUserRecord[] = json.data.map(u => ({
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
          isVip: u.is_vip || false,
          betaTester: u.beta_tester || false,
          trustScore: u.trust_score || 100,
          fraudScore: u.fraud_score || 0,
          trialStatus: (u.trial_status as UserRecord['trialStatus']) || 'none',
          emailVerified: u.email_verified ?? false,
        }))
        setUsers(mapped)
      }
    } catch {
      setDataSource('demo')
      setUsers([])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // ─── Derived data: stats from actual users ───────────────────────────
  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter(u => u.status === 'active').length
    const verified = users.filter(u => u.emailVerified).length
    const newThisMonth = users.filter(u => {
      if (!u.createdAt) return false
      const d = new Date(u.createdAt)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    const activeRate = total > 0 ? Math.round((active / total) * 1000) / 10 : 0
    const verifiedRate = total > 0 ? Math.round((verified / total) * 1000) / 10 : 0
    return { total, active, newThisMonth, activeRate, verified, verifiedRate }
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
      { stage: 'New', count: newUsers, color: '#F4C430', pct: Math.round((newUsers / total) * 100) },
      { stage: 'Active', count: activeUsers, color: '#F4C430', pct: Math.round((activeUsers / total) * 100) },
      { stage: 'Power', count: powerUsers, color: '#F4C430', pct: Math.round((powerUsers / total) * 100) },
      { stage: 'Churned', count: churnedUsers, color: '#F4C430', pct: Math.round((churnedUsers / total) * 100) },
    ]
  }, [users])

  // ─── Derived data: plan distribution for sidebar ────────────────────
  const planDistribution = useMemo(() => {
    const free = users.filter(u => u.plan === 'Free').length
    const pro = users.filter(u => u.plan === 'Pro').length
    const family = users.filter(u => u.plan === 'Family+').length
    const max = users.filter(u => u.plan === 'Max').length
    const ultimate = users.filter(u => u.plan === 'Ultimate').length
    return [
      { plan: 'Free', count: free, color: '#64748B', pct: users.length ? Math.round((free / users.length) * 100) : 0 },
      { plan: 'Pro', count: pro, color: '#F4C430', pct: users.length ? Math.round((pro / users.length) * 100) : 0 },
      { plan: 'Family+', count: family, color: '#F59E0B', pct: users.length ? Math.round((family / users.length) * 100) : 0 },
      { plan: 'Max', count: max, color: '#C40812', pct: users.length ? Math.round((max / users.length) * 100) : 0 },
      { plan: 'Ultimate', count: ultimate, color: '#F43F5E', pct: users.length ? Math.round((ultimate / users.length) * 100) : 0 },
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

  // ─── Parse sort option into sortField + sortDir ────────────────────
  const { sortField, sortDir } = useMemo(() => {
    switch (sortOption) {
      case 'newest': return { sortField: 'createdAt' as SortField, sortDir: 'desc' as SortDir }
      case 'oldest': return { sortField: 'createdAt' as SortField, sortDir: 'asc' as SortDir }
      case 'name_az': return { sortField: 'name' as SortField, sortDir: 'asc' as SortDir }
      case 'name_za': return { sortField: 'name' as SortField, sortDir: 'desc' as SortDir }
      case 'last_active': return { sortField: 'lastLogin' as SortField, sortDir: 'desc' as SortDir }
      case 'email_az': return { sortField: 'email' as SortField, sortDir: 'asc' as SortDir }
      default: return { sortField: 'createdAt' as SortField, sortDir: 'desc' as SortDir }
    }
  }, [sortOption])

  // Filtered + sorted data
  const filteredUsers = useMemo(() => {
    let result = [...users]

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }
    if (planFilter !== 'all') {
      result = result.filter(u => u.plan === planFilter)
    }
    if (statusFilter !== 'all') {
      result = result.filter(u => u.status === statusFilter)
    }
    if (verificationFilter === 'verified') {
      result = result.filter(u => u.emailVerified)
    } else if (verificationFilter === 'unverified') {
      result = result.filter(u => !u.emailVerified)
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
  }, [users, debouncedSearch, planFilter, statusFilter, verificationFilter, sortField, sortDir])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handlePlanFilterChange = (v: string) => { setPlanFilter(v); setCurrentPage(1) }
  const handleStatusFilterChange = (v: string) => { setStatusFilter(v); setCurrentPage(1) }
  const handleVerificationFilterChange = (v: string) => { setVerificationFilter(v); setCurrentPage(1) }
  const handleSortOptionChange = (v: string) => { setSortOption(v); setCurrentPage(1) }

  // ─── Selection handling ─────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedUsers.length && paginatedUsers.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedUsers.map(u => u.id)))
    }
  }, [selectedIds, paginatedUsers])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // ─── Export handler ────────────────────────────────────────────────
  const handleExport = useCallback(async (selectedOnly = false) => {
    setIsExporting(true)
    try {
      const idsToExport = selectedOnly ? Array.from(selectedIds) : undefined
      let exportData: unknown[] = []

      if (idsToExport && idsToExport.length > 0) {
        // Export selected users via bulk API
        const res = await fetch('/api/admin/users/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            action: 'bulk_export',
            user_ids: idsToExport,
            format: 'json',
          }),
        })
        if (res.ok) {
          const json = await res.json()
          exportData = json.data || []
        } else {
          // Fallback: export from local data
          exportData = users.filter(u => idsToExport.includes(u.id))
        }
      } else {
        // Export all users from local data
        exportData = users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          plan: u.plan,
          status: u.status,
          language: u.language,
          country: u.country,
          emailVerified: u.emailVerified,
          lastLogin: u.lastLogin,
          createdAt: u.createdAt,
          isVip: u.isVip,
          betaTester: u.betaTester,
        }))
      }

      // Convert to CSV and download
      if (Array.isArray(exportData) && exportData.length > 0) {
        const headers = Object.keys(exportData[0] as Record<string, unknown>)
        const csvRows = [
          headers.map(h => `"${h}"`).join(','),
          ...exportData.map(row => {
            const r = row as Record<string, unknown>
            return headers.map(h => {
              const val = r[h]
              if (val === null || val === undefined) return '""'
              if (Array.isArray(val)) return `"${val.join(';')}"`
              const str = String(val).replace(/"/g, '""')
              return `"${str}"`
            }).join(',')
          }),
        ]
        const csv = csvRows.join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success(`Exported ${exportData.length} users to CSV`)
        addAuditLog('export_users', 'system', 'bulk', { count: exportData.length, selectedOnly })
      } else {
        toast.info('No users to export')
      }
    } catch {
      toast.error('Export failed — check your connection')
    } finally {
      setIsExporting(false)
    }
  }, [selectedIds, users, addAuditLog])

  // ─── Bulk action handler ──────────────────────────────────────────
  const handleBulkAction = useCallback(async (action: string) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      toast.error('No users selected')
      return
    }

    if (action === 'export_selected') {
      await handleExport(true)
      return
    }

    try {
      const res = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: action === 'ban_selected' ? 'bulk_status_change' : action === 'delete_selected' ? 'bulk_status_change' : action,
          user_ids: ids,
          status: action === 'ban_selected' ? 'suspended' : 'active',
        }),
      })

      if (res.ok) {
        const json = await res.json()
        const succeeded = json.summary?.succeeded ?? ids.length
        if (action === 'ban_selected') {
          toast.success(`Suspended ${succeeded} user(s)`)
          setUsers(prev => prev.map(u => ids.includes(u.id) ? { ...u, status: 'suspended' as const } : u))
        } else if (action === 'delete_selected') {
          toast.success(`Action applied to ${succeeded} user(s)`)
        }
        addAuditLog(`bulk_${action}`, 'system', 'bulk', { userIds: ids, count: ids.length })
      } else {
        // If API fails, still update locally
        if (action === 'ban_selected') {
          setUsers(prev => prev.map(u => ids.includes(u.id) ? { ...u, status: 'suspended' as const } : u))
          toast.success(`Suspended ${ids.length} user(s) locally`)
        } else {
          toast.error(`Bulk action failed: ${action}`)
        }
      }
    } catch {
      // If API fails, still update locally
      if (action === 'ban_selected') {
        setUsers(prev => prev.map(u => ids.includes(u.id) ? { ...u, status: 'suspended' as const } : u))
        toast.success(`Suspended ${ids.length} user(s) locally`)
      } else {
        toast.error('Bulk action failed — check your connection')
      }
    }

    setSelectedIds(new Set())
    setBulkActionOpen(false)
  }, [selectedIds, addAuditLog, handleExport])

  const handleAction = (user: UserRecord, action: string) => {
    if (action === 'view') {
      addAuditLog('view_user_details', 'user', user.id, { userName: user.name, userEmail: user.email })
      setSelectedUserId(user.id)
      setSelectedUser(user)
      setDrawerOpen(true)
      return
    }
    if (action === 'edit_profile') {
      const nameParts = user.name.split(' ')
      setEditProfileData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: user.email,
        phone: '',
        language: user.language || 'en',
        countryCode: user.country || '+966',
        emailVerified: (user as EnhancedUserRecord).emailVerified ?? false,
      })
      setEditProfileTarget(user)
      setEditProfileOpen(true)
      return
    }
    if (action === 'reset_password') {
      setResetPasswordTarget(user)
      setNewPassword('')
      setResetPasswordOpen(true)
      return
    }
    if (action === 'ban_workflow') {
      setBanTarget(user)
      setBanType('warning')
      setBanReason('')
      setBanDuration('24')
      setBanDialogOpen(true)
      return
    }
    if (action === 'admin_note') {
      setNoteTarget(user)
      setAdminNote('')
      setNoteDialogOpen(true)
      return
    }
    if (action === 'add_vip') {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isVip: true } : u))
      toast.success(`${user.name} granted VIP status`)
      addAuditLog('add_vip', 'user', user.id, { userName: user.name })
      return
    }
    if (action === 'remove_vip') {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isVip: false } : u))
      toast.success(`VIP status removed from ${user.name}`)
      addAuditLog('remove_vip', 'user', user.id, { userName: user.name })
      return
    }
    if (action === 'add_beta') {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, betaTester: true } : u))
      toast.success(`${user.name} added as beta tester`)
      addAuditLog('add_beta_tester', 'user', user.id, { userName: user.name })
      return
    }
    if (action === 'remove_beta') {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, betaTester: false } : u))
      toast.success(`Beta tester status removed from ${user.name}`)
      addAuditLog('remove_beta_tester', 'user', user.id, { userName: user.name })
      return
    }
    setConfirmAction({ user, action })
    setConfirmOpen(true)
  }

  const handleConfirmAction = async () => {
    if (!confirmAction) return
    const { user, action } = confirmAction
    try {
      if (action === 'suspend' || action === 'shadow_ban' || action === 'permanent_ban') {
        const res = await fetch('/api/admin/bans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            userId: user.id,
            banType: action === 'suspend' ? 'temporary_suspension' : action,
            reason: `Admin action: ${action}`,
            durationHours: action === 'suspend' ? 24 : undefined,
          }),
        })
        if (res.ok) {
          toast.success(`${action} applied to ${user.name}`)
        } else {
          toast.error(`Failed to ${action} user`)
        }
      } else {
        toast.success(`Action '${action}' applied to ${user.name}`)
      }
    } catch {
      toast.error('Action failed — check your connection')
    }
    addAuditLog(`${action}_user`, 'user', user.id, { userName: user.name, userEmail: user.email })
    setConfirmOpen(false)
    setConfirmAction(null)
  }

  const handleBanSubmit = async () => {
    if (!banTarget || !banReason.trim()) return
    setBanSubmitting(true)
    try {
      const res = await fetch('/api/admin/bans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          userId: banTarget.id,
          banType,
          reason: banReason.trim(),
          durationHours: banType === 'temporary_suspension' ? parseInt(banDuration) : undefined,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.approvalRequired) {
          toast.success('Permanent ban submitted — requires founder approval', { duration: 5000 })
        } else {
          toast.success(`${banType.replace(/_/g, ' ')} issued for ${banTarget.name}`)
        }
        addAuditLog('issue_ban', 'user', banTarget.id, { banType, reason: banReason })
      } else {
        toast.error('Failed to issue ban')
      }
    } catch {
      toast.error('Failed to issue ban — check connection')
    } finally {
      setBanSubmitting(false)
      setBanDialogOpen(false)
      setBanTarget(null)
    }
  }

  const handleAdminNote = () => {
    if (!noteTarget || !adminNote.trim()) return
    addAuditLog('add_admin_note', 'user', noteTarget.id, { userName: noteTarget.name, note: adminNote })
    toast.success(`Note added for ${noteTarget.name}`)
    setNoteDialogOpen(false)
    setNoteTarget(null)
    setAdminNote('')
  }

  // ─── Edit Profile submit handler ──────────────────────────────────
  const handleEditProfileSubmit = async () => {
    if (!editProfileTarget) return
    setEditProfileSubmitting(true)
    try {
      const res = await fetch(`/api/admin/users/${editProfileTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'update_profile',
          firstName: editProfileData.firstName,
          lastName: editProfileData.lastName,
          email: editProfileData.email,
          phone: editProfileData.phone || undefined,
          language: editProfileData.language,
          countryCode: editProfileData.countryCode,
          emailVerified: editProfileData.emailVerified,
        }),
      })
      if (res.ok) {
        toast.success(`Profile updated for ${editProfileTarget.name}`)
        addAuditLog('edit_user_profile', 'user', editProfileTarget.id, { email: editProfileData.email })
        setUsers(prev => prev.map(u => u.id === editProfileTarget.id ? {
          ...u,
          name: [editProfileData.firstName, editProfileData.lastName].filter(Boolean).join(' ') || u.name,
          email: editProfileData.email,
          language: editProfileData.language,
          country: editProfileData.countryCode,
          emailVerified: editProfileData.emailVerified,
        } : u))
        setEditProfileOpen(false)
        setEditProfileTarget(null)
      } else {
        const json = await res.json()
        toast.error(json.error || 'Failed to update profile')
      }
    } catch {
      toast.error('Failed to update profile — check connection')
    } finally {
      setEditProfileSubmitting(false)
    }
  }

  // ─── Reset Password submit handler ────────────────────────────────
  const handleResetPasswordSubmit = async () => {
    if (!resetPasswordTarget || !newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setResetPasswordSubmitting(true)
    try {
      const res = await fetch(`/api/admin/users/${resetPasswordTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'reset_password', newPassword }),
      })
      if (res.ok) {
        toast.success(`Password reset for ${resetPasswordTarget.name}. All sessions terminated.`)
        addAuditLog('reset_user_password', 'user', resetPasswordTarget.id, { email: resetPasswordTarget.email })
        setResetPasswordOpen(false)
        setResetPasswordTarget(null)
        setNewPassword('')
      } else {
        const json = await res.json()
        toast.error(json.error || 'Failed to reset password')
      }
    } catch {
      toast.error('Failed to reset password — check connection')
    } finally {
      setResetPasswordSubmitting(false)
    }
  }

  const isFiltered = searchQuery !== '' || planFilter !== 'all' || statusFilter !== 'all' || verificationFilter !== 'all'

  // ─── Bulk confirmation dialog ─────────────────────────────────────
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [pendingBulkAction, setPendingBulkAction] = useState<string>('')

  const requestBulkAction = (action: string) => {
    if (selectedIds.size === 0) {
      toast.error('No users selected')
      return
    }
    setPendingBulkAction(action)
    setBulkConfirmOpen(true)
  }

  const confirmBulkAction = () => {
    handleBulkAction(pendingBulkAction)
    setBulkConfirmOpen(false)
    setPendingBulkAction('')
  }

  return (
    <div className="space-y-6">
      {/* Show skeleton while data is loading */}
      {isLoading && users.length === 0 ? (
        <AdminTablePageSkeleton />
      ) : (
      <>
      {/* ─── Page Title: People Observatory ──────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F4C430]/20 to-[#F4C430]/20 flex items-center justify-center border border-[#F4C430]/20">
              <Telescope className="w-5 h-5 text-[#F4C430]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[--text-primary] flex items-center gap-2">
                People Observatory
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-normal ${dataSource === 'live' ? 'bg-[#F4C430]/10 text-[--text-secondary] border-[#F4C430]/20' : 'bg-[#F4C430]/10 text-[--text-muted] border-[#F4C430]/10'}`}>
                  {dataSource === 'live' ? 'Live Data' : 'No Live Data'}
                </span>
              </h2>
              <div className="h-[2px] w-32 rounded-full bg-gradient-to-r from-[#F4C430]/80 via-[#F4C430]/60 to-transparent mt-1" />
            </div>
          </div>
          {/* Refresh button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchUsers(true)}
            disabled={isRefreshing}
            className="text-[--text-muted] hover:text-[#F4C430] hover:bg-[#F4C430]/[0.04] gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-xs">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
        </div>
        <p className="text-sm text-[--text-muted] mt-1">Explore user demographics, engagement patterns, and lifecycle stages</p>
      </motion.div>

      {/* ─── Top Stats: 2x2 Grid with Radial Progress ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.total} delay={0} ringValue={stats.total} ringMax={Math.max(stats.total * 1.5, 10)} ringColor="#F4C430" />
        <StatCard icon={UserPlus} label="New This Month" value={stats.newThisMonth} delay={0.05} ringValue={stats.newThisMonth} ringMax={Math.max(stats.total, 10)} ringColor="#F4C430" />
        <StatCard icon={Activity} label="Active Rate" value={`${stats.activeRate}%`} delay={0.1} ringValue={stats.activeRate} ringMax={100} ringColor="#F4C430" />
        <StatCard icon={Shield} label="Verified" value={`${stats.verifiedRate}%`} delay={0.15} ringValue={stats.verifiedRate} ringMax={100} ringColor="#F4C430" />
      </div>

      {/* ─── Main Content: Sidebar + User Explorer ──────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#F4C430]/[0.02] border border-[#F4C430]/[0.08] rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-[#F4C430]/10 rounded w-2/3 mb-3" />
                <div className="h-2 bg-[#F4C430]/5 rounded w-full mb-2" />
                <div className="h-2 bg-[#F4C430]/5 rounded w-4/5" />
              </div>
            ))}
          </div>
          <div className="lg:col-span-3 bg-[#F4C430]/[0.02] border border-[#F4C430]/[0.08] rounded-xl p-8 animate-pulse">
            <div className="h-8 bg-[#F4C430]/10 rounded w-1/3 mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-32 bg-[#F4C430]/5 rounded-xl" />
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
              className="bg-gradient-to-b from-[#F4C430]/[0.02] to-transparent border border-[#F4C430]/[0.08] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[--text-primary] mb-4 flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[--text-secondary]" />
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

            {/* Country Distribution */}
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25, duration: 0.3 }}
              className="bg-gradient-to-b from-[#F4C430]/[0.02] to-transparent border border-[#F4C430]/[0.08] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[--text-primary] mb-4 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[--text-secondary]" />
                Countries
              </h3>
              <div className="space-y-2">
                {countryBreakdown.map(([country, count]) => (
                  <div key={country} className="flex items-center justify-between">
                    <span className="text-xs text-[--text-muted]">{country}</span>
                    <span className="text-xs font-metric text-[--text-muted]">{count}</span>
                  </div>
                ))}
                {countryBreakdown.length === 0 && <p className="text-xs text-[--text-muted]">No data</p>}
              </div>
            </motion.div>

            {/* Language Split */}
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.3 }}
              className="bg-gradient-to-b from-[#F4C430]/[0.02] to-transparent border border-[#F4C430]/[0.08] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[--text-primary] mb-4 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-[--text-secondary]" />
                Languages
              </h3>
              <div className="space-y-2">
                {languageBreakdown.map(l => (
                  <div key={l.lang}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[--text-muted]">{l.lang}</span>
                      <span className="text-xs text-[--text-muted]">{l.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-[--bg-surface] rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${l.pct}%` }} transition={{ delay: 0.35, duration: 0.6 }}
                        className="h-full rounded-full bg-[#F4C430]/40" />
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
              className="bg-gradient-to-b from-[#F4C430]/[0.02] to-transparent border border-[#F4C430]/[0.08] rounded-xl p-4">
              {/* Row 1: Search + Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
                  <input type="text" placeholder="Search by name or email..." value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[--bg-primary] border border-[#F4C430]/[0.08] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30 transition-colors" />
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Export Users Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport(false)}
                    disabled={isExporting}
                    className="h-8 text-xs bg-transparent border-[#F4C430]/[0.12] text-[--text-secondary] hover:bg-[#F4C430]/[0.06] hover:text-[#F4C430] gap-1.5"
                  >
                    <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-pulse' : ''}`} />
                    {isExporting ? 'Exporting...' : 'Export Users'}
                  </Button>

                  {/* Bulk Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={selectedIds.size === 0}
                        className="h-8 text-xs bg-transparent border-[#F4C430]/[0.12] text-[--text-secondary] hover:bg-[#F4C430]/[0.06] hover:text-[#F4C430] gap-1.5 disabled:opacity-40"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Bulk Actions
                        {selectedIds.size > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#F4C430]/20 text-[#F4C430] text-[10px] font-medium">
                            {selectedIds.size}
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[--bg-surface] border-[#F4C430]/[0.12] text-[--text-secondary] w-52">
                      <DropdownMenuItem className="text-xs focus:bg-[--status-warning-bg] focus:text-[--status-warning] cursor-pointer" onClick={() => requestBulkAction('ban_selected')}>
                        <Ban className="w-3.5 h-3.5 mr-2" />Suspend Selected ({selectedIds.size})
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs focus:bg-[--status-danger-bg] focus:text-[--status-danger] cursor-pointer" onClick={() => requestBulkAction('delete_selected')}>
                        <Trash2 className="w-3.5 h-3.5 mr-2" />Delete Selected ({selectedIds.size})
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-[#F4C430]/[0.06]" />
                      <DropdownMenuItem className="text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary] cursor-pointer" onClick={() => handleExport(true)}>
                        <Download className="w-3.5 h-3.5 mr-2" />Export Selected ({selectedIds.size})
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-[#F4C430]/[0.06]" />
                      <DropdownMenuItem className="text-xs focus:bg-[--bg-surface] focus:text-[--text-muted] cursor-pointer" onClick={clearSelection}>
                        <XCircle className="w-3.5 h-3.5 mr-2" />Clear Selection
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Row 2: Filters + Sort + View + Count */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-3">
                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={planFilter} onValueChange={handlePlanFilterChange}>
                    <SelectTrigger className="h-8 text-xs bg-[--bg-primary] border-[#F4C430]/[0.08] text-[--text-secondary] w-[110px]">
                      <SelectValue placeholder="Plan" />
                    </SelectTrigger>
                    <SelectContent className="bg-[--bg-surface] border-[#F4C430]/[0.12]">
                      <SelectItem value="all" className="text-[--text-secondary] text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary]">All Plans</SelectItem>
                      <SelectItem value="Free" className="text-[--text-secondary] text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary]">Free</SelectItem>
                      <SelectItem value="Pro" className="text-[--text-secondary] text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary]">Pro</SelectItem>
                      <SelectItem value="Family+" className="text-[--text-secondary] text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary]">Family+</SelectItem>
                      <SelectItem value="Max" className="text-[--text-secondary] text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary]">Max</SelectItem>
                      <SelectItem value="Ultimate" className="text-[--text-secondary] text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary]">Ultimate</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                    <SelectTrigger className="h-8 text-xs bg-[--bg-primary] border-[#F4C430]/[0.08] text-[--text-secondary] w-[120px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[--bg-surface] border-[#F4C430]/[0.12]">
                      <SelectItem value="all" className="text-[--text-secondary] text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary]">All Status</SelectItem>
                      <SelectItem value="active" className="text-[--text-secondary] text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary]">Active</SelectItem>
                      <SelectItem value="suspended" className="text-[--text-secondary] text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary]">Suspended</SelectItem>
                      <SelectItem value="flagged" className="text-[--text-secondary] text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary]">Flagged</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={verificationFilter} onValueChange={handleVerificationFilterChange}>
                    <SelectTrigger className="h-8 text-xs bg-[--bg-primary] border-[#F4C430]/[0.08] text-[--text-secondary] w-[130px]">
                      <SelectValue placeholder="Verification" />
                    </SelectTrigger>
                    <SelectContent className="bg-[--bg-surface] border-[#F4C430]/[0.12]">
                      <SelectItem value="all" className="text-[--text-secondary] text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary]">All Verification</SelectItem>
                      <SelectItem value="verified" className="text-[--text-secondary] text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary]">Verified</SelectItem>
                      <SelectItem value="unverified" className="text-[--text-secondary] text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary]">Unverified</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortOption} onValueChange={handleSortOptionChange}>
                    <SelectTrigger className="h-8 text-xs bg-[--bg-primary] border-[#F4C430]/[0.08] text-[--text-secondary] w-[140px]">
                      <ArrowUpDown className="w-3 h-3 mr-1" />
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent className="bg-[--bg-surface] border-[#F4C430]/[0.12]">
                      <SelectItem value="newest" className="text-[--text-secondary] text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary]">Newest First</SelectItem>
                      <SelectItem value="oldest" className="text-[--text-secondary] text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary]">Oldest First</SelectItem>
                      <SelectItem value="name_az" className="text-[--text-secondary] text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary]">Name A → Z</SelectItem>
                      <SelectItem value="name_za" className="text-[--text-secondary] text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary]">Name Z → A</SelectItem>
                      <SelectItem value="last_active" className="text-[--text-secondary] text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary]">Last Active</SelectItem>
                      <SelectItem value="email_az" className="text-[--text-secondary] text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary]">Email A → Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* User count display */}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-[--text-muted]">
                    {filteredUsers.length !== users.length
                      ? `${filteredUsers.length} of ${users.length} users`
                      : `${users.length} user${users.length !== 1 ? 's' : ''}`
                    }
                  </span>
                </div>

                {/* View toggle */}
                <div className="flex items-center gap-1 border border-[#F4C430]/[0.08] rounded-lg p-0.5">
                  <button onClick={() => setViewMode('cards')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'cards' ? 'bg-[#F4C430]/15 text-[#F4C430]' : 'text-[--text-muted] hover:text-[--text-muted]'}`}>
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-[#F4C430]/15 text-[#F4C430]' : 'text-[--text-muted] hover:text-[--text-muted]'}`}>
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
                        <UserCard
                          key={user.id}
                          user={user}
                          onAction={handleAction}
                          selected={selectedIds.has(user.id)}
                          onToggleSelect={toggleSelect}
                        />
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
                className="bg-gradient-to-b from-[#F4C430]/[0.02] to-transparent border border-[#F4C430]/[0.08] rounded-xl overflow-hidden">
                <div className="max-h-[500px] overflow-y-auto">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#F4C430]/[0.06] hover:bg-transparent">
                        <TableHead className="w-10">
                          <button onClick={toggleSelectAll} className="text-[--text-muted] hover:text-[#F4C430] transition-colors">
                            {selectedIds.size === paginatedUsers.length && paginatedUsers.length > 0
                              ? <CheckSquare className="w-4 h-4 text-[#F4C430]" />
                              : <Square className="w-4 h-4" />
                            }
                          </button>
                        </TableHead>
                        <TableHead className="text-[--text-secondary] text-xs font-medium">User</TableHead>
                        <TableHead className="text-[--text-secondary] text-xs font-medium">Email</TableHead>
                        <TableHead className="text-[--text-secondary] text-xs font-medium">Plan</TableHead>
                        <TableHead className="text-[--text-secondary] text-xs font-medium">Status</TableHead>
                        <TableHead className="text-[--text-secondary] text-xs font-medium">Verified</TableHead>
                        <TableHead className="text-[--text-secondary] text-xs font-medium">Last Active</TableHead>
                        <TableHead className="text-[--text-secondary] text-xs font-medium">Joined</TableHead>
                        <TableHead className="text-[--text-secondary] text-xs font-medium text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence mode="popLayout">
                        {paginatedUsers.map((user, idx) => (
                          <motion.tr key={user.id}
                            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                            transition={{ delay: idx * 0.02, duration: 0.2 }}
                            className={`border-b border-[#F4C430]/[0.04] hover:bg-[#F4C430]/[0.02] transition-colors group ${selectedIds.has(user.id) ? 'bg-[#F4C430]/[0.04]' : ''}`}>
                            <TableCell className="py-3">
                              <button onClick={() => toggleSelect(user.id)} className="text-[--text-muted] hover:text-[#F4C430] transition-colors">
                                {selectedIds.has(user.id)
                                  ? <CheckSquare className="w-4 h-4 text-[#F4C430]" />
                                  : <Square className="w-4 h-4" />
                                }
                              </button>
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F4C430]/20 to-[#F4C430]/20 flex items-center justify-center text-xs font-medium text-[#F4C430] shrink-0 ring-2 ring-[#F4C430]/20">
                                  {user.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-[--text-primary]">{user.name}</p>
                                  <p className="text-[10px] text-[--text-muted]">{user.country || 'SA'} · {user.language === 'ar' ? 'العربية' : 'EN'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-[--text-muted]">{user.email}</TableCell>
                            <TableCell><PlanBadge plan={user.plan} /></TableCell>
                            <TableCell><StatusBadge status={user.status} /></TableCell>
                            <TableCell>
                              {user.emailVerified
                                ? <CheckCircle2 className="w-4 h-4 text-[#F4C430]" />
                                : <XCircle className="w-4 h-4 text-[--status-danger]/60" />
                              }
                            </TableCell>
                            <TableCell className="text-sm text-[--text-muted]">
                              <span title={formatDate(user.lastLogin)}>{formatTimeAgo(user.lastLogin)}</span>
                            </TableCell>
                            <TableCell className="text-sm text-[--text-muted]">{formatDate(user.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1.5 rounded-md text-[--text-muted] hover:text-[--text-secondary] hover:bg-[#F4C430]/[0.04] transition-all opacity-0 group-hover:opacity-100">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[--bg-surface] border-[#F4C430]/[0.12] text-[--text-secondary] w-48">
                                  <DropdownMenuItem className="text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary] cursor-pointer" onClick={() => handleAction(user, 'view')}>
                                    <Eye className="w-3.5 h-3.5 mr-2" />View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-[#F4C430]/[0.06]" />
                                  <DropdownMenuItem className="text-xs focus:bg-[--status-danger-bg] focus:text-[--status-danger] cursor-pointer" onClick={() => handleAction(user, 'suspend')}>
                                    <Ban className="w-3.5 h-3.5 mr-2" />Suspend Account
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs focus:bg-[--status-warning-bg] focus:text-[--status-warning] cursor-pointer" onClick={() => handleAction(user, 'flag')}>
                                    <Flag className="w-3.5 h-3.5 mr-2" />Flag Abuse
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-[#F4C430]/[0.06]" />
                                  <DropdownMenuItem className="text-xs focus:bg-[#F4C430]/[0.06] focus:text-[--text-primary] cursor-pointer" onClick={() => handleAction(user, 'reset_subscription')}>
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
                          <TableCell colSpan={9} className="h-32 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <Users className="w-8 h-8 text-[#F4C430]/10" />
                              <p className="text-sm text-[--text-muted]">No users found</p>
                              <p className="text-xs text-[--text-muted]">Try adjusting your search or filters</p>
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

            {/* Pagination */}
            {filteredUsers.length > pageSize && (
              <div className="flex items-center justify-between px-2">
                <p className="text-xs text-[--text-muted]">
                  Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
                  {filteredUsers.length !== users.length && (
                    <span className="text-[--text-muted] ml-1">(filtered from {users.length} total)</span>
                  )}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="p-1.5 rounded-md text-[--text-muted] hover:text-[#F4C430] hover:bg-[#F4C430]/[0.04] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first, last, current, and pages around current
                      if (totalPages <= 7) return true
                      if (page === 1 || page === totalPages) return true
                      if (Math.abs(page - currentPage) <= 1) return true
                      return false
                    })
                    .map((page, i, arr) => {
                      // Add ellipsis indicator
                      const prevPage = arr[i - 1]
                      const showEllipsis = prevPage !== undefined && page - prevPage > 1
                      return (
                        <span key={page} className="flex items-center">
                          {showEllipsis && <span className="text-[--text-muted] text-xs px-1">...</span>}
                          <button onClick={() => setCurrentPage(page)}
                            className={`w-7 h-7 rounded-md text-xs font-medium transition-all ${page === currentPage ? 'bg-[#F4C430]/20 text-[#F4C430]' : 'text-[--text-muted] hover:text-[#F4C430] hover:bg-[#F4C430]/[0.04]'}`}>
                            {page}
                          </button>
                        </span>
                      )
                    })}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md text-[--text-muted] hover:text-[#F4C430] hover:bg-[#F4C430]/[0.04] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
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
          className="bg-gradient-to-b from-[#F4C430]/[0.02] to-transparent border border-[#F4C430]/[0.08] rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-[--text-primary]">User Lifecycle Stages</h3>
              <p className="text-xs text-[--text-muted] mt-0.5">Distribution across engagement stages</p>
            </div>
            <div className="flex items-center gap-3">
              {lifecycleStages.map(stage => (
                <div key={stage.stage} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-[10px] text-[--text-muted]">{stage.stage}</span>
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
        className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-[#F4C430]/[0.02] to-transparent border border-[#F4C430]/[0.08]">
        <Shield className="w-4 h-4 text-[#F4C430] mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-[--text-muted]">Privacy-First Observatory</p>
          <p className="text-[10px] text-[--text-muted] mt-0.5 leading-relaxed">
            This view displays only privacy-safe profile fields: name, email, plan, status, and aggregate engagement metrics.
            Private messages, files, task content, and personal data are never accessible.
          </p>
        </div>
      </motion.div>

      {/* ─── Confirmation Dialog ────────────────────────────────────── */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-[--bg-surface] border-[#F4C430]/[0.12] text-[--text-primary]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[--status-warning]" />
              Confirm Action
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[--text-muted]">
              {confirmAction && (
                <>Are you sure you want to <strong className="text-[--text-secondary]">{confirmAction.action}</strong> user <strong className="text-[--text-secondary]">{confirmAction.user.name}</strong>?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[#F4C430]/[0.12] text-[--text-secondary] hover:bg-[#F4C430]/[0.04] hover:text-[--text-primary]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className="bg-[#E50914] text-white hover:bg-[#C40812]">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Bulk Action Confirmation Dialog ─────────────────────────── */}
      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent className="bg-[--bg-surface] border-[#F4C430]/[0.12] text-[--text-primary]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[--status-warning]" />
              Confirm Bulk Action
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[--text-muted]">
              Are you sure you want to <strong className="text-[--text-secondary]">{pendingBulkAction === 'ban_selected' ? 'suspend' : pendingBulkAction === 'delete_selected' ? 'delete' : pendingBulkAction}</strong> <strong className="text-[--text-secondary]">{selectedIds.size} user(s)</strong>?
              This action will affect all selected users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[#F4C430]/[0.12] text-[--text-secondary] hover:bg-[#F4C430]/[0.04] hover:text-[--text-primary]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkAction}
              className="bg-[#E50914] text-white hover:bg-[#C40812]">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── User Detail Drawer ─────────────────────────────────────── */}
      <UserDetailDrawer
        userId={selectedUserId}
        user={selectedUser}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedUserId(null)
          setSelectedUser(null)
        }}
      />
      </>
      )}
    </div>
  )
}
