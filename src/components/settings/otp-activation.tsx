'use client'

import React, { useState, useCallback } from 'react'
import { KeyRound, Loader2, CheckCircle2, AlertTriangle, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useSubscriptionStore } from '@/stores/subscription-store'
import { useAuthStore } from '@/stores/auth-store'
import type { SubscriptionPlan } from '@/types'

import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'

export function OtpActivation() {
  const [otpCode, setOtpCode] = useState('')
  const [isActivating, setIsActivating] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    plan?: string
    startDate?: string
    endDate?: string
    error?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const { setPlan, fetchPlanFromServer } = useSubscriptionStore()
  const { user } = useAuthStore()

  const handleActivate = useCallback(async () => {
    if (!otpCode.trim()) {
      toast.error('Please enter an OTP code')
      return
    }

    setIsActivating(true)
    setResult(null)

    try {
      const res = await fetch('/api/subscription/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ otpCode: otpCode.trim() }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setResult({
          success: true,
          plan: data.subscription?.plan,
          startDate: data.subscription?.startDate,
          endDate: data.subscription?.endDate,
        })

        if (data.subscription?.plan) {
          setPlan(data.subscription.plan as SubscriptionPlan)
          if (user?.id) {
            setTimeout(() => fetchPlanFromServer(user.id), 1000)
          }
        }

        toast.success('Subscription activated successfully!')
        setOtpCode('')
      } else {
        setResult({
          success: false,
          error: data.error || 'Activation failed',
        })
        toast.error(data.error || 'Failed to activate subscription')
      }
    } catch {
      setResult({
        success: false,
        error: 'Network error. Please try again.',
      })
      toast.error('Network error. Please try again.')
    } finally {
      setIsActivating(false)
    }
  }, [otpCode, setPlan, fetchPlanFromServer, user?.id])

  const handleCopyPlan = () => {
    if (!result?.plan) return
    navigator.clipboard.writeText(result.plan)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Stack spacing={3}>
      {/* OTP Input Section */}
      <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 0.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'primary.main', opacity: 0.1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <KeyRound size={16} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Activate Subscription</Typography>
            <Typography variant="caption" color="text.secondary">Enter the OTP code provided by your administrator</Typography>
          </Box>
        </Stack>

        <Stack spacing={2} sx={{ mt: 2.5 }}>
          <Box>
            <Typography variant="caption" sx={{ mb: 1, display: 'block', fontWeight: 500 }}>OTP Code</Typography>
            <Stack direction="row" gap={1}>
              <TextField
                value={otpCode}
                onChange={(e) => {
                  setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                  setResult(null)
                }}
                placeholder="Enter 6-digit code"
                inputProps={{ maxLength: 6, style: { fontFamily: 'monospace', fontSize: 18, letterSpacing: '0.5em', textAlign: 'center' } }}
                fullWidth
                disabled={isActivating}
              />
              <Button
                variant="contained"
                onClick={handleActivate}
                disabled={isActivating || otpCode.length !== 6}
                startIcon={isActivating ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                sx={{ flexShrink: 0 }}
              >
                {isActivating ? 'Activating...' : 'Activate'}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {/* Result Section */}
      {result && (
        result.success ? (
          <Alert severity="success" variant="outlined" sx={{ borderRadius: 4 }}>
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" gap={1.5}>
                <CheckCircle2 size={20} color="success" />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Subscription Activated!</Typography>
                  <Typography variant="caption" color="text.secondary">Your plan has been upgraded successfully</Typography>
                </Box>
              </Stack>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Plan</Typography>
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {result.plan === 'family_plus' ? 'Family+' : result.plan?.charAt(0).toUpperCase() + result.plan?.slice(1)}
                      </Typography>
                      <IconButton size="small" onClick={handleCopyPlan}>
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                      </IconButton>
                    </Stack>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Start Date</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {result.startDate ? new Date(result.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>End Date</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {result.endDate ? new Date(result.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Stack>
          </Alert>
        ) : (
          <Alert severity="error" variant="outlined" sx={{ borderRadius: 4 }}>
            <Stack direction="row" alignItems="center" gap={1.5}>
              <AlertTriangle size={20} color="error" />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Activation Failed</Typography>
                <Typography variant="caption" color="text.secondary">{result.error || 'Please check your OTP code and try again.'}</Typography>
              </Box>
            </Stack>
          </Alert>
        )
      )}

      {/* Help Text */}
      <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          <strong>How to get an OTP code:</strong> Contact your administrator to receive a subscription activation code.
          Each code is valid for 7 days and can only be used once. The code is tied to your account and cannot be transferred.
        </Typography>
      </Paper>
    </Stack>
  )
}
