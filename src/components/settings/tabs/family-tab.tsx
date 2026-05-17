'use client'

import React, { useState, useCallback } from 'react'
import {
  Users,
  Copy,
  Check,
  Trash2,
  LogOut,
  Pencil,
  Save,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

import Stack from '@mui/material/Stack'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'

import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'
import { createClient } from '@/lib/supabase/client'
import type { FamilyMember, FamilyRole } from '@/types'

import { SectionCard, SectionTitle, SectionDescription } from '../settings-helpers'

export function FamilyTab() {
  const { t } = useI18n()
  const { currentFamily, familyMembers, setCurrentFamily, setFamilyMembers } = useAppStore()
  const { user } = useAuthStore()
  const [familyName, setFamilyName] = useState(currentFamily?.name ?? '')
  const [familyDesc, setFamilyDesc] = useState(currentFamily?.description ?? '')
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState<string | null>(null)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const currentUserMember = familyMembers.find((m) => m.user_id === user?.id)
  const isOwnerOrAdmin = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin'
  const isOwner = currentUserMember?.role === 'owner'

  const handleCopyCode = useCallback(() => {
    if (!currentFamily?.invite_code) return
    try {
      navigator.clipboard.writeText(currentFamily.invite_code)
      setCopied(true)
      toast.success(t.common.copied)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t.common.error)
    }
  }, [currentFamily?.invite_code, t.common.copied, t.common.error])

  const handleSaveFamily = useCallback(async () => {
    if (!currentFamily) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('families')
        .update({ name: familyName, description: familyDesc })
        .eq('id', currentFamily.id)
      if (error) throw error
      setCurrentFamily({ ...currentFamily, name: familyName, description: familyDesc })
      setIsEditing(false)
      toast.success(t.common.success)
    } catch {
      toast.error(t.common.error)
    } finally {
      setSaving(false)
    }
  }, [currentFamily, familyName, familyDesc, setCurrentFamily, t])

  const handleChangeRole = useCallback(
    async (memberId: string, newRole: FamilyRole) => {
      try {
        const supabase = createClient()
        const { error } = await supabase.from('family_members').update({ role: newRole }).eq('id', memberId)
        if (error) throw error
        setFamilyMembers(familyMembers.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)))
        toast.success(t.common.success)
      } catch {
        toast.error(t.common.error)
      }
    },
    [familyMembers, setFamilyMembers, t]
  )

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      try {
        const supabase = createClient()
        const { error } = await supabase.from('family_members').delete().eq('id', memberId)
        if (error) throw error
        setFamilyMembers(familyMembers.filter((m) => m.id !== memberId))
        toast.success(t.common.success)
      } catch {
        toast.error(t.common.error)
      }
    },
    [familyMembers, setFamilyMembers, t]
  )

  const handleLeaveFamily = useCallback(async () => {
    if (!currentUserMember) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('family_members').delete().eq('id', currentUserMember.id)
      if (error) throw error
      setCurrentFamily(null)
      setFamilyMembers([])
      toast.success(t.common.success)
    } catch {
      toast.error(t.common.error)
    }
  }, [currentUserMember, setCurrentFamily, setFamilyMembers, t])

  const handleDeleteFamily = useCallback(async () => {
    if (!currentFamily) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('families').delete().eq('id', currentFamily.id)
      if (error) throw error
      setCurrentFamily(null)
      setFamilyMembers([])
      toast.success(t.common.success)
    } catch {
      toast.error(t.common.error)
    }
  }, [currentFamily, setCurrentFamily, setFamilyMembers, t])

  if (!currentFamily) {
    return (
      <SectionCard>
        <Stack alignItems="center" sx={{ py: 6 }}>
          <Users size={48} sx={{ color: 'text.secondary' }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }} sx={{ mt: 1 }}>{t.settings.family}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>No family selected</Typography>
        </Stack>
      </SectionCard>
    )
  }

  const roleChipColor: Record<FamilyRole, 'default' | 'primary' | 'secondary'> = {
    owner: 'primary',
    admin: 'secondary',
    member: 'default',
  }

  return (
    <Stack spacing={3}>
      {/* Family Info */}
      <SectionCard>
        <Stack sx={{ flexDirection: 'row' }} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <SectionTitle>{t.settings.family}</SectionTitle>
            <SectionDescription>Manage your family details and members</SectionDescription>
          </Box>
          {isOwnerOrAdmin && !isEditing && (
            <IconButton sx={{ color: 'primary.main' }} onClick={() => setIsEditing(true)} size="small">
              <Pencil size={16} />
            </IconButton>
          )}
        </Stack>

        {isEditing ? (
          <Stack spacing={2}>
            <TextField
              label={t.settings.familyName}
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Description"
              value={familyDesc}
              onChange={(e) => setFamilyDesc(e.target.value)}
              placeholder="Family description..."
              fullWidth
              size="small"
            />
            <Stack sx={{ flexDirection: 'row', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                onClick={handleSaveFamily}
                disabled={saving}
                startIcon={saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              >
                {t.common.save}
              </Button>
              <Button
                variant="text"
                size="small"
                color="inherit"
                onClick={() => setIsEditing(false)}
                startIcon={<X size={16} />}
              >
                {t.common.cancel}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t.settings.familyName}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{currentFamily.name}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Description</Typography>
              <Typography variant="body2">{currentFamily.description || 'No description'}</Typography>
            </Box>
          </Stack>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Invite Code */}
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }} sx={{ mb: 1, display: 'block' }}>{t.settings.inviteCode}</Typography>
          <Stack sx={{ flexDirection: 'row', gap: 1 }} alignItems="center">
            <Paper elevation={0} variant="outlined" sx={{ flex: 1, px: 2, py: 1, fontFamily: 'monospace', fontSize: 14, bgcolor: 'action.hover', borderRadius: 2 }}>
              {currentFamily.invite_code}
            </Paper>
            <Button
              variant="outlined"
              size="small"
              onClick={handleCopyCode}
              startIcon={copied ? <Check size={16} /> : <Copy size={16} />}
            >
              {copied ? t.common.copied : t.settings.copyCode}
            </Button>
          </Stack>
        </Box>
      </SectionCard>

      {/* Members List */}
      <SectionCard>
        <SectionTitle>{t.settings.members}</SectionTitle>
        <SectionDescription>{familyMembers.length} members in this family</SectionDescription>

        <Stack spacing={1} sx={{ maxHeight: 384, overflowY: 'auto' }}>
          {familyMembers.map((member: FamilyMember) => (
            <Stack
              key={member.id}
              direction="row"
              alignItems="center"
              gap={1.5}
              sx={{
                p: 1.5,
                borderRadius: 3,
                bgcolor: 'action.hover',
                border: 1,
                borderColor: 'divider',
                transition: 'all 0.15s',
                '&:hover': { bgcolor: 'primary.main', color: 'primary.contrastText' },
              }}
            >
              <Avatar sx={{ width: 36, height: 36 }}>
                {member.profiles?.first_name?.[0] ?? member.nickname?.[0] ?? '?'}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                  {member.profiles?.first_name
                    ? `${member.profiles.first_name} ${member.profiles.last_name ?? ''}`
                    : member.nickname ?? 'Unknown'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                  {member.profiles?.email ?? ''}
                </Typography>
              </Box>
              <Chip
                label={
                  member.role === 'owner'
                    ? t.settings.owner
                    : member.role === 'admin'
                      ? t.settings.admin
                      : t.settings.member
                }
                size="small"
                color={roleChipColor[member.role]}
              />

              {/* Change Role Dropdown */}
              {isOwnerOrAdmin && member.user_id !== user?.id && (
                <TextField
                  select
                  value={member.role}
                  onChange={(e) => handleChangeRole(member.id, e.target.value as FamilyRole)}
                  size="small"
                  sx={{ width: 100 }}
                >
                  <MenuItem value="admin">{t.settings.admin}</MenuItem>
                  <MenuItem value="member">{t.settings.member}</MenuItem>
                </TextField>
              )}

              {/* Remove Member */}
              {isOwnerOrAdmin && member.user_id !== user?.id && (
                <IconButton
                  size="small"
                  sx={{ color: 'error.main' }}
                  onClick={() => setRemoveDialogOpen(member.id)}
                >
                  <Trash2 size={14} />
                </IconButton>
              )}
            </Stack>
          ))}
        </Stack>
      </SectionCard>

      {/* Remove Member Dialog */}
      <Dialog open={!!removeDialogOpen} onClose={() => setRemoveDialogOpen(null)}>
        <DialogTitle>{t.settings.removeMember}</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to remove this member? This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveDialogOpen(null)}>{t.common.cancel}</Button>
          <Button
            sx={{ color: 'error.main' }}
            variant="contained"
            onClick={() => {
              if (removeDialogOpen) handleRemoveMember(removeDialogOpen)
              setRemoveDialogOpen(null)
            }}
          >
            {t.settings.removeMember}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Danger Zone */}
      <SectionCard sx={{ borderColor: 'error.light' }}>
        <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }} sx={{ mb: 0.5 }}>
          <AlertTriangle size={16} sx={{ color: 'error.main' }} />
          <Typography variant="subtitle1" sx={{ color: 'error.main' }} sx={{ fontWeight: 600 }}>Danger Zone</Typography>
        </Stack>
        <SectionDescription>Irreversible and destructive actions</SectionDescription>

        <Stack spacing={1.5}>
          {/* Leave Family */}
          {!isOwner && (
            <Paper elevation={0} variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderColor: 'error.light', bgcolor: 'error.light', }}>
              <Stack sx={{ flexDirection: 'row' }} alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Leave Family</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>You will lose access to all family data</Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ color: 'error.main' }}
                  startIcon={<LogOut size={16} />}
                  onClick={() => setLeaveDialogOpen(true)}
                >
                  Leave
                </Button>
              </Stack>
            </Paper>
          )}

          {/* Delete Family - owner only */}
          {isOwner && (
            <Paper elevation={0} variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderColor: 'error.light', bgcolor: 'error.light' }}>
              <Stack sx={{ flexDirection: 'row' }} alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{t.common.delete} Family</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Permanently delete this family and all its data</Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  sx={{ color: 'error.main' }}
                  startIcon={<Trash2 size={16} />}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  {t.common.delete}
                </Button>
              </Stack>
            </Paper>
          )}
        </Stack>
      </SectionCard>

      {/* Leave Family Dialog */}
      <Dialog open={leaveDialogOpen} onClose={() => setLeaveDialogOpen(false)}>
        <DialogTitle>Leave Family</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to leave &quot;{currentFamily.name}&quot;? You will lose access to all shared data, tasks, and events.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveDialogOpen(false)}>{t.common.cancel}</Button>
          <Button
            sx={{ color: 'error.main' }}
            variant="contained"
            onClick={() => { handleLeaveFamily(); setLeaveDialogOpen(false) }}
          >
            Leave Family
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Family Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Family</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete &quot;{currentFamily.name}&quot; and remove all members, tasks, events, and data. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t.common.cancel}</Button>
          <Button
            sx={{ color: 'error.main' }}
            variant="contained"
            onClick={() => { handleDeleteFamily(); setDeleteDialogOpen(false) }}
          >
            {t.common.delete} Family
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
