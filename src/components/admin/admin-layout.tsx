'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useAdminStore } from '@/stores/admin-store'
import { useAdminAuthStore } from '@/stores/admin-auth-store'
import { useAnalyticsData } from '@/hooks/use-admin-data'
import { useAppStore } from '@/stores/app-store'
import {
  LayoutDashboard, Users, Home, BarChart3, CreditCard,
  Server, LifeBuoy, Settings, LogOut, ChevronLeft, ChevronRight,
  Shield, Activity, Search, Bell, Bug,
  ShieldAlert, Ticket, Gift, DollarSign, Megaphone,
  Radio, Monitor, ScrollText, Paintbrush,
  Zap, CheckCircle2, Sun, Moon,
  Database, Clock, Wifi, KeyRound
} from 'lucide-react'
import type { AdminPage } from '@/types/admin'
import { safeJsonResponse } from '@/lib/safe-fetch'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import TextField from '@mui/material/TextField'
import Popover from '@mui/material/Popover'
import Badge from '@mui/material/Badge'
import Tooltip from '@mui/material/Tooltip'
import Avatar from '@mui/material/Avatar'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import Fade from '@mui/material/Fade'
import { useTheme } from '@mui/material/styles'

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
const AdminSubscriptionOtp = dynamic(() => import('./pages/admin-subscription-otp').then(m => ({ default: m.AdminSubscriptionOtp })), { ssr: false, loading: () => <AdminPageLoader /> })
const DemoModeBanner = dynamic(() => import('./demo-mode-banner').then(m => ({ default: m.DemoModeBanner })), { ssr: false })

// ─── Helper: Lucide icon wrapped in a themed color container ────────────────
// Lucide icons use `currentColor` by default, so setting color on the wrapper
// Box propagates the correct MUI theme token color to the SVG stroke/fill.

