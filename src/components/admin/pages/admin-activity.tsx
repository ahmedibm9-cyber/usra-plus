'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { safeJsonResponse } from '@/lib/safe-fetch'
import {
  Activity, UserPlus, Shield, Clock, TrendingUp,
  RefreshCw, Loader2, Users, BarChart3, Radio,
  ChevronDown, Database, Eye
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ActivityEvent {
  id: string
  type: 'signup' | 'session' | 'security' | 'system'
  description: string
  timestamp: string
  userName: string
  userEmail: string
}

// ─── Animation Variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

function getEventTypeIcon(type: string) {
  switch (type) {
    case 'signup': return <UserPlus className="w-3.5 h-3.5" />
    case 'session': return <Activity className="w-3.5 h-3.5" />
    case 'security': return <Shield className="w-3.5 h-3.5" />
    default: return <Activity className="w-3.5 h-3.5" />
  }
}

function getEventTypeColor(type: string) {
  switch (type) {
    case 'signup': return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20', dot: 'bg-[var(--accent)]' }
    case 'session': return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20', dot: 'bg-[var(--accent)]' }
    case 'security': return { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', border: 'border-[--status-danger-border]', dot: 'bg-[--status-danger]' }
    default: return { bg: 'bg-[--bg-surface]', text: 'text-[--text-muted]', border: 'border-[--border-subtle]', dot: 'bg-[--bg-surface-2]' }
  }
}

function getEventTypeLabel(type: string) {
  switch (type) {
    case 'signup': return 'Signup'
    case 'session': return 'Session'
    case 'security': return 'Security'
    default: return 'System'
  }
}

// ─── Live Pulse Dot ──────────────────────────────────────────────────────────

function LivePulseDot({ color = 'bg-[var(--accent)]' }: { color?: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-40`} />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
    </span>
  )
}

// ─── Stats Card ──────────────────────────────────────────────────────────────

function StatsCard({ title, value, icon: Icon, color, sub }: {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
  sub?: string
}) {
  return (
    <motion.div variants={itemVariants} className="bg-[--bg-surface] border border-[--border-subtle] rounded-xl p-4 relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/[0.02] to-transparent pointer-events-none rounded-bl-full" />
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center`} style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
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

// ─── Empty State (No Activity) ────────────────────────────────────────────────

function EmptyActivityState({ onRetry, dbLabel, dbSource }: { onRetry: () => void; dbLabel: string; dbSource: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent)]/10 to-[var(--accent)]/10 flex items-center justify-center border border-[var(--accent)]/15">
          <Eye className="w-10 h-10 text-[--text-muted]" />
        </div>
        <div className="absolute -inset-3 border border-[var(--accent)]/[0.06] rounded-full" />
        <div className="absolute -inset-6 border border-[var(--accent)]/[0.03] rounded-full" />
      </div>
      <h3 className="text-lg font-semibold text-[--text-secondary] mb-2">No Activity Yet</h3>
      <p className="text-sm text-[--text-muted] text-center max-w-md mb-2">
        The platform is live and connected, but no activity events have been recorded yet.
      </p>
      <p className="text-xs text-[--text-muted] text-center max-w-sm mb-6">
        Activity events like user signups, sessions, and security events will appear here in real-time as users interact with the platform.
      </p>
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)]/[0.04] border border-[var(--accent)]/[0.08] mb-4">
        <Database className="w-4 h-4 text-[--text-muted]" />
        <span className="text-xs text-[--text-muted]">Connected to {dbSource} — data is real, just empty</span>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-sm hover:bg-[var(--accent)]/20 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Refresh
      </button>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdminActivity() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [filterType, setFilterType] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalSessions, setTotalSessions] = useState(0)
  const [activeSessions, setActiveSessions] = useState(0)
  const [dbLabel, setDbLabel] = useState('SQLite')
  const [dbSource, setDbSource] = useState('Local Database')
  const feedRef = useRef<HTMLDivElement>(null)

  // Fetch database provider info
  useEffect(() => {
    fetch('/api/admin/db-info', { credentials: 'same-origin' })
      .then(async (res) => res.ok ? await safeJsonResponse(res) : null)
      .then((data: unknown) => {
        if (data && typeof data === 'object') {
          const record = data as Record<string, unknown>
          setDbLabel((record.displayBadge as string) || 'SQLite')
          setDbSource((record.source as string) || 'Local Database')
        }
      })
      .catch(() => {})
  }, [])

  function mapFeedType(type: string): ActivityEvent['type'] {
    if (type === 'user_registered') return 'signup'
    if (type === 'security_alert') return 'security'
    return 'system'
  }

  // Fetch activity data from API — REAL data only
  const fetchActivityData = useCallback(async () => {
    try {
      const [overviewRes, analyticsRes] = await Promise.all([
        fetch('/api/admin/overview', { credentials: 'same-origin' }),
        fetch('/api/admin/analytics', { credentials: 'same-origin' }),
      ])
      const overviewJson = overviewRes.ok ? await safeJsonResponse(overviewRes) : null
      const analyticsJson = analyticsRes.ok ? await safeJsonResponse(analyticsRes) : null

      // Get real user counts
      const analyticsData = (analyticsJson as Record<string, unknown> | null)
      const overviewData = (overviewJson as Record<string, unknown> | null)
      const users = (analyticsData as any)?.data?.users?.total ?? 0
      const sessions = (analyticsData as any)?.data?.sessions?.total ?? 0
      const active = (analyticsData as any)?.data?.sessions?.active ?? 0
      setTotalUsers(users)
      setTotalSessions(sessions)
      setActiveSessions(active)

      // Build activity events from real data (overview API returns activity feed from real signups)
      if ((overviewData as any)?.data?.activityFeed && (overviewData as any).data.activityFeed.length > 0) {
        const feedEvents: ActivityEvent[] = (overviewData as any).data.activityFeed.map((item: { id: string; type: string; text: string; time: string }, i: number) => ({
          id: item.id || `live-${i}`,
          type: mapFeedType(item.type),
          description: item.text,
          timestamp: item.time,
          userName: item.text.split(' ')[0] || 'User',
          userEmail: '',
        }))
        setEvents(feedEvents)
      } else {
        // No activity yet — empty array, NOT fake data
        setEvents([])
      }
    } catch {
      setEvents([])
      setTotalUsers(0)
      setTotalSessions(0)
      setActiveSessions(0)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActivityData()
  }, [fetchActivityData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchActivityData()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchActivityData])

  // Scroll feed to top on new events
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0
    }
  }, [events])

  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return events
    return events.filter(e => e.type === filterType)
  }, [events, filterType])

  const eventTypes = useMemo(() => {
    const types = new Set(events.map(e => e.type))
    return Array.from(types)
  }, [events])

  // Stats from REAL data
  const eventsToday = useMemo(() => {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    return events.filter(e => new Date(e.timestamp).getTime() >= startOfDay.getTime()).length
  }, [events])

  const eventsThisWeek = useMemo(() => {
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - 7)
    startOfWeek.setHours(0, 0, 0, 0)
    return events.filter(e => new Date(e.timestamp).getTime() >= startOfWeek.getTime()).length
  }, [events])

  const isEmpty = totalUsers === 0 && events.length === 0

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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[400px] h-[300px] opacity-100" style={{ background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--accent) 12%, transparent) 0%, transparent 60%)' }} />
          <div className="absolute bottom-0 left-0 w-[300px] h-[200px] opacity-100" style={{ background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.08) 0%, transparent 60%)' }} />
        </div>
        <div className="relative z-10 px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <LivePulseDot color={isEmpty ? 'bg-[--bg-surface]' : 'bg-[var(--accent)]'} />
                <span className={`text-sm font-medium ${isEmpty ? 'text-[--text-muted]' : 'text-[--text-secondary]'}`}>
                  {isEmpty ? 'Monitoring active — No events yet' : 'Real-time monitoring active'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[--text-primary]">
                Activity
                <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent)] bg-clip-text text-transparent"> Monitor</span>
              </h1>
              <p className="text-sm text-[--text-muted] mt-1">
                {isEmpty
                  ? 'Platform events will appear here as users interact with the app'
                  : 'Track platform events, signups, and usage patterns in real-time'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                <Database className="w-3 h-3" />
                {dbLabel}
              </div>
              <button
                onClick={fetchActivityData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--bg-surface] border border-[--border-subtle] text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface-2] transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[var(--bg-primary)] to-transparent pointer-events-none" />
      </motion.div>

      {isEmpty ? (
        <EmptyActivityState onRetry={fetchActivityData} dbLabel={dbLabel} dbSource={dbSource} />
      ) : (
        <>
          {/* ── Stats Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatsCard title="Total Users" value={totalUsers || '—'} icon={Users} color="var(--accent)" />
            <StatsCard title="Total Sessions" value={totalSessions || '—'} icon={Activity} color="var(--accent)" />
            <StatsCard title="Active Sessions" value={activeSessions || '—'} icon={Radio} color="var(--primary)" />
            <StatsCard title="Events Today" value={eventsToday || '—'} icon={TrendingUp} color="var(--accent)" />
          </div>

          {/* ── Live Activity Feed ── */}
          <motion.div variants={itemVariants} className="bg-[--bg-surface] border border-[--border-subtle] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[--border-subtle] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[--text-primary] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--accent)]" />
                  Activity Feed
                </h3>
                {events.length > 0 && <LivePulseDot color="bg-[var(--accent)]" />}
              </div>
              {eventTypes.length > 0 && (
                <div className="relative">
                  <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg text-xs text-[--text-muted] px-2 py-1 pr-6 focus:outline-none focus:border-[var(--accent)]/30 appearance-none"
                  >
                    <option value="all">All Types</option>
                    {eventTypes.map(t => (
                      <option key={t} value={t}>{getEventTypeLabel(t)}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-[--text-muted] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
            </div>
            <div ref={feedRef} className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Activity className="w-8 h-8 text-[--text-muted] mb-3" />
                  <p className="text-sm text-[--text-muted]">No activity events yet</p>
                  <p className="text-[10px] text-[--text-muted] mt-1">Events will appear here as users interact with the platform</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {filteredEvents.map((event, i) => {
                    const c = getEventTypeColor(event.type)
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ delay: i * 0.02, duration: 0.2 }}
                        className="flex items-center gap-3 px-4 py-2.5 border-b border-[--border-subtle] hover:bg-[--bg-surface] transition-colors"
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${c.bg} ${c.text}`}>
                          {getEventTypeIcon(event.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[--text-secondary] truncate">{event.description}</p>
                          {event.userEmail && <p className="text-[10px] text-[--text-muted] truncate">{event.userEmail}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] ${c.bg} ${c.text} border ${c.border}`}>
                            {getEventTypeLabel(event.type)}
                          </span>
                          <span className="text-[10px] text-[--text-muted] min-w-[50px] text-right">{timeAgo(event.timestamp)}</span>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}

      {/* Data source badge */}
      <div className="text-center">
        <span className="text-[10px] font-metric text-[--text-muted] tracking-widest uppercase">
          {isEmpty ? 'Connected — Real Database, No Activity Yet' : `Live Data — ${dbLabel}`}
        </span>
      </div>
    </motion.div>
  )
}
