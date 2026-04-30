'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Activity, Clock, Wifi, ShieldAlert, Database, HardDrive,
  TrendingUp, TrendingDown, AlertTriangle, AlertCircle, Info,
  Search, Filter, Shield, ShieldCheck, Lock, LogIn, Users,
  Globe, ChevronRight, Zap, Server, Terminal, CheckCircle2, XCircle
} from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import type { ErrorLog } from '@/types/admin'

// ─── Demo Data ───────────────────────────────────────────────────────

const UPTIME_DAYS = Array.from({ length: 90 }, (_, i) => ({
  day: i + 1,
  uptime: i === 55 ? 98.2 : i === 66 ? 99.1 : i === 72 ? 99.4 : 99.97 + Math.random() * 0.03,
  isDowntime: i === 55 || i === 66 || i === 72,
}))

const DB_SIZE_DATA = Array.from({ length: 30 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - (29 - i))
  return {
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    size: 2.4 - (29 - i) * 0.05 + Math.random() * 0.02,
  }
})

const STORAGE_DATA = Array.from({ length: 30 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - (29 - i))
  return {
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    usage: 4.7 - (29 - i) * 0.06 + Math.random() * 0.05,
  }
})

const API_REQUEST_DATA = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0') + ':00'
  const isPeak = i >= 9 && i <= 12
  const isLow = i >= 0 && i <= 5
  return {
    hour,
    requests: isPeak
      ? 3500 + Math.floor(Math.random() * 1500)
      : isLow
        ? 400 + Math.floor(Math.random() * 300)
        : 1200 + Math.floor(Math.random() * 1500),
  }
})

const ERROR_LOGS: ErrorLog[] = [
  { id: 'err-1', level: 'critical', message: 'Database connection pool exhausted', source: 'db-connector', count: 1, lastOccurrence: '2 hours ago' },
  { id: 'err-2', level: 'error', message: 'Failed to process payment webhook', source: 'payment-service', count: 3, lastOccurrence: '45 min ago' },
  { id: 'err-3', level: 'warning', message: 'High memory usage on worker node 3', source: 'infra-monitor', count: 12, lastOccurrence: '10 min ago' },
  { id: 'err-4', level: 'warning', message: 'Rate limit exceeded for /api/v2/search', source: 'api-gateway', count: 47, lastOccurrence: '5 min ago' },
  { id: 'err-5', level: 'error', message: 'Supabase realtime connection dropped', source: 'realtime-service', count: 2, lastOccurrence: '1 hour ago' },
  { id: 'err-6', level: 'warning', message: 'Slow query detected: family_members join', source: 'db-query-analyzer', count: 23, lastOccurrence: '15 min ago' },
  { id: 'err-7', level: 'warning', message: 'CDN cache miss rate above 30%', source: 'cdn-monitor', count: 8, lastOccurrence: '30 min ago' },
  { id: 'err-8', level: 'error', message: 'Email delivery failed for 3 users', source: 'email-service', count: 3, lastOccurrence: '2 hours ago' },
  { id: 'err-9', level: 'warning', message: 'Storage upload queue backlog: 15 files', source: 'storage-service', count: 5, lastOccurrence: '20 min ago' },
  { id: 'err-10', level: 'warning', message: 'WebSocket reconnection spike detected', source: 'ws-gateway', count: 14, lastOccurrence: '8 min ago' },
]

const SECURITY_EVENTS = [
  { id: 'se-1', type: 'suspicious_login', message: 'Login attempt from unusual location (Lagos, Nigeria)', time: '12 min ago', severity: 'high' },
  { id: 'se-2', type: 'failed_auth', message: 'Multiple failed auth attempts for user ahmed@example.com', time: '28 min ago', severity: 'medium' },
  { id: 'se-3', type: 'suspicious_login', message: 'Login from new device for admin@usraplus.com', time: '1 hour ago', severity: 'low' },
  { id: 'se-4', type: 'ip_blocked', message: 'IP 192.168.45.102 blocked after 10 failed attempts', time: '2 hours ago', severity: 'medium' },
  { id: 'se-5', type: 'suspicious_login', message: 'Login attempt from VPN endpoint for user noura@example.com', time: '3 hours ago', severity: 'high' },
]

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

