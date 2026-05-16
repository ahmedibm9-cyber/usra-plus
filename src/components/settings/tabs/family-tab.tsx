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

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
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
        setFamilyMembers(
          familyMembers.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        )
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
        <div className="text-center py-12">
          <Users className="size-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">{t.settings.family}</p>
          <p className="text-muted-foreground text-xs mt-1">No family selected</p>
        </div>
      </SectionCard>
    )
  }

  const roleBadgeColor: Record<FamilyRole, string> = {
    owner: 'bg-accent/20 text-accent border-emerald-500/30',
    admin: 'bg-primary/20 text-accent border-primary/30',
    member: 'bg-muted text-muted-foreground border-border',
  }

  return (
    <div className="space-y-6">
      {/* Family Info */}
      <SectionCard>
        <div className="flex items-center justify-between mb-4">
          <div>
            <SectionTitle>{t.settings.family}</SectionTitle>
            <SectionDescription>Manage your family details and members</SectionDescription>
          </div>
          {isOwnerOrAdmin && !isEditing && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-primary">
              <Pencil className="size-4" />
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label className="text-foreground text-xs mb-1.5 block">{t.settings.familyName}</Label>
              <Input
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                className="bg-muted border-border text-foreground"
              />
            </div>
            <div>
              <Label className="text-foreground text-xs mb-1.5 block">Description</Label>
              <Input
                value={familyDesc}
                onChange={(e) => setFamilyDesc(e.target.value)}
                className="bg-muted border-border text-foreground"
                placeholder="Family description..."
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveFamily}
                disabled={saving}
                className="bg-primary hover:bg-primary/80 text-white"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {t.common.save}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="text-muted-foreground">
                <X className="size-4" />
                {t.common.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <span className="text-muted-foreground text-xs">{t.settings.familyName}</span>
              <p className="text-foreground font-medium">{currentFamily.name}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Description</span>
              <p className="text-foreground">{currentFamily.description || 'No description'}</p>
            </div>
          </div>
        )}

        <Separator className="my-4 bg-muted" />

        {/* Invite Code */}
        <div>
          <span className="text-muted-foreground text-xs block mb-2">{t.settings.inviteCode}</span>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-accent font-mono text-sm">
              {currentFamily.invite_code}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="border-border text-foreground hover:bg-muted"
            >
              {copied ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
              {copied ? t.common.copied : t.settings.copyCode}
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* Members List */}
      <SectionCard>
        <SectionTitle>{t.settings.members}</SectionTitle>
        <SectionDescription>{familyMembers.length} members in this family</SectionDescription>

        <ScrollArea className="max-h-96">
          <div className="space-y-2">
            {familyMembers.map((member: FamilyMember) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-surface-variant/50 border border-outline-variant hover:bg-primary-container transition-all duration-150"
              >
                <Avatar className="size-9">
                  <AvatarImage src={member.profiles?.avatar_url ?? ''} />
                  <AvatarFallback className="bg-primary/20 text-accent text-xs">
                    {member.profiles?.first_name?.[0] ?? member.nickname?.[0] ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">
                    {member.profiles?.first_name
                      ? `${member.profiles.first_name} ${member.profiles.last_name ?? ''}`
                      : member.nickname ?? 'Unknown'}
                  </p>
                  <p className="text-muted-foreground text-xs truncate">
                    {member.profiles?.email ?? ''}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-2 py-0 ${roleBadgeColor[member.role]}`}
                >
                  {member.role === 'owner'
                    ? t.settings.owner
                    : member.role === 'admin'
                      ? t.settings.admin
                      : t.settings.member}
                </Badge>

                {/* Change Role Dropdown - owner/admin only */}
                {isOwnerOrAdmin && member.user_id !== user?.id && (
                  <Select
                    value={member.role}
                    onValueChange={(v) => handleChangeRole(member.id, v as FamilyRole)}
                  >
                    <SelectTrigger className="h-8 w-28 text-xs bg-surface-variant border-outline-variant text-on-surface-variant rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border rounded-xl shadow-[var(--elevation-2)]">
                      <SelectItem value="admin" className="text-foreground text-xs rounded-lg cursor-pointer">
                        {t.settings.admin}
                      </SelectItem>
                      <SelectItem value="member" className="text-foreground text-xs rounded-lg cursor-pointer">
                        {t.settings.member}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {/* Remove Member - owner/admin only, can't remove self */}
                {isOwnerOrAdmin && member.user_id !== user?.id && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-10 text-[#EF4444]/60 hover:text-[#EF4444] hover:bg-[#EF4444]/10 min-h-[44px] min-w-[44px]">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-foreground">{t.settings.removeMember}</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                          Are you sure you want to remove this member? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-muted border-border text-foreground">
                          {t.common.cancel}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveMember(member.id)}
                          className="bg-[#EF4444] text-white hover:bg-[#EF4444]/80"
                        >
                          {t.settings.removeMember}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SectionCard>

      {/* Danger Zone */}
      <SectionCard className="border-[#EF4444]/20 hover:shadow-[#EF4444]/5">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="size-4 text-[#EF4444]" />
          <SectionTitle className="text-[#EF4444] mb-0">Danger Zone</SectionTitle>
        </div>
        <SectionDescription>Irreversible and destructive actions</SectionDescription>

        <div className="space-y-3">
          {/* Leave Family */}
          {!isOwner && (
            <AlertDialog>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#EF4444]/5 border border-[#EF4444]/10">
                <div>
                  <p className="text-foreground text-sm font-medium">Leave Family</p>
                  <p className="text-muted-foreground text-xs">You will lose access to all family data</p>
                </div>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10">
                    <LogOut className="size-4" />
                    Leave
                  </Button>
                </AlertDialogTrigger>
              </div>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground">Leave Family</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    Are you sure you want to leave &quot;{currentFamily.name}&quot;? You will lose access to all shared data, tasks, and events.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-muted border-border text-foreground">
                    {t.common.cancel}
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleLeaveFamily} className="bg-[#EF4444] text-white hover:bg-[#EF4444]/80">
                    Leave Family
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Delete Family - owner only */}
          {isOwner && (
            <AlertDialog>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#EF4444]/5 border border-[#EF4444]/10">
                <div>
                  <p className="text-foreground text-sm font-medium">{t.common.delete} Family</p>
                  <p className="text-muted-foreground text-xs">Permanently delete this family and all its data</p>
                </div>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="size-4" />
                    {t.common.delete}
                  </Button>
                </AlertDialogTrigger>
              </div>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground">Delete Family</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    This will permanently delete &quot;{currentFamily.name}&quot; and remove all members, tasks, events, and data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-muted border-border text-foreground">
                    {t.common.cancel}
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteFamily} className="bg-[#EF4444] text-white hover:bg-[#EF4444]/80">
                    {t.common.delete} Family
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </SectionCard>
    </div>
  )
}
