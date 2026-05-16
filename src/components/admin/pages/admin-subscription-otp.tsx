'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  KeyRound, Plus, Copy, Check, X, Trash2, Loader2,
  Search, Filter, Zap, Crown, ShieldCheck, Users,
  RefreshCw, Ban, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { safeJsonResponse } from '@/lib/safe-fetch'

import Stack from '@mui/material/Stack'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'

// ─── Types ───────────────────────────────────────────────────────────

interface OtpRecord {
  id: string
  code: string
  userId: string
  planSlug: string
  startDate: string
  endDate: string
  generatedBy: string
  status: string
  usedAt: string | null
  createdAt: string
  expiresAt: string
}

interface UserOption {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

// ─── Plan Icon/Color Mapping ────────────────────────────────────────

function planConfig(slug: string) {
  switch (slug) {
    case 'free': return { color: 'default' as const, Icon: Users }
    case 'pro': return { color: 'success' as const, Icon: Zap }
    case 'family_plus': return { color: 'success' as const, Icon: Crown }
    case 'max': return { color: 'primary' as const, Icon: ShieldCheck }
    case 'ultimate': return { color: 'primary' as const, Icon: ShieldCheck }
    default: return { color: 'success' as const, Icon: Zap }
  }
}

function statusChipProps(status: string): { label: string; color: 'default' | 'success' | 'error' | 'warning' | 'info' | 'primary' } {
  switch (status) {
    case 'pending': return { label: 'Pending', color: 'success' }
    case 'used': return { label: 'Used', color: 'info' }
    case 'expired': return { label: 'Expired', color: 'default' }
    case 'revoked': return { label: 'Revoked', color: 'error' }
    default: return { label: status, color: 'default' }
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  } catch {
    return iso
  }
}

// ─── Generate OTP Dialog ─────────────────────────────────────────────

function GenerateOtpDialog({
  onGenerate,
  onClose,
}: {
  onGenerate: (data: { userId: string; planSlug: string; startDate: string; endDate: string }) => Promise<{ otpCode: string; otpId: string; expiresAt: string } | null>
  onClose: () => void
}) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [planSlug, setPlanSlug] = useState('pro')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return d.toISOString().slice(0, 10)
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/admin/users?pageSize=100', { credentials: 'same-origin' })
        if (res.ok) {
          const json = await safeJsonResponse<{ data?: UserOption[] }>(res)
          if (json?.data) setUsers(json.data)
        }
      } catch { /* ignore */ }
    }
    fetchUsers()
  }, [])

  const filteredUsers = userSearch.trim()
    ? users.filter(u =>
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.firstName && u.firstName.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.lastName && u.lastName.toLowerCase().includes(userSearch.toLowerCase()))
      )
    : users

  const handleGenerate = async () => {
    if (!selectedUserId) { toast.error('Please select a user'); return }
    if (!startDate || !endDate) { toast.error('Please set start and end dates'); return }
    setIsGenerating(true)
    try {
      const result = await onGenerate({ userId: selectedUserId, planSlug, startDate, endDate })
      if (result) {
        setGeneratedCode(result.otpCode)
        toast.success('OTP code generated successfully')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    if (!generatedCode) return
    navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    toast.success('OTP code copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" gap={1}>
          <KeyRound size={16} color="success" />
          <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
            Generate Subscription OTP
          </Typography>
        </Stack>
        <IconButton size="small" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </Stack>

      {generatedCode ? (
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Alert severity="success" variant="outlined" sx={{ textAlign: 'center', borderRadius: 3, p: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 1, display: 'block' }}>OTP Code Generated</Typography>
            <Typography variant="h4" sx={{ fontFamily: 'monospace', letterSpacing: '0.3em', fontWeight: 700, color: 'success.main' }}>{generatedCode}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>Share this code with the user. It expires in 7 days.</Typography>
          </Alert>
          <Stack direction="row" justifyContent="center" gap={1.5}>
            <Button
              variant="outlined"
              color="success"
              size="small"
              onClick={handleCopy}
              startIcon={copied ? <Check size={14} /> : <Copy size={14} />}
            >
              {copied ? 'Copied!' : 'Copy Code'}
            </Button>
            <Button variant="outlined" size="small" onClick={onClose}>Done</Button>
          </Stack>
        </Stack>
      ) : (
        <Stack spacing={2} sx={{ mt: 2 }}>
          {/* User Search & Select */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 0.5, display: 'block' }}>User *</Typography>
            <TextField
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by email or name..."
              fullWidth
              size="small"
              sx={{ mb: 1 }}
            />
            <TextField
              select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              fullWidth
              size="small"
              SelectProps={{ native: false }}
            >
              {filteredUsers.map(user => (
                <MenuItem key={user.id} value={user.id}>
                  {user.firstName ? `${user.firstName} ${user.lastName || ''} — ` : ''}{user.email}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Plan Selector */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 0.5, display: 'block' }}>Plan *</Typography>
            <Grid container spacing={1}>
              {['pro', 'family_plus', 'max', 'ultimate'].map(plan => {
                const { color, Icon } = planConfig(plan)
                return (
                  <Grid key={plan} size={{ xs: 3 }}>
                    <Button
                      fullWidth
                      variant={planSlug === plan ? 'contained' : 'outlined'}
                      color={planSlug === plan ? 'success' : 'inherit'}
                      onClick={() => setPlanSlug(plan)}
                      sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 1.5, textTransform: 'none' }}
                    >
                      <Icon size={16} />
                      <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 500 }}>
                        {plan === 'family_plus' ? 'Family+' : plan.charAt(0).toUpperCase() + plan.slice(1)}
                      </Typography>
                    </Button>
                  </Grid>
                )
              })}
            </Grid>
          </Box>

          {/* Date Pickers */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 0.5, display: 'block' }}>Start Date *</Typography>
              <TextField type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} fullWidth size="small" />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 0.5, display: 'block' }}>End Date *</Typography>
              <TextField type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} fullWidth size="small" />
            </Grid>
          </Grid>

          {/* Actions */}
          <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ pt: 1 }}>
            <Button variant="outlined" size="small" onClick={onClose}>Cancel</Button>
            <Button
              variant="contained"
              color="success"
              size="small"
              onClick={handleGenerate}
              disabled={isGenerating || !selectedUserId}
              startIcon={isGenerating ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
            >
              Generate OTP
            </Button>
          </Stack>
        </Stack>
      )}
    </Paper>
  )
}

