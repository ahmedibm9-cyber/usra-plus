'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Mail, Phone, Lock, Shield, Key, Calendar, Clock, Globe, MapPin,
  Crown, Zap, Activity, Monitor, Smartphone, Fingerprint, CreditCard,
  AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronRight,
  MessageSquare, Plus, Send, User, Eye, Ban, RotateCcw, Users,
  FileText, ShieldAlert, ShieldCheck, Server, Hash,
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { UserRecord, RiskLevel } from '@/types/admin'
import { safeJsonResponse } from '@/lib/safe-fetch'

// ─── Types for API response ────────────────────────────────────────────────

interface AuthIdentity {
  provider: string
  identity_data: Record<string, unknown> | null
  created_at: string | null
  last_sign_in_at: string | null
}

interface AuthFactor {
  id: string
  factor_type: string
  status: string
  created_at: string | null
  updated_at: string | null
}

interface PasswordInfo {
  has_password: boolean
  last_password_change: string | null
  encryption_type: string
  providers: string[]
  mfa_enabled: boolean
}

interface AuthData {
  id: string
  email: string | null
  phone: string | null
  email_confirmed_at: string | null
  phone_confirmed_at: string | null
  confirmed_at: string | null
  last_sign_in_at: string | null
  created_at: string | null
  updated_at: string | null
  role: string | null
  app_metadata: Record<string, unknown> | null
  user_metadata: Record<string, unknown> | null
  identities: AuthIdentity[]
  factors: AuthFactor[]
  password_info: PasswordInfo
}

