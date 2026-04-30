'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Activity, Clock, Wifi, ShieldAlert, Database, HardDrive,
  TrendingUp, TrendingDown, AlertTriangle, AlertCircle, Info,
  Search, Filter, Shield, ShieldCheck, Lock, LogIn, Users,
  Globe, ChevronRight, Zap, Server
} from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import type { ErrorLog } from '@/types/admin'

// ─── Demo Data ───────────────────────────────────────────────────────

const UPTIME_DAYS = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  uptime: i === 18 ? 98.2 : i === 22 ? 99.1 : 99.97 + Math.random() * 0.03,
  isDowntime: i === 18 || i === 22,
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

// ─── Custom Tooltip ──────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a24] border border-white/[0.08] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-white/50 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-medium text-white/90">
          <span style={{ color: p.color }}>●</span>{' '}
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(p.value < 10 ? 2 : 0) : p.value}
        </p>
      ))}
    </div>
  )
}

// ─── Uptime Bar ──────────────────────────────────────────────────────

function UptimeBar() {
  return (
    <div className="flex gap-[2px] items-end h-8">
      {UPTIME_DAYS.map((day) => (
        <div
          key={day.day}
          className="flex-1 rounded-[2px] transition-all hover:scale-y-110"
          style={{
            height: `${(day.uptime / 100) * 100}%`,
            backgroundColor: day.isDowntime
              ? 'rgba(239, 68, 68, 0.8)'
              : day.uptime >= 99.95
                ? 'rgba(34, 197, 94, 0.7)'
                : 'rgba(234, 179, 8, 0.7)',
            minWidth: 0,
          }}
          title={`Day ${day.day}: ${day.uptime.toFixed(2)}%`}
        />
      ))}
    </div>
  )
}

// ─── Level Badge ─────────────────────────────────────────────────────

