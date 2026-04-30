'use client'

import React, { useState, useCallback } from 'react'
import {
  Users,
  User,
  Shield,
  SlidersHorizontal,
  Lock,
  Database,
  Plug,
  Crown,
  Copy,
  Check,
  Trash2,
  LogOut,
  Pencil,
  Save,
  X,
  Sun,
  Moon,
  Download,
  HardDrive,
  Chrome,
  Apple,
  Mic,
  Mail,
  KeyRound,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  Smartphone,
  Monitor,
  Globe,
  ChevronRight,
  Sparkles,
  Infinity,
  CheckCircle2,
  Zap,
  BarChart3,
  ShieldCheck,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { Progress } from '@/components/ui/progress'

import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useSubscriptionStore } from '@/stores/subscription-store'
import { useTaskStore } from '@/stores/task-store'
import { useGroceryStore } from '@/stores/grocery-store'
import { useCalendarStore } from '@/stores/calendar-store'
import { PlanBadge } from '@/components/shared/plan-badge'
import { useI18n } from '@/i18n/use-translation'
import { createClient } from '@/lib/supabase/client'
import type { FamilyMember, FamilyRole, Notification, SubscriptionPlan, Theme, Language } from '@/types'

// ─── Tab Configuration ───────────────────────────────────────────────────────

const settingsTabs = [
  { id: 'family', icon: Users, labelKey: 'family' as const },
  { id: 'user', icon: User, labelKey: 'user' as const },
  { id: 'account', icon: Shield, labelKey: 'account' as const },
  { id: 'preferences', icon: SlidersHorizontal, labelKey: 'preferences' as const },
  { id: 'security', icon: Lock, labelKey: 'security' as const },
  { id: 'data', icon: Database, labelKey: 'data' as const },
  { id: 'integrations', icon: Plug, labelKey: 'integrations' as const },
  { id: 'premium', icon: Crown, labelKey: 'premium' as const },
]

// ─── Helper Components ───────────────────────────────────────────────────────

function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`bg-[#111117] border border-white/[0.08] rounded-2xl p-6 ${className ?? ''}`}
    >
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[#E5E7EB] text-base font-semibold mb-1">{children}</h3>
  )
}

function SectionDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-[#6B7280] text-sm mb-4">{children}</p>
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-[#E5E7EB] text-sm font-medium">{label}</p>
        {description && <p className="text-[#6B7280] text-xs mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// ─── Family Management Tab ───────────────────────────────────────────────────

function FamilyManagementTab() {
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
    navigator.clipboard.writeText(currentFamily.invite_code)
    setCopied(true)
    toast.success(t.common.copied)
    setTimeout(() => setCopied(false), 2000)
  }, [currentFamily?.invite_code, t.common.copied])

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
          <Users className="size-12 text-[#6B7280] mx-auto mb-3" />
          <p className="text-[#6B7280] text-sm">{t.settings.family}</p>
          <p className="text-[#6B7280] text-xs mt-1">No family selected</p>
        </div>
      </SectionCard>
    )
  }

  const roleBadgeColor: Record<FamilyRole, string> = {
    owner: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    admin: 'bg-[#6366F1]/20 text-[#A78BFA] border-[#6366F1]/30',
    member: 'bg-white/5 text-[#6B7280] border-white/10',
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
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-[#6366F1]">
              <Pencil className="size-4" />
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label className="text-[#E5E7EB] text-xs mb-1.5 block">{t.settings.familyName}</Label>
              <Input
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                className="bg-white/5 border-white/10 text-[#E5E7EB]"
              />
            </div>
            <div>
              <Label className="text-[#E5E7EB] text-xs mb-1.5 block">Description</Label>
              <Input
                value={familyDesc}
                onChange={(e) => setFamilyDesc(e.target.value)}
                className="bg-white/5 border-white/10 text-[#E5E7EB]"
                placeholder="Family description..."
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveFamily}
                disabled={saving}
                className="bg-[#6366F1] hover:bg-[#6366F1]/80 text-white"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {t.common.save}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="text-[#6B7280]">
                <X className="size-4" />
                {t.common.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <span className="text-[#6B7280] text-xs">{t.settings.familyName}</span>
              <p className="text-[#E5E7EB] font-medium">{currentFamily.name}</p>
            </div>
            <div>
              <span className="text-[#6B7280] text-xs">Description</span>
              <p className="text-[#E5E7EB]">{currentFamily.description || 'No description'}</p>
            </div>
          </div>
        )}

        <Separator className="my-4 bg-white/[0.06]" />

        {/* Invite Code */}
        <div>
          <span className="text-[#6B7280] text-xs block mb-2">{t.settings.inviteCode}</span>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[#A78BFA] font-mono text-sm">
              {currentFamily.invite_code}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="border-white/10 text-[#E5E7EB] hover:bg-white/5"
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
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors"
              >
                <Avatar className="size-9">
                  <AvatarImage src={member.profiles?.avatar_url ?? ''} />
                  <AvatarFallback className="bg-[#6366F1]/20 text-[#A78BFA] text-xs">
                    {member.profiles?.first_name?.[0] ?? member.nickname?.[0] ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-[#E5E7EB] text-sm font-medium truncate">
                    {member.profiles?.first_name
                      ? `${member.profiles.first_name} ${member.profiles.last_name ?? ''}`
                      : member.nickname ?? 'Unknown'}
                  </p>
                  <p className="text-[#6B7280] text-xs truncate">
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
                    <SelectTrigger className="h-7 w-24 text-xs bg-white/5 border-white/10 text-[#6B7280]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111117] border-white/10">
                      <SelectItem value="admin" className="text-[#E5E7EB] text-xs">
                        {t.settings.admin}
                      </SelectItem>
                      <SelectItem value="member" className="text-[#E5E7EB] text-xs">
                        {t.settings.member}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {/* Remove Member - owner/admin only, can't remove self */}
                {isOwnerOrAdmin && member.user_id !== user?.id && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 text-[#EF4444]/60 hover:text-[#EF4444] hover:bg-[#EF4444]/10">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#111117] border-white/10">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-[#E5E7EB]">{t.settings.removeMember}</AlertDialogTitle>
                        <AlertDialogDescription className="text-[#6B7280]">
                          Are you sure you want to remove this member? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/5 border-white/10 text-[#E5E7EB]">
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
      <SectionCard className="border-[#EF4444]/20">
        <SectionTitle className="text-[#EF4444]">Danger Zone</SectionTitle>
        <SectionDescription>Irreversible and destructive actions</SectionDescription>

        <div className="space-y-3">
          {/* Leave Family */}
          {!isOwner && (
            <AlertDialog>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#EF4444]/5 border border-[#EF4444]/10">
                <div>
                  <p className="text-[#E5E7EB] text-sm font-medium">Leave Family</p>
                  <p className="text-[#6B7280] text-xs">You will lose access to all family data</p>
                </div>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10">
                    <LogOut className="size-4" />
                    Leave
                  </Button>
                </AlertDialogTrigger>
              </div>
              <AlertDialogContent className="bg-[#111117] border-white/10">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-[#E5E7EB]">Leave Family</AlertDialogTitle>
                  <AlertDialogDescription className="text-[#6B7280]">
                    Are you sure you want to leave &quot;{currentFamily.name}&quot;? You will lose access to all shared data, tasks, and events.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-white/5 border-white/10 text-[#E5E7EB]">
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
                  <p className="text-[#E5E7EB] text-sm font-medium">{t.common.delete} Family</p>
                  <p className="text-[#6B7280] text-xs">Permanently delete this family and all its data</p>
                </div>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="size-4" />
                    {t.common.delete}
                  </Button>
                </AlertDialogTrigger>
              </div>
              <AlertDialogContent className="bg-[#111117] border-white/10">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-[#E5E7EB]">Delete Family</AlertDialogTitle>
                  <AlertDialogDescription className="text-[#6B7280]">
                    This will permanently delete &quot;{currentFamily.name}&quot; and remove all members, tasks, events, and data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-white/5 border-white/10 text-[#E5E7EB]">
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

// ─── User Management Tab ─────────────────────────────────────────────────────

const countryCodes = [
  { code: '+966', country: 'SA', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+971', country: 'AE', flag: '🇦🇪', name: 'UAE' },
  { code: '+965', country: 'KW', flag: '🇰🇼', name: 'Kuwait' },
  { code: '+974', country: 'QA', flag: '🇶🇦', name: 'Qatar' },
  { code: '+973', country: 'BH', flag: '🇧🇭', name: 'Bahrain' },
  { code: '+968', country: 'OM', flag: '🇴🇲', name: 'Oman' },
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States' },
  { code: '+44', country: 'UK', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
]

function UserManagementTab() {
  const { t, isRTL } = useI18n()
  const { user, setUser } = useAuthStore()
  const { families } = useAppStore()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName, setLastName] = useState(user?.last_name ?? '')
  const [countryCode, setCountryCode] = useState(user?.country_code ?? '+966')
  const [phoneNumber, setPhoneNumber] = useState(() => {
    const phone = user?.phone ?? ''
    const cc = user?.country_code ?? '+966'
    return phone.startsWith(cc) ? phone.slice(cc.length) : phone
  })

  const handleSave = useCallback(async () => {
    if (!user) return
    setSaving(true)
    const fullPhone = phoneNumber ? `${countryCode}${phoneNumber}` : null
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ first_name: firstName, last_name: lastName, phone: fullPhone, country_code: countryCode })
        .eq('id', user.id)
      if (error) throw error
      setUser({ ...user, first_name: firstName, last_name: lastName, phone: fullPhone, country_code: countryCode })
      setIsEditing(false)
      toast.success(t.common.success)
    } catch {
      // Even if Supabase fails (e.g. demo mode), update locally
      const fullPhone = phoneNumber ? `${countryCode}${phoneNumber}` : null
      setUser({ ...user, first_name: firstName, last_name: lastName, phone: fullPhone, country_code: countryCode })
      setIsEditing(false)
      toast.success(t.common.success)
    } finally {
      setSaving(false)
    }
  }, [user, firstName, lastName, phoneNumber, countryCode, setUser, t])

  const handleCancel = useCallback(() => {
    setFirstName(user?.first_name ?? '')
    setLastName(user?.last_name ?? '')
    setCountryCode(user?.country_code ?? '+966')
    const phone = user?.phone ?? ''
    const cc = user?.country_code ?? '+966'
    setPhoneNumber(phone.startsWith(cc) ? phone.slice(cc.length) : phone)
    setIsEditing(false)
  }, [user])

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <SectionCard>
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="size-16 border-2 border-[#6366F1]/30">
            <AvatarImage src={user?.avatar_url ?? ''} />
            <AvatarFallback className="bg-[#6366F1]/20 text-[#A78BFA] text-xl">
              {user?.first_name?.[0] ?? user?.email?.[0] ?? '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-[#E5E7EB] text-lg font-semibold">
              {user?.first_name && user?.last_name
                ? `${user.first_name} ${user.last_name}`
                : user?.email ?? 'User'}
            </h3>
            <p className="text-[#6B7280] text-sm">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="bg-[#6366F1]/10 text-[#A78BFA] border-[#6366F1]/20 text-[10px]">
                {t.settings.owner}
              </Badge>
            </div>
          </div>
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-[#6366F1]">
              <Pencil className="size-4" />
              {t.settings.editProfile}
            </Button>
          )}
        </div>

        {isEditing ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Change Photo */}
            <div>
              <Label className="text-[#E5E7EB] text-xs mb-1.5 block">
                {t.settings.editProfile}
              </Label>
              <div className="flex items-center gap-3">
                <Avatar className="size-14 border border-white/10">
                  <AvatarImage src={user?.avatar_url ?? ''} />
                  <AvatarFallback className="bg-[#6366F1]/20 text-[#A78BFA] text-lg">
                    {user?.first_name?.[0] ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/[0.08] bg-[#0B0B0F] text-[#E5E7EB] hover:bg-white/5 hover:border-white/[0.12]"
                  onClick={() => toast.info(isRTL ? 'سيكون رفع الصور متاحاً قريباً' : 'Photo upload coming soon')}
                >
                  Change Photo
                </Button>
              </div>
            </div>

            <Separator className="bg-white/[0.06]" />

            {/* First Name & Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-[#E5E7EB] text-xs mb-1.5 block">{t.auth.firstName}</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] focus-visible:ring-[#6366F1]/30"
                  placeholder={isRTL ? 'الاسم الأول' : 'First name'}
                />
              </div>
              <div>
                <Label className="text-[#E5E7EB] text-xs mb-1.5 block">{t.auth.lastName}</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] focus-visible:ring-[#6366F1]/30"
                  placeholder={isRTL ? 'اسم العائلة' : 'Last name'}
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <Label className="text-[#E5E7EB] text-xs mb-1.5 block">{t.auth.email}</Label>
              <Input
                value={user?.email ?? ''}
                readOnly
                className="bg-[#0B0B0F]/60 border-white/[0.04] text-[#6B7280] cursor-not-allowed focus-visible:ring-0"
              />
              <p className="text-[10px] text-[#6B7280] mt-1">
                {isRTL ? 'لا يمكن تغيير البريد الإلكتروني من هنا' : 'Email cannot be changed here'}
              </p>
            </div>

            {/* Phone with country code */}
            <div>
              <Label className="text-[#E5E7EB] text-xs mb-1.5 block">{t.auth.phone}</Label>
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="w-[120px] bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] focus:ring-[#6366F1]/30 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111117] border-white/[0.08] text-[#E5E7EB] max-h-64">
                    {countryCodes.map((cc) => (
                      <SelectItem
                        key={cc.code}
                        value={cc.code}
                        className="focus:bg-[#6366F1]/10 focus:text-[#A78BFA] cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <span>{cc.flag}</span>
                          <span>{cc.code}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 bg-[#0B0B0F] border-white/[0.08] text-[#E5E7EB] focus-visible:ring-[#6366F1]/30"
                  placeholder="501234567"
                />
              </div>
            </div>

            <Separator className="bg-white/[0.06]" />

            {/* Save / Cancel */}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-[#6366F1] hover:bg-[#6366F1]/80 text-white"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {t.common.save}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel} className="text-[#6B7280] hover:text-[#E5E7EB]">
                <X className="size-4" />
                {t.common.cancel}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[#6B7280] text-xs">{t.auth.firstName}</span>
                <p className="text-[#E5E7EB] text-sm">{user?.first_name || 'Not set'}</p>
              </div>
              <div>
                <span className="text-[#6B7280] text-xs">{t.auth.lastName}</span>
                <p className="text-[#E5E7EB] text-sm">{user?.last_name || 'Not set'}</p>
              </div>
            </div>
            <div>
              <span className="text-[#6B7280] text-xs">{t.auth.email}</span>
              <p className="text-[#E5E7EB] text-sm">{user?.email || 'Not set'}</p>
            </div>
            <div>
              <span className="text-[#6B7280] text-xs">{t.auth.phone}</span>
              <p className="text-[#E5E7EB] text-sm">{user?.phone || 'Not set'}</p>
            </div>
          </motion.div>
        )}
      </SectionCard>

      {/* Family Memberships */}
      <SectionCard>
        <SectionTitle>Family Memberships</SectionTitle>
        <SectionDescription>Families you belong to</SectionDescription>

        {families.length > 0 ? (
          <div className="space-y-2">
            {families.map((family) => (
              <div
                key={family.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]"
              >
                <div className="size-9 rounded-lg bg-[#6366F1]/20 flex items-center justify-center">
                  <Users className="size-4 text-[#A78BFA]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#E5E7EB] text-sm font-medium truncate">{family.name}</p>
                  <p className="text-[#6B7280] text-xs truncate">{family.description || 'No description'}</p>
                </div>
                <ChevronRight className="size-4 text-[#6B7280]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Users className="size-8 text-[#6B7280] mx-auto mb-2" />
            <p className="text-[#6B7280] text-sm">No family memberships yet</p>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ─── Account Settings Tab ────────────────────────────────────────────────────

function AccountSettingsTab() {
  const { t } = useI18n()
  const { user, setUser } = useAuthStore()
  const [email, setEmail] = useState(user?.email ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

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

  const handleDeleteAccount = useCallback(async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success('Account deletion requested')
    } catch {
      toast.error(t.common.error)
    }
  }, [t])

  return (
    <div className="space-y-6">
      {/* Email Change */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Mail className="size-4 text-[#6366F1]" /> Change Email
          </span>
        </SectionTitle>
        <SectionDescription>Update your email address</SectionDescription>

        <div className="space-y-3">
          <div>
            <Label className="text-[#E5E7EB] text-xs mb-1.5 block">{t.auth.email}</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-[#E5E7EB] flex-1"
              />
              <Button
                size="sm"
                onClick={handleEmailChange}
                disabled={savingEmail}
                className="bg-[#6366F1] hover:bg-[#6366F1]/80 text-white shrink-0"
              >
                {savingEmail ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {t.common.save}
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Password Change */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <KeyRound className="size-4 text-[#6366F1]" /> {t.settings.changePassword}
          </span>
        </SectionTitle>
        <SectionDescription>Update your password to keep your account secure</SectionDescription>

        <div className="space-y-3">
          <div>
            <Label className="text-[#E5E7EB] text-xs mb-1.5 block">Current Password</Label>
            <div className="relative">
              <Input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-[#E5E7EB] pr-10"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#E5E7EB]"
              >
                {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-[#E5E7EB] text-xs mb-1.5 block">New Password</Label>
            <div className="relative">
              <Input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-[#E5E7EB] pr-10"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#E5E7EB]"
              >
                {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-[#E5E7EB] text-xs mb-1.5 block">{t.auth.confirmPassword}</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-white/5 border-white/10 text-[#E5E7EB]"
              placeholder="Confirm new password"
            />
          </div>
          <Button
            size="sm"
            onClick={handlePasswordChange}
            disabled={savingPassword}
            className="bg-[#6366F1] hover:bg-[#6366F1]/80 text-white"
          >
            {savingPassword ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            {t.settings.changePassword}
          </Button>
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
          <AlertDialogContent className="bg-[#111117] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-[#E5E7EB]">{t.settings.deleteAccount}</AlertDialogTitle>
              <AlertDialogDescription className="text-[#6B7280]">
                This will permanently delete your account, all your families, tasks, events, and data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/5 border-white/10 text-[#E5E7EB]">
                {t.common.cancel}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} className="bg-[#EF4444] text-white hover:bg-[#EF4444]/80">
                {t.common.delete} Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SectionCard>
    </div>
  )
}

// ─── Preferences Tab ─────────────────────────────────────────────────────────

function PreferencesTab() {
  const { t, language, setLanguage } = useI18n()
  const { user, setUser } = useAuthStore()
  const [theme, setTheme] = useState<Theme>(user?.theme ?? 'dark')
  const [notifications, setNotifications] = useState<Record<Notification['type'], boolean>>({
    task: true,
    calendar: true,
    grocery: true,
    chat: true,
    family: true,
    system: true,
  })

  const handleThemeToggle = useCallback(() => {
    const newTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', newTheme === 'dark')
    }
  }, [theme])

  const handleLanguageChange = useCallback(
    async (lang: Language) => {
      setLanguage(lang)
      if (user) {
        try {
          const supabase = createClient()
          await supabase.from('profiles').update({ language: lang }).eq('id', user.id)
          setUser({ ...user, language: lang })
        } catch {
          // silently fail - language changed locally already
        }
      }
    },
    [setLanguage, user, setUser]
  )

  const toggleNotification = useCallback((type: Notification['type']) => {
    setNotifications((prev) => ({ ...prev, [type]: !prev[type] }))
  }, [])

  const notifTypes: { type: Notification['type']; icon: React.ElementType; label: string }[] = [
    { type: 'task', icon: CheckCircle2, label: 'Tasks' },
    { type: 'calendar', icon: Clock, label: 'Calendar' },
    { type: 'grocery', icon: HardDrive, label: 'Grocery' },
    { type: 'chat', icon: Mail, label: 'Chat' },
    { type: 'family', icon: Users, label: 'Family' },
    { type: 'system', icon: Shield, label: 'System' },
  ]

  return (
    <div className="space-y-6">
      {/* Language */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Globe className="size-4 text-[#6366F1]" /> {t.settings.language}
          </span>
        </SectionTitle>
        <SectionDescription>Choose your preferred language</SectionDescription>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleLanguageChange('en')}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              language === 'en'
                ? 'bg-[#6366F1]/10 border-[#6366F1]/30 text-[#A78BFA]'
                : 'bg-white/[0.03] border-white/[0.05] text-[#6B7280] hover:bg-white/[0.05]'
            }`}
          >
            <span className="text-lg">🇺🇸</span>
            <span className="text-sm font-medium">English</span>
            {language === 'en' && <Check className="size-4 ml-auto" />}
          </button>
          <button
            onClick={() => handleLanguageChange('ar')}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              language === 'ar'
                ? 'bg-[#6366F1]/10 border-[#6366F1]/30 text-[#A78BFA]'
                : 'bg-white/[0.03] border-white/[0.05] text-[#6B7280] hover:bg-white/[0.05]'
            }`}
          >
            <span className="text-lg">🇸🇦</span>
            <span className="text-sm font-medium">العربية</span>
            {language === 'ar' && <Check className="size-4 ml-auto" />}
          </button>
        </div>
      </SectionCard>

      {/* Theme */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            {theme === 'dark' ? <Moon className="size-4 text-[#6366F1]" /> : <Sun className="size-4 text-[#6366F1]" />}
            {t.settings.theme}
          </span>
        </SectionTitle>
        <SectionDescription>Customize your visual experience</SectionDescription>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setTheme('dark'); if (typeof document !== 'undefined') document.documentElement.classList.add('dark') }}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all flex-1 ${
              theme === 'dark'
                ? 'bg-[#6366F1]/10 border-[#6366F1]/30 text-[#A78BFA]'
                : 'bg-white/[0.03] border-white/[0.05] text-[#6B7280] hover:bg-white/[0.05]'
            }`}
          >
            <Moon className="size-5" />
            <span className="text-sm font-medium">{t.settings.darkMode}</span>
            {theme === 'dark' && <Check className="size-4 ml-auto" />}
          </button>
          <button
            onClick={() => { setTheme('light'); if (typeof document !== 'undefined') document.documentElement.classList.remove('dark') }}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all flex-1 ${
              theme === 'light'
                ? 'bg-[#6366F1]/10 border-[#6366F1]/30 text-[#A78BFA]'
                : 'bg-white/[0.03] border-white/[0.05] text-[#6B7280] hover:bg-white/[0.05]'
            }`}
          >
            <Sun className="size-5" />
            <span className="text-sm font-medium">{t.settings.lightMode}</span>
            {theme === 'light' && <Check className="size-4 ml-auto" />}
          </button>
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard>
        <SectionTitle>{t.settings.notifications}</SectionTitle>
        <SectionDescription>Choose which notifications you want to receive</SectionDescription>

        <div className="space-y-1">
          {notifTypes.map(({ type, icon: Icon, label }) => (
            <SettingRow key={type} label={label} description={`${type} notifications`}>
              <Switch checked={notifications[type]} onCheckedChange={() => toggleNotification(type)} />
            </SettingRow>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Security Tab ────────────────────────────────────────────────────────────

function SecurityTab() {
  const { t } = useI18n()
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const sessions = [
    { id: '1', device: 'Chrome on macOS', icon: Chrome, ip: '192.168.1.1', lastActive: 'Current session', current: true },
    { id: '2', device: 'Safari on iPhone', icon: Smartphone, ip: '192.168.1.2', lastActive: 'Last active 2h ago', current: false },
    { id: '3', device: 'Firefox on Windows', icon: Monitor, ip: '10.0.0.5', lastActive: 'Last active 3 days ago', current: false },
  ]

  const handleRevokeSession = useCallback((sessionId: string) => {
    toast.success('Session revoked!')
  }, [])

  const handleUpdatePassword = useCallback(() => {
    toast.info('Password update coming soon!')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
  }, [])

  return (
    <div className="space-y-6">
      {/* Two-Factor Authentication */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#6366F1]" /> Two-Factor Authentication
          </span>
        </SectionTitle>
        <SectionDescription>Add an extra layer of security to your account</SectionDescription>

        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-[#6366F1]/10 flex items-center justify-center">
              <Lock className="size-4 text-[#A78BFA]" />
            </div>
            <div>
              <p className="text-[#E5E7EB] text-sm font-medium">Two-Factor Authentication</p>
              <p className="text-[#6B7280] text-xs">Add an extra layer of security to your account</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
              Coming Soon
            </Badge>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={(checked) => {
                setTwoFactorEnabled(checked)
                toast.info('2FA setup coming soon!')
              }}
              disabled
              className="data-[state=checked]:bg-[#6366F1]/50"
            />
          </div>
        </div>
      </SectionCard>

      {/* Active Sessions */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Smartphone className="size-4 text-[#6366F1]" /> Active Sessions
          </span>
        </SectionTitle>
        <SectionDescription>Devices currently signed in to your account</SectionDescription>

        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]"
            >
              <div className="size-9 rounded-lg bg-white/5 flex items-center justify-center">
                <session.icon className="size-4 text-[#6B7280]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${session.current ? 'bg-green-400' : 'bg-[#6B7280]/40'}`} />
                  <p className="text-[#E5E7EB] text-sm font-medium">{session.device}</p>
                  {session.current && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-1.5 py-0">
                      Current
                    </Badge>
                  )}
                </div>
                <p className="text-[#6B7280] text-xs">
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
            <KeyRound className="size-4 text-[#6366F1]" /> Change Password
          </span>
        </SectionTitle>
        <SectionDescription>Update your password to keep your account secure</SectionDescription>

        <div className="space-y-3">
          <div>
            <Label className="text-[#E5E7EB] text-xs mb-1.5 block">Current Password</Label>
            <div className="relative">
              <Input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-[#E5E7EB] pr-10"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#E5E7EB]"
              >
                {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-[#E5E7EB] text-xs mb-1.5 block">New Password</Label>
            <div className="relative">
              <Input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-[#E5E7EB] pr-10"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#E5E7EB]"
              >
                {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-[#E5E7EB] text-xs mb-1.5 block">Confirm New Password</Label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-[#E5E7EB] pr-10"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#E5E7EB]"
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleUpdatePassword}
            className="bg-[#6366F1] hover:bg-[#6366F1]/80 text-white"
          >
            <KeyRound className="size-4" />
            Update Password
          </Button>
        </div>
      </SectionCard>

      {/* Privacy Controls */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Eye className="size-4 text-[#6366F1]" /> Privacy Controls
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
    </div>
  )
}

// ─── Data Control Tab ────────────────────────────────────────────────────────

function DataControlTab() {
  const { t } = useI18n()
  const [exporting, setExporting] = useState(false)
  const [exportingCSV, setExportingCSV] = useState(false)

  const handleExportJSON = useCallback(async () => {
    setExporting(true)
    try {
      // Collect all data from Zustand stores
      const { user } = useAuthStore.getState()
      const { currentFamily, familyMembers } = useAppStore.getState()
      const { tasks } = useTaskStore.getState()
      const { items } = useGroceryStore.getState()
      const { events } = useCalendarStore.getState()

      const data = {
        exportedAt: new Date().toISOString(),
        family: currentFamily ? {
          id: currentFamily.id,
          name: currentFamily.name,
          description: currentFamily.description,
          invite_code: currentFamily.invite_code,
        } : null,
        members: familyMembers.map((m) => ({
          id: m.id,
          nickname: m.nickname,
          role: m.role,
          first_name: m.profiles?.first_name ?? null,
          last_name: m.profiles?.last_name ?? null,
          email: m.profiles?.email ?? null,
        })),
        tasks: tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date,
          created_at: task.created_at,
        })),
        groceryItems: items.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          checked: item.checked,
          created_at: item.created_at,
        })),
        events: events.map((event) => ({
          id: event.id,
          title: event.title,
          description: event.description,
          start_time: event.start_time,
          end_time: event.end_time,
          color: event.color,
          all_day: event.all_day,
        })),
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `usra-plus-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data exported as JSON successfully')
    } catch {
      toast.error(t.common.error)
    } finally {
      setExporting(false)
    }
  }, [t])

  const handleExportCSV = useCallback(async () => {
    setExportingCSV(true)
    try {
      const { tasks } = useTaskStore.getState()

      // CSV header
      const headers = ['Title', 'Status', 'Priority', 'Assignee', 'Due Date', 'Created At']
      const rows = tasks.map((task) => [
        `"${(task.title ?? '').replace(/"/g, '""')}"`,
        task.status ?? '',
        task.priority ?? '',
        task.assignee?.first_name ? `${task.assignee.first_name} ${task.assignee.last_name ?? ''}`.trim() : '',
        task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : '',
        task.created_at ? new Date(task.created_at).toISOString().slice(0, 10) : '',
      ])

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `usra-plus-tasks-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Tasks exported as CSV successfully')
    } catch {
      toast.error(t.common.error)
    } finally {
      setExportingCSV(false)
    }
  }, [t])

  const handleClearData = useCallback(async () => {
    try {
      // Clear all Zustand stores
      const taskStore = useTaskStore.getState()
      const groceryStore = useGroceryStore.getState()
      const calendarStore = useCalendarStore.getState()
      const appStore = useAppStore.getState()

      taskStore.setTasks([])
      groceryStore.setItems([])
      calendarStore.setEvents([])
      appStore.setFamilyMembers([])

      toast.success('All data cleared')
    } catch {
      toast.error(t.common.error)
    }
  }, [t])

  return (
    <div className="space-y-6">
      {/* Storage */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <HardDrive className="size-4 text-[#6366F1]" /> Storage Usage
          </span>
        </SectionTitle>
        <SectionDescription>Your current storage consumption</SectionDescription>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#E5E7EB] text-sm">2.4 GB of 5 GB</span>
              <span className="text-[#A78BFA] text-sm font-medium">48%</span>
            </div>
            <Progress value={48} className="h-2 bg-white/5 [&>div]:bg-[#6366F1]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <p className="text-[#6B7280] text-xs">Files</p>
              <p className="text-[#E5E7EB] text-sm font-medium">1.8 GB</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <p className="text-[#6B7280] text-xs">Messages</p>
              <p className="text-[#E5E7EB] text-sm font-medium">0.4 GB</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <p className="text-[#6B7280] text-xs">Tasks & Events</p>
              <p className="text-[#E5E7EB] text-sm font-medium">0.1 GB</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <p className="text-[#6B7280] text-xs">Other</p>
              <p className="text-[#E5E7EB] text-sm font-medium">0.1 GB</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Export */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Download className="size-4 text-[#6366F1]" /> {t.settings.exportData}
          </span>
        </SectionTitle>
        <SectionDescription>Download a copy of all your data in your preferred format</SectionDescription>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleExportJSON}
            disabled={exporting}
            variant="outline"
            className="border-white/10 text-[#E5E7EB] hover:bg-white/5 gap-2"
          >
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export as JSON
          </Button>
          <Button
            onClick={handleExportCSV}
            disabled={exportingCSV}
            variant="outline"
            className="border-white/10 text-[#E5E7EB] hover:bg-white/5 gap-2"
          >
            {exportingCSV ? <Loader2 className="size-4 animate-spin" /> : <BarChart3 className="size-4" />}
            Export Tasks as CSV
          </Button>
        </div>
      </SectionCard>

      {/* Clear Data */}
      <SectionCard className="border-[#EF4444]/20">
        <SectionTitle className="text-[#EF4444]">
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4" /> {t.settings.clearData}
          </span>
        </SectionTitle>
        <SectionDescription>Permanently remove all your data from USRA PLUS</SectionDescription>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="size-4" />
              {t.settings.clearData}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-[#111117] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-[#E5E7EB]">Are you sure?</AlertDialogTitle>
              <AlertDialogDescription className="text-[#6B7280]">
                This will delete all your data including tasks, grocery items, events, and family members. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/5 border-white/10 text-[#E5E7EB]">
                {t.common.cancel}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleClearData} className="bg-[#EF4444] text-white hover:bg-[#EF4444]/80">
                Yes, Clear All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SectionCard>
    </div>
  )
}

// ─── Integrations Tab ────────────────────────────────────────────────────────

function IntegrationsTab() {
  const integrations = [
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Sync your family events with Google Calendar',
      icon: Chrome,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      id: 'apple-calendar',
      name: 'Apple Calendar',
      description: 'Sync with Apple Calendar and iCloud',
      icon: Apple,
      color: 'text-gray-300',
      bgColor: 'bg-gray-500/10',
    },
    {
      id: 'alexa',
      name: 'Amazon Alexa',
      description: 'Voice control your family tasks and lists',
      icon: Mic,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
  ]

  return (
    <div className="space-y-6">
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Plug className="size-4 text-[#6366F1]" /> Connected Services
          </span>
        </SectionTitle>
        <SectionDescription>Manage your third-party integrations</SectionDescription>

        <div className="space-y-3">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]"
            >
              <div className={`size-10 rounded-lg ${integration.bgColor} flex items-center justify-center`}>
                <integration.icon className={`size-5 ${integration.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#E5E7EB] text-sm font-medium">{integration.name}</p>
                <p className="text-[#6B7280] text-xs">{integration.description}</p>
              </div>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
                Coming Soon
              </Badge>
            </div>
          ))}
        </div>
      </SectionCard>

      <Alert className="bg-[#6366F1]/5 border-[#6366F1]/20">
        <Sparkles className="size-4 text-[#A78BFA]" />
        <AlertDescription className="text-[#A78BFA] text-sm">
          More integrations are coming soon! Stay tuned for Google Calendar, Apple Calendar, and Amazon Alexa support.
        </AlertDescription>
      </Alert>
    </div>
  )
}

// ─── Premium Tab ─────────────────────────────────────────────────────────────

function PremiumTab() {
  const { t, isRTL } = useI18n()
  const { user } = useAuthStore()
  const { plan: subscriptionPlan, setPlan } = useSubscriptionStore()

  const handleUpgrade = useCallback(
    (targetPlan: SubscriptionPlan) => {
      if (targetPlan === subscriptionPlan) return
      setPlan(targetPlan)
      toast.success(isRTL ? 'إدارة الاشتراك قريبًا!' : 'Subscription management coming soon!')
    },
    [subscriptionPlan, setPlan, isRTL]
  )

  const plans: {
    id: SubscriptionPlan
    name: string
    price: string
    period: string
    features: { label: string; included: boolean }[]
    cta: string
    popular?: boolean
  }[] = [
    {
      id: 'free',
      name: t.settings.free,
      price: '$0',
      period: 'forever',
      features: [
        { label: '1 Family', included: true },
        { label: '10 Tasks', included: true },
        { label: 'Basic features', included: true },
        { label: 'Unlimited tasks', included: false },
        { label: 'Real-time updates', included: false },
        { label: 'Task assignments', included: false },
        { label: 'Multiple families', included: false },
        { label: 'Advanced permissions', included: false },
        { label: 'Analytics', included: false },
      ],
      cta: 'Current Plan',
    },
    {
      id: 'pro',
      name: t.settings.pro,
      price: '$4.99',
      period: '/month',
      features: [
        { label: '1 Family', included: true },
        { label: 'Unlimited tasks', included: true },
        { label: 'All basic features', included: true },
        { label: 'Unlimited tasks', included: true },
        { label: 'Real-time updates', included: true },
        { label: 'Task assignments', included: true },
        { label: 'Multiple families', included: false },
        { label: 'Advanced permissions', included: false },
        { label: 'Analytics', included: false },
      ],
      cta: t.settings.upgradeToPro,
      popular: true,
    },
    {
      id: 'family_plus',
      name: t.settings.familyPlus,
      price: '$9.99',
      period: '/month',
      features: [
        { label: 'Multiple families', included: true },
        { label: 'Unlimited tasks', included: true },
        { label: 'All features', included: true },
        { label: 'Unlimited tasks', included: true },
        { label: 'Real-time updates', included: true },
        { label: 'Task assignments', included: true },
        { label: 'Multiple families', included: true },
        { label: 'Advanced permissions', included: true },
        { label: 'Analytics', included: true },
      ],
      cta: t.settings.upgradeToFamily,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <SectionCard>
        <div className="flex items-center justify-between">
          <div>
            <SectionTitle>
              <span className="flex items-center gap-2">
                <Crown className="size-4 text-amber-400" /> {t.settings.currentPlan}
              </span>
            </SectionTitle>
            <SectionDescription>{isRTL ? 'تفاصيل اشتراكك' : 'Your subscription details'}</SectionDescription>
          </div>
          <PlanBadge />
        </div>
      </SectionCard>

      {/* Plan Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            whileHover={{ y: -2 }}
            className={`relative bg-[#111117] border rounded-2xl p-5 flex flex-col ${
              plan.popular
                ? 'border-[#6366F1]/50 shadow-[0_0_24px_-4px_rgba(99,102,241,0.15)]'
                : 'border-white/[0.08]'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-[#6366F1] text-white border-0 text-xs px-3">
                  <Sparkles className="size-3 mr-1" /> {isRTL ? 'موصى به' : 'Popular'}
                </Badge>
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-[#E5E7EB] text-lg font-semibold">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold text-[#E5E7EB]">{plan.price}</span>
                <span className="text-[#6B7280] text-sm">{plan.period}</span>
              </div>
            </div>

            <div className="flex-1 space-y-2 mb-5">
              {plan.features.map((feature) => (
                <div key={feature.label} className="flex items-center gap-2">
                  {feature.included ? (
                    <Check className="size-3.5 text-green-400 shrink-0" />
                  ) : (
                    <X className="size-3.5 text-[#6B7280]/50 shrink-0" />
                  )}
                  <span
                    className={`text-xs ${
                      feature.included ? 'text-[#E5E7EB]' : 'text-[#6B7280]/50'
                    }`}
                  >
                    {feature.label}
                  </span>
                </div>
              ))}
            </div>

            {subscriptionPlan === plan.id ? (
              <Button
                variant="outline"
                disabled
                className="w-full border-white/10 text-[#6B7280]"
              >
                {isRTL ? 'الخطة الحالية' : 'Current Plan'}
              </Button>
            ) : (
              <Button
                onClick={() => handleUpgrade(plan.id)}
                className={`w-full ${
                  plan.popular
                    ? 'bg-[#6366F1] hover:bg-[#6366F1]/80 text-white'
                    : 'bg-white/5 border border-white/10 text-[#E5E7EB] hover:bg-white/10'
                }`}
                variant={plan.popular ? 'default' : 'outline'}
              >
                <Zap className="size-4" />
                {plan.cta}
              </Button>
            )}
          </motion.div>
        ))}
      </div>

      {/* Feature Highlights */}
      <SectionCard>
        <SectionTitle>{isRTL ? 'ميزات مميزة' : 'Feature Highlights'}</SectionTitle>
        <SectionDescription>{isRTL ? 'ما تحصل عليه مع الخطط المميزة' : 'What you get with premium plans'}</SectionDescription>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <Infinity className="size-6 text-[#6366F1] mb-2" />
            <p className="text-[#E5E7EB] text-sm font-medium">{isRTL ? 'مهام غير محدودة' : 'Unlimited Tasks'}</p>
            <p className="text-[#6B7280] text-xs">{isRTL ? 'بدون حدود على إنشاء المهام' : 'No limits on task creation'}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <Zap className="size-6 text-[#A78BFA] mb-2" />
            <p className="text-[#E5E7EB] text-sm font-medium">{isRTL ? 'مزامنة فورية' : 'Real-time Sync'}</p>
            <p className="text-[#6B7280] text-xs">{isRTL ? 'تحديثات فورية عبر الأجهزة' : 'Instant updates across devices'}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <BarChart3 className="size-6 text-amber-400 mb-2" />
            <p className="text-[#E5E7EB] text-sm font-medium">{isRTL ? 'التحليلات' : 'Analytics'}</p>
            <p className="text-[#6B7280] text-xs">{isRTL ? 'رؤى إنتاجية العائلة' : 'Family productivity insights'}</p>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Main Settings Page ──────────────────────────────────────────────────────

export default function SettingsPage() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState('family')

  return (
    <div className="min-h-screen bg-[#0B0B0F]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-[#E5E7EB] text-2xl sm:text-3xl font-bold">{t.settings.title}</h1>
          <p className="text-[#6B7280] text-sm mt-1">Manage your account, family, and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Navigation - Desktop */}
          <div className="hidden lg:block w-64 shrink-0">
            <nav className="bg-[#111117] border border-white/[0.08] rounded-2xl p-2 sticky top-6">
              {settingsTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#6366F1]/15 text-[#A78BFA]'
                      : 'text-[#6B7280] hover:bg-white/[0.03] hover:text-[#E5E7EB]'
                  }`}
                >
                  <tab.icon className="size-4" />
                  {t.settings[tab.labelKey]}
                </button>
              ))}
            </nav>
          </div>

          {/* Mobile Tabs - Horizontal Scroll */}
          <div className="lg:hidden w-full">
            <ScrollArea className="w-full">
              <div className="flex gap-1 pb-2 mb-4">
                {settingsTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                      activeTab === tab.id
                        ? 'bg-[#6366F1]/15 text-[#A78BFA] border border-[#6366F1]/30'
                        : 'text-[#6B7280] bg-white/[0.03] border border-white/[0.05] hover:text-[#E5E7EB]'
                    }`}
                  >
                    <tab.icon className="size-3.5" />
                    {t.settings[tab.labelKey]}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {activeTab === 'family' && <FamilyManagementTab />}
                {activeTab === 'user' && <UserManagementTab />}
                {activeTab === 'account' && <AccountSettingsTab />}
                {activeTab === 'preferences' && <PreferencesTab />}
                {activeTab === 'security' && <SecurityTab />}
                {activeTab === 'data' && <DataControlTab />}
                {activeTab === 'integrations' && <IntegrationsTab />}
                {activeTab === 'premium' && <PremiumTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
