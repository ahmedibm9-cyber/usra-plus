'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAdminStore } from '@/stores/admin-store'
import { useAdminAuthStore } from '@/stores/admin-auth-store'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import {
  Flag, CreditCard, Megaphone, AlertTriangle, Shield,
  Search, Plus, Trash2, Edit3, Download, Power, Lock, Database,
  LogOut, AlertOctagon, Clock, Check,
  Info, AlertCircle, ToggleLeft, ToggleRight, UserPlus,
  Crown, FileText, HardDrive, Archive, Play, RefreshCw,
  Upload, Trash, Save, Loader2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { FeatureFlag, PlanConfig, Announcement, AdminRole } from '@/types/admin'
import { safeJsonResponse } from '@/lib/safe-fetch'

// Admin user type for the Admin Access tab
interface AdminAccessUser {
  id: string
  name: string
  email: string
  role: AdminRole
  lastLogin: string
  status: 'online' | 'offline'
}

// Database stats types
interface TableStat {
  name: string
  rows: number
}

interface BackupRecord {
  id: string
  filename: string
  fileSize: number
  fileSizeFormatted: string
  tableCount: number
  totalRows: number
  note: string | null
  createdAt: string
}

interface SchemaVersion {
  database: string
  prismaVersion: string
  modelCount: number
  lastMigration: string
}

interface DatabaseStats {
  fileSize: number
  fileSizeFormatted: string
  totalRows: number
  tableCount: number
  tables: TableStat[]
}

// ─── Helpers ───────────────────────────────────────────────────
function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatDateTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateStr
  }
}

function getRoleBadgeColor(role: AdminRole) {
  switch (role) {
    case 'super_admin': return 'bg-[--status-danger-bg] text-[--status-danger] border-[--status-danger-border]'
    case 'support_admin': return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
    case 'analytics_admin': return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
    case 'billing_admin': return 'bg-[--status-warning-bg] text-[--status-warning] border-[--status-warning-border]'
    default: return 'bg-[--bg-surface] text-[--text-secondary] border-[--border-subtle]'
  }
}

function getRoleLabel(role: AdminRole) {
  switch (role) {
    case 'super_admin': return 'Super Admin'
    case 'support_admin': return 'Support'
    case 'analytics_admin': return 'Analytics'
    case 'billing_admin': return 'Billing'
    default: return role
  }
}

function getActionColor(action: string) {
  if (action.includes('login') || action.includes('logout')) return 'text-[#10B981]'
  if (action.includes('security') || action.includes('unauthorized') || action.includes('failed')) return 'text-[--status-danger]'
  return 'text-[--status-warning]'
}

function getActionBg(action: string) {
  if (action.includes('login') || action.includes('logout')) return 'bg-[#10B981]/10'
  if (action.includes('security') || action.includes('unauthorized') || action.includes('failed')) return 'bg-[--status-danger-bg]'
  return 'bg-[--status-warning-bg]'
}

function getAnnouncementTypeStyle(type: string) {
  switch (type) {
    case 'critical': return 'bg-[--status-danger-bg] text-[--status-danger] border-[--status-danger-border]'
    case 'warning': return 'bg-[--status-warning-bg] text-[--status-warning] border-[--status-warning-border]'
    case 'info': return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
    default: return 'bg-[--bg-surface] text-[--text-secondary] border-[--border-subtle]'
  }
}