function ThemedIcon({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <Box component="span" sx={{ color, display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}>
      {children}
    </Box>
  )
}

// ─── Admin Page Loader ─────────────────────────────────────────────────────

function AdminPageLoader() {
  return (
    <Stack alignItems="center" justifyContent="center" sx={{ py: 10 }}>
      <CircularProgress size={24} />
    </Stack>
  )
}

type ModuleAccent = 'founder' | 'admin'

const NAV_ITEMS: { id: AdminPage; label: string; icon: React.ReactNode; group: string; accent: ModuleAccent }[] = [
  { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard size={16} />, group: 'Analytics', accent: 'founder' },
  { id: 'users', label: 'Users', icon: <Users size={16} />, group: 'Analytics', accent: 'founder' },
  { id: 'families', label: 'Families', icon: <Home size={16} />, group: 'Analytics', accent: 'founder' },
  { id: 'features', label: 'Features', icon: <BarChart3 size={16} />, group: 'Analytics', accent: 'founder' },
  { id: 'activity', label: 'Activity Monitor', icon: <Radio size={16} />, group: 'Analytics', accent: 'founder' },
  { id: 'subscriptions', label: 'Subscriptions', icon: <CreditCard size={16} />, group: 'Business', accent: 'founder' },
  { id: 'subscription_otp', label: 'OTP', icon: <KeyRound size={16} />, group: 'Business', accent: 'founder' },
  { id: 'coupons', label: 'Coupons', icon: <Ticket size={16} />, group: 'Business', accent: 'founder' },
  { id: 'referrals', label: 'Referrals', icon: <Gift size={16} />, group: 'Business', accent: 'founder' },
  { id: 'revenue', label: 'Revenue', icon: <DollarSign size={16} />, group: 'Business', accent: 'founder' },
  { id: 'campaigns', label: 'Campaigns', icon: <Megaphone size={16} />, group: 'Growth', accent: 'founder' },
  { id: 'content', label: 'Content', icon: <Paintbrush size={16} />, group: 'Growth', accent: 'founder' },
  { id: 'moderation', label: 'Moderation', icon: <ShieldAlert size={16} />, group: 'Operations', accent: 'admin' },
  { id: 'support', label: 'Support', icon: <LifeBuoy size={16} />, group: 'Operations', accent: 'admin' },
  { id: 'audit', label: 'Audit', icon: <ScrollText size={16} />, group: 'Operations', accent: 'admin' },
  { id: 'bugs', label: 'Bugs', icon: <Bug size={16} />, group: 'Operations', accent: 'admin' },
  { id: 'infrastructure', label: 'Infrastructure', icon: <Server size={16} />, group: 'Operations', accent: 'admin' },
  { id: 'sessions', label: 'Session Tracker', icon: <Monitor size={16} />, group: 'Operations', accent: 'admin' },
  { id: 'settings', label: 'Settings', icon: <Settings size={16} />, group: 'System', accent: 'admin' },
]

// ─── Notification Bell using MUI Popover ──────────────────────────────────────
interface NotificationData {
  counts: { criticalBugs: number; pendingModeration: number; openTickets: number; total: number }
  latest: {
    bugs: Array<{ id: string; title: string; severity: string; createdAt: string }>
    moderation: Array<{ id: string; itemType: string; priority: string; reason: string | null; createdAt: string }>
    tickets: Array<{ id: string; subject: string; priority: string; status: string; createdAt: string }>
  }
}

function NotificationBellDropdown({ onNavigate }: { onNavigate: (page: AdminPage) => void }) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [data, setData] = useState<NotificationData | null>(null)
  const open = Boolean(anchorEl)

  useEffect(() => {
    fetch('/api/admin/notifications', { credentials: 'same-origin' })
      .then(async (res) => res.ok ? await safeJsonResponse<{ data?: NotificationData }>(res) : null)
      .then(json => { if (json?.data) setData(json.data) })
      .catch(() => {})
    const interval = setInterval(() => {
      fetch('/api/admin/notifications', { credentials: 'same-origin' })
        .then(async (res) => res.ok ? await safeJsonResponse<{ data?: NotificationData }>(res) : null)
        .then(json => { if (json?.data) setData(json.data) })
        .catch(() => {})
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const total = data?.counts.total ?? 0
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="Notifications">
        <Badge badgeContent={total} color="error" max={99}>
          <Bell size={16} />
        </Badge>
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 1 }}
      >
        <Paper sx={{ width: 320, maxHeight: 400, overflowY: 'auto' }}>
          {/* Header */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2">Notifications</Typography>
            {total > 0 && (
              <Chip label={`${total} items need attention`} size="small" color="error" variant="outlined" />
            )}
          </Stack>

          {/* Critical Bugs */}
          {data && data.counts.criticalBugs > 0 && (
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <ListItemButton onClick={() => { onNavigate('bugs'); setAnchorEl(null) }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <ThemedIcon color="error.main"><Bug size={14} /></ThemedIcon>
                </ListItemIcon>
                <ListItemText primary="Critical Bugs" primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
                <Chip label={data.counts.criticalBugs} size="small" color="error" />
              </ListItemButton>
              {data.latest.bugs.slice(0, 3).map(bug => (
                <Stack key={bug.id} sx={{ px: 2, py: 0.5, pl: 5 }}>
                  <Typography variant="caption" noWrap>{bug.title}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>{timeAgo(bug.createdAt)}</Typography>
                </Stack>
              ))}
            </Box>
          )}

          {/* Pending Moderation */}
          {data && data.counts.pendingModeration > 0 && (
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <ListItemButton onClick={() => { onNavigate('moderation'); setAnchorEl(null) }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <ThemedIcon color="warning.main"><ShieldAlert size={14} /></ThemedIcon>
                </ListItemIcon>
                <ListItemText primary="Pending Moderation" primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
                <Chip label={data.counts.pendingModeration} size="small" color="warning" />
              </ListItemButton>
              {data.latest.moderation.slice(0, 3).map(item => (
                <Stack key={item.id} sx={{ px: 2, py: 0.5, pl: 5 }}>
                  <Typography variant="caption" noWrap>{item.reason || item.itemType}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>{timeAgo(item.createdAt)}</Typography>
                </Stack>
              ))}
            </Box>
          )}

          {/* Open Support Tickets */}
          {data && data.counts.openTickets > 0 && (
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <ListItemButton onClick={() => { onNavigate('support'); setAnchorEl(null) }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <ThemedIcon color="primary.main"><LifeBuoy size={14} /></ThemedIcon>
                </ListItemIcon>
                <ListItemText primary="Open Tickets" primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
                <Chip label={data.counts.openTickets} size="small" color="primary" />
              </ListItemButton>
              {data.latest.tickets.slice(0, 3).map(ticket => (
                <Stack key={ticket.id} sx={{ px: 2, py: 0.5, pl: 5 }}>
                  <Typography variant="caption" noWrap>{ticket.subject}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>{timeAgo(ticket.createdAt)}</Typography>
                </Stack>
              ))}
            </Box>
          )}

          {/* No notifications */}
          {(!data || data.counts.total === 0) && (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <ThemedIcon color="success.main"><CheckCircle2 size={32} /></ThemedIcon>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>All clear!</Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>No items need your attention right now</Typography>
            </Stack>
          )}
        </Paper>
      </Popover>
    </>
  )
}

// ─── Admin Search using MUI Popover ──────────────────────────────────────────

const SEARCH_CATEGORIES = [
  {
    category: 'Pages',
    items: NAV_ITEMS.map(n => ({ id: n.id, label: n.label, description: `${n.group} module`, page: n.id })),
  },
  {
    category: 'Quick Actions',
    items: [
      { id: 'create-announcement', label: 'Create Announcement', description: 'System Settings → Announcements', page: 'settings' as AdminPage },
      { id: 'ban-user', label: 'Ban User', description: 'User Analytics → Ban workflow', page: 'users' as AdminPage },
      { id: 'run-health-check', label: 'Run Health Check', description: 'Bug Detection → Health checks', page: 'bugs' as AdminPage },
      { id: 'export-users', label: 'Export Users', description: 'Export user data as CSV/JSON', page: 'users' as AdminPage },
      { id: 'export-revenue', label: 'Export Revenue', description: 'Export revenue data', page: 'revenue' as AdminPage },
      { id: 'export-families', label: 'Export Families', description: 'Export family data', page: 'families' as AdminPage },
      { id: 'clear-cache', label: 'Clear Cache', description: 'System Settings → Database', page: 'settings' as AdminPage },
      { id: 'view-audit-log', label: 'View Audit Log', description: 'Operations → Audit log', page: 'audit' as AdminPage },
      { id: 'moderation-queue', label: 'Moderation Queue', description: 'Trust & Safety → Pending items', page: 'moderation' as AdminPage },
      { id: 'support-tickets', label: 'Support Tickets', description: 'Open support tickets', page: 'support' as AdminPage },
    ],
  },
]

function AdminSearchPalette({ onNavigate }: { onNavigate: (page: AdminPage) => void }) {
  const [query, setQuery] = useState('')
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const open = Boolean(anchorEl) && query.trim().length > 0

  const filteredResults = query.trim().length > 0
    ? SEARCH_CATEGORIES.map(cat => ({
        ...cat,
        items: cat.items.filter(
          item => item.label.toLowerCase().includes(query.toLowerCase()) ||
                  item.description.toLowerCase().includes(query.toLowerCase())
        ),
      })).filter(cat => cat.items.length > 0)
    : []

  // Keyboard shortcut: Ctrl+K to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setAnchorEl(null)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleSelect = (page: AdminPage) => {
    onNavigate(page)
    setQuery('')
    setAnchorEl(null)
    inputRef.current?.blur()
  }

  return (
    <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'relative' }}>
      <TextField
        inputRef={inputRef}
        size="small"
        placeholder="Search commands... (Ctrl+K)"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setAnchorEl(e.currentTarget) }}
        onFocus={(e) => setAnchorEl(e.currentTarget)}
        sx={{ width: 224, '& .MuiInputBase-input': { fontSize: 12, py: 0.75 } }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start" sx={{ mr: 0.5 }}>
              <Search size={14} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end" sx={{ ml: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: 9, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 0.5, px: 0.5, py: 0.25, color: 'text.disabled' }}>⌘K</Typography>
            </InputAdornment>
          ),
        }}
      />
      <Popover
        open={open && filteredResults.length > 0}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 1 }}
      >
        <Paper sx={{ width: 288, maxHeight: 320, overflowY: 'auto' }}>
          {filteredResults.map(category => (
            <Box key={category.category}>
              <Typography variant="caption" sx={{ px: 1.5, py: 1, textTransform: 'uppercase', letterSpacing: 1, display: 'block', borderBottom: 1, borderColor: 'divider', color: 'text.secondary' }}>
                {category.category}
              </Typography>
              {category.items.map(item => (
                <ListItemButton key={item.id} onClick={() => handleSelect(item.page)} sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}><Search size={12} /></ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    secondary={item.description}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItemButton>
              ))}
            </Box>
          ))}
          {query.trim().length > 0 && filteredResults.length === 0 && (
            <Stack alignItems="center" sx={{ py: 3 }}>
              <ThemedIcon color="text.disabled"><Search size={20} /></ThemedIcon>
              <Typography variant="caption" sx={{ color: 'text.disabled', mt: 1 }}>No results for &quot;{query}&quot;</Typography>
            </Stack>
          )}
        </Paper>
      </Popover>
    </Box>
  )
}

