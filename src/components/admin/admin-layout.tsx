'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { useAdminStore } from '@/stores/admin-store'
import { useAdminAuthStore } from '@/stores/admin-auth-store'
import { useAnalyticsData } from '@/hooks/use-admin-data'
import { useAppStore } from '@/stores/app-store'
import {
  LayoutDashboard, Users, Home, BarChart3, CreditCard,
  Server, LifeBuoy, Settings, LogOut, ChevronLeft, ChevronRight,
  Shield, Activity, Search, Bell, Bug, Loader2,
  ShieldAlert, Ticket, Gift, DollarSign, Megaphone,
  Radio, Monitor, ScrollText, FileText, Paintbrush,
  Zap, AlertTriangle, CheckCircle2, Sun, Moon,
  Database, Clock, Wifi, MegaphoneOff, Trash2, RefreshCw,
  ArrowRight, Download, Ban, Heart, Wrench
} from 'lucide-react'
import type { AdminPage } from '@/types/admin'
import { safeJsonResponse } from '@/lib/safe-fetch'

// Dynamic imports for admin pages
const AdminOverview = dynamic(() => import('./pages/admin-overview').then(m => ({ default: m.AdminOverview })), { ssr: false, loading: () => <AdminPageLoader /> })
const AdminUsers = dynamic(() => import('./pages/admin-users').then(m => ({ default: m.AdminUsers })), { ssr: false, loading: () => <AdminPageLoader /> })
const AdminFamilies = dynamic(() => import('./pages/admin-families').then(m => ({ default: m.AdminFamilies })), { ssr: false, loading: () => <AdminPageLoader /> })
const AdminFeatures = dynamic(() => import('./pages/admin-features').then(m => ({ default: m.AdminFeatures })), { ssr: false, loading: () => <AdminPageLoader /> })
const AdminSubscriptions = dynamic(() => import('./pages/admin-subscriptions').then(m => ({ default: m.AdminSubscriptions })), { ssr: false, loading: () => <AdminPageLoader /> })
const AdminInfrastructure = dynamic(() => import('./pages/admin-infrastructure').then(m => ({ default: m.AdminInfrastructure })), { ssr: false, loading: () => <AdminPageLoader /> })
const AdminSupport = dynamic(() => import('./pages/admin-support').then(m => ({ default: m.AdminSupport })), { ssr: false, loading: () => <AdminPageLoader /> })
const AdminSettings = dynamic(() => import('./pages/admin-settings').then(m => ({ default: m.AdminSettings })), { ssr: false, loading: () => <AdminPageLoader /> })
const AdminBugs = dynamic(() => import('./pages/admin-bugs').then(m => ({ default: m.AdminBugs })), { ssr: false, loading: () => <AdminPageLoader /> })
const AdminModeration = dynamic(() => import('./pages/admin-moderation').then(m => ({ default: m.AdminModeration })), { ssr: false, loading: () => <AdminPageLoader /> })
const AdminCoupons = dynamic(() => import('./pages/admin-coupons').then(m => ({ default: m.AdminCoupons })), { ssr: false, loading: () => <AdminPageLoader /> })
const AdminReferrals = dynamic(() => import('./pages/admin-referrals').then(m => ({ default: m.AdminReferrals })), { ssr: false, loading: () => <AdminPageLoader /> })
const AdminRevenue = dynamic(() => import('./pages/admin-revenue').then(m => ({ default: m.AdminRevenue })), { ssr: false, loading: () => <AdminPageLoader /> })
const AdminCampaigns = dynamic(() => import('./pages/admin-campaigns').then(m => ({ default: m.AdminCampaigns })), { ssr: false, loading: () => <AdminPageLoader /> })
const AdminActivity = dynamic(() => import('./pages/admin-activity').then(m => ({ default: m.AdminActivity })), { ssr: false, loading: () => <AdminPageLoader /> })
const AdminSessions = dynamic(() => import('./pages/admin-sessions').then(m => ({ default: m.AdminSessions })), { ssr: false, loading: () => <AdminPageLoader /> })
const AdminAudit = dynamic(() => import('./pages/admin-audit').then(m => ({ default: m.AdminAudit })), { ssr: false, loading: () => <AdminPageLoader /> })
const AdminContent = dynamic(() => import('./pages/admin-content').then(m => ({ default: m.AdminContent })), { ssr: false, loading: () => <AdminPageLoader /> })
const DemoModeBanner = dynamic(() => import('./demo-mode-banner').then(m => ({ default: m.DemoModeBanner })), { ssr: false })

function AdminPageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-[#10B981]" />
    </div>
  )
}

/** Founder-level modules use Emerald accent; Regular admin modules use Teal accent */
type ModuleAccent = 'founder' | 'admin'

const NAV_ITEMS: { id: AdminPage; label: string; icon: React.ReactNode; group: string; accent: ModuleAccent }[] = [
  // Founder-level: Analytics — premium insights, executive dashboards
  { id: 'overview', label: 'Platform Overview', icon: <LayoutDashboard className="w-4 h-4" />, group: 'Analytics', accent: 'founder' },
  { id: 'users', label: 'User Analytics', icon: <Users className="w-4 h-4" />, group: 'Analytics', accent: 'founder' },
  { id: 'families', label: 'Family Analytics', icon: <Home className="w-4 h-4" />, group: 'Analytics', accent: 'founder' },
  { id: 'features', label: 'Feature Usage', icon: <BarChart3 className="w-4 h-4" />, group: 'Analytics', accent: 'founder' },
  { id: 'activity', label: 'Activity Monitor', icon: <Radio className="w-4 h-4" />, group: 'Analytics', accent: 'founder' },
  // Founder-level: Business — revenue, financial tools
  { id: 'subscriptions', label: 'Subscriptions', icon: <CreditCard className="w-4 h-4" />, group: 'Business', accent: 'founder' },
  { id: 'coupons', label: 'Coupons', icon: <Ticket className="w-4 h-4" />, group: 'Business', accent: 'founder' },
  { id: 'referrals', label: 'Referrals', icon: <Gift className="w-4 h-4" />, group: 'Business', accent: 'founder' },
  { id: 'revenue', label: 'Revenue', icon: <DollarSign className="w-4 h-4" />, group: 'Business', accent: 'founder' },
  // Regular admin: Operations — system health, moderation, safety
  { id: 'moderation', label: 'Trust & Safety', icon: <ShieldAlert className="w-4 h-4" />, group: 'Operations', accent: 'admin' },
  { id: 'infrastructure', label: 'Infrastructure', icon: <Server className="w-4 h-4" />, group: 'Operations', accent: 'admin' },
  { id: 'sessions', label: 'Session Tracker', icon: <Monitor className="w-4 h-4" />, group: 'Operations', accent: 'admin' },
  { id: 'audit', label: 'Audit Log', icon: <ScrollText className="w-4 h-4" />, group: 'Operations', accent: 'admin' },
  { id: 'bugs', label: 'Bug Detection', icon: <Bug className="w-4 h-4" />, group: 'Operations', accent: 'admin' },
  { id: 'support', label: 'Support Center', icon: <LifeBuoy className="w-4 h-4" />, group: 'Operations', accent: 'admin' },
  // Founder-level: Growth — experimental features, campaigns
  { id: 'content', label: 'Content & Branding', icon: <Paintbrush className="w-4 h-4" />, group: 'Growth', accent: 'founder' },
  { id: 'campaigns', label: 'Campaigns', icon: <Megaphone className="w-4 h-4" />, group: 'Growth', accent: 'founder' },
  // Regular admin: System
  { id: 'settings', label: 'System Settings', icon: <Settings className="w-4 h-4" />, group: 'System', accent: 'admin' },
]