// ─── Card Wrapper ──────────────────────────────────────────────
function SettingsCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[--bg-surface] border border-[--border-subtle] rounded-xl ${className}`}>
      {children}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────
export function AdminSettings() {
  const { featureFlags, planConfigs, announcements, toggleFeatureFlag, setPlanConfigs, addAnnouncement, setAnnouncements, setFeatureFlags, fetchPlanConfigs } = useAdminStore()
  const { adminRole, adminUser, adminLogs, addAuditLog } = useAdminAuthStore()
  const { toast } = useToast()

  // Feature Flag state
  const [flagSearch, setFlagSearch] = useState('')
  const [addFlagOpen, setAddFlagOpen] = useState(false)
  const [newFlag, setNewFlag] = useState({ name: '', key: '', description: '', rolloutPercentage: 100, targetPlan: '' })

  // Plan config state
  const [editPlanOpen, setEditPlanOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PlanConfig | null>(null)

  // Announcement state
  const [addAnnouncementOpen, setAddAnnouncementOpen] = useState(false)
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '', type: 'info' as 'info' | 'warning' | 'critical', startDate: '', endDate: '' })

  // Emergency state
  const [emergencyShutdown, setEmergencyShutdown] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null)

  // Audit log state
  const [logSearch, setLogSearch] = useState('')
  const [logFilter, setLogFilter] = useState<'all' | 'login' | 'changes' | 'security'>('all')

  // Admin access state — initialized with the current logged-in admin
  const [adminUsers, setAdminUsers] = useState<AdminAccessUser[]>(() => {
    if (adminUser) {
      return [{
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        lastLogin: adminUser.last_login ?? new Date().toISOString(),
        status: 'online' as const,
      }]
    }
    return []
  })
  const [addAdminOpen, setAddAdminOpen] = useState(false)
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', role: 'support_admin' as AdminRole })

  // Database tab state
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null)
  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [schemaVersion, setSchemaVersion] = useState<SchemaVersion | null>(null)
  const [dbLoading, setDbLoading] = useState(false)
  const [dbActionLoading, setDbActionLoading] = useState<string | null>(null)
  const [backupNote, setBackupNote] = useState('')
  const [purgeConfirmText, setPurgeConfirmText] = useState('')
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false)
  const [flagsPersisted, setFlagsPersisted] = useState(false)
  const [saveFlagsLoading, setSaveFlagsLoading] = useState(false)

  // ─── Database tab: Fetch data ──────────────────────────────────
  const fetchDbData = useCallback(async () => {
    setDbLoading(true)
    try {
      const res = await fetch('/api/admin/system', { credentials: 'same-origin' })
      if (res.ok) {
        const json = await safeJsonResponse(res)
        if (json.data) {
          setDbStats(json.data.databaseStats)
          setBackups(json.data.backups || [])
          setSchemaVersion(json.data.schemaVersion)

          // If we have persisted feature flags and the store is empty, load them
          if (json.data.featureFlags?.length > 0 && featureFlags.length === 0) {
            setFeatureFlags(json.data.featureFlags)
          }
        }
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load database stats', variant: 'destructive' })
    } finally {
      setDbLoading(false)
    }
  }, [featureFlags.length, setFeatureFlags, toast])

  // Fetch DB data on mount
  useEffect(() => {
    void fetchDbData()
  }, [fetchDbData])

  // Fetch plan configs from DB on mount
  useEffect(() => {
    void fetchPlanConfigs()
  }, [fetchPlanConfigs])

  // ─── Filtered Data ──────────────────────────────────────────────
  const filteredFlags = useMemo(() => {
    if (!flagSearch.trim()) return featureFlags
    const q = flagSearch.toLowerCase()
    return featureFlags.filter(f => f.name.toLowerCase().includes(q) || f.key.toLowerCase().includes(q))
  }, [featureFlags, flagSearch])

  const filteredLogs = useMemo(() => {
    let logs = adminLogs
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase()
      logs = logs.filter(l => l.action.toLowerCase().includes(q) || l.admin_email.toLowerCase().includes(q) || l.target_type.toLowerCase().includes(q))
    }
    if (logFilter !== 'all') {
      switch (logFilter) {
        case 'login':
          logs = logs.filter(l => l.action.includes('login') || l.action.includes('logout'))
          break
        case 'changes':
          logs = logs.filter(l => !l.action.includes('login') && !l.action.includes('logout') && !l.action.includes('security') && !l.action.includes('unauthorized') && !l.action.includes('failed'))
          break
        case 'security':
          logs = logs.filter(l => l.action.includes('security') || l.action.includes('unauthorized') || l.action.includes('failed'))
          break
      }
    }
    return logs
  }, [adminLogs, logSearch, logFilter])

  // ─── Handlers ───────────────────────────────────────────────────
  const handleToggleFlag = useCallback((flagId: string) => {
    const flag = featureFlags.find(f => f.id === flagId)
    const newEnabled = !flag?.enabled
    toggleFeatureFlag(flagId)
    addAuditLog('feature_flag_toggled', 'feature_flag', flagId, { flagKey: flag?.key, newState: newEnabled })
    toast({ title: 'Feature flag updated', description: `${flag?.name} has been ${newEnabled ? 'enabled' : 'disabled'}` })
    setFlagsPersisted(false)
  }, [toggleFeatureFlag, featureFlags, addAuditLog, toast])

  const handleAddFlag = useCallback(() => {
    if (!newFlag.name.trim() || !newFlag.key.trim()) {
      toast({ title: 'Validation error', description: 'Name and key are required', variant: 'destructive' })
      return
    }
    const flag: FeatureFlag = {
      id: `ff-${Date.now()}`,
      key: newFlag.key.trim(),
      name: newFlag.name.trim(),
      description: newFlag.description.trim(),
      enabled: false,
      rolloutPercentage: newFlag.rolloutPercentage,
      targetPlan: newFlag.targetPlan || null,
      createdAt: new Date().toISOString().split('T')[0],
    }
    useAdminStore.setState(s => ({ featureFlags: [...s.featureFlags, flag] }))
    addAuditLog('feature_flag_created', 'feature_flag', flag.id, { key: flag.key })
    toast({ title: 'Feature flag created', description: `${flag.name} has been added` })
    setAddFlagOpen(false)
    setNewFlag({ name: '', key: '', description: '', rolloutPercentage: 100, targetPlan: '' })
    setFlagsPersisted(false)
  }, [newFlag, addAuditLog, toast])

  // ─── Save Feature Flags to DB ──────────────────────────────────
  const handleSaveFlagsToDB = useCallback(async () => {
    setSaveFlagsLoading(true)
    try {
      const res = await fetch('/api/admin/system', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_feature_flags',
          flags: featureFlags.map(f => ({
            key: f.key,
            name: f.name,
            description: f.description,
            enabled: f.enabled,
            rolloutPercentage: f.rolloutPercentage,
            targetPlan: f.targetPlan,
          })),
        }),
      })
      if (res.ok) {
        const json = await safeJsonResponse(res)
        setFlagsPersisted(true)
        addAuditLog('feature_flags_saved_to_db', 'feature_flag', null, { count: featureFlags.length })
        toast({ title: 'Feature flags saved', description: `${featureFlags.length} flags persisted to database` })
        // Reload from DB to get proper IDs
        if (json.results) {
          const loadRes = await fetch('/api/admin/system', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'load_feature_flags' }),
          })
          if (loadRes.ok) {
            const loadJson = await safeJsonResponse(loadRes)
            if (loadJson.featureFlags) {
              setFeatureFlags(loadJson.featureFlags)
            }
          }
        }
      } else {
        const json = await safeJsonResponse(res)
        toast({ title: 'Save failed', description: json.error || 'Unknown error', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Save failed', description: 'Network error', variant: 'destructive' })
    } finally {
      setSaveFlagsLoading(false)
    }
  }, [featureFlags, addAuditLog, toast, setFeatureFlags])

  // ─── Load Feature Flags from DB ────────────────────────────────
  const handleLoadFlagsFromDB = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/system', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'load_feature_flags' }),
      })
      if (res.ok) {
        const json = await safeJsonResponse(res)
        if (json.featureFlags) {
          setFeatureFlags(json.featureFlags)
          setFlagsPersisted(true)
          toast({ title: 'Flags loaded', description: `${json.featureFlags.length} feature flags loaded from database` })
        }
      }
    } catch {
      toast({ title: 'Load failed', description: 'Network error', variant: 'destructive' })
    }
  }, [setFeatureFlags, toast])

  const handleEditPlan = useCallback(async () => {
    if (!editingPlan) return
    setPlanConfigs(planConfigs.map(p => p.id === editingPlan.id ? editingPlan : p))
    addAuditLog('plan_config_updated', 'plan_config', editingPlan.id, { plan: editingPlan.plan })
    toast({ title: 'Plan updated', description: `${editingPlan.plan} configuration saved` })
    setEditPlanOpen(false)
    setEditingPlan(null)
    // Persist to database
    try {
      await fetch('/api/admin/subscriptions', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: editingPlan.id,
          name: editingPlan.plan,
          description: editingPlan.description,
          monthlyPrice: editingPlan.price,
          yearlyPrice: editingPlan.yearlyPrice,
          lifetimePrice: editingPlan.lifetimePrice,
          currency: editingPlan.currency,
          features: editingPlan.features,
          limits: editingPlan.limits,
          trialDays: editingPlan.trialDays,
          isActive: editingPlan.active,
          isPopular: editingPlan.isPopular,
          ctaText: editingPlan.ctaText,
        }),
      })
    } catch {
      // Silently fail - local state is already updated
    }
  }, [editingPlan, planConfigs, setPlanConfigs, addAuditLog, toast])

  const handleTogglePlan = useCallback(async (planId: string) => {
    const updated = planConfigs.map(p => p.id === planId ? { ...p, active: !p.active } : p)
    setPlanConfigs(updated)
    const plan = updated.find(p => p.id === planId)
    addAuditLog('plan_toggled', 'plan_config', planId, { plan: plan?.plan, active: plan?.active })
    toast({ title: 'Plan status updated', description: `${plan?.plan} is now ${plan?.active ? 'active' : 'inactive'}` })
    // Persist to database
    try {
      await fetch('/api/admin/subscriptions', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          isActive: plan?.active ?? true,
        }),
      })
    } catch {
      // Silently fail - local state is already updated
    }
  }, [planConfigs, setPlanConfigs, addAuditLog, toast])

  const handleAddAnnouncement = useCallback(() => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.message.trim()) {
      toast({ title: 'Validation error', description: 'Title and message are required', variant: 'destructive' })
      return
    }
    const announcement: Announcement = {
      id: `ann-${Date.now()}`,
      title: newAnnouncement.title.trim(),
      message: newAnnouncement.message.trim(),
      type: newAnnouncement.type,
      active: true,
      startDate: newAnnouncement.startDate || new Date().toISOString().split('T')[0],
      endDate: newAnnouncement.endDate || null,
      createdAt: new Date().toISOString().split('T')[0],
      targetAudience: 'all',
    }
    addAnnouncement(announcement)
    addAuditLog('announcement_created', 'announcement', announcement.id, { title: announcement.title })
    toast({ title: 'Announcement created', description: `"${announcement.title}" is now live` })
    setAddAnnouncementOpen(false)
    setNewAnnouncement({ title: '', message: '', type: 'info', startDate: '', endDate: '' })
  }, [newAnnouncement, addAnnouncement, addAuditLog, toast])

  const handleToggleAnnouncement = useCallback((annId: string) => {
    const updated = announcements.map(a => a.id === annId ? { ...a, active: !a.active } : a)
    setAnnouncements(updated)
    const ann = updated.find(a => a.id === annId)
    addAuditLog('announcement_toggled', 'announcement', annId, { title: ann?.title, active: ann?.active })
    toast({ title: 'Announcement updated', description: `"${ann?.title}" is now ${ann?.active ? 'active' : 'inactive'}` })
  }, [announcements, setAnnouncements, addAuditLog, toast])

  const handleDeleteAnnouncement = useCallback((annId: string) => {
    const ann = announcements.find(a => a.id === annId)
    setAnnouncements(announcements.filter(a => a.id !== annId))
    addAuditLog('announcement_deleted', 'announcement', annId, { title: ann?.title })
    toast({ title: 'Announcement deleted', description: `"${ann?.title}" has been removed` })
  }, [announcements, setAnnouncements, addAuditLog, toast])

  const handleConfirmAction = useCallback((title: string, description: string, onConfirm: () => void) => {
    setConfirmAction({ title, description, onConfirm })
    setConfirmDialogOpen(true)
  }, [])

  const handleEmergencyShutdown = useCallback(() => {
    const newState = !emergencyShutdown
    setEmergencyShutdown(newState)
    addAuditLog(newState ? 'emergency_shutdown_enabled' : 'emergency_shutdown_disabled', 'system', null, {})
    toast({
      title: newState ? '⚠️ Emergency Shutdown Activated' : 'Emergency Shutdown Deactivated',
      description: newState ? 'All user access has been suspended' : 'Normal operations resumed',
      variant: newState ? 'destructive' : 'default',
    })
  }, [emergencyShutdown, addAuditLog, toast])

  const handleMaintenanceMode = useCallback(() => {
    const newState = !maintenanceMode
    setMaintenanceMode(newState)
    addAuditLog(newState ? 'maintenance_mode_enabled' : 'maintenance_mode_disabled', 'system', null, {})
    toast({
      title: newState ? '🔧 Maintenance Mode Enabled' : 'Maintenance Mode Disabled',
      description: newState ? 'Users will see maintenance page' : 'Normal access restored',
    })
  }, [maintenanceMode, addAuditLog, toast])

  const handleForceLogout = useCallback(() => {
    addAuditLog('force_logout_all_users', 'system', null, {})
    toast({ title: 'All users logged out', description: 'All user sessions have been terminated', variant: 'destructive' })
  }, [addAuditLog, toast])

  const handleClearCache = useCallback(() => {
    addAuditLog('cache_cleared', 'system', null, {})
    toast({ title: 'Cache cleared', description: 'All application caches have been purged' })
  }, [addAuditLog, toast])

  const handleExportLogs = useCallback(() => {
    const data = JSON.stringify(adminLogs, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `admin-audit-logs-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    addAuditLog('audit_logs_exported', 'system', null, { count: adminLogs.length })
    toast({ title: 'Logs exported', description: `${adminLogs.length} log entries downloaded` })
  }, [adminLogs, addAuditLog, toast])

  const handleAddAdmin = useCallback(() => {
    if (!newAdmin.name.trim() || !newAdmin.email.trim()) {
      toast({ title: 'Validation error', description: 'Name and email are required', variant: 'destructive' })
      return
    }
    const newAdminUser: AdminAccessUser = {
      id: `admin-${Date.now()}`,
      name: newAdmin.name.trim(),
      email: newAdmin.email.trim(),
      role: newAdmin.role,
      lastLogin: new Date().toISOString(),
      status: 'offline' as const,
    }
    setAdminUsers(prev => [...prev, newAdminUser])
    addAuditLog('admin_user_added', 'admin_user', newAdminUser.id, { email: newAdminUser.email, role: newAdminUser.role })
    toast({ title: 'Admin user added', description: `${newAdminUser.name} (${getRoleLabel(newAdminUser.role)}) has been added` })
    setAddAdminOpen(false)
    setNewAdmin({ name: '', email: '', role: 'support_admin' })
  }, [newAdmin, addAuditLog, toast])

  // ─── Database Action Handlers ──────────────────────────────────
  const handleDbAction = useCallback(async (action: string, body: Record<string, unknown> = {}) => {
    setDbActionLoading(action)
    try {
      const res = await fetch('/api/admin/system', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      })
      const json = await safeJsonResponse(res)
      if (res.ok && json.success) {
        toast({ title: 'Success', description: json.message || `Action ${action} completed` })
        // Refresh data
        await fetchDbData()
      } else {
        toast({ title: 'Action failed', description: json.error || 'Unknown error', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Action failed', description: 'Network error', variant: 'destructive' })
    } finally {
      setDbActionLoading(null)
    }
  }, [fetchDbData, toast])

  const handleBackup = useCallback(() => {
    handleDbAction('backup', { note: backupNote || undefined })
    setBackupNote('')
  }, [handleDbAction, backupNote])

  const handleRestore = useCallback((backupId: string) => {
    handleConfirmAction(
      '⚠️ Restore Database',
      'This will REPLACE the current database with the backup. A safety backup will be created first. Are you sure?',
      () => handleDbAction('restore', { backupId })
    )
  }, [handleConfirmAction, handleDbAction])

  const handleDeleteBackup = useCallback((backupId: string) => {
    handleConfirmAction(
      'Delete Backup',
      'This will permanently delete this backup file. This cannot be undone.',
      () => handleDbAction('delete_backup', { backupId })
    )
  }, [handleConfirmAction, handleDbAction])

  const handleSeed = useCallback(() => {
    handleConfirmAction(
      '🌱 Seed Demo Data',
      'This will create sample users, feature flags, and support tickets for testing. Existing data will not be affected.',
      () => handleDbAction('seed')
    )
  }, [handleConfirmAction, handleDbAction])

  const handlePurge = useCallback(() => {
    if (purgeConfirmText !== 'PURGE ALL DATA') {
      toast({ title: 'Confirmation required', description: 'Type PURGE ALL DATA to confirm', variant: 'destructive' })
      return
    }
    handleDbAction('purge', { confirmText: purgeConfirmText })
    setPurgeConfirmText('')
    setPurgeDialogOpen(false)
  }, [purgeConfirmText, handleDbAction, toast])

  const handleRunMigrations = useCallback(() => {
    handleDbAction('run_migrations')
  }, [handleDbAction])

  const isSuperAdmin = adminRole === 'super_admin'

  // ─── Tab Items ──────────────────────────────────────────────────
  const tabItems = [
    { value: 'feature-flags', label: 'Feature Flags', icon: <Flag className="w-3.5 h-3.5" /> },
    { value: 'plan-config', label: 'Plan Config', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { value: 'announcements', label: 'Announcements', icon: <Megaphone className="w-3.5 h-3.5" /> },
    { value: 'emergency', label: 'Emergency', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { value: 'audit-logs', label: 'Audit Logs', icon: <FileText className="w-3.5 h-3.5" /> },
    ...(isSuperAdmin ? [{ value: 'database', label: 'Database', icon: <Database className="w-3.5 h-3.5" /> }] : []),
    ...(isSuperAdmin ? [{ value: 'admin-access', label: 'Admin Access', icon: <Shield className="w-3.5 h-3.5" /> }] : []),
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-bold text-[--text-primary]">System Settings</h1>
        <p className="text-[--text-muted] text-sm mt-1">Manage feature flags, plans, announcements, and emergency controls</p>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="feature-flags" className="space-y-6">
        <TabsList className="bg-[--bg-surface] border border-[--border-subtle] p-1 h-auto flex-wrap gap-1">
          {tabItems.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-[#0D9488]/10 data-[state=active]:text-[#0D9488] text-[--text-muted] hover:text-[--text-secondary] px-3 py-1.5 text-xs sm:text-sm gap-1.5 rounded-lg"
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Tab 1: Feature Flags ─────────────────────────────── */}
        <TabsContent value="feature-flags">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-2 items-center flex-1 w-full sm:w-auto">
                <div className="relative flex-1 max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
                  <input
                    type="text"
                    placeholder="Search flags..."
                    value={flagSearch}
                    onChange={e => setFlagSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#0D9488]/30"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleLoadFlagsFromDB}
                  className="bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 hover:bg-[#10B981]/20"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" /> Load from DB
                </Button>
                <Button
                  onClick={handleSaveFlagsToDB}
                  disabled={saveFlagsLoading}
                  className="bg-[--status-warning-bg] text-[--status-warning] border border-[--status-warning-border] hover:bg-[--status-warning]/20 hover:text-[--status-warning]"
                >
                  {saveFlagsLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                  Save to DB
                </Button>
                <Button
                  onClick={() => setAddFlagOpen(true)}
                  className="bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 hover:bg-[#0D9488]/20"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Add Flag
                </Button>
              </div>
            </div>

            {/* Persistence status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${flagsPersisted ? 'bg-[#10B981]' : 'bg-[--status-warning]'}`} />
              <span className={`text-xs ${flagsPersisted ? 'text-[#10B981]' : 'text-[--status-warning]'}`}>
                {flagsPersisted ? 'All changes persisted to database' : 'Changes not saved — click "Save to DB" to persist'}
              </span>
            </div>

            {/* Table */}
            <SettingsCard>
              <Table>
                <TableHeader>
                  <TableRow className="border-[--border-subtle] hover:bg-transparent">
                    <TableHead className="text-[--text-muted] font-medium">Name</TableHead>
                    <TableHead className="text-[--text-muted] font-medium">Key</TableHead>
                    <TableHead className="text-[--text-muted] font-medium">Enabled</TableHead>
                    <TableHead className="text-[--text-muted] font-medium">Rollout %</TableHead>
                    <TableHead className="text-[--text-muted] font-medium">Target Plan</TableHead>
                    <TableHead className="text-[--text-muted] font-medium">Last Modified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFlags.map((flag, i) => (
                    <motion.tr
                      key={flag.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-[--border-subtle] hover:bg-[--bg-surface] transition-colors"
                    >
                      <TableCell>
                        <div>
                          <p className="text-[--text-primary] text-sm font-medium">{flag.name}</p>
                          <p className="text-[--text-muted] text-xs">{flag.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs px-2 py-0.5 rounded bg-[--bg-surface] text-[--text-muted] font-metric">{flag.key}</code>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={flag.enabled}
                          onCheckedChange={() => handleToggleFlag(flag.id)}
                          className="data-[state=checked]:bg-[#0D9488]"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[80px] h-1.5 bg-[--bg-surface] rounded-full overflow-hidden">
                            <div className="h-full bg-[#0D9488]/60 rounded-full" style={{ width: `${flag.rolloutPercentage}%` }} />
                          </div>
                          <span className="text-xs text-[--text-muted]">{flag.rolloutPercentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {flag.targetPlan ? (
                          <Badge className="text-[10px] bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20">
                            {flag.targetPlan}
                          </Badge>
                        ) : (
                          <span className="text-[--text-muted] text-xs">All plans</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[--text-muted] text-xs">{formatDate(flag.createdAt)}</TableCell>
                    </motion.tr>
                  ))}
                  {filteredFlags.length === 0 && (
                    <TableRow className="border-[--border-subtle]">
                      <TableCell colSpan={6} className="text-center py-8 text-[--text-muted]">
                        No feature flags found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </SettingsCard>
          </motion.div>
        </TabsContent>

        {/* ── Tab 2: Plan Configuration ────────────────────────── */}
        <TabsContent value="plan-config">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {planConfigs.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <SettingsCard className="p-5 relative overflow-hidden h-full flex flex-col">
                  {/* Plan header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-[--text-primary]">{plan.plan}</h3>
                        {!plan.active && (
                          <Badge className="text-[10px] bg-[--status-danger-bg] text-[--status-danger] border-[--status-danger-border]">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-[--text-primary]">
                        ${plan.price}<span className="text-sm text-[--text-muted] font-normal">/mo</span>
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => { setEditingPlan(plan); setEditPlanOpen(true) }}
                        className="p-1.5 rounded-lg bg-[--bg-surface] text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface-2] transition-all"
                        title="Edit plan"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleTogglePlan(plan.id)}
                        className="p-1.5 rounded-lg bg-[--bg-surface] text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface-2] transition-all"
                        title={plan.active ? 'Deactivate' : 'Activate'}
                      >
                        {plan.active ? <ToggleRight className="w-3.5 h-3.5 text-[#10B981]" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex-1 mb-4">
                    <p className="text-[10px] font-medium text-[--text-muted] uppercase tracking-wider mb-2">Features</p>
                    <ul className="space-y-1.5">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-[--text-secondary]">
                          <Check className="w-3 h-3 text-[#10B981] shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Limits */}
                  <div>
                    <p className="text-[10px] font-medium text-[--text-muted] uppercase tracking-wider mb-2">Limits</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(plan.limits).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-1.5">
                          <span className="text-[--text-muted] text-xs capitalize">{key}:</span>
                          <span className="text-[--text-secondary] text-xs font-medium">{value ?? '∞'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active indicator */}
                  <div className={`mt-4 pt-3 border-t ${plan.active ? 'border-[#10B981]/10' : 'border-[--border-subtle]'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${plan.active ? 'bg-[#10B981]' : 'bg-[--bg-surface]'}`} />
                      <span className={`text-xs ${plan.active ? 'text-[#10B981]' : 'text-[--text-muted]'}`}>
                        {plan.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </SettingsCard>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>

        {/* ── Tab 3: Announcements ─────────────────────────────── */}
        <TabsContent value="announcements">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[--text-muted] text-sm">{announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</p>
              <Button
                onClick={() => setAddAnnouncementOpen(true)}
                className="bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 hover:bg-[#0D9488]/20"
              >
                <Plus className="w-4 h-4 mr-1.5" /> New Announcement
              </Button>
            </div>

            <div className="space-y-3">
              {announcements.map((ann, i) => (
                <motion.div
                  key={ann.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <SettingsCard className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${ann.type === 'critical' ? 'bg-[--status-danger-bg]' : ann.type === 'warning' ? 'bg-[--status-warning-bg]' : 'bg-[#10B981]/10'}`}>
                        {ann.type === 'critical' ? <AlertOctagon className="w-5 h-5 text-[--status-danger]" /> : ann.type === 'warning' ? <AlertCircle className="w-5 h-5 text-[--status-warning]" /> : <Info className="w-5 h-5 text-[#10B981]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="text-sm font-medium text-[--text-primary]">{ann.title}</h4>
                          <Badge className={`text-[10px] border ${getAnnouncementTypeStyle(ann.type)}`}>
                            {ann.type}
                          </Badge>
                          <Badge className={`text-[10px] border ${ann.active ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' : 'bg-[--bg-surface] text-[--text-muted] border-[--border-subtle]'}`}>
                            {ann.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-[--text-muted] mb-2 line-clamp-2">{ann.message}</p>
                        <div className="flex items-center gap-3 text-xs text-[--text-muted]">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(ann.startDate)}</span>
                          {ann.endDate && <span>→ {formatDate(ann.endDate)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleToggleAnnouncement(ann.id)}
                          className="p-1.5 rounded-lg bg-[--bg-surface] text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface-2] transition-all"
                          title={ann.active ? 'Deactivate' : 'Activate'}
                        >
                          {ann.active ? <ToggleRight className="w-4 h-4 text-[#10B981]" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleConfirmAction(
                            'Delete Announcement',
                            `Are you sure you want to delete "${ann.title}"? This action cannot be undone.`,
                            () => handleDeleteAnnouncement(ann.id)
                          )}
                          className="p-1.5 rounded-lg bg-[--bg-surface] text-[--text-muted] hover:text-[--status-danger] hover:bg-[--status-danger-bg] transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </SettingsCard>
                </motion.div>
              ))}

              {announcements.length === 0 && (
                <SettingsCard className="p-8 text-center">
                  <Megaphone className="w-10 h-10 text-[--text-muted] mx-auto mb-3" />
                  <p className="text-[--text-muted] text-sm">No announcements yet</p>
                  <p className="text-[--text-muted] text-xs mt-1">Create one to notify all users</p>
                </SettingsCard>
              )}
            </div>
          </motion.div>
        </TabsContent>

        {/* ── Tab 4: Emergency Controls ────────────────────────── */}
        <TabsContent value="emergency">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
            {/* Warning Banner */}
            <div className="bg-[--status-danger-bg] border border-[--status-danger-border] rounded-xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[--status-danger-bg] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[--status-danger]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[--status-danger]">⚠️ Emergency Controls</h3>
                <p className="text-xs text-[--status-danger]/60 mt-0.5">These controls can immediately affect all users. Use with extreme caution. All actions are logged and require double confirmation.</p>
              </div>
            </div>

            {/* Emergency Shutdown */}
            <SettingsCard className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${emergencyShutdown ? 'bg-[--status-danger-bg]' : 'bg-[--status-danger-bg]'}`}>
                    <Power className={`w-5 h-5 ${emergencyShutdown ? 'text-[--status-danger]' : 'text-[--status-danger]/60'}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-[--text-primary]">Emergency Shutdown</h4>
                    <p className="text-xs text-[--text-muted]">Immediately disable all user access to the platform</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={`text-[10px] border ${emergencyShutdown ? 'bg-[--status-danger-bg] text-[--status-danger] border-[--status-danger-border]' : 'bg-[--bg-surface] text-[--text-muted] border-[--border-subtle]'}`}>
                    {emergencyShutdown ? 'ACTIVE' : 'OFF'}
                  </Badge>
                  <button
                    onClick={() => handleConfirmAction(
                      emergencyShutdown ? 'Disable Emergency Shutdown' : '⚠️ Enable Emergency Shutdown',
                      emergencyShutdown
                        ? 'This will restore normal user access to the platform.'
                        : 'This will IMMEDIATELY disable all user access. Only admins will be able to use the platform. Are you absolutely sure?',
                      handleEmergencyShutdown
                    )}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      emergencyShutdown
                        ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 hover:bg-[#10B981]/20'
                        : 'bg-[--status-danger-bg] text-[--status-danger] border border-[--status-danger-border] hover:bg-[--status-danger-bg]'
                    }`}
                  >
                    {emergencyShutdown ? 'Restore Access' : 'Activate Shutdown'}
                  </button>
                </div>
              </div>
            </SettingsCard>

            {/* Maintenance Mode */}
            <SettingsCard className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${maintenanceMode ? 'bg-[--status-warning]/20' : 'bg-[--status-warning-bg]'}`}>
                    <AlertOctagon className={`w-5 h-5 ${maintenanceMode ? 'text-[--status-warning]' : 'text-[--status-warning]/60'}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-[--text-primary]">Maintenance Mode</h4>
                    <p className="text-xs text-[--text-muted]">Show maintenance page to all users</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={`text-[10px] border ${maintenanceMode ? 'bg-[--status-warning-bg] text-[--status-warning] border-[--status-warning-border]' : 'bg-[--bg-surface] text-[--text-muted] border-[--border-subtle]'}`}>
                    {maintenanceMode ? 'ACTIVE' : 'OFF'}
                  </Badge>
                  <button
                    onClick={() => handleConfirmAction(
                      maintenanceMode ? 'Disable Maintenance Mode' : '🔧 Enable Maintenance Mode',
                      maintenanceMode
                        ? 'This will restore normal user access.'
                        : 'All users will see a maintenance page. Only admins can access the dashboard.',
                      handleMaintenanceMode
                    )}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      maintenanceMode
                        ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 hover:bg-[#10B981]/20'
                        : 'bg-[--status-warning-bg] text-[--status-warning] border border-[--status-warning-border] hover:bg-[--status-warning]/20'
                    }`}
                  >
                    {maintenanceMode ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            </SettingsCard>

            {/* Force Logout All Users */}
            <SettingsCard className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[--status-danger-bg] flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-[--status-danger]/60" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-[--text-primary]">Force Logout All Users</h4>
                    <p className="text-xs text-[--text-muted]">Terminate all active user sessions immediately</p>
                  </div>
                </div>
                <button
                  onClick={() => handleConfirmAction(
                    '🔴 Force Logout All Users',
                    'This will immediately terminate ALL active user sessions. Every user will need to log in again. This is a highly disruptive action.',
                    handleForceLogout
                  )}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-[--status-danger-bg] text-[--status-danger] border border-[--status-danger-border] hover:bg-[--status-danger-bg] transition-all"
                >
                  Force Logout
                </button>
              </div>
            </SettingsCard>

            {/* Clear Cache */}
            <SettingsCard className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[--status-warning-bg] flex items-center justify-center">
                    <Database className="w-5 h-5 text-[--status-warning]/60" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-[--text-primary]">Clear Application Cache</h4>
                    <p className="text-xs text-[--text-muted]">Purge all cached data and regenerate</p>
                  </div>
                </div>
                <button
                  onClick={() => handleConfirmAction(
                    'Clear Application Cache',
                    'This will purge all cached data. Users may experience slightly slower load times temporarily.',
                    handleClearCache
                  )}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-[--status-warning-bg] text-[--status-warning] border border-[--status-warning-border] hover:bg-[--status-warning]/20 transition-all"
                >
                  Clear Cache
                </button>
              </div>
            </SettingsCard>
          </motion.div>
        </TabsContent>

        {/* ── Tab 5: Audit Logs ────────────────────────────────── */}
        <TabsContent value="audit-logs">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-2 items-center flex-1 w-full sm:w-auto">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--text-muted]" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={logSearch}
                    onChange={e => setLogSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#0D9488]/30"
                  />
                </div>
                <div className="flex gap-1">
                  {(['all', 'login', 'changes', 'security'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setLogFilter(f)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                        logFilter === f
                          ? 'bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20'
                          : 'text-[--text-muted] hover:text-[--text-muted] hover:bg-[--bg-surface]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                onClick={handleExportLogs}
                className="bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 hover:bg-[#0D9488]/20"
              >
                <Download className="w-4 h-4 mr-1.5" /> Export
              </Button>
            </div>

            {/* Logs list */}
            <SettingsCard>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[--border-subtle] hover:bg-transparent">
                      <TableHead className="text-[--text-muted] font-medium">Time</TableHead>
                      <TableHead className="text-[--text-muted] font-medium">Admin</TableHead>
                      <TableHead className="text-[--text-muted] font-medium">Action</TableHead>
                      <TableHead className="text-[--text-muted] font-medium">Target</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log, i) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-[--border-subtle] hover:bg-[--bg-surface] transition-colors"
                      >
                        <TableCell className="text-[--text-muted] text-xs whitespace-nowrap">{formatDateTime(log.created_at)}</TableCell>
                        <TableCell className="text-[--text-muted] text-xs">{log.admin_email}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge className={`text-[10px] border ${getActionBg(log.action)} ${getActionColor(log.action)} border-transparent`}>
                              {log.target_type}
                            </Badge>
                            {log.target_id && <span className="text-[--text-muted] text-[10px] font-metric">{log.target_id.slice(0, 8)}</span>}
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <TableRow className="border-[--border-subtle]">
                        <TableCell colSpan={4} className="text-center py-8 text-[--text-muted]">
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </SettingsCard>
          </motion.div>
        </TabsContent>

        {/* ── Tab 6: Database (super_admin only) ────────────────── */}
        {isSuperAdmin && (
          <TabsContent value="database">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
              {/* DB Stats Header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SettingsCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                      <HardDrive className="w-5 h-5 text-[#10B981]" />
                    </div>
                    <div>
                      <p className="text-[--text-muted] text-[10px] uppercase tracking-wider">DB File Size</p>
                      <p className="text-[--text-primary] text-lg font-bold">{dbStats?.fileSizeFormatted || '—'}</p>
                    </div>
                  </div>
                </SettingsCard>
                <SettingsCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[--status-warning-bg] flex items-center justify-center">
                      <Database className="w-5 h-5 text-[--status-warning]" />
                    </div>
                    <div>
                      <p className="text-[--text-muted] text-[10px] uppercase tracking-wider">Total Rows</p>
                      <p className="text-[--text-primary] text-lg font-bold">{dbStats?.totalRows?.toLocaleString() || '—'}</p>
                    </div>
                  </div>
                </SettingsCard>
                <SettingsCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0D9488]/10 flex items-center justify-center">
                      <Archive className="w-5 h-5 text-[#0D9488]" />
                    </div>
                    <div>
                      <p className="text-[--text-muted] text-[10px] uppercase tracking-wider">Tables</p>
                      <p className="text-[--text-primary] text-lg font-bold">{dbStats?.tableCount || '—'}</p>
                    </div>
                  </div>
                </SettingsCard>
                <SettingsCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[--status-danger-bg] flex items-center justify-center">
                      <Lock className="w-5 h-5 text-[--status-danger]" />
                    </div>
                    <div>
                      <p className="text-[--text-muted] text-[10px] uppercase tracking-wider">Backups</p>
                      <p className="text-[--text-primary] text-lg font-bold">{backups.length}</p>
                    </div>
                  </div>
                </SettingsCard>
              </div>

              {/* Table Row Counts */}
              <SettingsCard className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-[--text-primary] flex items-center gap-2">
                    <Database className="w-4 h-4 text-[--text-muted]" /> Table Row Counts
                  </h3>
                  <button
                    onClick={fetchDbData}
                    disabled={dbLoading}
                    className="p-1.5 rounded-lg bg-[--bg-surface] text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface-2] transition-all disabled:opacity-50"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${dbLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-64 overflow-y-auto">
                  {dbStats?.tables.map(t => (
                    <div key={t.name} className="bg-[--bg-surface] rounded-lg p-3 border border-[--border-subtle]">
                      <p className="text-[--text-muted] text-[10px] uppercase tracking-wider truncate">{t.name}</p>
                      <p className="text-[--text-primary] text-sm font-bold mt-0.5">{t.rows.toLocaleString()}</p>
                    </div>
                  ))}
                  {(!dbStats?.tables || dbStats.tables.length === 0) && (
                    <p className="text-[--text-muted] text-sm col-span-full text-center py-4">No table data available</p>
                  )}
                </div>
              </SettingsCard>

              {/* Backup & Restore */}
              <SettingsCard className="p-5">
                <h3 className="text-sm font-medium text-[--text-primary] flex items-center gap-2 mb-4">
                  <Archive className="w-4 h-4 text-[--text-muted]" /> Backup & Restore
                </h3>

                {/* Create backup */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end mb-5">
                  <div className="flex-1 w-full">
                    <label className="text-[--text-muted] text-xs block mb-1.5">Backup note (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Before major update"
                      value={backupNote}
                      onChange={e => setBackupNote(e.target.value)}
                      className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#0D9488]/30"
                    />
                  </div>
                  <Button
                    onClick={handleBackup}
                    disabled={dbActionLoading === 'backup'}
                    className="bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 hover:bg-[#10B981]/20 w-full sm:w-auto"
                  >
                    {dbActionLoading === 'backup' ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                    Backup Database
                  </Button>
                </div>

                {/* Available backups */}
                <div>
                  <p className="text-[--text-muted] text-xs uppercase tracking-wider mb-2">Available Backups</p>
                  {backups.length === 0 ? (
                    <div className="bg-[--bg-surface] rounded-lg p-6 text-center border border-[--border-subtle]">
                      <Archive className="w-8 h-8 text-[--text-muted] mx-auto mb-2" />
                      <p className="text-[--text-muted] text-sm">No backups yet</p>
                      <p className="text-[--text-muted] text-xs mt-1">Create your first backup above</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {backups.map(b => (
                        <div key={b.id} className="flex items-center justify-between bg-[--bg-surface] rounded-lg p-3 border border-[--border-subtle]">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#0D9488]/10 flex items-center justify-center shrink-0">
                              <HardDrive className="w-4 h-4 text-[#0D9488]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[--text-secondary] text-xs font-metric truncate">{b.filename}</p>
                              <div className="flex items-center gap-2 text-[10px] text-[--text-muted]">
                                <span>{b.fileSizeFormatted}</span>
                                <span>·</span>
                                <span>{b.tableCount} tables</span>
                                <span>·</span>
                                <span>{b.totalRows.toLocaleString()} rows</span>
                                {b.note && <><span>·</span><span className="text-[--status-warning]/60">{b.note}</span></>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className="text-[--text-muted] text-[10px]">{formatDateTime(b.createdAt)}</span>
                            <button
                              onClick={() => handleRestore(b.id)}
                              className="p-1.5 rounded-lg bg-[--bg-surface] text-[--text-muted] hover:text-[--status-warning] hover:bg-[--status-warning-bg] transition-all"
                              title="Restore from this backup"
                            >
                              <Upload className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBackup(b.id)}
                              className="p-1.5 rounded-lg bg-[--bg-surface] text-[--text-muted] hover:text-[--status-danger] hover:bg-[--status-danger-bg] transition-all"
                              title="Delete backup"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SettingsCard>

              {/* Actions */}
              <SettingsCard className="p-5">
                <h3 className="text-sm font-medium text-[--text-primary] flex items-center gap-2 mb-4">
                  <Play className="w-4 h-4 text-[--text-muted]" /> Database Actions
                </h3>

                <div className="space-y-4">
                  {/* Run Migrations */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#0D9488]/10 flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-[#0D9488]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-[--text-primary]">Run Migrations</h4>
                        <p className="text-xs text-[--text-muted]">Check schema sync status</p>
                      </div>
                    </div>
                    <button
                      onClick={handleRunMigrations}
                      disabled={dbActionLoading === 'run_migrations'}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 hover:bg-[#0D9488]/20 transition-all disabled:opacity-50"
                    >
                      {dbActionLoading === 'run_migrations' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check Schema'}
                    </button>
                  </div>

                  {/* Seed Demo Data */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                        <Play className="w-5 h-5 text-[#10B981]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-[--text-primary]">Seed Demo Data</h4>
                        <p className="text-xs text-[--text-muted]">Create sample users, flags, and tickets for testing</p>
                      </div>
                    </div>
                    <button
                      onClick={handleSeed}
                      disabled={dbActionLoading === 'seed'}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 hover:bg-[#10B981]/20 transition-all disabled:opacity-50"
                    >
                      {dbActionLoading === 'seed' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Seed Data'}
                    </button>
                  </div>

                  {/* Purge All Data */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[--status-danger-bg] flex items-center justify-center">
                        <Trash className="w-5 h-5 text-[--status-danger]/60" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-[--text-primary]">Purge All Data</h4>
                        <p className="text-xs text-[--text-muted]">Delete all non-system data (users, sessions, transactions, etc.)</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setPurgeDialogOpen(true)}
                      disabled={dbActionLoading === 'purge'}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-[--status-danger-bg] text-[--status-danger] border border-[--status-danger-border] hover:bg-[--status-danger-bg] transition-all disabled:opacity-50"
                    >
                      {dbActionLoading === 'purge' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Purge Data'}
                    </button>
                  </div>
                </div>
              </SettingsCard>

              {/* Schema Version Info */}
              <SettingsCard className="p-5">
                <h3 className="text-sm font-medium text-[--text-primary] flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-[--text-muted]" /> Schema Version Info
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[--bg-surface] rounded-lg p-3 border border-[--border-subtle]">
                    <p className="text-[--text-muted] text-[10px] uppercase tracking-wider">Database</p>
                    <p className="text-[--text-secondary] text-sm font-medium">{schemaVersion?.database || '—'}</p>
                  </div>
                  <div className="bg-[--bg-surface] rounded-lg p-3 border border-[--border-subtle]">
                    <p className="text-[--text-muted] text-[10px] uppercase tracking-wider">Prisma</p>
                    <p className="text-[--text-secondary] text-sm font-medium">v{schemaVersion?.prismaVersion || '—'}</p>
                  </div>
                  <div className="bg-[--bg-surface] rounded-lg p-3 border border-[--border-subtle]">
                    <p className="text-[--text-muted] text-[10px] uppercase tracking-wider">Models</p>
                    <p className="text-[--text-secondary] text-sm font-medium">{schemaVersion?.modelCount || '—'}</p>
                  </div>
                  <div className="bg-[--bg-surface] rounded-lg p-3 border border-[--border-subtle]">
                    <p className="text-[--text-muted] text-[10px] uppercase tracking-wider">Last Sync</p>
                    <p className="text-[--text-secondary] text-sm font-medium">{schemaVersion?.lastMigration || '—'}</p>
                  </div>
                </div>
              </SettingsCard>
            </motion.div>
          </TabsContent>
        )}

        {/* ── Tab 7: Admin Access (super_admin only) ────────────── */}
        {isSuperAdmin && (
          <TabsContent value="admin-access">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[--text-muted] text-sm">{adminUsers.length} admin{adminUsers.length !== 1 ? 's' : ''}</p>
                <Button
                  onClick={() => setAddAdminOpen(true)}
                  className="bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 hover:bg-[#0D9488]/20"
                >
                  <UserPlus className="w-4 h-4 mr-1.5" /> Add Admin
                </Button>
              </div>

              <SettingsCard>
                <Table>
                  <TableHeader>
                    <TableRow className="border-[--border-subtle] hover:bg-transparent">
                      <TableHead className="text-[--text-muted] font-medium">Name</TableHead>
                      <TableHead className="text-[--text-muted] font-medium">Email</TableHead>
                      <TableHead className="text-[--text-muted] font-medium">Role</TableHead>
                      <TableHead className="text-[--text-muted] font-medium">Last Login</TableHead>
                      <TableHead className="text-[--text-muted] font-medium">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminUsers.map((admin) => (
                      <TableRow key={admin.id} className="border-[--border-subtle] hover:bg-[--bg-surface] transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0D9488]/20 to-[#10B981]/20 flex items-center justify-center">
                              <Crown className="w-3.5 h-3.5 text-[#0D9488]" />
                            </div>
                            <span className="text-[--text-primary] text-sm font-medium">{admin.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[--text-muted] text-sm">{admin.email}</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] border ${getRoleBadgeColor(admin.role)}`}>
                            {getRoleLabel(admin.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[--text-muted] text-xs">{formatDateTime(admin.lastLogin)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${admin.status === 'online' ? 'bg-[#10B981]' : 'bg-[--bg-surface]'}`} />
                            <span className={`text-xs ${admin.status === 'online' ? 'text-[#10B981]' : 'text-[--text-muted]'}`}>
                              {admin.status === 'online' ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SettingsCard>
            </motion.div>
          </TabsContent>
        )}
      </Tabs>

      {/* ── Dialogs ────────────────────────────────────────────── */}
      {/* Add Feature Flag Dialog */}
      <Dialog open={addFlagOpen} onOpenChange={setAddFlagOpen}>
        <DialogContent className="bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[--text-primary]">Add Feature Flag</DialogTitle>
            <DialogDescription className="text-[--text-muted]">Create a new feature flag to control feature availability.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-[--text-muted] text-xs block mb-1.5">Name *</label>
              <input type="text" value={newFlag.name} onChange={e => setNewFlag({ ...newFlag, name: e.target.value })} className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#0D9488]/30" placeholder="e.g. Dark Mode" />
            </div>
            <div>
              <label className="text-[--text-muted] text-xs block mb-1.5">Key *</label>
              <input type="text" value={newFlag.key} onChange={e => setNewFlag({ ...newFlag, key: e.target.value })} className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#0D9488]/30" placeholder="e.g. dark_mode" />
            </div>
            <div>
              <label className="text-[--text-muted] text-xs block mb-1.5">Description</label>
              <input type="text" value={newFlag.description} onChange={e => setNewFlag({ ...newFlag, description: e.target.value })} className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#0D9488]/30" placeholder="Brief description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[--text-muted] text-xs block mb-1.5">Rollout %</label>
                <input type="number" min={0} max={100} value={newFlag.rolloutPercentage} onChange={e => setNewFlag({ ...newFlag, rolloutPercentage: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#0D9488]/30" />
              </div>
              <div>
                <label className="text-[--text-muted] text-xs block mb-1.5">Target Plan</label>
                <input type="text" value={newFlag.targetPlan} onChange={e => setNewFlag({ ...newFlag, targetPlan: e.target.value })} className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#0D9488]/30" placeholder="All plans" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddFlagOpen(false)} className="text-[--text-muted] hover:text-[--text-secondary]">Cancel</Button>
            <Button onClick={handleAddFlag} className="bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 hover:bg-[#0D9488]/20">Create Flag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
        <DialogContent className="bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[--text-primary]">Edit Plan: {editingPlan?.plan}</DialogTitle>
            <DialogDescription className="text-[--text-muted]">Modify plan pricing, features, and limits.</DialogDescription>
          </DialogHeader>
          {editingPlan && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[--text-muted] text-xs block mb-1.5">Price ($/mo)</label>
                  <input type="number" value={editingPlan.price} onChange={e => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#0D9488]/30" />
                </div>
                <div>
                  <label className="text-[--text-muted] text-xs block mb-1.5">Trial Days</label>
                  <input type="number" value={editingPlan.trialDays} onChange={e => setEditingPlan({ ...editingPlan, trialDays: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#0D9488]/30" />
                </div>
              </div>
              <div>
                <label className="text-[--text-muted] text-xs block mb-1.5">Description</label>
                <input type="text" value={editingPlan.description} onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })} className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#0D9488]/30" />
              </div>
              <div>
                <label className="text-[--text-muted] text-xs block mb-1.5">CTA Text</label>
                <input type="text" value={editingPlan.ctaText} onChange={e => setEditingPlan({ ...editingPlan, ctaText: e.target.value })} className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#0D9488]/30" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditPlanOpen(false)} className="text-[--text-muted] hover:text-[--text-secondary]">Cancel</Button>
            <Button onClick={handleEditPlan} className="bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 hover:bg-[#0D9488]/20">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Announcement Dialog */}
      <Dialog open={addAnnouncementOpen} onOpenChange={setAddAnnouncementOpen}>
        <DialogContent className="bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[--text-primary]">New Announcement</DialogTitle>
            <DialogDescription className="text-[--text-muted]">Create an announcement visible to all users.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-[--text-muted] text-xs block mb-1.5">Title *</label>
              <input type="text" value={newAnnouncement.title} onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#0D9488]/30" placeholder="Announcement title" />
            </div>
            <div>
              <label className="text-[--text-muted] text-xs block mb-1.5">Message *</label>
              <textarea value={newAnnouncement.message} onChange={e => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })} className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#0D9488]/30 min-h-[80px] resize-none" placeholder="Announcement message" />
            </div>
            <div>
              <label className="text-[--text-muted] text-xs block mb-1.5">Type</label>
              <div className="flex gap-2">
                {(['info', 'warning', 'critical'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setNewAnnouncement({ ...newAnnouncement, type: t })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                      newAnnouncement.type === t
                        ? t === 'critical' ? 'bg-[--status-danger-bg] text-[--status-danger] border border-[--status-danger-border]'
                          : t === 'warning' ? 'bg-[--status-warning-bg] text-[--status-warning] border border-[--status-warning-border]'
                            : 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20'
                        : 'text-[--text-muted] hover:text-[--text-muted] hover:bg-[--bg-surface]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[--text-muted] text-xs block mb-1.5">Start Date</label>
                <input type="date" value={newAnnouncement.startDate} onChange={e => setNewAnnouncement({ ...newAnnouncement, startDate: e.target.value })} className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#0D9488]/30" />
              </div>
              <div>
                <label className="text-[--text-muted] text-xs block mb-1.5">End Date</label>
                <input type="date" value={newAnnouncement.endDate} onChange={e => setNewAnnouncement({ ...newAnnouncement, endDate: e.target.value })} className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#0D9488]/30" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddAnnouncementOpen(false)} className="text-[--text-muted] hover:text-[--text-secondary]">Cancel</Button>
            <Button onClick={handleAddAnnouncement} className="bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 hover:bg-[#0D9488]/20">Create Announcement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Admin Dialog */}
      <Dialog open={addAdminOpen} onOpenChange={setAddAdminOpen}>
        <DialogContent className="bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[--text-primary]">Add Admin User</DialogTitle>
            <DialogDescription className="text-[--text-muted]">Grant admin access to a new team member.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-[--text-muted] text-xs block mb-1.5">Name *</label>
              <input type="text" value={newAdmin.name} onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })} className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#0D9488]/30" placeholder="Full name" />
            </div>
            <div>
              <label className="text-[--text-muted] text-xs block mb-1.5">Email *</label>
              <input type="email" value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#0D9488]/30" placeholder="email@example.com" />
            </div>
            <div>
              <label className="text-[--text-muted] text-xs block mb-1.5">Role</label>
              <div className="flex gap-2">
                {(['super_admin', 'support_admin', 'analytics_admin', 'billing_admin'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setNewAdmin({ ...newAdmin, role: r })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      newAdmin.role === r
                        ? `${getRoleBadgeColor(r)} border`
                        : 'text-[--text-muted] hover:text-[--text-muted] hover:bg-[--bg-surface]'
                    }`}
                  >
                    {getRoleLabel(r)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddAdminOpen(false)} className="text-[--text-muted] hover:text-[--text-secondary]">Cancel</Button>
            <Button onClick={handleAddAdmin} className="bg-[#0D9488]/10 text-[#0D9488] border border-[#0D9488]/20 hover:bg-[#0D9488]/20">Add Admin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purge Confirmation Dialog */}
      <Dialog open={purgeDialogOpen} onOpenChange={setPurgeDialogOpen}>
        <DialogContent className="bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[--status-danger]">⚠️ Purge All Data</DialogTitle>
            <DialogDescription className="text-[--status-danger]/60">
              This will permanently delete ALL non-system data including users, sessions, subscriptions, transactions, and more. This action CANNOT be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-[--status-danger-bg] border border-[--status-danger-border] rounded-lg p-3">
              <p className="text-[--status-danger] text-xs font-medium mb-2">Type &quot;PURGE ALL DATA&quot; to confirm:</p>
              <input
                type="text"
                value={purgeConfirmText}
                onChange={e => setPurgeConfirmText(e.target.value)}
                className="w-full px-3 py-2 bg-[--bg-primary] border border-[--status-danger-border] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[--status-danger-border] font-metric"
                placeholder="PURGE ALL DATA"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setPurgeDialogOpen(false); setPurgeConfirmText('') }} className="text-[--text-muted] hover:text-[--text-secondary]">Cancel</Button>
            <Button
              onClick={handlePurge}
              disabled={purgeConfirmText !== 'PURGE ALL DATA'}
              className="bg-[--status-danger-bg] text-[--status-danger] border border-[--status-danger-border] hover:bg-[--status-danger-bg] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4 mr-1.5" /> Purge All Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog (used for destructive actions) */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[--text-primary]">{confirmAction?.title}</DialogTitle>
            <DialogDescription className="text-[--text-muted]">{confirmAction?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDialogOpen(false)} className="text-[--text-muted] hover:text-[--text-secondary]">Cancel</Button>
            <Button
              onClick={() => {
                confirmAction?.onConfirm()
                setConfirmDialogOpen(false)
              }}
              className="bg-[--status-danger-bg] text-[--status-danger] border border-[--status-danger-border] hover:bg-[--status-danger-bg]"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
