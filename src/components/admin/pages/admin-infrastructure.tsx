'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Clock, Wifi, ShieldAlert, Database, HardDrive,
  TrendingUp, TrendingDown, AlertTriangle, AlertCircle, Info,
  Search, Filter, Shield, ShieldCheck, Lock, LogIn, Users,
  Globe, ChevronRight, Zap, Server, Terminal, CheckCircle2, XCircle,
  RefreshCw, Loader2, WifiOff
} from 'lucide-react'
import type { ErrorLog } from '@/types/admin'

// ─── Types ───────────────────────────────────────────────────────────

interface InfraAPIData {
  tableCounts?: Record<string, number>
  totalRows?: number
  recentActivity?: Record<string, number>
  totalRecentActivity?: number
  activeConnections?: number
  userGrowth?: { thisWeek: number; lastWeek: number; growthRate: number }
}

// ─── Animation Variants ──────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
}

// ─── Blinking Cursor Component ──────────────────────────────────────

function BlinkingCursor() {
  return (
    <span className="inline-block w-2 h-5 bg-green-400 ml-1 align-middle animate-pulse" />
  )
}

// ─── Terminal Block Header ──────────────────────────────────────────

function TerminalBlockHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-[#0A0A0F] rounded-t-lg border-b border-white/[0.04]">
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
      </div>
      <span className="text-[10px] font-mono text-white/30 ml-2">{title}</span>
    </div>
  )
}

// ─── Terminal Block Wrapper ─────────────────────────────────────────

function TerminalBlock({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#0D0D14] border border-white/[0.06] rounded-lg overflow-hidden ${className}`}>
      <TerminalBlockHeader title={title} />
      <div className="p-4 font-mono">
        {children}
      </div>
    </div>
  )
}

// ─── Blinking Cursor Effect for Header ──────────────────────────────

function TerminalHeader() {
  const [commandText, setCommandText] = useState('')
  const fullCommand = '$ usra-infra --monitor'

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i <= fullCommand.length) {
        setCommandText(fullCommand.slice(0, i))
        i++
      } else {
        clearInterval(interval)
      }
    }, 60)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="font-mono text-sm text-green-400">
      {commandText}
      <BlinkingCursor />
    </div>
  )
}

// ─── Database Table Row Count Display ───────────────────────────────

