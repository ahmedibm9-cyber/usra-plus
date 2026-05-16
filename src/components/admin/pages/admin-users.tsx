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
import { safeJsonResponse } from '@/lib/safe-fetch'
import { Alert as MuiAlert } from '@mui/material'


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
    active: { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', dot: 'bg-[var(--accent)]' },
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
    'Pro': { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]' },
    'Family+': { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]' },
    'Max': { bg: 'bg-[var(--accent-primary)]/10', text: 'text-[var(--accent-primary)]' },
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
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--accent)]/10 text-[var(--accent)]"><CheckCircle2 className="w-3 h-3" />Verified</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[--status-danger-bg] text-[--status-danger]"><XCircle className="w-3 h-3" />Unverified</span>
}

// ─── Radial Progress Ring ─────────────────────────────────────────────────────

function RadialProgressRing({ value, max, size = 56, strokeWidth = 4, color = 'var(--accent)' }: {
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
      className="relative bg-gradient-to-br from-[var(--accent)]/[0.03] to-[var(--accent)]/[0.02] border border-[var(--accent)]/[0.12] rounded-xl p-5 hover:border-[var(--accent)]/[0.25] transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 overflow-hidden group"
    >
      <Box className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(20,184,166,0.04))' }} />
      <Box className="relative z-10 flex items-start justify-between">
        <Box className="flex items-start gap-3">
          <RadialProgressRing value={ringValue} max={ringMax} size={48} strokeWidth={3} color={ringColor || 'var(--accent)'} />
          <Box>
            <Box className="flex items-center gap-1.5 mb-0.5">
              <Icon className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="text-[10px] text-[--text-muted] uppercase tracking-wider">{label}</span>
            </Box>
            <p className="text-2xl font-bold text-[var(--accent)]">{value}</p>
            {trendLabel && <p className="text-[10px] text-[--text-muted] mt-0.5">{trendLabel}</p>}
          </Box>
        </Box>
        {trend && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${trend.startsWith('+') || trend.startsWith('↑') ? 'text-[var(--accent)]' : 'text-[--status-danger]'}`}>
            <TrendingUp className="w-3 h-3" />{trend}
          </span>
        )}
      </Box>
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
      <Box className="relative">
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`} className="transition-all duration-700"
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }} />
        </svg>
        <Box className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-[--text-primary]">{count}</span>
          <span className="text-[9px] text-[--text-muted]">{pct}%</span>
        </Box>
      </Box>
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
      className={`bg-gradient-to-br from-[var(--accent)]/[0.03] to-transparent border rounded-xl p-4 hover:border-[var(--accent)]/[0.2] transition-all group cursor-pointer relative ${selected ? 'border-[var(--accent)]/40 bg-[var(--accent)]/[0.05]' : 'border-[var(--accent)]/[0.08]'}`}
    >
      {/* Selection checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect(user.id) }}
        className="absolute top-3 left-3 z-10 text-[--text-muted] hover:text-[var(--accent)] transition-colors"
      >
        {selected ? <CheckSquare className="w-4 h-4 text-[var(--accent)]" /> : <Square className="w-4 h-4" />}
      </button>

      <Box className="flex items-start gap-3 pl-5">
        {/* Avatar with activity ring */}
        <Box className="relative shrink-0" onClick={() => onAction(user, 'view')}>
          <Box className={`w-11 h-11 rounded-full bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/20 flex items-center justify-center text-sm font-medium text-[var(--accent)] ring-2 ${isActive ? 'ring-[var(--accent)]/30' : 'ring-white/[0.06]'}`}>
            {user.name.charAt(0)}
          </Box>
          {/* Online indicator */}
          {isActive && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--accent)] ring-2 ring-[var(--bg-primary)]" />
          )}
        </Box>

        <Box className="flex-1 min-w-0">
          <Box className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-[--text-primary] truncate">{user.name}</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded-md text-[--text-muted] hover:text-[--text-secondary] hover:bg-[var(--accent)]/[0.04] transition-all opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[--bg-surface] border-[var(--accent)]/[0.12] text-[--text-secondary] w-52">
                <DropdownMenuItem className="text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary] cursor-pointer" onClick={() => onAction(user, 'view')}>
                  <Eye className="w-3.5 h-3.5 mr-2" />View Details
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary] cursor-pointer" onClick={() => onAction(user, 'edit_profile')}>
                  <Edit3 className="w-3.5 h-3.5 mr-2" />Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary] cursor-pointer" onClick={() => onAction(user, 'reset_password')}>
                  <Lock className="w-3.5 h-3.5 mr-2" />Reset Password
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[var(--accent)]/[0.06]" />
                <DropdownMenuItem className="text-xs focus:bg-[--status-warning-bg] focus:text-[--status-warning] cursor-pointer" onClick={() => onAction(user, 'ban_workflow')}>
                  <AlertOctagon className="w-3.5 h-3.5 mr-2" />Issue Warning / Ban
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs focus:bg-[var(--accent)]/10 focus:text-[var(--accent)] cursor-pointer" onClick={() => onAction(user, 'shadow_ban')}>
                  <EyeOff className="w-3.5 h-3.5 mr-2" />Shadow Ban
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs focus:bg-[--status-danger-bg] focus:text-[--status-danger] cursor-pointer" onClick={() => onAction(user, 'permanent_ban')}>
                  <Ban className="w-3.5 h-3.5 mr-2" />Permanent Ban
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[var(--accent)]/[0.06]" />
                <DropdownMenuItem className="text-xs focus:bg-[var(--accent)]/10 focus:text-[var(--accent)] cursor-pointer" onClick={() => onAction(user, user.isVip ? 'remove_vip' : 'add_vip')}>
                  <Crown className="w-3.5 h-3.5 mr-2" />{user.isVip ? 'Remove VIP' : 'Add VIP Tag'}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs focus:bg-[var(--accent)]/10 focus:text-[var(--accent)] cursor-pointer" onClick={() => onAction(user, user.betaTester ? 'remove_beta' : 'add_beta')}>
                  <Zap className="w-3.5 h-3.5 mr-2" />{user.betaTester ? 'Remove Beta' : 'Add Beta Tester'}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[var(--accent)]/[0.06]" />
                <DropdownMenuItem className="text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary] cursor-pointer" onClick={() => onAction(user, 'admin_note')}>
                  <MessageSquare className="w-3.5 h-3.5 mr-2" />Add Admin Note
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary] cursor-pointer" onClick={() => onAction(user, 'reset_subscription')}>
                  <RotateCcw className="w-3.5 h-3.5 mr-2" />Reset Subscription
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Box>

          <Box className="flex items-center gap-1.5 mt-0.5">
            <Mail className="w-3 h-3 text-[--text-muted]" />
            <p className="text-xs text-[--text-muted] truncate">{user.email}</p>
          </Box>

          <Box className="flex items-center gap-2 mt-2.5 flex-wrap">
            <PlanBadge plan={user.plan} />
            <StatusBadge status={user.status} />
            <VerificationBadge verified={user.emailVerified ?? false} />
          </Box>

          <Box className="flex items-center gap-3 mt-2.5 text-[10px] text-[--text-muted]">
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
          </Box>
        </Box>
      </Box>
    </motion.div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isFiltered }: { isFiltered: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-20 px-4">
      {/* Telescope illustration */}
      <Box className="relative mb-6">
        <Box className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent)]/10 to-[var(--accent)]/10 flex items-center justify-center border border-[var(--accent)]/15">
          <Telescope className="w-10 h-10 text-[--text-muted]" />
        </Box>
        {/* Decorative orbit ring */}
        <Box className="absolute -inset-3 border border-[var(--accent)]/[0.06] rounded-full" />
        <Box className="absolute -inset-6 border border-[var(--accent)]/[0.03] rounded-full" />
      </Box>
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
        <Box className="mt-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)]/[0.04] border border-[var(--accent)]/[0.08]">
          <Shield className="w-4 h-4 text-[--text-muted]" />
          <span className="text-xs text-[--text-muted]">Privacy-safe — only aggregate profile data is shown</span>
        </Box>
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
        const json = await safeJsonResponse<UsersApiResponse>(res)
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
      { stage: 'New', count: newUsers, color: 'var(--accent)', pct: Math.round((newUsers / total) * 100) },
      { stage: 'Active', count: activeUsers, color: 'var(--accent)', pct: Math.round((activeUsers / total) * 100) },
      { stage: 'Power', count: powerUsers, color: 'var(--accent)', pct: Math.round((powerUsers / total) * 100) },
      { stage: 'Churned', count: churnedUsers, color: 'var(--accent)', pct: Math.round((churnedUsers / total) * 100) },
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
      { plan: 'Pro', count: pro, color: 'var(--accent)', pct: users.length ? Math.round((pro / users.length) * 100) : 0 },
      { plan: 'Family+', count: family, color: 'var(--accent)', pct: users.length ? Math.round((family / users.length) * 100) : 0 },
      { plan: 'Max', count: max, color: 'var(--primary)', pct: users.length ? Math.round((max / users.length) * 100) : 0 },
      { plan: 'Ultimate', count: ultimate, color: 'var(--accent-primary)', pct: users.length ? Math.round((ultimate / users.length) * 100) : 0 },
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
          const json = await safeJsonResponse(res)
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
        const json = await safeJsonResponse(res)
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
        const json = await safeJsonResponse(res)
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
        const json = await safeJsonResponse(res)
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
        const json = await safeJsonResponse(res)
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
    <Box className="space-y-6">
      {/* Show skeleton while data is loading */}
      {isLoading && users.length === 0 ? (
        <AdminTablePageSkeleton />
      ) : (
      <>
      {/* ─── Page Title: People Observatory ──────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Box className="flex items-center justify-between">
          <Box className="flex items-center gap-3 mb-2">
            <Box className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/20 flex items-center justify-center border border-[var(--accent)]/20">
              <Telescope className="w-5 h-5 text-[var(--accent)]" />
            </Box>
            <Box>
              <h2 className="text-xl font-semibold text-[--text-primary] flex items-center gap-2">
                People Observatory
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-normal ${dataSource === 'live' ? 'bg-[var(--accent)]/10 text-[--text-secondary] border-[var(--accent)]/20' : 'bg-[var(--accent)]/10 text-[--text-muted] border-[var(--accent)]/10'}`}>
                  {dataSource === 'live' ? 'Live Data' : 'No Live Data'}
                </span>
              </h2>
              <Box className="h-[2px] w-32 rounded-full bg-gradient-to-r from-[var(--accent)]/80 via-[var(--accent)]/60 to-transparent mt-1" />
            </Box>
          </Box>
          {/* Refresh button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchUsers(true)}
            disabled={isRefreshing}
            className="text-[--text-muted] hover:text-[var(--accent)] hover:bg-[var(--accent)]/[0.04] gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-xs">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
        </Box>
        <p className="text-sm text-[--text-muted] mt-1">Explore user demographics, engagement patterns, and lifecycle stages</p>
      </motion.div>

      {/* ─── Top Stats: 2x2 Grid with Radial Progress ──────────────── */}
      <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.total} delay={0} ringValue={stats.total} ringMax={Math.max(stats.total * 1.5, 10)} ringColor="var(--accent)" />
        <StatCard icon={UserPlus} label="New This Month" value={stats.newThisMonth} delay={0.05} ringValue={stats.newThisMonth} ringMax={Math.max(stats.total, 10)} ringColor="var(--accent)" />
        <StatCard icon={Activity} label="Active Rate" value={`${stats.activeRate}%`} delay={0.1} ringValue={stats.activeRate} ringMax={100} ringColor="var(--accent)" />
        <StatCard icon={Shield} label="Verified" value={`${stats.verifiedRate}%`} delay={0.15} ringValue={stats.verifiedRate} ringMax={100} ringColor="var(--accent)" />
      </Box>

      {/* ─── Main Content: Sidebar + User Explorer ──────────────────── */}
      {isLoading ? (
        <Box className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Box className="lg:col-span-1 space-y-4">
            {[1, 2, 3].map(i => (
              <Box key={i} className="bg-[var(--accent)]/[0.02] border border-[var(--accent)]/[0.08] rounded-xl p-5 animate-pulse">
                <Box className="h-4 bg-[var(--accent)]/10 rounded w-2/3 mb-3" />
                <Box className="h-2 bg-[var(--accent)]/5 rounded w-full mb-2" />
                <Box className="h-2 bg-[var(--accent)]/5 rounded w-4/5" />
              </Box>
            ))}
          </Box>
          <Box className="lg:col-span-3 bg-[var(--accent)]/[0.02] border border-[var(--accent)]/[0.08] rounded-xl p-8 animate-pulse">
            <Box className="h-8 bg-[var(--accent)]/10 rounded w-1/3 mb-4" />
            <Box className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Box key={i} className="h-32 bg-[var(--accent)]/5 rounded-xl" />
              ))}
            </Box>
          </Box>
        </Box>
      ) : users.length === 0 ? (
        <EmptyState isFiltered={isFiltered} />
      ) : (
        <Box className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* ─── Left Sidebar: Distribution Breakdowns ────────────── */}
          <Box className="lg:col-span-1 space-y-4">
            {/* Plan Distribution */}
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.3 }}
              className="bg-gradient-to-b from-[var(--accent)]/[0.02] to-transparent border border-[var(--accent)]/[0.08] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[--text-primary] mb-4 flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[--text-secondary]" />
                Plan Distribution
              </h3>
              <Box className="space-y-3">
                {planDistribution.map(p => (
                  <Box key={p.plan}>
                    <Box className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[--text-muted]">{p.plan}</span>
                      <span className="text-xs text-[--text-muted]">{p.count} · {p.pct}%</span>
                    </Box>
                    <Box className="h-1.5 bg-[--bg-surface] rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ delay: 0.3, duration: 0.6 }}
                        className="h-full rounded-full" style={{ backgroundColor: p.color }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </motion.div>

            {/* Country Distribution */}
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25, duration: 0.3 }}
              className="bg-gradient-to-b from-[var(--accent)]/[0.02] to-transparent border border-[var(--accent)]/[0.08] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[--text-primary] mb-4 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[--text-secondary]" />
                Countries
              </h3>
              <Box className="space-y-2">
                {countryBreakdown.map(([country, count]) => (
                  <Box key={country} className="flex items-center justify-between">
                    <span className="text-xs text-[--text-muted]">{country}</span>
                    <span className="text-xs font-metric text-[--text-muted]">{count}</span>
                  </Box>
                ))}
                {countryBreakdown.length === 0 && <p className="text-xs text-[--text-muted]">No data</p>}
              </Box>
            </motion.div>

            {/* Language Split */}
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.3 }}
              className="bg-gradient-to-b from-[var(--accent)]/[0.02] to-transparent border border-[var(--accent)]/[0.08] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[--text-primary] mb-4 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-[--text-secondary]" />
                Languages
              </h3>
              <Box className="space-y-2">
                {languageBreakdown.map(l => (
                  <Box key={l.lang}>
                    <Box className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[--text-muted]">{l.lang}</span>
                      <span className="text-xs text-[--text-muted]">{l.pct}%</span>
                    </Box>
                    <Box className="h-1.5 bg-[--bg-surface] rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${l.pct}%` }} transition={{ delay: 0.35, duration: 0.6 }}
                        className="h-full rounded-full bg-[var(--accent)]/40" />
                    </Box>
                  </Box>
                ))}
              </Box>
            </motion.div>
          </Box>

          {/* ─── Main Area: User Explorer ────────────────────────── */}
          <Box className="lg:col-span-3 space-y-4">
            {/* Toolbar */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }}
              className="bg-gradient-to-b from-[var(--accent)]/[0.02] to-transparent border border-[var(--accent)]/[0.08] rounded-xl p-4">
              {/* Row 1: Search + Actions */}
              <Box className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Search */}
                <Box className="relative flex-1 w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
                  <input type="text" placeholder="Search by name or email..." value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[--bg-primary] border border-[var(--accent)]/[0.08] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[var(--accent)]/30 transition-colors" />
                </Box>

                {/* Action buttons */}
                <Box className="flex items-center gap-2 flex-wrap">
                  {/* Export Users Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport(false)}
                    disabled={isExporting}
                    className="h-8 text-xs bg-transparent border-[var(--accent)]/[0.12] text-[--text-secondary] hover:bg-[var(--accent)]/[0.06] hover:text-[var(--accent)] gap-1.5"
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
                        className="h-8 text-xs bg-transparent border-[var(--accent)]/[0.12] text-[--text-secondary] hover:bg-[var(--accent)]/[0.06] hover:text-[var(--accent)] gap-1.5 disabled:opacity-40"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Bulk Actions
                        {selectedIds.size > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-[10px] font-medium">
                            {selectedIds.size}
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[--bg-surface] border-[var(--accent)]/[0.12] text-[--text-secondary] w-52">
                      <DropdownMenuItem className="text-xs focus:bg-[--status-warning-bg] focus:text-[--status-warning] cursor-pointer" onClick={() => requestBulkAction('ban_selected')}>
                        <Ban className="w-3.5 h-3.5 mr-2" />Suspend Selected ({selectedIds.size})
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs focus:bg-[--status-danger-bg] focus:text-[--status-danger] cursor-pointer" onClick={() => requestBulkAction('delete_selected')}>
                        <Trash2 className="w-3.5 h-3.5 mr-2" />Delete Selected ({selectedIds.size})
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-[var(--accent)]/[0.06]" />
                      <DropdownMenuItem className="text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary] cursor-pointer" onClick={() => handleExport(true)}>
                        <Download className="w-3.5 h-3.5 mr-2" />Export Selected ({selectedIds.size})
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-[var(--accent)]/[0.06]" />
                      <DropdownMenuItem className="text-xs focus:bg-[--bg-surface] focus:text-[--text-muted] cursor-pointer" onClick={clearSelection}>
                        <XCircle className="w-3.5 h-3.5 mr-2" />Clear Selection
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Box>
              </Box>

              {/* Row 2: Filters + Sort + View + Count */}
              <Box className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-3">
                {/* Filters */}
                <Box className="flex items-center gap-2 flex-wrap">
                  <Select value={planFilter} onValueChange={handlePlanFilterChange}>
                    <SelectTrigger className="h-8 text-xs bg-[--bg-primary] border-[var(--accent)]/[0.08] text-[--text-secondary] w-[110px]">
                      <SelectValue placeholder="Plan" />
                    </SelectTrigger>
                    <SelectContent className="bg-[--bg-surface] border-[var(--accent)]/[0.12]">
                      <SelectItem value="all" className="text-[--text-secondary] text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary]">All Plans</SelectItem>
                      <SelectItem value="Free" className="text-[--text-secondary] text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary]">Free</SelectItem>
                      <SelectItem value="Pro" className="text-[--text-secondary] text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary]">Pro</SelectItem>
                      <SelectItem value="Family+" className="text-[--text-secondary] text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary]">Family+</SelectItem>
                      <SelectItem value="Max" className="text-[--text-secondary] text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary]">Max</SelectItem>
                      <SelectItem value="Ultimate" className="text-[--text-secondary] text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary]">Ultimate</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                    <SelectTrigger className="h-8 text-xs bg-[--bg-primary] border-[var(--accent)]/[0.08] text-[--text-secondary] w-[120px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[--bg-surface] border-[var(--accent)]/[0.12]">
                      <SelectItem value="all" className="text-[--text-secondary] text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary]">All Status</SelectItem>
                      <SelectItem value="active" className="text-[--text-secondary] text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary]">Active</SelectItem>
                      <SelectItem value="suspended" className="text-[--text-secondary] text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary]">Suspended</SelectItem>
                      <SelectItem value="flagged" className="text-[--text-secondary] text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary]">Flagged</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={verificationFilter} onValueChange={handleVerificationFilterChange}>
                    <SelectTrigger className="h-8 text-xs bg-[--bg-primary] border-[var(--accent)]/[0.08] text-[--text-secondary] w-[130px]">
                      <SelectValue placeholder="Verification" />
                    </SelectTrigger>
                    <SelectContent className="bg-[--bg-surface] border-[var(--accent)]/[0.12]">
                      <SelectItem value="all" className="text-[--text-secondary] text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary]">All Verification</SelectItem>
                      <SelectItem value="verified" className="text-[--text-secondary] text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary]">Verified</SelectItem>
                      <SelectItem value="unverified" className="text-[--text-secondary] text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary]">Unverified</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortOption} onValueChange={handleSortOptionChange}>
                    <SelectTrigger className="h-8 text-xs bg-[--bg-primary] border-[var(--accent)]/[0.08] text-[--text-secondary] w-[140px]">
                      <ArrowUpDown className="w-3 h-3 mr-1" />
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent className="bg-[--bg-surface] border-[var(--accent)]/[0.12]">
                      <SelectItem value="newest" className="text-[--text-secondary] text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary]">Newest First</SelectItem>
                      <SelectItem value="oldest" className="text-[--text-secondary] text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary]">Oldest First</SelectItem>
                      <SelectItem value="name_az" className="text-[--text-secondary] text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary]">Name A → Z</SelectItem>
                      <SelectItem value="name_za" className="text-[--text-secondary] text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary]">Name Z → A</SelectItem>
                      <SelectItem value="last_active" className="text-[--text-secondary] text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary]">Last Active</SelectItem>
                      <SelectItem value="email_az" className="text-[--text-secondary] text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary]">Email A → Z</SelectItem>
                    </SelectContent>
                  </Select>
                </Box>

                {/* User count display */}
                <Box className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-[--text-muted]">
                    {filteredUsers.length !== users.length
                      ? `${filteredUsers.length} of ${users.length} users`
                      : `${users.length} user${users.length !== 1 ? 's' : ''}`
                    }
                  </span>
                </Box>

                {/* View toggle */}
                <Box className="flex items-center gap-1 border border-[var(--accent)]/[0.08] rounded-lg p-0.5">
                  <button onClick={() => setViewMode('cards')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'cards' ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-[--text-muted] hover:text-[--text-muted]'}`}>
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-[--text-muted] hover:text-[--text-muted]'}`}>
                    <List className="w-4 h-4" />
                  </button>
                </Box>
              </Box>
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
                className="bg-gradient-to-b from-[var(--accent)]/[0.02] to-transparent border border-[var(--accent)]/[0.08] rounded-xl overflow-hidden">
                <Box className="max-h-[500px] overflow-y-auto">
                <Box className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[var(--accent)]/[0.06] hover:bg-transparent">
                        <TableHead className="w-10">
                          <button onClick={toggleSelectAll} className="text-[--text-muted] hover:text-[var(--accent)] transition-colors">
                            {selectedIds.size === paginatedUsers.length && paginatedUsers.length > 0
                              ? <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
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
                            className={`border-b border-[var(--accent)]/[0.04] hover:bg-[var(--accent)]/[0.02] transition-colors group ${selectedIds.has(user.id) ? 'bg-[var(--accent)]/[0.04]' : ''}`}>
                            <TableCell className="py-3">
                              <button onClick={() => toggleSelect(user.id)} className="text-[--text-muted] hover:text-[var(--accent)] transition-colors">
                                {selectedIds.has(user.id)
                                  ? <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                                  : <Square className="w-4 h-4" />
                                }
                              </button>
                            </TableCell>
                            <TableCell className="py-3">
                              <Box className="flex items-center gap-3">
                                <Box className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/20 flex items-center justify-center text-xs font-medium text-[var(--accent)] shrink-0 ring-2 ring-[var(--accent)]/20">
                                  {user.name.charAt(0)}
                                </Box>
                                <Box>
                                  <p className="text-sm font-medium text-[--text-primary]">{user.name}</p>
                                  <p className="text-[10px] text-[--text-muted]">{user.country || 'SA'} · {user.language === 'ar' ? 'العربية' : 'EN'}</p>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell className="text-sm text-[--text-muted]">{user.email}</TableCell>
                            <TableCell><PlanBadge plan={user.plan} /></TableCell>
                            <TableCell><StatusBadge status={user.status} /></TableCell>
                            <TableCell>
                              {user.emailVerified
                                ? <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
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
                                  <button className="p-1.5 rounded-md text-[--text-muted] hover:text-[--text-secondary] hover:bg-[var(--accent)]/[0.04] transition-all opacity-0 group-hover:opacity-100">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[--bg-surface] border-[var(--accent)]/[0.12] text-[--text-secondary] w-48">
                                  <DropdownMenuItem className="text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary] cursor-pointer" onClick={() => handleAction(user, 'view')}>
                                    <Eye className="w-3.5 h-3.5 mr-2" />View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-[var(--accent)]/[0.06]" />
                                  <DropdownMenuItem className="text-xs focus:bg-[--status-danger-bg] focus:text-[--status-danger] cursor-pointer" onClick={() => handleAction(user, 'suspend')}>
                                    <Ban className="w-3.5 h-3.5 mr-2" />Suspend Account
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs focus:bg-[--status-warning-bg] focus:text-[--status-warning] cursor-pointer" onClick={() => handleAction(user, 'flag')}>
                                    <Flag className="w-3.5 h-3.5 mr-2" />Flag Abuse
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-[var(--accent)]/[0.06]" />
                                  <DropdownMenuItem className="text-xs focus:bg-[var(--accent)]/[0.06] focus:text-[--text-primary] cursor-pointer" onClick={() => handleAction(user, 'reset_subscription')}>
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
                            <Box className="flex flex-col items-center gap-2">
                              <Users className="w-8 h-8 text-[var(--accent)]/10" />
                              <p className="text-sm text-[--text-muted]">No users found</p>
                              <p className="text-xs text-[--text-muted]">Try adjusting your search or filters</p>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
                </Box>
              </motion.div>
            )}

            {/* Pagination */}
            {filteredUsers.length > pageSize && (
              <Box className="flex items-center justify-between px-2">
                <p className="text-xs text-[--text-muted]">
                  Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
                  {filteredUsers.length !== users.length && (
                    <span className="text-[--text-muted] ml-1">(filtered from {users.length} total)</span>
                  )}
                </p>
                <Box className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="p-1.5 rounded-md text-[--text-muted] hover:text-[var(--accent)] hover:bg-[var(--accent)]/[0.04] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
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
                            className={`w-7 h-7 rounded-md text-xs font-medium transition-all ${page === currentPage ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'text-[--text-muted] hover:text-[var(--accent)] hover:bg-[var(--accent)]/[0.04]'}`}>
                            {page}
                          </button>
                        </span>
                      )
                    })}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md text-[--text-muted] hover:text-[var(--accent)] hover:bg-[var(--accent)]/[0.04] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* ─── User Lifecycle Stages: Individual Progress Rings ──────── */}
      {users.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.3 }}
          className="bg-gradient-to-b from-[var(--accent)]/[0.02] to-transparent border border-[var(--accent)]/[0.08] rounded-xl p-5">
          <Box className="flex items-center justify-between mb-6">
            <Box>
              <h3 className="text-sm font-semibold text-[--text-primary]">User Lifecycle Stages</h3>
              <p className="text-xs text-[--text-muted] mt-0.5">Distribution across engagement stages</p>
            </Box>
            <Box className="flex items-center gap-3">
              {lifecycleStages.map(stage => (
                <Box key={stage.stage} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-[10px] text-[--text-muted]">{stage.stage}</span>
                </Box>
              ))}
            </Box>
          </Box>
          <Box className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {lifecycleStages.map((stage, i) => (
              <motion.div key={stage.stage} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }} className="flex justify-center">
                <LifecycleRing stage={stage.stage} count={stage.count} color={stage.color} pct={stage.pct} />
              </motion.div>
            ))}
          </Box>
        </motion.div>
      )}

      {/* ─── Privacy Notice ────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-[var(--accent)]/[0.02] to-transparent border border-[var(--accent)]/[0.08]">
        <Shield className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
        <Box>
          <p className="text-xs font-medium text-[--text-muted]">Privacy-First Observatory</p>
          <p className="text-[10px] text-[--text-muted] mt-0.5 leading-relaxed">
            This view displays only privacy-safe profile fields: name, email, plan, status, and aggregate engagement metrics.
            Private messages, files, task content, and personal data are never accessible.
          </p>
        </Box>
      </motion.div>

      {/* ─── Confirmation Dialog ────────────────────────────────────── */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-[--bg-surface] border-[var(--accent)]/[0.12] text-[--text-primary]">
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
            <AlertDialogCancel className="bg-transparent border-[var(--accent)]/[0.12] text-[--text-secondary] hover:bg-[var(--accent)]/[0.04] hover:text-[--text-primary]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className="bg-[var(--accent-primary)] text-white hover:bg-[var(--primary)]">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Bulk Action Confirmation Dialog ─────────────────────────── */}
      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent className="bg-[--bg-surface] border-[var(--accent)]/[0.12] text-[--text-primary]">
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
            <AlertDialogCancel className="bg-transparent border-[var(--accent)]/[0.12] text-[--text-secondary] hover:bg-[var(--accent)]/[0.04] hover:text-[--text-primary]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkAction}
              className="bg-[var(--accent-primary)] text-white hover:bg-[var(--primary)]">
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
    </Box>
  )
}