// ─── System Health Widget (Sidebar Footer) ──────────────────────────────────
function SystemHealthWidget({ collapsed }: { collapsed: boolean }) {
  const theme = useTheme()
  const [health, setHealth] = useState({
    dbStatus: 'idle' as 'healthy' | 'warning' | 'error' | 'idle',
    dbLabel: 'Checking...',
    uptime: '—',
    activeConnections: 0,
  })

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const dbRes = await fetch('/api/admin/db-info', { credentials: 'same-origin' })
        if (dbRes.ok) {
          const dbData = await safeJsonResponse(dbRes)
          setHealth(prev => ({ ...prev, dbStatus: 'healthy', dbLabel: dbData.displayBadge || 'SQLite' }))
        }
      } catch {
        setHealth(prev => ({ ...prev, dbStatus: 'error', dbLabel: 'Error' }))
      }
      const startTime = Date.now()
      const updateUptime = () => {
        const elapsed = Date.now() - startTime
        const hours = Math.floor(elapsed / 3600000)
        const mins = Math.floor((elapsed % 3600000) / 60000)
        setHealth(prev => ({ ...prev, uptime: hours > 0 ? `${hours}h ${mins}m` : `${mins}m` }))
      }
      updateUptime()
      const interval = setInterval(updateUptime, 60000)
      return () => clearInterval(interval)
    }
    fetchHealth()
  }, [])

  const statusColor = health.dbStatus === 'healthy' ? theme.palette.success.main : health.dbStatus === 'error' ? theme.palette.error.main : theme.palette.text.disabled

  if (collapsed) {
    return (
      <Stack alignItems="center" sx={{ py: 0.5 }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
      </Stack>
    )
  }

  return (
    <Stack spacing={0.5} sx={{ px: 1.5, py: 1 }}>
      <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 9, fontWeight: 500, mb: 0.5, color: 'text.disabled' }}>
        System Health
      </Typography>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" gap={0.75}>
          <ThemedIcon color="text.disabled"><Database size={12} /></ThemedIcon>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>DB</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" gap={0.75}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: statusColor }} />
          <Typography variant="caption" sx={{ fontSize: 10, color: statusColor }}>{health.dbLabel}</Typography>
        </Stack>
      </Stack>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" gap={0.75}>
          <ThemedIcon color="text.disabled"><Clock size={12} /></ThemedIcon>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>Uptime</Typography>
        </Stack>
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>{health.uptime}</Typography>
      </Stack>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" gap={0.75}>
          <ThemedIcon color="text.disabled"><Wifi size={12} /></ThemedIcon>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>Active</Typography>
        </Stack>
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>{health.activeConnections}</Typography>
      </Stack>
    </Stack>
  )
}

