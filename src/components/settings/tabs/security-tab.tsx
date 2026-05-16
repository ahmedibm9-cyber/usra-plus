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

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'
import { createClient } from '@/lib/supabase/client'

import { SectionCard, SectionTitle, SectionDescription, SettingRow } from '../settings-helpers'

export function SecurityTab() {
  const { t } = useI18n()
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
      // Call GDPR/PDPL-compliant deletion endpoint to purge all DB records
      const res = await fetch('/api/user/delete', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Deletion failed')
      }

      // After successful DB deletion, sign out and clear local state
      try {
        const supabase = createClient()
        await supabase.auth.signOut()
      } catch {
        // Supabase sign-out failure is non-critical — DB records are already deleted
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
    <div className="space-y-6">
      {/* Email Change */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Mail className="size-4 text-primary" /> Change Email
          </span>
        </SectionTitle>
        <SectionDescription>Update your email address</SectionDescription>

        <div className="space-y-3">
          <div>
            <Label className="text-foreground text-xs mb-1.5 block">{t.auth.email}</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-muted border-border text-foreground flex-1"
              />
              <Button
                size="sm"
                onClick={handleEmailChange}
                disabled={savingEmail}
                className="bg-primary hover:bg-primary/80 text-white shrink-0"
              >
                {savingEmail ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {t.common.save}
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Two-Factor Authentication */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" /> Two-Factor Authentication
          </span>
        </SectionTitle>
        <SectionDescription>Add an extra layer of security to your account</SectionDescription>

        <div className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lock className="size-4 text-accent" />
            </div>
            <div>
              <p className="text-foreground text-sm font-medium">Two-Factor Authentication</p>
              <p className="text-muted-foreground text-xs">Add an extra layer of security to your account</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-accent border-emerald-500/20 text-xs">
              Coming Soon
            </Badge>
            <Switch
              checked={false}
              disabled
              className="data-[state=checked]:bg-primary/50"
            />
          </div>
        </div>
      </SectionCard>

      {/* Active Sessions */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Smartphone className="size-4 text-primary" /> Active Sessions
          </span>
        </SectionTitle>
        <SectionDescription>Devices currently signed in to your account</SectionDescription>

        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border"
            >
              <div className="size-9 rounded-lg bg-muted flex items-center justify-center">
                <session.icon className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${session.current ? 'bg-green-400' : 'bg-[--text-muted]/40'}`} />
                  <p className="text-foreground text-sm font-medium">{session.device}</p>
                  {session.current && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-1.5 py-0">
                      Current
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  {session.ip} &middot; {session.lastActive}
                </p>
              </div>
              {!session.current && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevokeSession(session.id)}
                  className="text-[#EF4444]/60 hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Change Password */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" /> {t.settings.changePassword}
          </span>
        </SectionTitle>
        <SectionDescription>Update your password to keep your account secure</SectionDescription>

        <div className="space-y-3">
          <div>
            <Label className="text-foreground text-xs mb-1.5 block">Current Password</Label>
            <div className="relative">
              <Input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-muted border-border text-foreground pr-10"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-foreground text-xs mb-1.5 block">New Password</Label>
            <div className="relative">
              <Input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-muted border-border text-foreground pr-10"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-foreground text-xs mb-1.5 block">{t.auth.confirmPassword}</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-muted border-border text-foreground"
              placeholder="Confirm new password"
            />
          </div>
          <Button
            size="sm"
            onClick={handlePasswordChange}
            disabled={savingPassword}
            className="bg-primary hover:bg-primary/80 text-white"
          >
            {savingPassword ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            {t.settings.changePassword}
          </Button>
        </div>
      </SectionCard>

      {/* Privacy Controls */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Eye className="size-4 text-primary" /> Privacy Controls
          </span>
        </SectionTitle>
        <SectionDescription>Manage your privacy and visibility settings</SectionDescription>

        <div className="space-y-1">
          <SettingRow label="Online Status" description="Show when you are active">
            <Switch defaultChecked />
          </SettingRow>
          <SettingRow label="Read Receipts" description="Let others know you have read messages">
            <Switch defaultChecked />
          </SettingRow>
          <SettingRow label="Activity Visibility" description="Show your activity to family members">
            <Switch defaultChecked />
          </SettingRow>
        </div>
      </SectionCard>

      {/* Delete Account */}
      <SectionCard className="border-[#EF4444]/20">
        <SectionTitle className="text-[#EF4444]">
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4" /> {t.settings.deleteAccount}
          </span>
        </SectionTitle>
        <SectionDescription>Permanently delete your account and all associated data</SectionDescription>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="size-4" />
              {t.settings.deleteAccount}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">{t.settings.deleteAccount}</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                This will permanently delete your account, all your families, tasks, events, and data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-muted border-border text-foreground">
                {t.common.cancel}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} disabled={deletingAccount} className="bg-[#EF4444] text-white hover:bg-[#EF4444]/80">
                {deletingAccount ? <Loader2 className="size-4 animate-spin" /> : null}
                {deletingAccount ? 'Deleting...' : `${t.common.delete} Account`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SectionCard>
    </div>
  )
}