interface UserDetailResponse {
  source: 'live' | 'demo'
  auth: AuthData | null
  profile: Record<string, unknown> | null
  subscription: Record<string, unknown> | null
  trials: Record<string, unknown>[]
  bans: Record<string, unknown>[]
  trustScore: Record<string, unknown> | null
  notes: Record<string, unknown>[]
  sessions: Record<string, unknown>[]
  families: Record<string, unknown>[]
  devices: Record<string, unknown>[]
  error?: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatTimeAgo(iso: string | null | undefined): string {
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

function normalizePlan(plan: string): string {
  const map: Record<string, string> = { 'free': 'Free', 'pro': 'Pro', 'family_plus': 'Family+', 'max': 'Max', 'ultimate': 'Ultimate' }
  return map[plan] || plan
}

function getProviderIcon(provider: string) {
  switch (provider) {
    case 'google': return <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
    case 'email': return <Mail className="w-3.5 h-3.5" />
    case 'phone': return <Phone className="w-3.5 h-3.5" />
    default: return <Key className="w-3.5 h-3.5" />
  }
}

// ─── Radial Progress Ring ───────────────────────────────────────────────────

function RadialProgressRing({ value, size = 80, strokeWidth = 5, color = '#10B981', label }: {
  value: number; size?: number; strokeWidth?: number; color?: string; label?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(Math.max(value, 0), 100)
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="relative">
      <svg width={size} height={size} className="shrink-0">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} className="transition-all duration-700"
          style={{ filter: `drop-shadow(0 0 4px ${color}40)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-[--text-primary]">{Math.round(value)}</span>
        {label && <span className="text-[9px] text-[--text-muted]">{label}</span>}
      </div>
    </div>
  )
}

// ─── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-[#10B981]/70" />
      <h3 className="text-sm font-semibold text-[--text-primary]">{title}</h3>
      <div className="flex-1 h-px bg-[--bg-surface]" />
    </div>
  )
}

// ─── Info Row ───────────────────────────────────────────────────────────────

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-xs text-[--text-muted] shrink-0 min-w-[100px]">{label}</span>
      <div className="text-xs text-[--text-primary] text-right flex-1">{children}</div>
    </div>
  )
}

// ─── Badge helpers ──────────────────────────────────────────────────────────

function ConfirmedBadge({ confirmed }: { confirmed: boolean }) {
  return confirmed
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#10B981]/10 text-[#10B981]"><CheckCircle2 className="w-3 h-3" />Confirmed</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[--status-danger-bg] text-[--status-danger]"><XCircle className="w-3 h-3" />Unconfirmed</span>
}

function PlanBadge({ plan }: { plan: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    'Free': { bg: 'bg-[--status-neutral-bg]', text: 'text-[--status-neutral]' },
    'Pro': { bg: 'bg-[#10B981]/10', text: 'text-[#10B981]' },
    'Family+': { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]' },
    'Max': { bg: 'bg-[#0D9488]/10', text: 'text-[#0D9488]' },
    'Ultimate': { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]' },
  }
  const c = config[plan] || config['Free']
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{plan}</span>
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string }> = {
    active: { bg: 'bg-[#10B981]/10', text: 'text-[#10B981]', dot: 'bg-[#10B981]' },
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

function RiskBadge({ level }: { level: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    low: { bg: 'bg-[#10B981]/10', text: 'text-[#10B981]' },
    medium: { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]' },
    high: { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]' },
    critical: { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]' },
  }
  const c = config[level] || config.low
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{level.charAt(0).toUpperCase() + level.slice(1)}</span>
}

function BanStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    active: { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]' },
    appealed: { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]' },
    upheld: { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]' },
    revoked: { bg: 'bg-[#10B981]/10', text: 'text-[#10B981]' },
    expired: { bg: 'bg-[--status-neutral-bg]', text: 'text-[--status-neutral]' },
  }
  const c = config[status] || config.active
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${c.bg} ${c.text}`}>{status}</span>
}

function NoteCategoryBadge({ category }: { category: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    general: { bg: 'bg-[#10B981]/10', text: 'text-[#10B981]' },
    warning: { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]' },
    action: { bg: 'bg-[#10B981]/10', text: 'text-[#10B981]' },
    fraud: { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]' },
    compliance: { bg: 'bg-[#0D9488]/10', text: 'text-[#0D9488]' },
  }
  const c = config[category] || config.general
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${c.bg} ${c.text}`}>{category}</span>
}

// ─── Loading Skeleton ───────────────────────────────────────────────────────

function TabSkeleton() {
  return (
    <div className="space-y-4 p-1">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24 bg-[--bg-surface]" />
          <Skeleton className="h-4 w-48 bg-[--bg-surface]" />
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface UserDetailDrawerProps {
  userId: string | null
  user: UserRecord | null
  open: boolean
  onClose: () => void
}

export function UserDetailDrawer({ userId, user, open, onClose }: UserDetailDrawerProps) {
  const [detail, setDetail] = useState<UserDetailResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('account')
  const [metadataOpen, setMetadataOpen] = useState(false)
  const [appMetadataOpen, setAppMetadataOpen] = useState(false)

  // Notes form
  const [noteText, setNoteText] = useState('')
  const [noteCategory, setNoteCategory] = useState('general')
  const [noteSubmitting, setNoteSubmitting] = useState(false)

  // Fetch user detail when drawer opens
  useEffect(() => {
    if (!open || !userId) {
      setDetail(null)
      return
    }
    let cancelled = false
    async function fetchDetail() {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/users/${userId}/detail`, {
          credentials: 'same-origin',
        })
        if (!cancelled && res.ok) {
          const json = await safeJsonResponse<UserDetailResponse>(res)
          setDetail(json)
        } else if (!cancelled) {
          setDetail(null)
        }
      } catch {
        if (!cancelled) setDetail(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchDetail()
    return () => { cancelled = true }
  }, [open, userId])

  // Reset tab on open
  useEffect(() => {
    if (open) {
      setActiveTab('account')
      setMetadataOpen(false)
      setAppMetadataOpen(false)
      setNoteText('')
      setNoteCategory('general')
    }
  }, [open])

  const handleAddNote = useCallback(async () => {
    if (!userId || !noteText.trim()) return
    setNoteSubmitting(true)
    try {
      const res = await fetch('/api/admin/users/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ userId, text: noteText.trim(), category: noteCategory }),
      })
      if (res.ok) {
        toast.success('Note added successfully')
        setNoteText('')
        // Re-fetch detail to show new note
        const detailRes = await fetch(`/api/admin/users/${userId}/detail`, { credentials: 'same-origin' })
        if (detailRes.ok) {
          const json = await safeJsonResponse<UserDetailResponse>(detailRes)
          setDetail(json)
        }
      } else {
        toast.error('Failed to add note')
      }
    } catch {
      toast.error('Failed to add note — check connection')
    } finally {
      setNoteSubmitting(false)
    }
  }, [userId, noteText, noteCategory])

