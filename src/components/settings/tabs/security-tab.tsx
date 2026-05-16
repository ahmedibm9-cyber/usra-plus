'use client'

import React, { useState, useCallback } from 'react'
import {
  ShieldCheck,
  Lock,
  KeyRound,
  AlertTriangle,
  Eye,
  EyeOff,
  Chrome,
  Smartphone,
  Monitor,
  Mail,
  Trash2,
  Loader2,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'

import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import FormControlLabel from '@mui/material/FormControlLabel'

import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'
import { createClient } from '@/lib/supabase/client'

import { SectionCard, SectionTitle, SectionDescription, SettingRow } from '../settings-helpers'

export function SecurityTab() {
  const { t, isRTL } = useI18n()
  const { user } = useAuthStore()

  // Email change state
  const [email, setEmail] = useState(user?.email ?? '')
  const [savingEmail, setSavingEmail] = useState(false)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Delete account state
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const sessions = [
    { id: '1', device: 'Chrome on macOS', icon: Chrome, ip: '192.168.1.1', lastActive: 'Current session', current: true },
    { id: '2', device: 'Safari on iPhone', icon: Smartphone, ip: '192.168.1.2', lastActive: 'Last active 2h ago', current: false },
    { id: '3', device: 'Firefox on Windows', icon: Monitor, ip: '10.0.0.5', lastActive: 'Last active 3 days ago', current: false },
  ]

  const handleEmailChange = useCallback(async () => {
    if (!email) return
    setSavingEmail(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ email })
      if (error) throw error
      toast.success('Verification email sent to your new address')
    } catch {
      toast.error(t.common.error)
    } finally {
      setSavingEmail(false)
    }
  }, [email, t])

  const handlePasswordChange = useCallback(async () => {
    if (newPassword.length < 8) {
      toast.error(t.auth.passwordMinLength)
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(t.auth.passwordsNotMatch)
      return
    }
    setSavingPassword(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password updated successfully')
    } catch {
      toast.error(t.common.error)
    } finally {
      setSavingPassword(false)
    }
  }, [newPassword, confirmPassword, t])

  const handleRevokeSession = useCallback((sessionId: string) => {
    toast.success('Session revoked!')
  }, [])

  const handleDeleteAccount = useCallback(async () => {
    setDeletingAccount(true)
    try {
      const res = await fetch('/api/user/delete', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Deletion failed')
      }
      try {
        const supabase = createClient()
        await supabase.auth.signOut()
      } catch {
        // non-critical
      }
      useAuthStore.getState().logout()
      toast.success('Account and all data permanently deleted.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error)
    } finally {
      setDeletingAccount(false)
    }
  }, [t])

  return (
    <Stack spacing={3}>
      {/* Email Change */}
      <SectionCard>
        <SectionTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <Mail size={16} color="primary" /> Change Email
          </Stack>
        </SectionTitle>
        <SectionDescription>Update your email address</SectionDescription>

        <Stack spacing={2}>
          <Stack direction="row" gap={1}>
            <TextField
              type="email"
              label={t.auth.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              size="small"
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleEmailChange}
              disabled={savingEmail}
              startIcon={savingEmail ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              sx={{ flexShrink: 0 }}
            >
              {t.common.save}
            </Button>
          </Stack>
        </Stack>
      </SectionCard>

      {/* Two-Factor Authentication */}
      <SectionCard>
        <SectionTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <ShieldCheck size={16} color="primary" /> Two-Factor Authentication
          </Stack>
        </SectionTitle>
        <SectionDescription>Add an extra layer of security to your account</SectionDescription>

        <Paper elevation={0} variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" gap={1.5}>
              <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'primary.main', opacity: 0.1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lock size={16} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>Two-Factor Authentication</Typography>
                <Typography variant="caption" color="text.secondary">Add an extra layer of security to your account</Typography>
              </Box>
            </Stack>
            <Stack direction="row" alignItems="center" gap={1}>
              <Chip
                label={isRTL ? 'المصادقة الثانية وإدارة الجلسات' : '2FA & Session Management'}
                size="small"
                variant="outlined"
                color="success"
              />
              <Switch checked={false} disabled size="small" />
            </Stack>
          </Stack>
        </Paper>
      </SectionCard>

      {/* Active Sessions */}
      <SectionCard>
        <SectionTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <Smartphone size={16} color="primary" /> Active Sessions
          </Stack>
        </SectionTitle>
        <SectionDescription>Devices currently signed in to your account</SectionDescription>

        <Stack spacing={1}>
          {sessions.map((session) => {
            const Icon = session.icon
            return (
              <Paper key={session.id} elevation={0} variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                <Stack direction="row" alignItems="center" gap={1.5}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color="text.secondary" />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: session.current ? 'success.main' : 'text.disabled' }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{session.device}</Typography>
                      {session.current && (
                        <Chip label="Current" size="small" color="success" variant="outlined" />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {session.ip} · {session.lastActive}
                    </Typography>
                  </Box>
                  {!session.current && (
                    <Button
                      variant="text"
                      size="small"
                      color="error"
                      onClick={() => handleRevokeSession(session.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </Stack>
              </Paper>
            )
          })}
        </Stack>
      </SectionCard>

      {/* Change Password */}
      <SectionCard>
        <SectionTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <KeyRound size={16} color="primary" /> {t.settings.changePassword}
          </Stack>
        </SectionTitle>
        <SectionDescription>Update your password to keep your account secure</SectionDescription>

        <Stack spacing={2}>
          <TextField
            label="Current Password"
            type={showCurrentPassword ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            fullWidth
            size="small"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="New Password"
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            fullWidth
            size="small"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowNewPassword(!showNewPassword)}>
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label={t.auth.confirmPassword}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            fullWidth
            size="small"
          />
          <Button
            variant="contained"
            size="small"
            onClick={handlePasswordChange}
            disabled={savingPassword}
            startIcon={savingPassword ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
          >
            {t.settings.changePassword}
          </Button>
        </Stack>
      </SectionCard>

      {/* Privacy Controls */}
      <SectionCard>
        <SectionTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <Eye size={16} color="primary" /> Privacy Controls
          </Stack>
        </SectionTitle>
        <SectionDescription>Manage your privacy and visibility settings</SectionDescription>

        <Stack>
          <SettingRow label="Online Status" description="Show when you are active">
            <Switch defaultChecked size="small" />
          </SettingRow>
          <SettingRow label="Read Receipts" description="Let others know you have read messages">
            <Switch defaultChecked size="small" />
          </SettingRow>
          <SettingRow label="Activity Visibility" description="Show your activity to family members">
            <Switch defaultChecked size="small" />
          </SettingRow>
        </Stack>
      </SectionCard>

      {/* Delete Account */}
      <SectionCard sx={{ borderColor: 'error.light' }}>
        <SectionTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <AlertTriangle size={16} color="error" /> {t.settings.deleteAccount}
          </Stack>
        </SectionTitle>
        <SectionDescription>Permanently delete your account and all associated data</SectionDescription>

        <Button
          variant="contained"
          color="error"
          size="small"
          startIcon={<Trash2 size={16} />}
          onClick={() => setDeleteDialogOpen(true)}
        >
          {t.settings.deleteAccount}
        </Button>

        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>{t.settings.deleteAccount}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              This will permanently delete your account, all your families, tasks, events, and data. This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>{t.common.cancel}</Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => { handleDeleteAccount(); setDeleteDialogOpen(false) }}
              disabled={deletingAccount}
              startIcon={deletingAccount ? <Loader2 size={16} className="animate-spin" /> : null}
            >
              {deletingAccount ? 'Deleting...' : `${t.common.delete} Account`}
            </Button>
          </DialogActions>
        </Dialog>
      </SectionCard>
    </Stack>
  )
}