// ─── Custom Tooltip ──────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0A0A0F] border border-orange-500/20 rounded-lg px-3 py-2 shadow-xl font-mono">
      <p className="text-[11px] text-orange-400/60 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-medium text-orange-300">
          <span style={{ color: p.color }}>●</span>{' '}
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(p.value < 10 ? 2 : 0) : p.value}
        </p>
      ))}
    </div>
  )
}

// ─── Git Commit Graph Uptime ────────────────────────────────────────

function GitCommitUptime() {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-[10px] font-mono text-white/30 mb-1">
        <span>90 days ago</span>
        <div className="flex-1" />
        <span>today</span>
      </div>
      {/* 9 rows of 10 squares */}
      <div className="space-y-[3px]">
        {Array.from({ length: 9 }, (_, row) => (
          <div key={row} className="flex gap-[3px]">
            {UPTIME_DAYS.slice(row * 10, (row + 1) * 10).map((day) => (
              <div
                key={day.day}
                className="w-[10px] h-[10px] rounded-[2px] transition-all hover:scale-125 hover:ring-1 hover:ring-white/20"
                style={{
                  backgroundColor: day.isDowntime
                    ? '#EF4444'
                    : day.uptime >= 99.95
                      ? '#22C55E'
                      : day.uptime >= 99.5
                        ? '#F97316'
                        : '#EAB308',
                }}
                title={`Day ${day.day}: ${day.uptime.toFixed(2)}%`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10px] font-mono">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-[1px] bg-green-500" /> Operational</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-[1px] bg-orange-500" /> Degraded</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-[1px] bg-red-500" /> Down</span>
      </div>
    </div>
  )
}

// ─── Terminal Log Line ───────────────────────────────────────────────

function TerminalLogLine({ log }: { log: ErrorLog }) {
  const levelConfig: Record<string, { color: string; prefix: string }> = {
    critical: { color: 'text-red-400', prefix: 'CRITICAL' },
    error: { color: 'text-orange-400', prefix: 'ERROR   ' },
    warning: { color: 'text-amber-400', prefix: 'WARNING ' },
  }
  const config = levelConfig[log.level] || levelConfig.warning
  const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) + ' ' + log.lastOccurrence

  return (
    <div className="flex items-start gap-0 py-1 hover:bg-white/[0.02] transition-colors leading-relaxed">
      <span className="text-green-600/40 text-[11px] shrink-0 w-28">{timestamp}</span>
      <span className={`${config.color} text-[11px] font-bold shrink-0 w-20`}>[{config.prefix}]</span>
      <span className="text-white/50 text-[11px] flex-1 truncate">{log.message}</span>
      <span className="text-white/20 text-[11px] shrink-0 hidden sm:inline">src={log.source}</span>
      <span className="text-white/20 text-[11px] shrink-0 w-10 text-right">×{log.count}</span>
    </div>
  )
}

// ─── Security Event in Terminal Style ────────────────────────────────

function SecurityEventIcon({ type }: { type: string }) {
  switch (type) {
    case 'suspicious_login':
      return <LogIn className="w-3.5 h-3.5 text-red-400" />
    case 'failed_auth':
      return <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
    case 'ip_blocked':
      return <Lock className="w-3.5 h-3.5 text-amber-400" />
    default:
      return <Shield className="w-3.5 h-3.5 text-white/40" />
  }
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

// ─── Main Component ──────────────────────────────────────────────────

export function AdminInfrastructure() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLevel, setFilterLevel] = useState<'all' | 'critical' | 'error' | 'warning'>('all')

  const filteredLogs = useMemo(() => {
    let logs = ERROR_LOGS
    if (filterLevel !== 'all') {
      logs = logs.filter((l) => l.level === filterLevel)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      logs = logs.filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          l.source.toLowerCase().includes(q)
      )
    }
    return logs
  }, [searchQuery, filterLevel])

  const avgApiRequests = Math.round(API_REQUEST_DATA.reduce((s, d) => s + d.requests, 0) / API_REQUEST_DATA.length)
  const peakApiRequests = Math.max(...API_REQUEST_DATA.map((d) => d.requests))

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
            <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-red-500/10 text-red-400 border border-red-500/20">Simulated</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-mono text-green-400/70">connected</span>
          </div>
        </div>
        <TerminalHeader />
      </motion.div>

      {/* ── Section: System Health — Terminal Blocks ─────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Uptime */}
        <motion.div variants={itemVariants}>
          <TerminalBlock title="uptime.monitor">
            <div className="text-green-400 text-[11px] mb-2">system: operational ✓</div>
            <div className="text-2xl font-bold text-white font-mono mb-1">
              99.97<span className="text-green-400 text-sm">%</span>
            </div>
            <div className="text-[10px] text-green-600/50 font-mono">uptime: 30d avg</div>
            <div className="mt-3">
              <GitCommitUptime />
            </div>
          </TerminalBlock>
        </motion.div>

        {/* Avg Response Time */}
        <motion.div variants={itemVariants}>
          <TerminalBlock title="latency.check">
            <div className="text-green-400 text-[11px] mb-2">response: healthy ✓</div>
            <div className="text-2xl font-bold text-white font-mono mb-1">
              142<span className="text-orange-400 text-sm">ms</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-green-600/50 font-mono">
              <TrendingDown className="w-3 h-3 text-green-500" />
              trend: -12ms ↓
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-white/30">p50:</span>
                <span className="text-green-400">89ms ✓</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-white/30">p95:</span>
                <span className="text-amber-400">234ms ⚠</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-white/30">p99:</span>
                <span className="text-red-400">567ms ✗</span>
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div className="h-full bg-orange-500/60 rounded-full" style={{ width: '28%' }} />
            </div>
            <div className="text-[10px] text-white/20 font-mono mt-1">threshold: 500ms</div>
          </TerminalBlock>
        </motion.div>

        {/* Active Connections */}
        <motion.div variants={itemVariants}>
          <TerminalBlock title="connections.stat">
            <div className="text-green-400 text-[11px] mb-2">pool: active ✓</div>
            <div className="text-2xl font-bold text-white font-mono mb-1">1,247</div>
            <div className="text-[10px] text-green-600/50 font-mono">total connections</div>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-white/30">active:</span>
                <span className="text-green-400">1,198</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-white/30">idle:</span>
                <span className="text-amber-400">49</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-white/30">max:</span>
                <span className="text-white/40">5,000</span>
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div className="h-full bg-green-500/60 rounded-full" style={{ width: '24.9%' }} />
            </div>
            <div className="text-[10px] text-white/20 font-mono mt-1">capacity: 24.9%</div>
          </TerminalBlock>
        </motion.div>

        {/* Security Alerts */}
        <motion.div variants={itemVariants}>
          <TerminalBlock title="security.scan">
            <div className="text-green-400 text-[11px] mb-2">firewall: enabled ✓</div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold text-white font-mono">0</span>
              <span className="text-[10px] text-red-400 font-mono">critical</span>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-lg font-semibold text-amber-400 font-mono">3</span>
              <span className="text-[10px] text-amber-500/60 font-mono">warnings</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-white/30">suspicious:</span>
                <span className="text-red-400">3</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-white/30">blocked IPs:</span>
                <span className="text-orange-400">12</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-white/30">ssl:</span>
                <span className="text-green-400">valid ✓</span>
              </div>
            </div>
            <div className="mt-3 px-2 py-1.5 rounded bg-green-500/5 border border-green-500/10">
              <span className="text-[10px] font-mono text-green-400">$ security-status --check</span>
              <div className="text-[10px] font-mono text-green-500/60 mt-0.5">All services secure. No critical threats.</div>
            </div>
          </TerminalBlock>
        </motion.div>
      </div>

      {/* ── Section: Database Metrics ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* DB Size Chart */}
        <motion.div variants={itemVariants}>
          <TerminalBlock title="db.size.history" className="!font-sans">
            <div className="font-sans">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-semibold text-white">Database Size</span>
                </div>
                <span className="text-[10px] font-mono text-white/30">30d</span>
              </div>
              <div className="flex items-baseline gap-2 mb-1 font-mono">
                <span className="text-xl font-bold text-white">2.4 GB</span>
                <span className="text-xs text-white/30">/ 10 GB</span>
                <span className="ml-auto text-[10px] text-orange-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> +50MB/d
                </span>
              </div>
              <div className="mb-3 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="h-full bg-orange-500/60 rounded-full" style={{ width: '24%' }} />
              </div>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={DB_SIZE_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }} interval={6} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }} domain={[0.5, 3]} axisLine={false} tickLine={false} unit=" GB" />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="size" name="DB Size" stroke="#F97316" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#F97316' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TerminalBlock>
        </motion.div>

        {/* Storage Usage Chart */}
        <motion.div variants={itemVariants}>
          <TerminalBlock title="storage.usage.history" className="!font-sans">
            <div className="font-sans">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-semibold text-white">Storage Usage</span>
                </div>
                <span className="text-[10px] font-mono text-white/30">30d</span>
              </div>
              <div className="flex items-baseline gap-2 mb-1 font-mono">
                <span className="text-xl font-bold text-white">4.7 GB</span>
                <span className="text-xs text-white/30">/ 50 GB</span>
                <span className="ml-auto text-[10px] text-red-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> +60MB/d
                </span>
              </div>
              <div className="mb-3 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="h-full bg-red-500/50 rounded-full" style={{ width: '9.4%' }} />
              </div>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={STORAGE_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }} interval={6} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }} domain={[2, 6]} axisLine={false} tickLine={false} unit=" GB" />
                    <Tooltip content={<CustomTooltip />} />
                    <defs>
                      <linearGradient id="storageGradInfra" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="usage" name="Storage" stroke="#EF4444" strokeWidth={2} fill="url(#storageGradInfra)" dot={false} activeDot={{ r: 4, fill: '#EF4444' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TerminalBlock>
        </motion.div>
      </div>

      {/* ── Section: API Request Volume ────────────────────────── */}
      <motion.div variants={itemVariants}>
        <TerminalBlock title="api.traffic.volume" className="!font-sans">
          <div className="font-sans">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-semibold text-white">API Request Volume</h3>
              </div>
              <span className="text-[10px] font-mono text-white/30">24h</span>
            </div>
            <div className="flex items-center gap-6 mb-4 font-mono">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-white">{avgApiRequests.toLocaleString()}</span>
                <span className="text-[10px] text-white/30">avg/hr</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-semibold text-red-400">{peakApiRequests.toLocaleString()}</span>
                <span className="text-[10px] text-white/30">peak</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-semibold text-white/50">~45K</span>
                <span className="text-[10px] text-white/30">total/day</span>
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={API_REQUEST_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }} interval={2} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <defs>
                    <linearGradient id="barGradInfra" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F97316" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="requests" name="Requests" fill="url(#barGradInfra)" radius={[3, 3, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TerminalBlock>
      </motion.div>

      {/* ── Section: Error Logs — Terminal Style ──────────────── */}
      <motion.div variants={itemVariants}>
        <div className="bg-[#0A0A0F] border border-red-500/10 rounded-lg overflow-hidden relative">
          {/* Scan line overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
          }} />
          
          <TerminalBlockHeader title="error.log — live" />
          
          <div className="p-4">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-white font-mono">Error Logs</span>
                <span className="text-[10px] font-mono text-white/20">{filteredLogs.length} entries</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-green-600/30" />
                  <input
                    type="text"
                    placeholder="grep..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 pr-3 py-1.5 bg-[#06060A] border border-white/[0.04] rounded text-[11px] text-green-400 placeholder-green-800/40 focus:outline-none focus:border-red-500/30 font-mono w-32"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Filter className="w-3 h-3 text-green-600/30" />
                  {(['all', 'critical', 'error', 'warning'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setFilterLevel(level)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all ${
                        filterLevel === level
                          ? level === 'critical'
                            ? 'bg-red-500/15 text-red-400'
                            : level === 'error'
                              ? 'bg-orange-500/15 text-orange-400'
                              : level === 'warning'
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-white/[0.06] text-white/60'
                          : 'text-white/20 hover:text-white/40'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Terminal Log Output */}
            <div className="bg-[#06060A] rounded-lg p-3 max-h-80 overflow-y-auto custom-scrollbar" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,255,0,0.01) 1px, rgba(0,255,0,0.01) 2px)',
            }}>
              <div className="text-[10px] font-mono text-green-600/30 mb-2">$ tail -f /var/log/usra/error.log | grep -E "CRITICAL|ERROR|WARNING"</div>
              {filteredLogs.map((log) => (
                <TerminalLogLine key={log.id} log={log} />
              ))}
              {filteredLogs.length === 0 && (
                <div className="text-center py-6 text-green-600/30 text-[11px] font-mono">$ no matching logs found</div>
              )}
              <div className="text-[10px] font-mono text-green-600/20 mt-2">-- end of log --</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Section: Performance Metrics ───────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'P50 Latency', value: '89', unit: 'ms', color: 'emerald', icon: <CheckCircle2 className="w-3.5 h-3.5" />, status: '✓' },
          { label: 'P95 Latency', value: '234', unit: 'ms', color: 'amber', icon: <AlertTriangle className="w-3.5 h-3.5" />, status: '⚠' },
          { label: 'P99 Latency', value: '567', unit: 'ms', color: 'red', icon: <XCircle className="w-3.5 h-3.5" />, status: '✗' },
          { label: 'Error Rate', value: '0.12', unit: '%', color: 'orange', icon: <AlertCircle className="w-3.5 h-3.5" />, status: '⚠' },
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

      {/* ── Section: Security Dashboard ────────────────────────── */}
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
                  <LogIn className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[9px] font-mono text-white/25 uppercase tracking-wider">Suspicious</span>
                </div>
                <p className="text-xl font-bold text-red-400 font-mono">3</p>
                <p className="text-[9px] text-red-500/40 font-mono mt-1">unusual locations</p>
              </div>

              <div className="bg-[#06060A] border border-orange-500/10 rounded-lg p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-[9px] font-mono text-white/25 uppercase tracking-wider">Failed Auth</span>
                </div>
                <p className="text-xl font-bold text-orange-400 font-mono">47</p>
                <p className="text-[9px] text-orange-500/40 font-mono mt-1">12 IPs blocked</p>
              </div>

              <div className="bg-[#06060A] border border-green-500/10 rounded-lg p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-[9px] font-mono text-white/25 uppercase tracking-wider">Sessions</span>
                </div>
                <p className="text-xl font-bold text-green-400 font-mono">1,247</p>
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
                <p className="text-[9px] text-green-500/40 font-mono mt-1">3 whitelist rules</p>
              </div>
            </div>

            {/* Red alert banner for suspicious activity */}
            {SECURITY_EVENTS.some(e => e.severity === 'high') && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/20 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-[11px] text-red-300 font-mono">SECURITY ALERT: {SECURITY_EVENTS.filter(e => e.severity === 'high').length} high-severity events detected in the last 3 hours</span>
              </div>
            )}

            {/* Recent Security Events */}
            <div>
              <h4 className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-3">$ security-events --recent</h4>
              <div className="space-y-2">
                {SECURITY_EVENTS.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-[#06060A] border border-white/[0.03] hover:border-red-500/15 transition-colors group font-mono"
                  >
                    <div className="shrink-0">
                      <SecurityEventIcon type={event.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-white/60 truncate">{event.message}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${event.severity === 'high' ? 'bg-red-400 animate-pulse' : event.severity === 'medium' ? 'bg-orange-400' : 'bg-amber-400'}`} />
                      <span className="text-[9px] text-white/20">{event.time}</span>
                      <ChevronRight className="w-3 h-3 text-white/10 group-hover:text-red-400/50 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Matrix-style green status footer */}
            <div className="mt-4 px-3 py-2 rounded bg-green-500/3 border border-green-500/8">
              <div className="text-[10px] font-mono text-green-500/40">
                $ security-audit --full<br />
                SSL certificates: VALID ✓ | Firewall: ACTIVE ✓ | RLS policies: ENFORCED ✓ | Encryption: AES-256 ✓
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Footer Info ────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center justify-center gap-4 pt-2 pb-4 font-mono">
        <div className="flex items-center gap-1.5 text-[10px] text-white/15">
          <Server className="w-3 h-3" />
          <span>USRA+ INFRA v2.4.1</span>
        </div>
        <span className="text-white/10">·</span>
        <span className="text-[10px] text-white/15">refresh: 30s</span>
        <span className="text-white/10">·</span>
        <span className="text-[10px] text-white/15">region: ME-South (Bahrain)</span>
        <span className="text-white/10">·</span>
        <span className="text-[10px] text-white/15">pid: 48291</span>
      </motion.div>
    </motion.div>
  )
}