function LevelBadge({ level }: { level: ErrorLog['level'] }) {
  const config = {
    critical: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/20', icon: <AlertCircle className="w-3 h-3" /> },
    error: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/20', icon: <AlertTriangle className="w-3 h-3" /> },
    warning: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20', icon: <Info className="w-3 h-3" /> },
  }
  const c = config[level]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${c.bg} ${c.text} border ${c.border}`}>
      {c.icon}
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  )
}

// ─── Security Event Icon ─────────────────────────────────────────────

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

function SecuritySeverityDot({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    high: 'bg-red-400',
    medium: 'bg-orange-400',
    low: 'bg-amber-400',
  }
  return <span className={`w-2 h-2 rounded-full ${colors[severity] || 'bg-white/30'}`} />
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
      {/* ── Section: System Health ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Uptime */}
        <motion.div variants={itemVariants} className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Uptime</span>
            </div>
            <span className="text-[10px] text-white/20">30 days</span>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">99.97<span className="text-lg text-emerald-400">%</span></p>
          <div className="mt-3">
            <UptimeBar />
          </div>
          <p className="text-[11px] text-white/30 mt-2">Last downtime 12 days ago · 8 min</p>
        </motion.div>

        {/* Avg Response Time */}
        <motion.div variants={itemVariants} className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Avg Response</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-400">
              <TrendingDown className="w-3 h-3" />
              <span className="text-[11px] font-medium">-12ms</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">142<span className="text-lg text-white/40">ms</span></p>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500/60 rounded-full" style={{ width: '28%' }} />
            </div>
            <span className="text-[10px] text-white/30">/ 500ms</span>
          </div>
          <p className="text-[11px] text-white/30 mt-2">Within normal range · P95 at 234ms</p>
        </motion.div>

        {/* Active Connections */}
        <motion.div variants={itemVariants} className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Wifi className="w-4 h-4 text-violet-400" />
              </div>
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Connections</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-400">
              <TrendingUp className="w-3 h-3" />
              <span className="text-[11px] font-medium">+84</span>
            </div>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">1,247</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-white/40">1,198 active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[11px] text-white/40">49 idle</span>
            </div>
          </div>
          <p className="text-[11px] text-white/30 mt-2">Max capacity: 5,000</p>
        </motion.div>

        {/* Security Alerts */}
        <motion.div variants={itemVariants} className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Security</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Healthy</span>
          </div>
          <div className="flex items-baseline gap-3">
            <p className="text-3xl font-bold text-white tracking-tight">0</p>
            <span className="text-xs text-white/30">critical</span>
            <span className="text-white/10">·</span>
            <p className="text-xl font-semibold text-amber-400">3</p>
            <span className="text-xs text-white/30">warnings</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/15">
              <AlertCircle className="w-2.5 h-2.5" /> 0 Critical
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/15">
              <AlertTriangle className="w-2.5 h-2.5" /> 3 Warnings
            </span>
          </div>
          <p className="text-[11px] text-white/30 mt-2">All services secure</p>
        </motion.div>
      </div>

      {/* ── Section: Database Metrics ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* DB Size Chart */}
        <motion.div variants={itemVariants} className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Database Size</h3>
            </div>
            <span className="text-xs text-white/30">Last 30 days</span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold text-white">2.4 GB</span>
            <span className="text-sm text-white/30">/ 10 GB</span>
            <span className="ml-auto text-[11px] text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +50 MB/day
            </span>
          </div>
          <div className="mb-4 h-2 bg-white/[0.04] rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500/60 rounded-full transition-all" style={{ width: '24%' }} />
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DB_SIZE_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} interval={6} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} domain={[0.5, 3]} axisLine={false} tickLine={false} unit=" GB" />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="size" name="DB Size" stroke="#6366F1" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#6366F1' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Storage Usage Chart */}
        <motion.div variants={itemVariants} className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-semibold text-white">Storage Usage</h3>
            </div>
            <span className="text-xs text-white/30">Last 30 days</span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold text-white">4.7 GB</span>
            <span className="text-sm text-white/30">/ 50 GB</span>
            <span className="ml-auto text-[11px] text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +60 MB/day
            </span>
          </div>
          <div className="mb-4 h-2 bg-white/[0.04] rounded-full overflow-hidden">
            <div className="h-full bg-violet-500/60 rounded-full transition-all" style={{ width: '9.4%' }} />
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={STORAGE_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} interval={6} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} domain={[2, 6]} axisLine={false} tickLine={false} unit=" GB" />
                <Tooltip content={<CustomTooltip />} />
                <defs>
                  <linearGradient id="storageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="usage" name="Storage" stroke="#8B5CF6" strokeWidth={2} fill="url(#storageGrad)" dot={false} activeDot={{ r: 4, fill: '#8B5CF6' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* ── Section: API Request Volume ────────────────────────── */}
      <motion.div variants={itemVariants} className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">API Request Volume</h3>
          </div>
          <span className="text-xs text-white/30">Last 24 hours</span>
        </div>
        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white">{(avgApiRequests).toLocaleString()}</span>
            <span className="text-xs text-white/30">avg/hr</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold text-amber-400">{(peakApiRequests).toLocaleString()}</span>
            <span className="text-xs text-white/30">peak</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold text-white/60">~45K</span>
            <span className="text-xs text-white/30">total/day</span>
          </div>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={API_REQUEST_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} interval={2} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="requests" name="Requests" fill="#22C55E" radius={[4, 4, 0, 0]} maxBarSize={28} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── Section: Error Logs ────────────────────────────────── */}
      <motion.div variants={itemVariants} className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Error Logs</h3>
            <span className="text-xs text-white/30 ml-1">{filteredLogs.length} entries</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#0B0B0F] border border-white/[0.06] rounded-lg text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/[0.12] w-40"
              />
            </div>
            {/* Filter */}
            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-white/20" />
              {(['all', 'critical', 'error', 'warning'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setFilterLevel(level)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                    filterLevel === level
                      ? 'bg-white/[0.08] text-white/80'
                      : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03]'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2.5 px-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Level</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Message</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-medium text-white/30 uppercase tracking-wider hidden sm:table-cell">Source</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Count</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-medium text-white/30 uppercase tracking-wider hidden md:table-cell">Last Occurrence</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3">
                    <LevelBadge level={log.level} />
                  </td>
                  <td className="py-2.5 px-3 text-white/70 text-xs max-w-xs truncate">{log.message}</td>
                  <td className="py-2.5 px-3 text-white/40 text-xs font-mono hidden sm:table-cell">{log.source}</td>
                  <td className="py-2.5 px-3 text-right text-white/50 text-xs font-mono">{log.count}</td>
                  <td className="py-2.5 px-3 text-right text-white/30 text-xs hidden md:table-cell">{log.lastOccurrence}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLogs.length === 0 && (
            <div className="text-center py-8 text-white/20 text-sm">No matching logs found</div>
          )}
        </div>
      </motion.div>

      {/* ── Section: Performance Metrics ───────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'P50 Latency', value: '89', unit: 'ms', color: 'emerald', icon: <Zap className="w-3.5 h-3.5" /> },
          { label: 'P95 Latency', value: '234', unit: 'ms', color: 'amber', icon: <Clock className="w-3.5 h-3.5" /> },
          { label: 'P99 Latency', value: '567', unit: 'ms', color: 'orange', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
          { label: 'Error Rate', value: '0.12', unit: '%', color: 'red', icon: <AlertCircle className="w-3.5 h-3.5" /> },
        ].map((metric) => {
          const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
            emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', iconBg: 'bg-emerald-500/15' },
            amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', iconBg: 'bg-amber-500/15' },
            orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', iconBg: 'bg-orange-500/15' },
            red: { bg: 'bg-red-500/10', text: 'text-red-400', iconBg: 'bg-red-500/15' },
          }
          const c = colorMap[metric.color]
          return (
            <motion.div key={metric.label} variants={itemVariants} className="bg-[#111117] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">{metric.label}</span>
                <div className={`w-6 h-6 rounded-md ${c.iconBg} flex items-center justify-center ${c.text}`}>
                  {metric.icon}
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">{metric.value}</span>
                <span className={`text-sm ${c.text}`}>{metric.unit}</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ── Section: Security Dashboard ────────────────────────── */}
      <motion.div variants={itemVariants} className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Security Dashboard</h3>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span className="text-[11px] text-emerald-400 font-medium">Secure</span>
          </div>
        </div>

        {/* Security Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {/* Suspicious Login Attempts */}
          <div className="bg-[#0B0B0F] border border-white/[0.04] rounded-lg p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <LogIn className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Suspicious Logins</span>
            </div>
            <p className="text-xl font-bold text-red-400">3</p>
            <p className="text-[10px] text-white/20 mt-1">today · from unusual locations</p>
          </div>

          {/* Failed Auth Attempts */}
          <div className="bg-[#0B0B0F] border border-white/[0.04] rounded-lg p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Failed Auth</span>
            </div>
            <p className="text-xl font-bold text-orange-400">47</p>
            <p className="text-[10px] text-white/20 mt-1">today · 12 IPs blocked</p>
          </div>

          {/* Active Sessions */}
          <div className="bg-[#0B0B0F] border border-white/[0.04] rounded-lg p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Active Sessions</span>
            </div>
            <p className="text-xl font-bold text-white">1,247</p>
            <p className="text-[10px] text-white/20 mt-1">across all users</p>
          </div>

          {/* IP Restrictions */}
          <div className="bg-[#0B0B0F] border border-white/[0.04] rounded-lg p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">IP Restrictions</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" /> Enabled
              </span>
            </div>
            <p className="text-[10px] text-white/20 mt-1">3 whitelist rules active</p>
          </div>
        </div>

        {/* Recent Security Events */}
        <div>
          <h4 className="text-xs font-medium text-white/30 uppercase tracking-wider mb-3">Recent Security Events</h4>
          <div className="space-y-2">
            {SECURITY_EVENTS.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-[#0B0B0F] border border-white/[0.04] hover:border-white/[0.08] transition-colors group"
              >
                <div className="shrink-0">
                  <SecurityEventIcon type={event.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/70 truncate">{event.message}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <SecuritySeverityDot severity={event.severity} />
                  <span className="text-[10px] text-white/20">{event.time}</span>
                  <ChevronRight className="w-3 h-3 text-white/10 group-hover:text-white/30 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Footer Info ────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center justify-center gap-4 pt-2 pb-4">
        <div className="flex items-center gap-1.5 text-[11px] text-white/20">
          <Server className="w-3 h-3" />
          <span>USRA PLUS Infrastructure v2.4.1</span>
        </div>
        <span className="text-white/10">·</span>
        <span className="text-[11px] text-white/20">Data refreshes every 30s</span>
        <span className="text-white/10">·</span>
        <span className="text-[11px] text-white/20">Region: ME-South (Bahrain)</span>
      </motion.div>
    </motion.div>
  )
}
