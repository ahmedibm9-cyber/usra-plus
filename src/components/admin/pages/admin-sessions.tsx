'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, type Variants } from 'framer-motion'
import {
  Monitor, Smartphone, Globe, Clock, Loader2, RefreshCw,
  UserX, Wifi, BarChart3, Users, Timer, Laptop, Tablet
} from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { safeJsonResponse } from '@/lib/safe-fetch'

// ─── Types ───────────────────────────────────────────────────────────

interface SessionRecord {
  id: string
  userId: string
  userName: string
  userEmail: string
  deviceType: string
  browser: string
  ipAddress: string
  country: string
  city: string
  lastActive: string
  createdAt: string
  expiresAt: string
  durationMs: number
  isActive: boolean
}

interface SessionStats {
  totalActive: number
  mobileCount: number
  desktopCount: number
  avgDurationMs: number
  sessionsLastHour: number
  totalSessions: number
}

interface SessionAPIData {
  sessions: SessionRecord[]
  stats: SessionStats
  geographicDistribution: Array<{ country: string; count: number }>
  deviceBreakdown: Array<{ device: string; count: number; percentage: number }>
}

// ─── Animation Variants ──────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
}

// ─── Helpers ─────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function getDeviceIcon(deviceType: string) {
  switch (deviceType) {
    case 'mobile': return <Smartphone className="w-4 h-4" />
    case 'tablet': return <Tablet className="w-4 h-4" />
    case 'desktop': return <Laptop className="w-4 h-4" />
    default: return <Monitor className="w-4 h-4" />
  }
}

function getDeviceColor(deviceType: string) {
  switch (deviceType) {
    case 'mobile': return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20' }
    case 'desktop': return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20' }
    case 'tablet': return { bg: 'bg-[var(--accent-primary)]/10', text: 'text-[var(--accent-primary)]', border: 'border-[var(--accent-primary)]/20' }
    default: return { bg: 'bg-[--bg-surface]', text: 'text-[--text-muted]', border: 'border-[--border-subtle]' }
  }
}

// ─── Stats Card ──────────────────────────────────────────────────────

