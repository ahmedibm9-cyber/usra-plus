'use client'

import { useState, useMemo, useCallback } from 'react'
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
  Crown, FileText
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { FeatureFlag, PlanConfig, Announcement, AdminRole } from '@/types/admin'

// ─── Demo Admin Users for Admin Access Tab ─────────────────────
const DEMO_ADMIN_USERS = [
  { id: 'admin-admin', name: 'USRA Founder', email: 'admin@usraplus.com', role: 'super_admin' as AdminRole, lastLogin: new Date().toISOString(), status: 'online' as const },
  { id: 'admin-support', name: 'Support Admin', email: 'support@usraplus.com', role: 'support_admin' as AdminRole, lastLogin: new Date(Date.now() - 3600000).toISOString(), status: 'online' as const },
  { id: 'admin-analytics', name: 'Analytics Admin', email: 'analytics@usraplus.com', role: 'analytics_admin' as AdminRole, lastLogin: new Date(Date.now() - 86400000).toISOString(), status: 'offline' as const },
  { id: 'admin-billing', name: 'Billing Admin', email: 'billing@usraplus.com', role: 'billing_admin' as AdminRole, lastLogin: new Date(Date.now() - 172800000).toISOString(), status: 'offline' as const },
]

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
    case 'super_admin': return 'bg-red-500/10 text-red-400 border-red-500/20'
    case 'support_admin': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    case 'analytics_admin': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'billing_admin': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    default: return 'bg-white/10 text-white/60 border-white/10'
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
  if (action.includes('login') || action.includes('logout')) return 'text-emerald-400'
  if (action.includes('security') || action.includes('unauthorized') || action.includes('failed')) return 'text-red-400'
  return 'text-amber-400'
}

function getActionBg(action: string) {
  if (action.includes('login') || action.includes('logout')) return 'bg-emerald-500/10'
  if (action.includes('security') || action.includes('unauthorized') || action.includes('failed')) return 'bg-red-500/10'
  return 'bg-amber-500/10'
}

function getAnnouncementTypeStyle(type: string) {
  switch (type) {
    case 'critical': return 'bg-red-500/10 text-red-400 border-red-500/20'
    case 'warning': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'info': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    default: return 'bg-white/10 text-white/60 border-white/10'
  }
}

// ─── Card Wrapper ──────────────────────────────────────────────
function SettingsCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#111117] border border-white/[0.06] rounded-xl ${className}`}>
      {children}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────