// ─── Main Layout ─────────────────────────────────────────────────────────────

export function AdminLayout() {
  const { currentPage, setCurrentPage, sidebarCollapsed, setSidebarCollapsed } = useAdminStore()
  const { adminUser, logoutAdmin, checkAndExtendSession } = useAdminAuthStore()
  const { source: analyticsSource } = useAnalyticsData()
  const { theme: appTheme, setTheme } = useAppStore()
  const muiTheme = useTheme()

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
    setTheme(appTheme === 'dark' ? 'light' : 'dark')
  }, [appTheme, setTheme])

  const renderPage = () => {
    switch (currentPage) {
      case 'overview': return <AdminOverview />
      case 'users': return <AdminUsers />
      case 'families': return <AdminFamilies />
      case 'features': return <AdminFeatures />
      case 'activity': return <AdminActivity />
      case 'subscriptions': return <AdminSubscriptions />
      case 'subscription_otp': return <AdminSubscriptionOtp />
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

  const getGroupAccent = (items: typeof NAV_ITEMS): ModuleAccent => {
    return items.some(i => i.accent === 'founder') ? 'founder' : 'admin'
  }

  const currentNav = NAV_ITEMS.find(i => i.id === currentPage)
  const currentAccent = currentNav?.accent || 'admin'

  const drawerWidth = sidebarCollapsed ? 64 : 240

  // Resolve theme-aware primary glow color for the logo
  const primaryGlow = `0 0 12px ${muiTheme.palette.primary.main}40`

  return (
    <Box sx={{ height: '100vh', display: 'flex', overflow: 'hidden', bgcolor: 'background.default' }}>
      {/* ─── Admin Sidebar using MUI Drawer ─── */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxSizing: 'border-box',
            borderRight: 1,
            borderColor: 'divider',
            overflowX: 'hidden',
          },
        }}
      >
        {/* Sidebar Header — Logo + Branding */}
        <Toolbar sx={{ minHeight: 64, px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" gap={1.5} sx={{ overflow: 'hidden' }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: primaryGlow }}>
              <Shield size={16} />
            </Box>
            {!sidebarCollapsed && (
              <Box sx={{ overflow: 'hidden' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: '"Space Grotesk", system-ui, sans-serif', whiteSpace: 'nowrap' }}>
                  USRA PLUS
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 500, letterSpacing: 1, whiteSpace: 'nowrap', fontSize: 10, color: 'primary.main' }}>
                  COMMAND CENTER
                </Typography>
              </Box>
            )}
          </Stack>
        </Toolbar>

        {/* Navigation Groups */}
        <Box sx={{ flex: 1, py: 2, overflowY: 'auto' }}>
          {Object.entries(groupedNav).map(([group, items]) => {
            const groupAccent = getGroupAccent(items)
            const groupColor = groupAccent === 'founder' ? 'primary.main' : 'secondary.main'
            return (
              <Box key={group} sx={{ mb: 2 }}>
                {!sidebarCollapsed && (
                  <Stack direction="row" alignItems="center" gap={1} sx={{ px: 2, mb: 1 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: groupColor }} />
                    <Typography variant="caption" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, fontSize: 10, color: groupColor }}>
                      {group}
                    </Typography>
                  </Stack>
                )}
                {sidebarCollapsed && (
                  <Stack alignItems="center" sx={{ mb: 1 }}>
                    <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: groupColor }} />
                  </Stack>
                )}
                <List sx={{ px: 1, py: 0 }}>
                  {items.map((item) => {
                    const isActive = currentPage === item.id
                    return (
                      <ListItem key={item.id} disablePadding sx={{ mb: 0.25 }}>
                        <ListItemButton
                          onClick={() => handleNavClick(item.id)}
                          selected={isActive}
                          sx={{
                            borderRadius: 2,
                            px: 1.5,
                            py: 1,
                            minHeight: 36,
                            '&.Mui-selected': {
                              bgcolor: item.accent === 'founder' ? 'primary.main' : 'secondary.main',
                              color: item.accent === 'founder' ? 'primary.contrastText' : 'secondary.contrastText',
                              opacity: 0.12,
                              '&:hover': { opacity: 0.2 },
                            },
                          }}
                          title={sidebarCollapsed ? item.label : undefined}
                        >
                          <ListItemIcon sx={{ minWidth: 28, color: isActive ? 'primary.main' : 'text.disabled' }}>
                            {item.icon}
                          </ListItemIcon>
                          {!sidebarCollapsed && (
                            <ListItemText
                              primary={item.label}
                              primaryTypographyProps={{ variant: 'body2', fontWeight: isActive ? 600 : 400 }}
                            />
                          )}
                          {!sidebarCollapsed && isActive && (
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: item.accent === 'founder' ? 'primary.main' : 'secondary.main', ml: 'auto' }} />
                          )}
                          {!sidebarCollapsed && !isActive && item.accent === 'founder' && (
                            <Box sx={{ ml: 'auto', opacity: 0.3, display: 'inline-flex', color: 'primary.main' }}>
                              <Zap size={12} />
                            </Box>
                          )}
                        </ListItemButton>
                      </ListItem>
                    )
                  })}
                </List>
              </Box>
            )
          })}
        </Box>

        {/* Sidebar Footer — System Health + Collapse Toggle */}
        <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
          <SystemHealthWidget collapsed={sidebarCollapsed} />
          <Box sx={{ px: 1, pt: 0 }}>
            <IconButton
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              sx={{ borderRadius: 2, color: 'text.disabled', width: '100%', '&:hover': { color: 'primary.main', bgcolor: 'action.hover' } }}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </IconButton>
          </Box>
        </Box>
      </Drawer>

      {/* ─── Main Content Area ─── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', transition: 'margin 0.2s' }}>
        {/* ─── Admin Header / Control Bar using MUI AppBar ─── */}
        <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Toolbar sx={{ minHeight: 56, gap: 2 }}>
            <Stack direction="row" alignItems="center" gap={2} sx={{ flex: 1 }}>
              {/* Page Title */}
              <Typography variant="subtitle1" sx={{ fontWeight: 600, fontFamily: '"Space Grotesk", system-ui, sans-serif' }}>
                {currentNav?.label || 'Dashboard'}
              </Typography>

              {/* System Status */}
              <Chip
                icon={<Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: analyticsSource === 'live' ? 'success.main' : analyticsSource === 'demo' ? 'warning.main' : 'text.disabled' }} />}
                label={analyticsSource === 'live' ? 'LIVE' : analyticsSource === 'demo' ? 'PRE-LAUNCH' : 'INIT'}
                size="small"
                variant="outlined"
                color={analyticsSource === 'live' ? 'success' : analyticsSource === 'demo' ? 'warning' : 'default'}
              />

              {/* Module Accent Indicator */}
              <Chip
                icon={currentAccent === 'founder' ? <Zap size={12} /> : <ShieldAlert size={12} />}
                label={currentAccent === 'founder' ? 'FOUNDER' : 'ADMIN'}
                size="small"
                variant="outlined"
                color={currentAccent === 'founder' ? 'primary' : 'secondary'}
                sx={{ display: { xs: 'none', sm: 'flex' } }}
              />
            </Stack>

            <Stack direction="row" alignItems="center" gap={1}>
              {/* Search */}
              <AdminSearchPalette onNavigate={handleNavClick} />

              {/* Theme Toggle */}
              <Tooltip title={appTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                <IconButton size="small" onClick={toggleTheme} aria-label="Toggle theme">
                  {appTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </IconButton>
              </Tooltip>

              {/* Notifications */}
              <NotificationBellDropdown onNavigate={handleNavClick} />

              {/* Demo Mode Banner */}
              <DemoModeBanner />

              {/* Admin User Avatar */}
              {adminUser && (
                <Chip
                  avatar={
                    <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: 12, fontWeight: 600 }}>
                      {adminUser.email?.[0]?.toUpperCase() ?? 'A'}
                    </Avatar>
                  }
                  label={adminUser.email?.split('@')[0] ?? 'Admin'}
                  variant="outlined"
                  size="small"
                />
              )}

              {/* Logout */}
              <Tooltip title="Sign out">
                <IconButton size="small" color="error" onClick={logoutAdmin} aria-label="Sign out">
                  <LogOut size={16} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Toolbar>
        </AppBar>

        {/* ─── Content Area using MUI Container ─── */}
        <Container maxWidth="xl" sx={{ flex: 1, overflowY: 'auto', py: 3 }}>
          <Fade in>
            <Paper sx={{ p: 3, minHeight: '50vh' }}>
              {renderPage()}
            </Paper>
          </Fade>
        </Container>
      </Box>
    </Box>
  )
}