function StatsCard({ title, value, icon: Icon, color, sub }: {
  title: string; value: string | number; icon: React.ElementType; color: string; sub?: string
}) {
  return (
    <motion.div variants={itemVariants} className="bg-[--bg-surface] border border-[--border-subtle] rounded-xl p-4 relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/[0.02] to-transparent pointer-events-none rounded-bl-full" />
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-[--text-primary] font-metric">{value}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-[--text-muted]">{title}</span>
        {sub && <span className="text-[10px] text-[--text-muted]">{sub}</span>}
      </div>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────

export function AdminSessions() {
  const [data, setData] = useState<SessionAPIData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [revokedIds, setRevokedIds] = useState<Set<string>>(new Set())
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/sessions', { signal: controller.signal, credentials: 'same-origin' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await safeJsonResponse(res)
      if (!controller.signal.aborted) setData(json.data)
    } catch {
      // Silently fail
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    return () => { if (abortRef.current) abortRef.current.abort() }
  }, [fetchData])

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId)
    try {
      const res = await fetch('/api/admin/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ sessionId }),
      })
      if (res.ok) {
        setRevokedIds(prev => new Set(prev).add(sessionId))
        toast.success('Session revoked')
        fetchData()
      } else {
        toast.error('Failed to revoke session')
      }
    } catch {
      toast.error('Failed to revoke session')
    } finally {
      setRevokingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[--bg-surface] rounded-xl border border-[--border-subtle] p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
        <div className="bg-[--bg-surface] rounded-xl border border-[--border-subtle] p-4">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  const stats = data?.stats
  const sessions = data?.sessions || []
  const deviceBreakdown = data?.deviceBreakdown || []

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[400px] h-[300px]" style={{ background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.12) 0%, transparent 60%)' }} />
          <div className="absolute bottom-0 left-0 w-[300px] h-[200px]" style={{ background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--accent) 8%, transparent) 0%, transparent 60%)' }} />
        </div>
        <div className="relative z-10 px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[--text-primary]">
                Session <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent)] bg-clip-text text-transparent">Tracker</span>
              </h1>
              <p className="text-sm text-[--text-muted] mt-1">Real session data from the database · {stats?.totalSessions || 0} total</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                <Wifi className="w-3 h-3" /> Live Data
              </div>
              <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--bg-surface] border border-[--border-subtle] text-[--text-muted] hover:text-[--text-secondary] transition-all">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard title="Active Sessions" value={stats?.totalActive ?? '—'} icon={Users} color="var(--accent)" />
        <StatsCard title="Desktop / Mobile" value={stats ? `${stats.desktopCount} / ${stats.mobileCount}` : '—'} icon={Smartphone} color="var(--accent)" />
        <StatsCard title="Avg Duration" value={stats ? formatDuration(stats.avgDurationMs) : '—'} icon={Timer} color="var(--primary)" />
        <StatsCard title="Last Hour" value={stats?.sessionsLastHour ?? '—'} icon={Clock} color="var(--accent)" sub="sessions" />
      </div>

      {/* ── Sessions Table + Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-[--bg-surface] border border-[--border-subtle] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[--border-subtle]">
            <h3 className="text-sm font-semibold text-[--text-primary] flex items-center gap-2">
              <Wifi className="w-4 h-4 text-[var(--accent)]" /> All Sessions
              <span className="text-xs text-[--text-muted] font-normal">({sessions.length})</span>
            </h3>
          </div>
          <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Monitor className="w-8 h-8 text-[--text-muted] mb-3" />
                <p className="text-sm text-[--text-muted]">No sessions found</p>
                <p className="text-[10px] text-[--text-muted] mt-1">Sessions will appear here when users log in</p>
              </div>
            ) : (
              sessions.map(session => {
                const dc = getDeviceColor(session.deviceType)
                const isRevoked = revokedIds.has(session.id)
                const isRevoking = revokingId === session.id
                return (
                  <div key={session.id} className={`flex items-center gap-3 px-4 py-3 border-b border-[--border-subtle] hover:bg-[--bg-surface] transition-colors ${isRevoked ? 'opacity-40' : ''}`}>
                    <div className={`w-8 h-8 rounded-full ${dc.bg} ${dc.border} border flex items-center justify-center ${dc.text} shrink-0`}>
                      {getDeviceIcon(session.deviceType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-[--text-secondary] truncate font-medium">{session.userName}</p>
                        {session.isActive && !isRevoked && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />}
                        {isRevoked && <span className="px-1.5 py-0.5 rounded text-[8px] bg-[--status-danger-bg] text-[--status-danger] border border-[--status-danger-border]">Revoked</span>}
                      </div>
                      <p className="text-[10px] text-[--text-muted] truncate">{session.userEmail}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] ${dc.bg} ${dc.text} border ${dc.border} capitalize`}>{session.deviceType}</span>
                    </div>
                    <div className="hidden md:block shrink-0 min-w-[100px]">
                      <p className="text-[10px] text-[--text-muted] font-metric">{timeAgo(session.createdAt)}</p>
                      <p className="text-[10px] text-[--text-muted]">Expires: {timeAgo(session.expiresAt)}</p>
                    </div>
                    <div className="hidden lg:block shrink-0 min-w-[50px]">
                      <span className="text-[10px] text-[--text-muted]">{formatDuration(session.durationMs)}</span>
                    </div>
                    <button onClick={() => handleRevoke(session.id)} disabled={isRevoked || isRevoking} className={`shrink-0 p-1.5 rounded-lg transition-all ${isRevoked ? 'bg-[--status-danger-bg] text-[--status-danger]/50 cursor-not-allowed' : isRevoking ? 'bg-[--bg-surface] text-[--text-muted] animate-pulse' : 'bg-[--bg-surface] text-[--text-muted] hover:text-[--status-danger] hover:bg-[--status-danger-bg] border border-[--border-subtle]'}`} title={isRevoked ? 'Session revoked' : 'Revoke session'}>
                      {isRevoking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>

        {/* Sidebar */}
        <div className="space-y-4">
          <motion.div variants={itemVariants} className="bg-[--bg-surface] border border-[--border-subtle] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-[--text-primary] flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-[var(--accent)]" /> Device Breakdown
            </h3>
            {deviceBreakdown.length > 0 ? (
              <div className="space-y-4">
                {deviceBreakdown.map(item => (
                  <div key={item.device}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={getDeviceColor(item.device).text}>{getDeviceIcon(item.device)}</span>
                        <span className="text-sm text-[--text-secondary] capitalize">{item.device}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[--text-primary] font-metric">{item.count}</span>
                        <span className="text-xs text-[--text-muted]">{item.percentage}%</span>
                      </div>
                    </div>
                    <div className="h-3 bg-[--bg-surface] rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${item.percentage}%` }} transition={{ duration: 0.8, delay: 0.2 }} className="h-full rounded-full bg-[var(--accent)]/60" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Monitor className="w-6 h-6 text-[--text-muted] mb-2" />
                <p className="text-xs text-[--text-muted]">No device data</p>
              </div>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="bg-[--bg-surface] border border-[--border-subtle] rounded-xl p-4">
            <h3 className="text-sm font-semibold text-[--text-primary] flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-[var(--accent)]" /> Session Info
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[--text-muted]">Total Sessions</span>
                <span className="text-[--text-secondary] font-metric">{stats?.totalSessions || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[--text-muted]">Active Now</span>
                <span className="text-[var(--accent)] font-metric">{stats?.totalActive || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[--text-muted]">Last Hour</span>
                <span className="text-[--status-warning] font-metric">{stats?.sessionsLastHour || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[--text-muted]">Avg Duration</span>
                <span className="text-[var(--accent)] font-metric">{stats ? formatDuration(stats.avgDurationMs) : '—'}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