export function AdminSettings() {
  const { featureFlags, planConfigs, announcements, toggleFeatureFlag, setPlanConfigs, addAnnouncement, setAnnouncements } = useAdminStore()
  const { adminRole, adminLogs, addAuditLog } = useAdminAuthStore()
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

  // Admin access state
  const [addAdminOpen, setAddAdminOpen] = useState(false)
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', role: 'support_admin' as AdminRole })

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
    toggleFeatureFlag(flagId)
    const flag = featureFlags.find(f => f.id === flagId)
    addAuditLog('feature_flag_toggled', 'feature_flag', flagId, { flagKey: flag?.key, newState: !flag?.enabled })
    toast({ title: 'Feature flag updated', description: `${flag?.name} has been ${flag?.enabled ? 'disabled' : 'enabled'}` })
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
  }, [newFlag, addAuditLog, toast])

  const handleEditPlan = useCallback(() => {
    if (!editingPlan) return
    setPlanConfigs(planConfigs.map(p => p.id === editingPlan.id ? editingPlan : p))
    addAuditLog('plan_config_updated', 'plan_config', editingPlan.id, { plan: editingPlan.plan })
    toast({ title: 'Plan updated', description: `${editingPlan.plan} configuration saved` })
    setEditPlanOpen(false)
    setEditingPlan(null)
  }, [editingPlan, planConfigs, setPlanConfigs, addAuditLog, toast])

  const handleTogglePlan = useCallback((planId: string) => {
    const updated = planConfigs.map(p => p.id === planId ? { ...p, active: !p.active } : p)
    setPlanConfigs(updated)
    const plan = updated.find(p => p.id === planId)
    addAuditLog('plan_toggled', 'plan_config', planId, { plan: plan?.plan, active: plan?.active })
    toast({ title: 'Plan status updated', description: `${plan?.plan} is now ${plan?.active ? 'active' : 'inactive'}` })
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
    addAuditLog('admin_user_added', 'admin_user', null, { email: newAdmin.email, role: newAdmin.role })
    toast({ title: 'Admin user added', description: `${newAdmin.name} (${newAdmin.role}) has been added` })
    setAddAdminOpen(false)
    setNewAdmin({ name: '', email: '', role: 'support_admin' })
  }, [newAdmin, addAuditLog, toast])

  const isSuperAdmin = adminRole === 'super_admin'

  // ─── Tab Items ──────────────────────────────────────────────────
  const tabItems = [
    { value: 'feature-flags', label: 'Feature Flags', icon: <Flag className="w-3.5 h-3.5" /> },
    { value: 'plan-config', label: 'Plan Config', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { value: 'announcements', label: 'Announcements', icon: <Megaphone className="w-3.5 h-3.5" /> },
    { value: 'emergency', label: 'Emergency', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { value: 'audit-logs', label: 'Audit Logs', icon: <FileText className="w-3.5 h-3.5" /> },
    ...(isSuperAdmin ? [{ value: 'admin-access', label: 'Admin Access', icon: <Shield className="w-3.5 h-3.5" /> }] : []),
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-bold text-white">System Settings</h1>
        <p className="text-white/40 text-sm mt-1">Manage feature flags, plans, announcements, and emergency controls</p>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="feature-flags" className="space-y-6">
        <TabsList className="bg-[#111117] border border-white/[0.06] p-1 h-auto flex-wrap gap-1">
          {tabItems.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400 text-white/50 hover:text-white/70 px-3 py-1.5 text-xs sm:text-sm gap-1.5 rounded-lg"
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
              <div className="relative flex-1 max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Search flags..."
                  value={flagSearch}
                  onChange={e => setFlagSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#0B0B0F] border border-white/[0.06] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/30"
                />
              </div>
              <Button
                onClick={() => setAddFlagOpen(true)}
                className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 hover:text-indigo-300"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Add Flag
              </Button>
            </div>

            {/* Table */}
            <SettingsCard>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/40 font-medium">Name</TableHead>
                    <TableHead className="text-white/40 font-medium">Key</TableHead>
                    <TableHead className="text-white/40 font-medium">Enabled</TableHead>
                    <TableHead className="text-white/40 font-medium">Rollout %</TableHead>
                    <TableHead className="text-white/40 font-medium">Target Plan</TableHead>
                    <TableHead className="text-white/40 font-medium">Last Modified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFlags.map((flag, i) => (
                    <motion.tr
                      key={flag.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <TableCell>
                        <div>
                          <p className="text-white/90 text-sm font-medium">{flag.name}</p>
                          <p className="text-white/30 text-xs">{flag.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs px-2 py-0.5 rounded bg-white/[0.04] text-white/50 font-mono">{flag.key}</code>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={flag.enabled}
                          onCheckedChange={() => handleToggleFlag(flag.id)}
                          className="data-[state=checked]:bg-indigo-500"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[80px] h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500/60 rounded-full" style={{ width: `${flag.rolloutPercentage}%` }} />
                          </div>
                          <span className="text-xs text-white/50">{flag.rolloutPercentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {flag.targetPlan ? (
                          <Badge className="text-[10px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                            {flag.targetPlan}
                          </Badge>
                        ) : (
                          <span className="text-white/30 text-xs">All plans</span>
                        )}
                      </TableCell>
                      <TableCell className="text-white/40 text-xs">{formatDate(flag.createdAt)}</TableCell>
                    </motion.tr>
                  ))}
                  {filteredFlags.length === 0 && (
                    <TableRow className="border-white/[0.04]">
                      <TableCell colSpan={6} className="text-center py-8 text-white/30">
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
                        <h3 className="text-lg font-bold text-white">{plan.plan}</h3>
                        {!plan.active && (
                          <Badge className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-white">
                        ${plan.price}<span className="text-sm text-white/40 font-normal">/mo</span>
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => { setEditingPlan(plan); setEditPlanOpen(true) }}
                        className="p-1.5 rounded-lg bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-all"
                        title="Edit plan"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleTogglePlan(plan.id)}
                        className="p-1.5 rounded-lg bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-all"
                        title={plan.active ? 'Deactivate' : 'Activate'}
                      >
                        {plan.active ? <ToggleRight className="w-3.5 h-3.5 text-emerald-400" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex-1 mb-4">
                    <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">Features</p>
                    <ul className="space-y-1.5">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-white/60">
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Limits */}
                  <div>
                    <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">Limits</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(plan.limits).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-1.5">
                          <span className="text-white/30 text-xs capitalize">{key}:</span>
                          <span className="text-white/70 text-xs font-medium">{value ?? '∞'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active indicator */}
                  <div className={`mt-4 pt-3 border-t ${plan.active ? 'border-emerald-500/10' : 'border-white/[0.04]'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${plan.active ? 'bg-emerald-400' : 'bg-white/20'}`} />
                      <span className={`text-xs ${plan.active ? 'text-emerald-400' : 'text-white/30'}`}>
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
              <p className="text-white/50 text-sm">{announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</p>
              <Button
                onClick={() => setAddAnnouncementOpen(true)}
                className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 hover:text-indigo-300"
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
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${ann.type === 'critical' ? 'bg-red-500/10' : ann.type === 'warning' ? 'bg-amber-500/10' : 'bg-blue-500/10'}`}>
                        {ann.type === 'critical' ? <AlertOctagon className="w-5 h-5 text-red-400" /> : ann.type === 'warning' ? <AlertCircle className="w-5 h-5 text-amber-400" /> : <Info className="w-5 h-5 text-blue-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="text-sm font-medium text-white/90">{ann.title}</h4>
                          <Badge className={`text-[10px] border ${getAnnouncementTypeStyle(ann.type)}`}>
                            {ann.type}
                          </Badge>
                          <Badge className={`text-[10px] border ${ann.active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/[0.04] text-white/30 border-white/[0.06]'}`}>
                            {ann.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-white/40 mb-2 line-clamp-2">{ann.message}</p>
                        <div className="flex items-center gap-3 text-xs text-white/25">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(ann.startDate)}</span>
                          {ann.endDate && <span>→ {formatDate(ann.endDate)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleToggleAnnouncement(ann.id)}
                          className="p-1.5 rounded-lg bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-all"
                          title={ann.active ? 'Deactivate' : 'Activate'}
                        >
                          {ann.active ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleConfirmAction(
                            'Delete Announcement',
                            `Are you sure you want to delete "${ann.title}"? This action cannot be undone.`,
                            () => handleDeleteAnnouncement(ann.id)
                          )}
                          className="p-1.5 rounded-lg bg-white/[0.04] text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
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
                  <Megaphone className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-white/30 text-sm">No announcements yet</p>
                  <p className="text-white/20 text-xs mt-1">Create one to notify all users</p>
                </SettingsCard>
              )}
            </div>
          </motion.div>
        </TabsContent>

        {/* ── Tab 4: Emergency Controls ────────────────────────── */}
        <TabsContent value="emergency">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
            {/* Warning Banner */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-red-400">⚠️ Emergency Controls</h3>
                <p className="text-xs text-red-400/60 mt-0.5">These controls can immediately affect all users. Use with extreme caution. All actions are logged and require double confirmation.</p>
              </div>
            </div>

            {/* Emergency Shutdown */}
            <SettingsCard className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${emergencyShutdown ? 'bg-red-500/20' : 'bg-red-500/10'}`}>
                    <Power className={`w-5 h-5 ${emergencyShutdown ? 'text-red-400' : 'text-red-400/60'}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white/90">Emergency Shutdown</h4>
                    <p className="text-xs text-white/40">Immediately disable all user access to the platform</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={`text-[10px] border ${emergencyShutdown ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-white/[0.04] text-white/30 border-white/[0.06]'}`}>
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
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
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
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${maintenanceMode ? 'bg-amber-500/20' : 'bg-amber-500/10'}`}>
                    <AlertOctagon className={`w-5 h-5 ${maintenanceMode ? 'text-amber-400' : 'text-amber-400/60'}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white/90">Maintenance Mode</h4>
                    <p className="text-xs text-white/40">Show maintenance page to all users</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={`text-[10px] border ${maintenanceMode ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-white/[0.04] text-white/30 border-white/[0.06]'}`}>
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
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
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
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-red-400/60" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white/90">Force Logout All Users</h4>
                    <p className="text-xs text-white/40">Terminate all active user sessions immediately</p>
                  </div>
                </div>
                <button
                  onClick={() => handleConfirmAction(
                    '🔴 Force Logout All Users',
                    'This will immediately terminate ALL active user sessions. Every user will need to log in again. This is a highly disruptive action.',
                    handleForceLogout
                  )}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                >
                  Force Logout
                </button>
              </div>
            </SettingsCard>

            {/* Clear Cache */}
            <SettingsCard className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Database className="w-5 h-5 text-amber-400/60" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white/90">Clear Application Cache</h4>
                    <p className="text-xs text-white/40">Purge all cached data and regenerate</p>
                  </div>
                </div>
                <button
                  onClick={() => handleConfirmAction(
                    'Clear Application Cache',
                    'This will purge all cached data. Users may experience slightly slower load times temporarily.',
                    handleClearCache
                  )}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
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
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={logSearch}
                    onChange={e => setLogSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#0B0B0F] border border-white/[0.06] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/30"
                  />
                </div>
                <select
                  value={logFilter}
                  onChange={e => setLogFilter(e.target.value as 'all' | 'login' | 'changes' | 'security')}
                  className="px-3 py-2 bg-[#0B0B0F] border border-white/[0.06] rounded-lg text-sm text-white/60 focus:outline-none focus:border-indigo-500/30"
                >
                  <option value="all">All</option>
                  <option value="login">Login/Logout</option>
                  <option value="changes">Changes</option>
                  <option value="security">Security</option>
                </select>
              </div>
              <Button
                onClick={handleExportLogs}
                className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 hover:text-indigo-300"
              >
                <Download className="w-4 h-4 mr-1.5" /> Export
              </Button>
            </div>

            {/* Logs Table */}
            <SettingsCard>
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-white/40 font-medium">Timestamp</TableHead>
                      <TableHead className="text-white/40 font-medium">Admin</TableHead>
                      <TableHead className="text-white/40 font-medium">Action</TableHead>
                      <TableHead className="text-white/40 font-medium">Target</TableHead>
                      <TableHead className="text-white/40 font-medium">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log, i) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.02, 0.5) }}
                        className="border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                      >
                        <TableCell className="text-xs text-white/40 whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </TableCell>
                        <TableCell className="text-xs text-white/60">{log.admin_email}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${getActionBg(log.action)} ${getActionColor(log.action)}`}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-white/40">
                          {log.target_type}
                          {log.target_id && <span className="text-white/20 ml-1">({log.target_id.slice(0, 12)})</span>}
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px]">
                          <code className="text-[11px] text-white/30 font-mono line-clamp-1">
                            {JSON.stringify(log.details).slice(0, 60)}
                          </code>
                        </TableCell>
                      </motion.tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <TableRow className="border-white/[0.04]">
                        <TableCell colSpan={5} className="text-center py-8 text-white/30">
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </SettingsCard>

            <div className="flex items-center justify-between text-xs text-white/25">
              <span>Showing {filteredLogs.length} of {adminLogs.length} entries</span>
              <span>Last 500 entries retained</span>
            </div>
          </motion.div>
        </TabsContent>

        {/* ── Tab 6: Admin Access (Super Admin Only) ───────────── */}
        {isSuperAdmin && (
          <TabsContent value="admin-access">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-white/50 text-sm">{DEMO_ADMIN_USERS.length} admin users</p>
                <Button
                  onClick={() => setAddAdminOpen(true)}
                  className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 hover:text-indigo-300"
                >
                  <UserPlus className="w-4 h-4 mr-1.5" /> Add Admin
                </Button>
              </div>

              <SettingsCard>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-white/40 font-medium">Name</TableHead>
                      <TableHead className="text-white/40 font-medium">Email</TableHead>
                      <TableHead className="text-white/40 font-medium">Role</TableHead>
                      <TableHead className="text-white/40 font-medium">Last Login</TableHead>
                      <TableHead className="text-white/40 font-medium">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DEMO_ADMIN_USERS.map((admin, i) => (
                      <motion.tr
                        key={admin.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-medium shrink-0">
                              {admin.name.charAt(0)}
                            </div>
                            <span className="text-sm text-white/90 font-medium">{admin.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-white/50">{admin.email}</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] border ${getRoleBadgeColor(admin.role)}`}>
                            {admin.role === 'super_admin' && <Crown className="w-3 h-3 mr-1" />}
                            {getRoleLabel(admin.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-white/40">{formatDateTime(admin.lastLogin)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${admin.status === 'online' ? 'bg-emerald-400' : 'bg-white/20'}`} />
                            <span className={`text-xs ${admin.status === 'online' ? 'text-emerald-400' : 'text-white/30'}`}>
                              {admin.status === 'online' ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </SettingsCard>

              {/* Security notice */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-400/60 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-amber-400/80">Security Notice</h4>
                  <p className="text-xs text-amber-400/40 mt-0.5">Only Super Admins can view and manage admin access. All role changes are permanently logged in the audit trail.</p>
                </div>
              </div>
            </motion.div>
          </TabsContent>
        )}
      </Tabs>

      {/* ── Dialogs ────────────────────────────────────────────── */}

      {/* Add Feature Flag Dialog */}
      <Dialog open={addFlagOpen} onOpenChange={setAddFlagOpen}>
        <DialogContent className="bg-[#111117] border-white/[0.06] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Add Feature Flag</DialogTitle>
            <DialogDescription className="text-white/40">Create a new feature flag to control feature availability.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Name</label>
              <input
                type="text"
                value={newFlag.name}
                onChange={e => setNewFlag(s => ({ ...s, name: e.target.value }))}
                className="w-full px-3 py-2 bg-[#0B0B0F] border border-white/[0.08] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/30"
                placeholder="e.g. AI Meal Planner"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Key</label>
              <input
                type="text"
                value={newFlag.key}
                onChange={e => setNewFlag(s => ({ ...s, key: e.target.value.replace(/\s/g, '_').toLowerCase() }))}
                className="w-full px-3 py-2 bg-[#0B0B0F] border border-white/[0.08] rounded-lg text-sm text-white font-mono placeholder-white/20 focus:outline-none focus:border-indigo-500/30"
                placeholder="e.g. ai_meal_planner"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Description</label>
              <textarea
                value={newFlag.description}
                onChange={e => setNewFlag(s => ({ ...s, description: e.target.value }))}
                className="w-full px-3 py-2 bg-[#0B0B0F] border border-white/[0.08] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/30 min-h-[60px] resize-none"
                placeholder="What does this feature flag control?"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Rollout %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newFlag.rolloutPercentage}
                  onChange={e => setNewFlag(s => ({ ...s, rolloutPercentage: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-[#0B0B0F] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500/30"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Target Plan</label>
                <select
                  value={newFlag.targetPlan}
                  onChange={e => setNewFlag(s => ({ ...s, targetPlan: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#0B0B0F] border border-white/[0.08] rounded-lg text-sm text-white/60 focus:outline-none focus:border-indigo-500/30"
                >
                  <option value="">All Plans</option>
                  <option value="pro">Pro</option>
                  <option value="family_plus">Family+</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddFlagOpen(false)} className="text-white/50 hover:text-white/70">Cancel</Button>
            <Button onClick={handleAddFlag} className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30">Create Flag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
        <DialogContent className="bg-[#111117] border-white/[0.06] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Plan: {editingPlan?.plan}</DialogTitle>
            <DialogDescription className="text-white/40">Modify plan pricing, features, and limits.</DialogDescription>
          </DialogHeader>
          {editingPlan && (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Monthly Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={editingPlan.price}
                  onChange={e => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-[#0B0B0F] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500/30"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Features (one per line)</label>
                <textarea
                  value={editingPlan.features.join('\n')}
                  onChange={e => setEditingPlan({ ...editingPlan, features: e.target.value.split('\n').filter(Boolean) })}
                  className="w-full px-3 py-2 bg-[#0B0B0F] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500/30 min-h-[100px] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(editingPlan.limits).map(([key, value]) => (
                  <div key={key}>
                    <label className="text-xs text-white/50 mb-1 block capitalize">{key} limit</label>
                    <input
                      type="number"
                      min={0}
                      value={value ?? ''}
                      placeholder="∞"
                      onChange={e => {
                        const val = e.target.value === '' ? null : parseInt(e.target.value)
                        setEditingPlan({ ...editingPlan, limits: { ...editingPlan.limits, [key]: val } })
                      }}
                      className="w-full px-3 py-2 bg-[#0B0B0F] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500/30"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditPlanOpen(false)} className="text-white/50 hover:text-white/70">Cancel</Button>
            <Button onClick={handleEditPlan} className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Announcement Dialog */}
      <Dialog open={addAnnouncementOpen} onOpenChange={setAddAnnouncementOpen}>
        <DialogContent className="bg-[#111117] border-white/[0.06] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">New Announcement</DialogTitle>
            <DialogDescription className="text-white/40">Create an announcement visible to all users.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Title</label>
              <input
                type="text"
                value={newAnnouncement.title}
                onChange={e => setNewAnnouncement(s => ({ ...s, title: e.target.value }))}
                className="w-full px-3 py-2 bg-[#0B0B0F] border border-white/[0.08] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/30"
                placeholder="Announcement title"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Message</label>
              <textarea
                value={newAnnouncement.message}
                onChange={e => setNewAnnouncement(s => ({ ...s, message: e.target.value }))}
                className="w-full px-3 py-2 bg-[#0B0B0F] border border-white/[0.08] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/30 min-h-[80px] resize-none"
                placeholder="What would you like to announce?"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Type</label>
              <select
                value={newAnnouncement.type}
                onChange={e => setNewAnnouncement(s => ({ ...s, type: e.target.value as 'info' | 'warning' | 'critical' }))}
                className="w-full px-3 py-2 bg-[#0B0B0F] border border-white/[0.08] rounded-lg text-sm text-white/60 focus:outline-none focus:border-indigo-500/30"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Start Date</label>
                <input
                  type="date"
                  value={newAnnouncement.startDate}
                  onChange={e => setNewAnnouncement(s => ({ ...s, startDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#0B0B0F] border border-white/[0.08] rounded-lg text-sm text-white/60 focus:outline-none focus:border-indigo-500/30"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">End Date (optional)</label>
                <input
                  type="date"
                  value={newAnnouncement.endDate}
                  onChange={e => setNewAnnouncement(s => ({ ...s, endDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#0B0B0F] border border-white/[0.08] rounded-lg text-sm text-white/60 focus:outline-none focus:border-indigo-500/30"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddAnnouncementOpen(false)} className="text-white/50 hover:text-white/70">Cancel</Button>
            <Button onClick={handleAddAnnouncement} className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Admin Dialog */}
      <Dialog open={addAdminOpen} onOpenChange={setAddAdminOpen}>
        <DialogContent className="bg-[#111117] border-white/[0.06] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Add Admin User</DialogTitle>
            <DialogDescription className="text-white/40">Grant admin access to a new team member.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Full Name</label>
              <input
                type="text"
                value={newAdmin.name}
                onChange={e => setNewAdmin(s => ({ ...s, name: e.target.value }))}
                className="w-full px-3 py-2 bg-[#0B0B0F] border border-white/[0.08] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/30"
                placeholder="Admin name"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Email</label>
              <input
                type="email"
                value={newAdmin.email}
                onChange={e => setNewAdmin(s => ({ ...s, email: e.target.value }))}
                className="w-full px-3 py-2 bg-[#0B0B0F] border border-white/[0.08] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/30"
                placeholder="admin@usraplus.com"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Role</label>
              <select
                value={newAdmin.role}
                onChange={e => setNewAdmin(s => ({ ...s, role: e.target.value as AdminRole }))}
                className="w-full px-3 py-2 bg-[#0B0B0F] border border-white/[0.08] rounded-lg text-sm text-white/60 focus:outline-none focus:border-indigo-500/30"
              >
                <option value="support_admin">Support Admin</option>
                <option value="analytics_admin">Analytics Admin</option>
                <option value="billing_admin">Billing Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddAdminOpen(false)} className="text-white/50 hover:text-white/70">Cancel</Button>
            <Button onClick={handleAddAdmin} className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30">Add Admin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog (used for destructive actions) */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="bg-[#111117] border-white/[0.06] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{confirmAction?.title}</DialogTitle>
            <DialogDescription className="text-white/40">{confirmAction?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDialogOpen(false)} className="text-white/50 hover:text-white/70">Cancel</Button>
            <Button
              onClick={() => {
                confirmAction?.onConfirm()
                setConfirmDialogOpen(false)
                setConfirmAction(null)
              }}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