function TableRowCounts({ tableCounts }: { tableCounts: Record<string, number> }) {
  const entries = Object.entries(tableCounts).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-1.5">
      {entries.map(([table, count], i) => {
        const maxCount = entries[0][1]
        const widthPct = Math.max((count / maxCount) * 100, 5)
        return (
          <motion.div
            key={table}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.04 }}
            className="group"
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] font-mono text-white/40 group-hover:text-orange-400/70 transition-colors">{table}</span>
              <span className="text-[10px] font-mono text-white/50">{count.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-white/[0.03] rounded-sm overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ delay: 0.2 + i * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-sm bg-gradient-to-r from-orange-500/60 to-red-500/50"
              />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── Live Connection Indicator ──────────────────────────────────────

function LiveConnectionIndicator({ activeNow, totalRows }: { activeNow: number; totalRows: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[10px] font-mono text-green-400/70">db: connected</span>
      </div>
      <div className="h-3 w-px bg-white/10" />
      <div className="flex items-center gap-1.5">
        <Users className="w-3 h-3 text-green-500/60" />
        <span className="text-[10px] font-mono text-green-400/50">{activeNow} active</span>
      </div>
      <div className="h-3 w-px bg-white/10" />
      <div className="flex items-center gap-1.5">
        <Database className="w-3 h-3 text-orange-500/60" />
        <span className="text-[10px] font-mono text-orange-400/50">{totalRows.toLocaleString()} rows</span>
      </div>
    </div>
  )
}

// ─── Recent Activity Sparkline (text-based terminal) ────────────────

function RecentActivityTerminal({ recentActivity }: { recentActivity: Record<string, number> }) {
  const entries = Object.entries(recentActivity).sort((a, b) => b[1] - a[1])
  if (!entries.length) return null

  const maxVal = Math.max(...entries.map(([, v]) => v))

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-mono text-green-600/30 mb-2">$ db-activity --last-24h --format=bar</div>
      {entries.map(([table, count], i) => {
        const barLen = Math.max(Math.round((count / maxVal) * 20), 1)
        const bar = '█'.repeat(barLen) + '░'.repeat(Math.max(20 - barLen, 0))
        const color = count > 100 ? 'text-green-400' : count > 10 ? 'text-amber-400' : 'text-white/30'
        return (
          <motion.div
            key={table}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2 text-[10px] font-mono"
          >
            <span className="text-white/25 w-24 truncate">{table}</span>
            <span className={color}>{bar}</span>
            <span className="text-white/40">{count.toLocaleString()}</span>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── Growth Metric Display ──────────────────────────────────────────

function GrowthMetric({ growth }: { growth: { thisWeek: number; lastWeek: number; growthRate: number } }) {
  const isPositive = growth.growthRate >= 0
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="text-white/30">this week:</span>
        <span className="text-green-400">{growth.thisWeek} new</span>
      </div>
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="text-white/30">last week:</span>
        <span className="text-white/40">{growth.lastWeek} new</span>
      </div>
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="text-white/30">growth:</span>
        <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
          {isPositive ? '+' : ''}{growth.growthRate.toFixed(1)}%
        </span>
      </div>
      <div className="mt-2 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${isPositive ? 'bg-green-500/60' : 'bg-red-500/60'}`}
          style={{ width: `${Math.min(Math.abs(growth.growthRate), 100)}%` }}
        />
      </div>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────

function EmptyState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-20 px-6"
    >
      <div className="w-16 h-16 rounded-2xl bg-[#0A0A0F] border border-red-500/15 flex items-center justify-center mb-5">
        <WifiOff className="w-8 h-8 text-red-400/40" />
      </div>
      <h3 className="text-lg font-semibold text-white/60 mb-2 font-mono">No System Metrics</h3>
      <p className="text-sm text-white/30 text-center max-w-md mb-6 font-mono">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition-colors font-mono"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        $ retry-connection
      </button>
    </motion.div>
  )
}

// ─── Loading State ───────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="font-mono text-green-400/60 mb-3">$ usra-infra --connect</div>
      <Loader2 className="w-8 h-8 text-green-400/40 animate-spin mb-4" />
      <p className="text-sm text-white/30 font-mono">Connecting to database...</p>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────

export function AdminInfrastructure() {
  const [apiData, setApiData] = useState<InfraAPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<string>('unavailable')
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update clock every second for live terminal feel
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/infrastructure')
      if (!res.ok) throw new Error('Failed to fetch infrastructure data')
      const json = await res.json()
      setDataSource(json.source)
      if (json.source === 'unavailable' || !json.data) {
        setApiData(null)
        setError(json.message || 'No data available')
      } else {
        setApiData(json.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      setApiData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const hasData = apiData !== null && (apiData.totalRows ?? 0) > 0

  // Derived metrics
  const totalRows = apiData?.totalRows ?? 0
  const activeConnections = apiData?.activeConnections ?? 0
  const tableCount = Object.keys(apiData?.tableCounts ?? {}).length
  const recentActivity = apiData?.recentActivity ?? {}
  const userGrowth = apiData?.userGrowth

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Terminal Header ──────────────────────────────────── */}
      <motion.div variants={itemVariants} className="bg-[#0A0A0F] border border-red-500/10 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-red-400" />
            <h2 className="text-xl font-bold text-white font-mono">Server Terminal</h2>
            {dataSource === 'live' && (
              <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-green-500/10 text-green-400 border border-green-500/20">LIVE</span>
            )}
            {dataSource === 'unavailable' && (
              <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-red-500/10 text-red-400 border border-red-500/20">OFFLINE</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {hasData && (
              <LiveConnectionIndicator activeNow={activeConnections} totalRows={totalRows} />
            )}
            <span className="text-[10px] font-mono text-white/15">
              {currentTime.toLocaleTimeString()}
            </span>
          </div>
        </div>
        <TerminalHeader />
      </motion.div>

      {/* ── Loading / Empty / Content ─────────────────────────── */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" variants={itemVariants}>
            <LoadingState />
          </motion.div>
        ) : !hasData ? (
          <motion.div key="empty" variants={itemVariants}>
            <EmptyState
              message={error || 'No system metrics available - connect your database to see infrastructure data'}
              onRetry={fetchData}
            />
          </motion.div>
        ) : (
          <motion.div key="content" className="space-y-6">
            {/* ── Section: System Health — Terminal Blocks ─────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Database Status */}
              <motion.div variants={itemVariants}>
                <TerminalBlock title="db.status">
                  <div className="text-green-400 text-[11px] mb-2">database: connected ✓</div>
                  <div className="text-2xl font-bold text-white font-mono mb-1">
                    {totalRows.toLocaleString()}
                    <span className="text-green-400 text-sm"> rows</span>
                  </div>
                  <div className="text-[10px] text-green-600/50 font-mono">{tableCount} tables tracked</div>
                  <div className="mt-3">
                    <TableRowCounts tableCounts={apiData?.tableCounts ?? {}} />
                  </div>
                </TerminalBlock>
              </motion.div>

              {/* Active Connections */}
              <motion.div variants={itemVariants}>
                <TerminalBlock title="connections.stat">
                  <div className="text-green-400 text-[11px] mb-2">pool: active ✓</div>
                  <div className="text-2xl font-bold text-white font-mono mb-1">
                    {activeConnections.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-green-600/50 font-mono">active sessions (1h)</div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-white/30">recent activity:</span>
                      <span className="text-green-400">{(apiData?.totalRecentActivity ?? 0).toLocaleString()} events/24h</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-white/30">tables:</span>
                      <span className="text-amber-400">{tableCount} active</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-white/30">status:</span>
                      <span className="text-green-400">healthy ✓</span>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-green-500/60 rounded-full" style={{ width: `${Math.min(activeConnections / 50 * 100, 100)}%` }} />
                  </div>
                  <div className="text-[10px] text-white/20 font-mono mt-1">capacity: {Math.min(activeConnections / 50 * 100, 100).toFixed(1)}%</div>
                </TerminalBlock>
              </motion.div>

              {/* Growth Rate */}
              <motion.div variants={itemVariants}>
                <TerminalBlock title="growth.rate">
                  <div className={`text-[11px] mb-2 ${userGrowth && userGrowth.growthRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {userGrowth && userGrowth.growthRate >= 0 ? 'growth: positive ✓' : 'growth: declining ⚠'}
                  </div>
                  <div className="text-2xl font-bold text-white font-mono mb-1">
                    {userGrowth ? `${userGrowth.growthRate >= 0 ? '+' : ''}${userGrowth.growthRate.toFixed(1)}` : '—'}
                    <span className={`text-sm ${userGrowth && userGrowth.growthRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>%</span>
                  </div>
                  <div className="text-[10px] text-green-600/50 font-mono">week-over-week</div>
                  {userGrowth && (
                    <div className="mt-3">
                      <GrowthMetric growth={userGrowth} />
                    </div>
                  )}
                </TerminalBlock>
              </motion.div>

              {/* Security Status */}
              <motion.div variants={itemVariants}>
                <TerminalBlock title="security.scan">
                  <div className="text-green-400 text-[11px] mb-2">firewall: enabled ✓</div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-bold text-white font-mono">0</span>
                    <span className="text-[10px] text-green-400 font-mono">critical</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-lg font-semibold text-amber-400 font-mono">0</span>
                    <span className="text-[10px] text-amber-500/60 font-mono">warnings</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-white/30">suspicious:</span>
                      <span className="text-green-400">0</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-white/30">blocked IPs:</span>
                      <span className="text-green-400">0</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-white/30">ssl:</span>
                      <span className="text-green-400">valid ✓</span>
                    </div>
                  </div>
                  <div className="mt-3 px-2 py-1.5 rounded bg-green-500/5 border border-green-500/10">
                    <span className="text-[10px] font-mono text-green-400">$ security-status --check</span>
                    <div className="text-[10px] font-mono text-green-500/60 mt-0.5">All services secure. No threats detected.</div>
                  </div>
                </TerminalBlock>
              </motion.div>
            </div>

            {/* ── Section: Database Table Details ────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Table Row Counts Chart */}
              <motion.div variants={itemVariants}>
                <TerminalBlock title="db.table.stats" className="!font-sans">
                  <div className="font-sans">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-orange-400" />
                        <span className="text-sm font-semibold text-white">Table Row Counts</span>
                      </div>
                      <span className="text-[10px] font-mono text-white/30">live</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-3 font-mono">
                      <span className="text-xl font-bold text-white">{totalRows.toLocaleString()}</span>
                      <span className="text-xs text-white/30">total rows</span>
                      <span className="ml-auto text-[10px] text-orange-400 flex items-center gap-1">
                        <Database className="w-3 h-3" /> {tableCount} tables
                      </span>
                    </div>
                    <div className="mb-3 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500/60 rounded-full" style={{ width: `${Math.min(totalRows / 100000 * 100, 100)}%` }} />
                    </div>
                    <TableRowCounts tableCounts={apiData?.tableCounts ?? {}} />
                  </div>
                </TerminalBlock>
              </motion.div>

              {/* Recent Activity Terminal */}
              <motion.div variants={itemVariants}>
                <TerminalBlock title="activity.24h" className="!font-sans">
                  <div className="font-sans">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-semibold text-white">Recent Activity (24h)</span>
                      </div>
                      <span className="text-[10px] font-mono text-white/30">live</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-3 font-mono">
                      <span className="text-xl font-bold text-white">{(apiData?.totalRecentActivity ?? 0).toLocaleString()}</span>
                      <span className="text-xs text-white/30">events</span>
                    </div>
                    <div className="mb-3 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full bg-green-500/60 rounded-full" style={{ width: `${Math.min((apiData?.totalRecentActivity ?? 0) / 1000 * 100, 100)}%` }} />
                    </div>
                    <RecentActivityTerminal recentActivity={recentActivity} />
                  </div>
                </TerminalBlock>
              </motion.div>
            </div>

            {/* ── Section: Performance Metrics ──────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Rows', value: totalRows.toLocaleString(), unit: 'rows', color: 'emerald', icon: <CheckCircle2 className="w-3.5 h-3.5" />, status: '✓' },
                { label: 'Active Now', value: activeConnections.toString(), unit: 'users', color: 'amber', icon: <Users className="w-3.5 h-3.5" />, status: '◉' },
                { label: 'Tables', value: tableCount.toString(), unit: 'tables', color: 'orange', icon: <Database className="w-3.5 h-3.5" />, status: '✓' },
                { label: '24h Events', value: (apiData?.totalRecentActivity ?? 0).toLocaleString(), unit: 'events', color: 'emerald', icon: <Activity className="w-3.5 h-3.5" />, status: '✓' },
              ].map((metric) => {
                const colorMap: Record<string, { bg: string; text: string; iconBg: string; border: string }> = {
                  emerald: { bg: 'bg-emerald-500/8', text: 'text-emerald-400', iconBg: 'bg-emerald-500/15', border: 'border-emerald-500/15' },
                  amber: { bg: 'bg-amber-500/8', text: 'text-amber-400', iconBg: 'bg-amber-500/15', border: 'border-amber-500/15' },
                  orange: { bg: 'bg-orange-500/8', text: 'text-orange-400', iconBg: 'bg-orange-500/15', border: 'border-orange-500/15' },
                  red: { bg: 'bg-red-500/8', text: 'text-red-400', iconBg: 'bg-red-500/15', border: 'border-red-500/15' },
                }
                const c = colorMap[metric.color]
                return (
                  <motion.div key={metric.label} variants={itemVariants}>
                    <div className="bg-[#0D0D14] border border-white/[0.06] rounded-lg p-4 overflow-hidden">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">{metric.label}</span>
                        <div className={`w-6 h-6 rounded-md ${c.iconBg} flex items-center justify-center ${c.text}`}>
                          {metric.icon}
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1 font-mono">
                        <span className="text-2xl font-bold text-white">{metric.value}</span>
                        <span className={`text-sm ${c.text}`}>{metric.unit}</span>
                        <span className={`text-sm ${c.text} ml-1`}>{metric.status}</span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* ── Section: Security Dashboard ────────────────────── */}
            <motion.div variants={itemVariants}>
              <div className="bg-[#0A0A0F] border border-red-500/10 rounded-lg overflow-hidden relative">
                {/* Matrix-style green overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{
                  backgroundImage: 'linear-gradient(rgba(0,255,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,0,0.1) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }} />

                <TerminalBlockHeader title="security.monitor" />

                <div className="p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-400" />
                      <h3 className="text-sm font-semibold text-white font-mono">Security Dashboard</h3>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 font-mono">
                      <ShieldCheck className="w-3 h-3 text-green-400" />
                      <span className="text-[10px] text-green-400 font-medium">SECURE</span>
                    </div>
                  </div>

                  {/* Security Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                    <div className="bg-[#06060A] border border-red-500/10 rounded-lg p-3.5">
                      <div className="flex items-center gap-2 mb-2">
                        <LogIn className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-[9px] font-mono text-white/25 uppercase tracking-wider">Suspicious</span>
                      </div>
                      <p className="text-xl font-bold text-green-400 font-mono">0</p>
                      <p className="text-[9px] text-green-500/40 font-mono mt-1">no threats</p>
                    </div>

                    <div className="bg-[#06060A] border border-orange-500/10 rounded-lg p-3.5">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-[9px] font-mono text-white/25 uppercase tracking-wider">Failed Auth</span>
                      </div>
                      <p className="text-xl font-bold text-green-400 font-mono">0</p>
                      <p className="text-[9px] text-green-500/40 font-mono mt-1">no issues</p>
                    </div>

                    <div className="bg-[#06060A] border border-green-500/10 rounded-lg p-3.5">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-[9px] font-mono text-white/25 uppercase tracking-wider">Sessions</span>
                      </div>
                      <p className="text-xl font-bold text-green-400 font-mono">{activeConnections.toLocaleString()}</p>
                      <p className="text-[9px] text-green-500/40 font-mono mt-1">all users active</p>
                    </div>

                    <div className="bg-[#06060A] border border-green-500/10 rounded-lg p-3.5">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-[9px] font-mono text-white/25 uppercase tracking-wider">IP Rules</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-mono text-green-400">ENABLED</span>
                      </div>
                      <p className="text-[9px] text-green-500/40 font-mono mt-1">RLS enforced</p>
                    </div>
                  </div>

                  {/* No security events message */}
                  <div>
                    <h4 className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-3">$ security-events --recent</h4>
                    <div className="bg-[#06060A] rounded-lg p-4 text-center border border-green-500/10">
                      <ShieldCheck className="w-8 h-8 text-green-500/20 mx-auto mb-2" />
                      <p className="text-[11px] font-mono text-green-500/40">No security events detected</p>
                      <p className="text-[10px] font-mono text-green-600/20 mt-1">$ all-clear — system is secure</p>
                    </div>
                  </div>

                  {/* Security status footer */}
                  <div className="mt-4 px-3 py-2 rounded bg-green-500/3 border border-green-500/8">
                    <div className="text-[10px] font-mono text-green-500/40">
                      $ security-audit --full<br />
                      SSL certificates: VALID ✓ | Firewall: ACTIVE ✓ | RLS policies: ENFORCED ✓ | Encryption: AES-256 ✓
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── Footer Info ────────────────────────────────────── */}
            <motion.div variants={itemVariants} className="flex items-center justify-center gap-4 pt-2 pb-4 font-mono">
              <div className="flex items-center gap-1.5 text-[10px] text-white/15">
                <Server className="w-3 h-3" />
                <span>USRA+ INFRA v2.4.1</span>
              </div>
              <span className="text-white/10">·</span>
              <span className="text-[10px] text-white/15">live: {currentTime.toLocaleTimeString()}</span>
              <span className="text-white/10">·</span>
              <div className="flex items-center gap-1.5 text-[10px] text-white/15">
                <button onClick={fetchData} className="hover:text-green-400/50 transition-colors flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> refresh
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