  const handleResetPassword = useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ userId }),
      })
      if (res.ok) {
        toast.success('Password reset email sent')
      } else {
        toast.error('Failed to send reset email')
      }
    } catch {
      toast.error('Failed to send reset email — check connection')
    }
  }, [userId])

  const auth = detail?.auth
  const profile = detail?.profile
  const subscription = detail?.subscription
  const trustScoreData = detail?.trustScore
  const isDemo = detail?.source === 'demo' || !detail

  // ─── Account Tab ──────────────────────────────────────────────────────
  const renderAccountTab = () => (
    <div className="space-y-6">
      {/* Auth Details */}
      <div>
        <SectionHeader icon={Shield} title="Authentication" />
        <div className="space-y-0">
          <InfoRow label="Email">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-[--text-primary]">{auth?.email || user?.email || '—'}</span>
              <ConfirmedBadge confirmed={!!auth?.email_confirmed_at} />
            </div>
          </InfoRow>
          <InfoRow label="Phone">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-[--text-primary]">{auth?.phone || 'Not set'}</span>
              {auth?.phone && <ConfirmedBadge confirmed={!!auth.phone_confirmed_at} />}
            </div>
          </InfoRow>
          <InfoRow label="Auth Providers">
            <div className="flex items-center gap-1.5 justify-end flex-wrap">
              {auth?.password_info?.providers?.length ? (
                auth.password_info.providers.map(p => (
                  <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[--bg-surface] border border-[--border-subtle] text-[10px] text-[--text-secondary]">
                    {getProviderIcon(p)}
                    {p}
                  </span>
                ))
              ) : auth?.identities?.length ? (
                auth.identities.map(i => (
                  <span key={i.provider} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[--bg-surface] border border-[--border-subtle] text-[10px] text-[--text-secondary]">
                    {getProviderIcon(i.provider)}
                    {i.provider}
                  </span>
                ))
              ) : (
                <span className="text-[--text-muted] text-[10px]">email</span>
              )}
            </div>
          </InfoRow>
        </div>
      </div>

      {/* Password Info */}
      <div>
        <SectionHeader icon={Lock} title="Password" />
        <div className="space-y-0">
          <InfoRow label="Encryption">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#10B981]/10 text-[10px] text-[#10B981]">
              <ShieldCheck className="w-3 h-3" />
              {auth?.password_info?.encryption_type || 'bcrypt (Supabase Auth)'}
            </span>
          </InfoRow>
          <InfoRow label="Has Password">
            {auth?.password_info?.has_password
              ? <span className="text-[#10B981] text-[10px]">Yes</span>
              : <span className="text-[--text-muted] text-[10px]">No (OAuth only)</span>
            }
          </InfoRow>
          <InfoRow label="Last Changed">
            <span className="text-[--text-secondary]">{formatTimeAgo(auth?.password_info?.last_password_change)}</span>
          </InfoRow>
          <InfoRow label="MFA Enabled">
            {auth?.password_info?.mfa_enabled
              ? <span className="inline-flex items-center gap-1 text-[#10B981] text-[10px]"><CheckCircle2 className="w-3 h-3" />Enabled</span>
              : <span className="inline-flex items-center gap-1 text-[--text-muted] text-[10px]"><XCircle className="w-3 h-3" />Disabled</span>
            }
          </InfoRow>
        </div>
      </div>

      {/* Sign-in Info */}
      <div>
        <SectionHeader icon={Clock} title="Sign-in History" />
        <div className="space-y-0">
          <InfoRow label="Account Created">
            <span className="text-[--text-secondary]">{formatDate(auth?.created_at || user?.createdAt)}</span>
          </InfoRow>
          <InfoRow label="Last Sign In">
            <span className="text-[--text-secondary]">{formatTimeAgo(auth?.last_sign_in_at || user?.lastLogin)}</span>
          </InfoRow>
          <InfoRow label="Last Updated">
            <span className="text-[--text-secondary]">{formatDate(auth?.updated_at)}</span>
          </InfoRow>
          <InfoRow label="Confirmed At">
            <span className="text-[--text-secondary]">{formatDate(auth?.confirmed_at)}</span>
          </InfoRow>
        </div>
      </div>

      {/* User Metadata */}
      <Collapsible open={metadataOpen} onOpenChange={setMetadataOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left mb-2 group">
          <SectionHeader icon={FileText} title="User Metadata" />
          {metadataOpen
            ? <ChevronDown className="w-4 h-4 text-[--text-muted] ml-auto" />
            : <ChevronRight className="w-4 h-4 text-[--text-muted] ml-auto" />
          }
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-3 max-h-48 overflow-auto">
            <pre className="text-[10px] text-[--text-muted] font-mono whitespace-pre-wrap">
              {auth?.user_metadata
                ? JSON.stringify(auth.user_metadata, null, 2)
                : '// No user metadata available'
              }
            </pre>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* App Metadata */}
      <Collapsible open={appMetadataOpen} onOpenChange={setAppMetadataOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left mb-2">
          <SectionHeader icon={Server} title="App Metadata" />
          {appMetadataOpen
            ? <ChevronDown className="w-4 h-4 text-[--text-muted] ml-auto" />
            : <ChevronRight className="w-4 h-4 text-[--text-muted] ml-auto" />
          }
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-3 max-h-48 overflow-auto">
            <pre className="text-[10px] text-[--text-muted] font-mono whitespace-pre-wrap">
              {auth?.app_metadata
                ? JSON.stringify(auth.app_metadata, null, 2)
                : '// No app metadata available'
              }
            </pre>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )

  // ─── Profile Tab ──────────────────────────────────────────────────────
  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Basic Info */}
      <div>
        <SectionHeader icon={User} title="Basic Information" />
        <div className="space-y-0">
          <InfoRow label="Full Name">
            <span className="text-[--text-primary]">{user?.name || (profile?.name as string) || '—'}</span>
          </InfoRow>
          <InfoRow label="Avatar">
            {user?.avatar_url || (profile?.avatar_url as string) ? (
              <img src={(user?.avatar_url || profile?.avatar_url) as string} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/20 flex items-center justify-center text-xs font-medium text-[#10B981]">
                {(user?.name || '?').charAt(0)}
              </div>
            )}
          </InfoRow>
        </div>
      </div>

      {/* Preferences */}
      <div>
        <SectionHeader icon={Globe} title="Preferences" />
        <div className="space-y-0">
          <InfoRow label="Language">
            <span className="text-[--text-secondary]">
              {(profile?.language as string) || user?.language === 'ar' ? 'العربية (Arabic)' : 'English'} 
            </span>
          </InfoRow>
          <InfoRow label="Theme">
            <span className="inline-flex items-center gap-1 text-[--text-secondary]">
              {(profile?.theme as string) || 'System'}
            </span>
          </InfoRow>
          <InfoRow label="Country">
            <span className="text-[--text-secondary] flex items-center gap-1 justify-end">
              <MapPin className="w-3 h-3 text-[--text-muted]" />
              {(profile?.country as string) || user?.country || 'Not set'}
            </span>
          </InfoRow>
        </div>
      </div>

      {/* Tags & Status */}
      <div>
        <SectionHeader icon={Crown} title="Tags & Status" />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[--text-muted]">VIP Status</span>
            {user?.isVip || (profile?.is_vip as boolean)
              ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[--status-warning-bg] text-[--status-warning]"><Crown className="w-3 h-3" />VIP</span>
              : <span className="text-[10px] text-[--text-muted]">Not VIP</span>
            }
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[--text-muted]">Beta Tester</span>
            {user?.betaTester || (profile?.beta_tester as boolean)
              ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#10B981]/10 text-[#10B981]"><Zap className="w-3 h-3" />Beta</span>
              : <span className="text-[10px] text-[--text-muted]">Not a beta tester</span>
            }
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[--text-muted]">Account Status</span>
            <StatusBadge status={user?.status || (profile?.status as string) || 'active'} />
          </div>
        </div>
      </div>
    </div>
  )

  // ─── Activity Tab ─────────────────────────────────────────────────────
  const renderActivityTab = () => (
    <div className="space-y-6">
      {/* Sessions */}
      <div>
        <SectionHeader icon={Activity} title="Sessions" />
        {detail?.sessions?.length ? (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {detail.sessions.map((s, i) => (
              <div key={i} className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[--text-secondary] flex items-center gap-1">
                    <Monitor className="w-3 h-3 text-[--text-muted]" />
                    {(s.ip_address as string) || 'Unknown IP'}
                  </span>
                  <span className="text-[10px] text-[--text-muted]">{formatTimeAgo(s.last_active as string || s.created_at as string)}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[--text-muted]">
                  <span>{(s.device as string) || (s.user_agent as string) || 'Unknown device'}</span>
                  {s.browser ? <span>· {s.browser as string}</span> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-[--text-muted] py-4 text-center">No session data available</div>
        )}
      </div>

      {/* Family Memberships */}
      <div>
        <SectionHeader icon={Users} title="Family Memberships" />
        {detail?.families?.length ? (
          <div className="space-y-2">
            {detail.families.map((f, i) => (
              <div key={i} className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[--text-secondary]">{(f.family_name as string) || (f.families as Record<string, unknown>)?.name as string || 'Family'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981]">{(f.role as string) || 'member'}</span>
                </div>
                {f.nickname ? <span className="text-[10px] text-[--text-muted] mt-1 block">Nickname: {f.nickname as string}</span> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-[--text-muted] py-4 text-center">No family memberships</div>
        )}
      </div>

      {/* Device Fingerprints */}
      <div>
        <SectionHeader icon={Fingerprint} title="Device Fingerprints" />
        {detail?.devices?.length ? (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {detail.devices.map((d, i) => (
              <div key={i} className="flex items-center justify-between bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-2.5">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-3.5 h-3.5 text-[#10B981]/40" />
                  <span className="text-[10px] text-[--text-muted] font-metric">{((d.fingerprint as string) || d.id as string || 'unknown').substring(0, 16)}...</span>
                </div>
                <span className="text-[10px] text-[--text-muted]">{formatTimeAgo(d.last_seen as string)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-[--text-muted] py-4 text-center">No device fingerprints</div>
        )}
      </div>
    </div>
  )

  // ─── Subscription Tab ─────────────────────────────────────────────────
  const renderSubscriptionTab = () => (
    <div className="space-y-6">
      {/* Current Plan */}
      <div>
        <SectionHeader icon={CreditCard} title="Current Plan" />
        <div className="space-y-0">
          <InfoRow label="Plan">
            <PlanBadge plan={normalizePlan((subscription?.plan as string) || user?.plan || 'free')} />
          </InfoRow>
          <InfoRow label="Status">
            <StatusBadge status={(subscription?.status as string) || 'active'} />
          </InfoRow>
          {(subscription?.current_period_end as string | undefined) && (
            <InfoRow label="Expires">
              <span className="text-[--text-secondary]">{formatDate(subscription!.current_period_end as string)}</span>
            </InfoRow>
          )}
          {(subscription?.cancel_at_period_end as boolean | undefined) && (
            <InfoRow label="Cancels">
              <span className="text-[--status-warning] text-[10px] flex items-center gap-1 justify-end">
                <AlertTriangle className="w-3 h-3" />
                Will cancel at period end
              </span>
            </InfoRow>
          )}
        </div>
      </div>

      {/* Trial History */}
      <div>
        <SectionHeader icon={Clock} title="Trial History" />
        {detail?.trials?.length ? (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {detail.trials.map((t, i) => (
              <div key={i} className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[--text-secondary]">{normalizePlan((t.plan as string) || 'pro')} trial</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[--bg-surface] text-[--text-muted]">{(t.status as string) || 'unknown'}</span>
                </div>
                <div className="text-[10px] text-[--text-muted]">
                  {formatDate(t.started_at as string)} → {formatDate(t.expires_at as string)}
                  {(t.was_abuse_flagged as boolean | undefined) ? <span className="ml-2 text-[--status-danger]">Abuse flagged</span> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-[--text-muted] py-4 text-center">No trial history</div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <SectionHeader icon={Zap} title="Quick Actions" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="h-7 text-[10px] bg-transparent border-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/10 hover:text-[#10B981]"
            onClick={() => toast.info('Upgrade plan action — requires billing integration')}>
            <Crown className="w-3 h-3 mr-1" />Upgrade Plan
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[10px] bg-transparent border-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/10 hover:text-[#10B981]"
            onClick={() => toast.info('Extend trial action — requires billing integration')}>
            <Clock className="w-3 h-3 mr-1" />Extend Trial
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[10px] bg-transparent border-[--border-subtle] text-[--text-muted] hover:bg-[--bg-surface] hover:text-[--text-secondary]"
            onClick={() => toast.info('Reset subscription action — requires billing integration')}>
            <RotateCcw className="w-3 h-3 mr-1" />Reset Subscription
          </Button>
        </div>
      </div>
    </div>
  )

  // ─── Security Tab ─────────────────────────────────────────────────────
  const renderSecurityTab = () => {
    const trustScore = (trustScoreData?.trust_score as number) ?? user?.trustScore ?? 100
    const fraudScore = (trustScoreData?.fraud_score as number) ?? user?.fraudScore ?? 0
    const riskLevel = (trustScoreData?.risk_level as string) || (fraudScore > 70 ? 'high' : fraudScore > 40 ? 'medium' : 'low')
    const factors = trustScoreData?.factors as Record<string, number> | null

    return (
      <div className="space-y-6">
        {/* Scores */}
        <div>
          <SectionHeader icon={ShieldAlert} title="Risk Assessment" />
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <RadialProgressRing value={trustScore} size={88} strokeWidth={6} color={trustScore >= 80 ? '#10B981' : trustScore >= 50 ? '#059669' : '#EF4444'} label="Trust" />
              <span className="text-[10px] text-[--text-muted]">Trust Score</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <RadialProgressRing value={fraudScore} size={88} strokeWidth={6} color={fraudScore <= 20 ? '#10B981' : fraudScore <= 50 ? '#059669' : '#EF4444'} label="Fraud" />
              <span className="text-[10px] text-[--text-muted]">Fraud Score</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <RiskBadge level={riskLevel} />
              <span className="text-[10px] text-[--text-muted]">Risk Level</span>
            </div>
          </div>
        </div>

        {/* Trust Score Factors */}
        {factors && Object.keys(factors).length > 0 && (
          <div>
            <SectionHeader icon={ShieldCheck} title="Trust Factors" />
            <div className="space-y-2">
              {Object.entries(factors).map(([key, val]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-[10px] text-[--text-muted] min-w-[100px]">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                  <div className="flex-1 h-1.5 bg-[--bg-surface] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(val, 100)}%`, backgroundColor: val >= 70 ? '#10B981' : val >= 40 ? '#059669' : '#EF4444' }} />
                  </div>
                  <span className="text-[10px] text-[--text-muted] w-8 text-right">{Math.round(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ban History */}
        <div>
          <SectionHeader icon={Ban} title="Ban History" />
          {detail?.bans?.length ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {detail.bans.map((b, i) => (
                <div key={i} className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <BanStatusBadge status={(b.status as string) || 'active'} />
                      <span className="text-[10px] text-[--text-muted]">{(b.ban_type as string || 'warning').replace(/_/g, ' ')}</span>
                    </div>
                    <span className="text-[10px] text-[--text-muted]">{formatDate(b.issued_at as string)}</span>
                  </div>
                  {(b.reason as string | undefined) && <p className="text-[10px] text-[--text-muted] mt-1">{b.reason as string}</p>}
                  {(b.expires_at as string | undefined) && <p className="text-[10px] text-[--text-muted] mt-0.5">Expires: {formatDate(b.expires_at as string)}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-[--text-muted] py-4 text-center">No ban history</div>
          )}
        </div>
      </div>
    )
  }

  // ─── Notes Tab ────────────────────────────────────────────────────────
  const renderNotesTab = () => (
    <div className="space-y-6">
      <div>
        <SectionHeader icon={MessageSquare} title="Admin Notes" />
        {detail?.notes?.length ? (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
            {detail.notes.map((n, i) => (
              <div key={i} className="relative pl-6 pb-4 border-l border-[--border-subtle] last:border-l-0">
                {/* Timeline dot */}
                <div className="absolute left-0 top-0 w-2 h-2 -translate-x-[5px] rounded-full bg-[#10B981]/40" />
                <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[--text-muted]">{(n.admin_email as string) || 'System'}</span>
                      <NoteCategoryBadge category={(n.category as string) || 'general'} />
                    </div>
                    <span className="text-[10px] text-[--text-muted]">{formatTimeAgo(n.created_at as string)}</span>
                  </div>
                  <p className="text-xs text-[--text-secondary]">{(n.text as string) || (n.note as string) || (n.content as string) || ''}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-[--text-muted] py-4 text-center">No admin notes yet</div>
        )}
      </div>

      {/* Add Note Form */}
      <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-4">
        <h4 className="text-xs font-medium text-[--text-secondary] mb-3 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-[#10B981]/60" />Add Note
        </h4>
        <Textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Enter admin note..."
          className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] text-xs placeholder-[--text-muted] min-h-[80px] resize-none focus:border-[#10B981]/30"
        />
        <div className="flex items-center justify-between mt-3">
          <Select value={noteCategory} onValueChange={setNoteCategory}>
            <SelectTrigger className="h-7 w-[130px] text-[10px] bg-[--bg-primary] border-[--border-subtle] text-[--text-secondary]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[--bg-surface] border-[--border-subtle]">
              <SelectItem value="general" className="text-[10px] text-[--text-secondary]">General</SelectItem>
              <SelectItem value="warning" className="text-[10px] text-[--text-secondary]">Warning</SelectItem>
              <SelectItem value="action" className="text-[10px] text-[--text-secondary]">Action</SelectItem>
              <SelectItem value="fraud" className="text-[10px] text-[--text-secondary]">Fraud</SelectItem>
              <SelectItem value="compliance" className="text-[10px] text-[--text-secondary]">Compliance</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!noteText.trim() || noteSubmitting}
            onClick={handleAddNote}
            className="h-7 text-[10px] bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30 border-0"
          >
            <Send className="w-3 h-3 mr-1" />
            {noteSubmitting ? 'Saving...' : 'Add Note'}
          </Button>
        </div>
      </div>
    </div>
  )

  // ─── Render Drawer ────────────────────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <SheetContent
        side="right"
        className="bg-[--bg-primary] border-l border-[--border-subtle] w-full sm:max-w-3xl p-0 gap-0 overflow-hidden"
      >
        {/* Custom close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-1.5 rounded-lg text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface] transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with user info */}
        <div className="px-6 pt-6 pb-4 border-b border-[--border-subtle]">
          <SheetHeader className="p-0 gap-0">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#10B981]/20 to-[#10B981]/20 flex items-center justify-center text-lg font-medium text-[#10B981] ring-2 ring-[#10B981]/20">
                  {user?.name?.charAt(0) || '?'}
                </div>
                {user?.status === 'active' && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#10B981] ring-2 ring-[var(--bg-primary)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-lg font-semibold text-[--text-primary] truncate">
                  {user?.name || 'Unknown User'}
                </SheetTitle>
                <SheetDescription className="text-xs text-[--text-muted] truncate mt-0.5">
                  {user?.email || 'No email'}
                </SheetDescription>
                <div className="flex items-center gap-2 mt-2">
                  <PlanBadge plan={normalizePlan(user?.plan || 'free')} />
                  <StatusBadge status={user?.status || 'active'} />
                  {isDemo && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981]/50 border border-[#10B981]/10">Demo</span>
                  )}
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-4">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] bg-transparent border-[--border-subtle] text-[--text-muted] hover:bg-[--bg-surface] hover:text-[--text-secondary]"
              onClick={handleResetPassword}
            >
              <RotateCcw className="w-3 h-3 mr-1" />Reset Password
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] bg-transparent border-[--border-subtle] text-[--text-muted] hover:bg-[--bg-surface] hover:text-[--text-secondary]"
              onClick={() => toast.info('Impersonate user — feature requires session handling')}
            >
              <Eye className="w-3 h-3 mr-1" />Impersonate
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] bg-transparent border-[--status-danger-border] text-[--status-danger] hover:bg-[--status-danger-bg] hover:text-[--status-danger]"
              onClick={() => toast.info('Ban action — use the ban workflow from the user card')}
            >
              <Ban className="w-3 h-3 mr-1" />Ban/Warning
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-3">
            <TabsList className="bg-[--bg-surface] border border-[--border-subtle] h-9 p-1 w-full">
              <TabsTrigger value="account" className="text-[10px] data-[state=active]:bg-[#10B981]/10 data-[state=active]:text-[#10B981] flex-1 h-7">
                <Shield className="w-3 h-3 mr-1" />Account
              </TabsTrigger>
              <TabsTrigger value="profile" className="text-[10px] data-[state=active]:bg-[#10B981]/10 data-[state=active]:text-[#10B981] flex-1 h-7">
                <User className="w-3 h-3 mr-1" />Profile
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-[10px] data-[state=active]:bg-[#10B981]/10 data-[state=active]:text-[#10B981] flex-1 h-7">
                <Activity className="w-3 h-3 mr-1" />Activity
              </TabsTrigger>
              <TabsTrigger value="subscription" className="text-[10px] data-[state=active]:bg-[#10B981]/10 data-[state=active]:text-[#10B981] flex-1 h-7">
                <CreditCard className="w-3 h-3 mr-1" />Plan
              </TabsTrigger>
              <TabsTrigger value="security" className="text-[10px] data-[state=active]:bg-[#10B981]/10 data-[state=active]:text-[#10B981] flex-1 h-7">
                <ShieldAlert className="w-3 h-3 mr-1" />Security
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-[10px] data-[state=active]:bg-[#10B981]/10 data-[state=active]:text-[#10B981] flex-1 h-7">
                <MessageSquare className="w-3 h-3 mr-1" />Notes
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content with ScrollArea */}
          <div className="flex-1 overflow-hidden mt-2">
            <ScrollArea className="h-full">
              <div className="px-6 pb-8">
                {loading ? (
                  <TabSkeleton />
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                    >
                      {activeTab === 'account' && renderAccountTab()}
                      {activeTab === 'profile' && renderProfileTab()}
                      {activeTab === 'activity' && renderActivityTab()}
                      {activeTab === 'subscription' && renderSubscriptionTab()}
                      {activeTab === 'security' && renderSecurityTab()}
                      {activeTab === 'notes' && renderNotesTab()}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </ScrollArea>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