/** Get accent color classes based on module type */
function getAccentColor(accent: ModuleAccent, type: 'bg' | 'text' | 'border' | 'bg-subtle' | 'shadow') {
  if (accent === 'founder') {
    switch (type) {
      case 'bg': return '#10B981'
      case 'text': return 'text-[#10B981]'
      case 'border': return 'border-[#10B981]'
      case 'bg-subtle': return 'bg-[#10B981]/10'
      case 'shadow': return 'rgba(16, 185, 129, 0.35)'
    }
  }
  switch (type) {
    case 'bg': return '#0D9488'
    case 'text': return 'text-[#0D9488]'
    case 'border': return 'border-[#0D9488]'
    case 'bg-subtle': return 'bg-[#0D9488]/10'
    case 'shadow': return 'rgba(13, 148, 136, 0.35)'
  }
}

/** LED Status Indicator component */
function LedIndicator({ status }: { status: 'healthy' | 'warning' | 'error' | 'idle' }) {
  const colorMap = {
    healthy: 'bg-[#22C55E] shadow-[0_0_6px_rgba(34,197,94,0.5)]',
    warning: 'bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.5)]',
    error: 'bg-[#0D9488] shadow-[0_0_6px_rgba(13,148,136,0.5)]',
    idle: 'bg-[--text-muted]',
  }
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${colorMap[status]}`} />
}

// ─── Notification Bell Dropdown ──────────────────────────────────────────────
interface NotificationData {
  counts: {
    criticalBugs: number
    pendingModeration: number
    openTickets: number
    total: number
  }
  latest: {
    bugs: Array<{ id: string; title: string; severity: string; createdAt: string }>
    moderation: Array<{ id: string; itemType: string; priority: string; reason: string | null; createdAt: string }>
    tickets: Array<{ id: string; subject: string; priority: string; status: string; createdAt: string }>
  }
}

function NotificationBellDropdown({ onNavigate }: { onNavigate: (page: AdminPage) => void }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<NotificationData | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/admin/notifications', { credentials: 'same-origin' })
      .then(async (res) => res.ok ? await safeJsonResponse(res) : null)
      .then(json => { if (json?.data) setData(json.data) })
      .catch(() => {})
    // Refresh every 60s
    const interval = setInterval(() => {
      fetch('/api/admin/notifications', { credentials: 'same-origin' })
        .then(async (res) => res.ok ? await safeJsonResponse(res) : null)
        .then(json => { if (json?.data) setData(json.data) })
        .catch(() => {})
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const total = data?.counts.total ?? 0
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-[--text-muted] hover:text-[#10B981] hover:bg-[--bg-surface-2] transition-all"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {total > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-[#0D9488] text-[8px] font-bold text-white shadow-[0_0_4px_rgba(13,148,136,0.5)] px-0.5">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-[--bg-surface] border border-[--border-subtle] rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-[--border-subtle] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[--text-primary]">Notifications</h3>
              {total > 0 && (
                <span className="text-[10px] font-medium text-[#0D9488] bg-[--status-danger-bg] px-2 py-0.5 rounded-full">{total} items need attention</span>
              )}
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {/* Critical Bugs */}
              {data && data.counts.criticalBugs > 0 && (
                <div className="border-b border-[--border-subtle]">
                  <button
                    onClick={() => { onNavigate('bugs'); setOpen(false) }}
                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[--bg-surface-2] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Bug className="w-3.5 h-3.5 text-[--status-danger]" />
                      <span className="text-xs font-medium text-[--text-primary]">Critical Bugs</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-[--status-danger] bg-[--status-danger-bg] px-1.5 py-0.5 rounded-full">{data.counts.criticalBugs}</span>
                      <ArrowRight className="w-3 h-3 text-[--text-muted]" />
                    </div>
                  </button>
                  {data.latest.bugs.slice(0, 3).map(bug => (
                    <div key={bug.id} className="px-4 py-2 pl-9 hover:bg-[--bg-surface-2] transition-colors">
                      <p className="text-xs text-[--text-secondary] truncate">{bug.title}</p>
                      <p className="text-[10px] text-[--text-muted]">{timeAgo(bug.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending Moderation */}
              {data && data.counts.pendingModeration > 0 && (
                <div className="border-b border-[--border-subtle]">
                  <button
                    onClick={() => { onNavigate('moderation'); setOpen(false) }}
                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[--bg-surface-2] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-[--status-warning]" />
                      <span className="text-xs font-medium text-[--text-primary]">Pending Moderation</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-[--status-warning] bg-[--status-warning-bg] px-1.5 py-0.5 rounded-full">{data.counts.pendingModeration}</span>
                      <ArrowRight className="w-3 h-3 text-[--text-muted]" />
                    </div>
                  </button>
                  {data.latest.moderation.slice(0, 3).map(item => (
                    <div key={item.id} className="px-4 py-2 pl-9 hover:bg-[--bg-surface-2] transition-colors">
                      <p className="text-xs text-[--text-secondary] truncate">{item.reason || item.itemType}</p>
                      <p className="text-[10px] text-[--text-muted]">{timeAgo(item.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Open Support Tickets */}
              {data && data.counts.openTickets > 0 && (
                <div className="border-b border-[--border-subtle]">
                  <button
                    onClick={() => { onNavigate('support'); setOpen(false) }}
                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[--bg-surface-2] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <LifeBuoy className="w-3.5 h-3.5 text-[#10B981]" />
                      <span className="text-xs font-medium text-[--text-primary]">Open Tickets</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded-full">{data.counts.openTickets}</span>
                      <ArrowRight className="w-3 h-3 text-[--text-muted]" />
                    </div>
                  </button>
                  {data.latest.tickets.slice(0, 3).map(ticket => (
                    <div key={ticket.id} className="px-4 py-2 pl-9 hover:bg-[--bg-surface-2] transition-colors">
                      <p className="text-xs text-[--text-secondary] truncate">{ticket.subject}</p>
                      <p className="text-[10px] text-[--text-muted]">{timeAgo(ticket.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* No notifications */}
              {(!data || data.counts.total === 0) && (
                <div className="px-4 py-8 flex flex-col items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-[--status-success] mb-2" />
                  <p className="text-sm text-[--text-muted]">All clear!</p>
                  <p className="text-xs text-[--text-muted] mt-1">No items need your attention right now</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Admin Search with Command Palette ──────────────────────────────────────
interface SearchResult {
  category: string
  items: Array<{ id: string; label: string; description: string; page: AdminPage }>
}

const SEARCH_CATEGORIES: SearchResult[] = [
  {
    category: 'Pages',
    items: NAV_ITEMS.map(n => ({ id: n.id, label: n.label, description: `${n.group} module`, page: n.id })),
  },
  {
    category: 'Quick Actions',
    items: [
      { id: 'create-announcement', label: 'Create Announcement', description: 'System Settings → Announcements', page: 'settings' },
      { id: 'ban-user', label: 'Ban User', description: 'User Analytics → Ban workflow', page: 'users' },
      { id: 'run-health-check', label: 'Run Health Check', description: 'Bug Detection → Health checks', page: 'bugs' },
      { id: 'export-users', label: 'Export Users', description: 'Export user data as CSV/JSON', page: 'users' },
      { id: 'export-revenue', label: 'Export Revenue', description: 'Export revenue data', page: 'revenue' },
      { id: 'export-families', label: 'Export Families', description: 'Export family data', page: 'families' },
      { id: 'clear-cache', label: 'Clear Cache', description: 'System Settings → Database', page: 'settings' },
      { id: 'view-audit-log', label: 'View Audit Log', description: 'Operations → Audit log', page: 'audit' },
      { id: 'moderation-queue', label: 'Moderation Queue', description: 'Trust & Safety → Pending items', page: 'moderation' },
      { id: 'support-tickets', label: 'Support Tickets', description: 'Open support tickets', page: 'support' },
    ],
  },
]

function AdminSearchPalette({ onNavigate }: { onNavigate: (page: AdminPage) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter results based on query
  const filteredResults = query.trim().length > 0
    ? SEARCH_CATEGORIES.map(cat => ({
        ...cat,
        items: cat.items.filter(
          item => item.label.toLowerCase().includes(query.toLowerCase()) ||
                  item.description.toLowerCase().includes(query.toLowerCase())
        ),
      })).filter(cat => cat.items.length > 0)
    : []

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Keyboard shortcut: Ctrl+K to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleSelect = (page: AdminPage) => {
    onNavigate(page)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div className="relative hidden md:block" ref={containerRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[--text-muted] pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search commands... (Ctrl+K)"
        className="pl-8 pr-12 py-1.5 bg-[--bg-surface-2] border border-[--border-subtle] rounded-lg text-xs text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30 focus:ring-1 focus:ring-[#10B981]/10 w-56 transition-all font-sans"
      />
      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-[--text-muted] bg-[--bg-surface] border border-[--border-subtle] rounded px-1 py-0.5 pointer-events-none">⌘K</kbd>

      <AnimatePresence>
        {open && query.trim().length > 0 && filteredResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-2 w-72 bg-[--bg-surface] border border-[--border-subtle] rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {filteredResults.map(category => (
                <div key={category.category}>
                  <div className="px-3 py-2 border-b border-[--border-subtle]">
                    <span className="text-[10px] font-medium text-[--text-muted] uppercase tracking-wider">{category.category}</span>
                  </div>
                  {category.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.page)}
                      className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-[--bg-surface-2] transition-colors text-left"
                    >
                      <Search className="w-3 h-3 text-[--text-muted] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[--text-primary] truncate">{item.label}</p>
                        <p className="text-[10px] text-[--text-muted] truncate">{item.description}</p>
                      </div>
                      <ArrowRight className="w-3 h-3 text-[--text-muted] shrink-0 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* No results */}
        {open && query.trim().length > 0 && filteredResults.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 top-full mt-2 w-72 bg-[--bg-surface] border border-[--border-subtle] rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="px-4 py-6 flex flex-col items-center justify-center">
              <Search className="w-5 h-5 text-[--text-muted] mb-2" />
              <p className="text-xs text-[--text-muted]">No results for &quot;{query}&quot;</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── System Health Widget (Sidebar Footer) ──────────────────────────────────
interface SystemHealthData {
  dbStatus: 'healthy' | 'warning' | 'error' | 'idle'
  dbLabel: string
  uptime: string
  activeConnections: number
}

function SystemHealthWidget({ collapsed }: { collapsed: boolean }) {
  const [health, setHealth] = useState<SystemHealthData>({
    dbStatus: 'idle',
    dbLabel: 'Checking...',
    uptime: '—',
    activeConnections: 0,
  })

  useEffect(() => {
    // Fetch db info and compute health
    const fetchHealth = async () => {
      try {
        const dbRes = await fetch('/api/admin/db-info', { credentials: 'same-origin' })
        if (dbRes.ok) {
          const dbData = await safeJsonResponse(dbRes)
          setHealth(prev => ({
            ...prev,
            dbStatus: 'healthy',
            dbLabel: dbData.displayBadge || 'SQLite',
          }))
        }
      } catch {
        setHealth(prev => ({ ...prev, dbStatus: 'error', dbLabel: 'Error' }))
      }

      // Compute uptime from page load
      const startTime = Date.now()
      const updateUptime = () => {
        const elapsed = Date.now() - startTime
        const hours = Math.floor(elapsed / 3600000)
        const mins = Math.floor((elapsed % 3600000) / 60000)
        setHealth(prev => ({
          ...prev,
          uptime: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
        }))
      }
      updateUptime()
      const interval = setInterval(updateUptime, 60000)
      return () => clearInterval(interval)
    }
    fetchHealth()
  }, [])

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 py-1">
        <LedIndicator status={health.dbStatus} />
      </div>
    )
  }

  return (
    <div className="px-3 py-2 space-y-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[9px] font-medium text-[--text-muted] uppercase tracking-wider font-metric">System Health</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Database className="w-3 h-3 text-[--text-muted]" />
          <span className="text-[10px] text-[--text-muted]">DB</span>
        </div>
        <div className="flex items-center gap-1.5">
          <LedIndicator status={health.dbStatus} />
          <span className={`text-[10px] font-metric ${health.dbStatus === 'healthy' ? 'text-[--status-success]' : health.dbStatus === 'error' ? 'text-[--status-danger]' : 'text-[--text-muted]'}`}>
            {health.dbLabel}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-[--text-muted]" />
          <span className="text-[10px] text-[--text-muted]">Uptime</span>
        </div>
        <span className="text-[10px] text-[--text-secondary] font-metric">{health.uptime}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3 text-[--text-muted]" />
          <span className="text-[10px] text-[--text-muted]">Active</span>
        </div>
        <span className="text-[10px] text-[--text-secondary] font-metric">{health.activeConnections}</span>
      </div>
    </div>
  )
}

export function AdminLayout() {
  const { currentPage, setCurrentPage, sidebarCollapsed, setSidebarCollapsed } = useAdminStore()
  const { adminUser, adminRole, logoutAdmin, checkAndExtendSession } = useAdminAuthStore()
  const { source: analyticsSource } = useAnalyticsData()
  const { theme, setTheme } = useAppStore()

  useEffect(() => {
    if (!checkAndExtendSession()) {
      logoutAdmin()
      return
    }
    const interval = setInterval(() => {
      if (!checkAndExtendSession()) {
        logoutAdmin()
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [checkAndExtendSession, logoutAdmin])

  const handleNavClick = useCallback((page: AdminPage) => {
    setCurrentPage(page)
  }, [setCurrentPage])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const renderPage = () => {
    switch (currentPage) {
      case 'overview': return <AdminOverview />
      case 'users': return <AdminUsers />
      case 'families': return <AdminFamilies />
      case 'features': return <AdminFeatures />
      case 'activity': return <AdminActivity />
      case 'subscriptions': return <AdminSubscriptions />
      case 'infrastructure': return <AdminInfrastructure />
      case 'sessions': return <AdminSessions />
      case 'audit': return <AdminAudit />
      case 'bugs': return <AdminBugs />
      case 'support': return <AdminSupport />
      case 'settings': return <AdminSettings />
      case 'moderation': return <AdminModeration />
      case 'coupons': return <AdminCoupons />
      case 'referrals': return <AdminReferrals />
      case 'revenue': return <AdminRevenue />
      case 'campaigns': return <AdminCampaigns />
      case 'content': return <AdminContent />
      default: return <AdminOverview />
    }
  }

  const groupedNav = NAV_ITEMS.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {} as Record<string, typeof NAV_ITEMS>)

  /** Determine the group-level accent (founder if any item is founder) */
  const getGroupAccent = (items: typeof NAV_ITEMS): ModuleAccent => {
    return items.some(i => i.accent === 'founder') ? 'founder' : 'admin'
  }

  const currentNav = NAV_ITEMS.find(i => i.id === currentPage)
  const currentAccent = currentNav?.accent || 'admin'

  return (
    <div className="h-screen bg-[--bg-primary] flex overflow-hidden">
      {/* ─── Admin Sidebar — NothingOS Command Center ─── */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="fixed left-0 top-0 bottom-0 z-50 bg-[--bg-surface] border-r border-[--border-subtle] flex flex-col"
      >
        {/* Sidebar Header — Logo + Branding */}
        <div className="h-16 flex items-center px-4 border-b border-[--border-subtle]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#10B981] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
              <Shield className="w-4 h-4 text-black" />
            </div>
            {!sidebarCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overflow-hidden">
                <h1 className="text-sm font-bold text-[--text-primary] whitespace-nowrap font-display">
                  USRA PLUS
                </h1>
                <p className="text-[10px] text-[#10B981] whitespace-nowrap font-medium tracking-wider font-metric">
                  COMMAND CENTER
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          {Object.entries(groupedNav).map(([group, items]) => {
            const groupAccent = getGroupAccent(items)
            const accentColor = groupAccent === 'founder' ? '#10B981' : '#0D9488'
            return (
              <div key={group} className="mb-4">
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-2 px-4 mb-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: accentColor, boxShadow: `0 0 6px ${accentColor}40` }}
                    />
                    <p
                      className="text-[10px] font-medium uppercase tracking-[0.1em] font-metric"
                      style={{ color: accentColor }}
                    >
                      {group}
                    </p>
                  </div>
                )}
                {sidebarCollapsed && (
                  <div className="flex justify-center mb-2">
                    <span
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: accentColor, boxShadow: `0 0 4px ${accentColor}40` }}
                    />
                  </div>
                )}
                <div className="space-y-0.5 px-2">
                  {items.map((item) => {
                    const isActive = currentPage === item.id
                    const itemAccentColor = item.accent === 'founder' ? '#10B981' : '#0D9488'
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all relative ${
                          isActive
                            ? 'bg-[#10B981]/10 text-[#10B981]'
                            : 'text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-surface-2]'
                        }`}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        {/* Active left accent bar */}
                        {isActive && (
                          <motion.div
                            layoutId="admin-nav-accent"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                            style={{ backgroundColor: itemAccentColor, boxShadow: `0 0 8px ${itemAccentColor}60` }}
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                          />
                        )}
                        <span className={`shrink-0 ${isActive ? 'text-[#10B981]' : 'text-[--text-muted]'}`}>
                          {item.icon}
                        </span>
                        {!sidebarCollapsed && (
                          <span className="truncate font-sans">
                            {item.label}
                          </span>
                        )}
                        {/* Active dot indicator */}
                        {isActive && !sidebarCollapsed && (
                          <div
                            className="ml-auto w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: itemAccentColor, boxShadow: `0 0 6px ${itemAccentColor}50` }}
                          />
                        )}
                        {/* Founder badge for premium modules */}
                        {!isActive && item.accent === 'founder' && !sidebarCollapsed && (
                          <Zap className="ml-auto w-3 h-3 text-[#10B981]/30" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Sidebar Footer — System Health Widget + Collapse Toggle */}
        <div className="border-t border-[--border-subtle]">
          {/* System Health Widget */}
          <SystemHealthWidget collapsed={sidebarCollapsed} />

          {/* Collapse Toggle */}
          <div className="p-2 pt-0">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center py-2 rounded-lg text-[--text-muted] hover:text-[#10B981] hover:bg-[--bg-surface-2] transition-all"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col h-full transition-all duration-200" style={{ marginLeft: sidebarCollapsed ? 64 : 240 }}>
        {/* ─── Admin Header / Control Bar ─── */}
        <header className="h-14 bg-[--bg-surface]/95 backdrop-blur-xl border-b border-[--border-subtle] flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            {/* Page Title — Space Grotesk */}
            <h2 className="text-base font-semibold text-[--text-primary] font-display">
              {currentNav?.label || 'Dashboard'}
            </h2>

            {/* System Status — LED Indicator + Source Badge */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-[--border-subtle] bg-[--bg-surface-2]">
              <LedIndicator
                status={
                  analyticsSource === 'live' ? 'healthy'
                    : analyticsSource === 'demo' ? 'warning'
                    : 'idle'
                }
              />
              <span
                className={`text-[10px] font-medium tracking-wide font-metric ${
                  analyticsSource === 'live' ? 'text-[#22C55E]'
                    : analyticsSource === 'demo' ? 'text-[#10B981]'
                    : 'text-[--text-muted]'
                }`}
              >
                {analyticsSource === 'live' ? 'LIVE' : analyticsSource === 'demo' ? 'PRE-LAUNCH' : 'INIT'}
              </span>
            </div>

            {/* Module Accent Indicator */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full border"
              style={{
                borderColor: currentAccent === 'founder' ? 'rgba(16,185,129,0.15)' : 'rgba(13,148,136,0.15)',
                backgroundColor: currentAccent === 'founder' ? 'rgba(16,185,129,0.05)' : 'rgba(13,148,136,0.05)',
              }}
            >
              {currentAccent === 'founder' ? (
                <Zap className="w-3 h-3 text-[#10B981]" />
              ) : (
                <ShieldAlert className="w-3 h-3 text-[#0D9488]" />
              )}
              <span
                className="text-[10px] font-medium font-metric"
                style={{
                  color: currentAccent === 'founder' ? '#10B981' : '#0D9488',
                }}
              >
                {currentAccent === 'founder' ? 'FOUNDER' : 'ADMIN'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Enhanced Search — Command Palette Style */}
            <AdminSearchPalette onNavigate={handleNavClick} />

            {/* Theme Toggle — Dark/Light Mode */}
            <button
              onClick={toggleTheme}
              className="relative p-2 rounded-lg text-[--text-muted] hover:text-[#10B981] hover:bg-[--bg-surface-2] transition-all"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {/* Notification Bell — Real-time Dropdown */}
            <NotificationBellDropdown onNavigate={handleNavClick} />

            {/* Admin Role Badge — Emerald Accent */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#10B981]/[0.08] border border-[#10B981]/15">
              <Shield className="w-3 h-3 text-[#10B981]" />
              <span
                className="text-[10px] text-[#10B981] font-medium capitalize font-metric"
              >
                {adminRole?.replace('_', ' ')}
              </span>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full bg-[#10B981] flex items-center justify-center text-black text-xs font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)] font-display"
              >
                {adminUser?.name?.charAt(0) || 'A'}
              </div>
              {!sidebarCollapsed && (
                <span className="text-xs text-[--text-secondary] hidden lg:block font-sans">
                  {adminUser?.name}
                </span>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={logoutAdmin}
              className="p-2 rounded-lg text-[--text-muted] hover:text-[#0D9488] hover:bg-[#0D9488]/10 transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ─── Workspace — Dot-Grid Command Center ─── */}
        <main className="flex-1 overflow-y-auto custom-scrollbar dot-grid-bg">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              <div className="mb-4">
                <DemoModeBanner isDemo={analyticsSource === 'demo'} />
              </div>
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ─── Status Bar — Mission Control Footer ─── */}
        <footer className="h-7 bg-[--bg-surface] border-t border-[--border-subtle] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4">
            {/* System Health */}
            <div className="flex items-center gap-1.5">
              <LedIndicator status={analyticsSource === 'live' ? 'healthy' : 'idle'} />
              <span className="text-[9px] text-[--text-muted] font-metric">
                SYS
              </span>
            </div>
            {/* DB Status */}
            <div className="flex items-center gap-1.5">
              <LedIndicator status="healthy" />
              <span className="text-[9px] text-[--text-muted] font-metric">
                DB
              </span>
            </div>
            {/* API Status */}
            <div className="flex items-center gap-1.5">
              <LedIndicator status="healthy" />
              <span className="text-[9px] text-[--text-muted] font-metric">
                API
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Active Module */}
            <span className="text-[9px] text-[--text-muted] font-metric">
              MODULE: <span style={{ color: currentAccent === 'founder' ? '#10B981' : '#0D9488' }}>{currentNav?.label?.toUpperCase() || 'OVERVIEW'}</span>
            </span>
            {/* Role */}
            <span className="text-[9px] text-[--text-muted] font-metric">
              ROLE: <span className="text-[#10B981]">{adminRole?.toUpperCase() || 'ADMIN'}</span>
            </span>
            {/* Environment */}
            <span className="text-[9px] text-[--text-muted] font-metric">
              ENV: <span className="text-[#22C55E]">{analyticsSource === 'live' ? 'PROD' : 'DEMO'}</span>
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}