// ─── OTP Row ─────────────────────────────────────────────────────────

function OtpRow({
  otp,
  onRevoke,
}: {
  otp: OtpRecord
  onRevoke: (id: string) => Promise<void>
}) {
  const [isRevoking, setIsRevoking] = useState(false)
  const [copied, setCopied] = useState(false)
  const { Icon, color } = planConfig(otp.planSlug)
  const chipProps = statusChipProps(otp.status)

  const handleCopy = () => {
    navigator.clipboard.writeText(otp.code)
    setCopied(true)
    toast.success('OTP code copied')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRevoke = async () => {
    setIsRevoking(true)
    try { await onRevoke(otp.id) } finally { setIsRevoking(false) }
  }

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, gap: 1.5, transition: 'border-color 0.15s', '&:hover': { borderColor: 'success.light' } }}>
      {/* Plan + Code */}
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={16} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}>
              {otp.status === 'used' || otp.status === 'revoked' ? '••••••' : otp.code}
            </Typography>
            {otp.status === 'pending' && (
              <IconButton size="small" onClick={handleCopy} title="Copy code">
                {copied ? <Check size={12} color="success" /> : <Copy size={12} />}
              </IconButton>
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {otp.planSlug === 'family_plus' ? 'Family+' : otp.planSlug.charAt(0).toUpperCase() + otp.planSlug.slice(1)} plan · {formatDate(otp.startDate)} → {formatDate(otp.endDate)}
          </Typography>
        </Box>
      </Stack>

      {/* Status + Meta */}
      <Stack direction="row" alignItems="center" gap={1.5}>
        <Chip label={chipProps.label} size="small" color={chipProps.color} variant="outlined" />
        <Stack direction="row" alignItems="center" gap={0.5}>
          <Clock size={12} color="text.secondary" />
          <Typography variant="caption" color="text.secondary">{formatDate(otp.createdAt)}</Typography>
        </Stack>
        {otp.status === 'pending' && (
          <IconButton
            size="small"
            color="error"
            onClick={handleRevoke}
            disabled={isRevoking}
            title="Revoke OTP"
          >
            {isRevoking ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
          </IconButton>
        )}
      </Stack>
    </Paper>
  )
}

// ─── Main Component ──────────────────────────────────────────────────

export function AdminSubscriptionOtp() {
  const [otps, setOtps] = useState<OtpRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showGenerateForm, setShowGenerateForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPlan, setFilterPlan] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchOtps = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterPlan) params.set('planSlug', filterPlan)
      const res = await fetch(`/api/admin/subscription-otp?${params.toString()}`, { credentials: 'same-origin' })
      if (res.ok) {
        const json = await safeJsonResponse<{ data?: OtpRecord[] }>(res)
        setOtps(json?.data || [])
      }
    } catch { /* ignore */ } finally { setIsLoading(false) }
  }, [filterStatus, filterPlan])

  useEffect(() => { fetchOtps() }, [fetchOtps])

  const handleGenerate = async (data: { userId: string; planSlug: string; startDate: string; endDate: string }) => {
    try {
      const res = await fetch('/api/admin/subscription-otp/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await safeJsonResponse(res)
        toast.error(err?.error || 'Failed to generate OTP')
        return null
      }
      const result = await safeJsonResponse<{ otpCode: string; otpId: string; expiresAt: string }>(res)
      fetchOtps()
      return result
    } catch {
      toast.error('Failed to generate OTP')
      return null
    }
  }

  const handleRevoke = async (otpId: string) => {
    try {
      const res = await fetch('/api/admin/subscription-otp', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ otpId }),
      })
      if (!res.ok) {
        const err = await safeJsonResponse(res)
        toast.error(err?.error || 'Failed to revoke OTP')
        return
      }
      toast.success('OTP revoked successfully')
      fetchOtps()
    } catch {
      toast.error('Failed to revoke OTP')
    }
  }

  const filteredOtps = searchQuery.trim()
    ? otps.filter(otp => otp.userId.toLowerCase().includes(searchQuery.toLowerCase()))
    : otps

  const pendingCount = otps.filter(o => o.status === 'pending').length
  const usedCount = otps.filter(o => o.status === 'used').length
  const expiredCount = otps.filter(o => o.status === 'expired' || o.status === 'revoked').length

  if (isLoading) {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Grid container spacing={2}>
          {[...Array(3)].map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 4 }}>
              <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Skeleton sx={{ height: 16, width: 96 }} />
                <Skeleton sx={{ height: 32, width: 64, mt: 1 }} />
              </Paper>
            </Grid>
          ))}
        </Grid>
        <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
          <Skeleton sx={{ height: 256 }} />
        </Paper>
      </Stack>
    )
  }

  return (
    <Stack spacing={3}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={2}>
        <Box>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Box sx={{ width: 40, height: 40, borderRadius: 3, bgcolor: 'success.main', opacity: 0.1, border: 1, borderColor: 'success.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <KeyRound size={20} color="success" />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>Subscription OTP</Typography>
              <Divider sx={{ height: 2, borderRadius: 1, bgcolor: 'success.main', mt: 0.5 }} />
            </Box>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 6.5 }}>Manually generate and manage subscription access codes</Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <IconButton size="small" onClick={fetchOtps} title="Refresh" sx={{ color: 'text.secondary', '&:hover': { color: 'success.main', bgcolor: 'success.light' } }}>
            <RefreshCw size={16} />
          </IconButton>
          <Button
            variant="contained"
            color="success"
            size="small"
            onClick={() => setShowGenerateForm(!showGenerateForm)}
            startIcon={<Plus size={14} />}
          >
            Generate OTP
          </Button>
        </Stack>
      </Stack>

      {/* Quick Stats */}
      <Grid container spacing={1.5}>
        {[
          { label: 'Pending', value: pendingCount, icon: Clock, color: 'success' as const },
          { label: 'Used', value: usedCount, icon: CheckCircle2, color: 'primary' as const },
          { label: 'Expired/Revoked', value: expiredCount, icon: AlertTriangle, color: 'default' as const },
        ].map(stat => (
          <Grid key={stat.label} size={{ xs: 4 }}>
            <Paper
              elevation={0}
              variant="outlined"
              sx={{ p: 2, borderRadius: 3, transition: 'all 0.2s', '&:hover': { boxShadow: 1, transform: 'translateY(-2px)' }, borderColor: stat.color === 'default' ? 'divider' : `${stat.color}.light` }}
            >
              <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                <stat.icon size={16} color={stat.color === 'default' ? 'text.secondary' : stat.color} />
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>{stat.label}</Typography>
              </Stack>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{stat.value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Generate Form */}
      {showGenerateForm && (
        <GenerateOtpDialog
          onGenerate={handleGenerate}
          onClose={() => setShowGenerateForm(false)}
        />
      )}

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={1.5}>
        <Stack direction="row" alignItems="center" gap={1}>
          <Filter size={14} color="text.secondary" />
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Filters:</Typography>
        </Stack>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <TextField
            select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            size="small"
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="used">Used</MenuItem>
            <MenuItem value="expired">Expired</MenuItem>
            <MenuItem value="revoked">Revoked</MenuItem>
          </TextField>
          <TextField
            select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            size="small"
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="">All Plans</MenuItem>
            <MenuItem value="pro">Pro</MenuItem>
            <MenuItem value="family_plus">Family+</MenuItem>
            <MenuItem value="max">Max</MenuItem>
            <MenuItem value="ultimate">Ultimate</MenuItem>
          </TextField>
          <TextField
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by user ID..."
            size="small"
            sx={{ width: 192 }}
            InputProps={{
              startAdornment: <Search size={12} style={{ marginRight: 6, color: 'text.secondary' }} />,
            }}
          />
        </Stack>
      </Stack>

      {/* OTP List */}
      <Stack spacing={1} sx={{ maxHeight: 500, overflowY: 'auto' }}>
        {filteredOtps.length > 0 ? (
          filteredOtps.map(otp => (
            <OtpRow key={otp.id} otp={otp} onRevoke={handleRevoke} />
          ))
        ) : (
          <Paper elevation={0} variant="outlined" sx={{ p: 6, borderRadius: 3, textAlign: 'center' }}>
            <KeyRound size={40} color="text.disabled" />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>No OTP codes found</Typography>
            <Typography variant="caption" color="text.disabled">Generate a new OTP to grant subscription access</Typography>
          </Paper>
        )}
      </Stack>

      {/* Total count */}
      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', textTransform: 'uppercase', letterSpacing: 2 }}>
        Showing {filteredOtps.length} of {otps.length} OTP codes
      </Typography>
    </Stack>
  )
}
