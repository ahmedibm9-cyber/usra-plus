'use client'

import React, { useState, useCallback } from 'react'
import {
 Users,
 User,
 Shield,
 SlidersHorizontal,
 Bell,
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
 Volume2,
 Vibrate,
 CalendarDays,
 ShoppingCart,
 MessageCircle,
 UserPlus,
 UserMinus,
 AtSign,
 RefreshCw,
 QrCode,
 Home,
 Heart,
 Share2,
 MessageSquare,
 Wand2,
 Upload,
 FileJson,
 FileSpreadsheet,
 Palette,
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
import { Checkbox } from '@/components/ui/checkbox'

import dynamic from 'next/dynamic'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useSubscriptionStore } from '@/stores/subscription-store'
import { useTaskStore } from '@/stores/task-store'
import { useGroceryStore } from '@/stores/grocery-store'
import { useCalendarStore } from '@/stores/calendar-store'
import { useChatStore } from '@/stores/chat-store'
import { useNotificationPreferencesStore } from '@/stores/notification-preferences-store'
import { useUIPreferencesStore, ACCENT_COLORS } from '@/stores/ui-preferences-store'
import type { Task, CalendarEvent, GroceryItem, ChatMessage } from '@/types'
import { PlanBadge } from '@/components/shared/plan-badge'
import { AvatarGenerator } from '@/components/shared/avatar-generator'
import { useI18n } from '@/i18n/use-translation'
import { createClient } from '@/lib/supabase/client'
import { announce } from '@/lib/live-announcer'

// Dynamic import — qrcode library is heavy, only load when QR tab is viewed
const FamilyQRCode = dynamic(() => import('@/components/shared/family-qr-code').then(m => ({ default: m.FamilyQRCode })), { ssr: false, loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> })

import type { FamilyMember, FamilyRole, Notification, SubscriptionPlan, Theme, Language } from '@/types'

// ─── Tab Configuration ───────────────────────────────────────────────────────

const settingsTabs = [
 { id: 'family', icon: Users, labelKey: 'family' as const },
 { id: 'user', icon: User, labelKey: 'user' as const },
 { id: 'account', icon: Shield, labelKey: 'account' as const },
 { id: 'preferences', icon: SlidersHorizontal, labelKey: 'preferences' as const },
 { id: 'notifications', icon: Bell, labelKey: 'notifications' as const },
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
  <Card
   className={`bg-card border border-outline-variant rounded-2xl shadow-[var(--elevation-1)] transition-shadow duration-200 ${className ?? ''}`}
  >
   <CardContent className="p-6">
    {children}
   </CardContent>
  </Card>
 )
}

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
 return (
  <h3 className={`text-foreground text-base font-semibold mb-1 ${className ?? ''}`}>{children}</h3>
 )
}

function SectionDescription({ children }: { children: React.ReactNode }) {
 return <p className="text-muted-foreground text-sm mb-4">{children}</p>
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
  <div className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0 last:pb-0">
   <div className="flex-1 min-w-0">
    <p className="text-foreground text-sm font-medium">{label}</p>
    {description && <p className="text-muted-foreground text-xs mt-0.5">{description}</p>}
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
  owner: 'bg-accent/20 text-accent border-amber-500/30',
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
 const [avatarGenOpen, setAvatarGenOpen] = useState(false)
 const [firstName, setFirstName] = useState(user?.first_name ?? '')
 const [lastName, setLastName] = useState(user?.last_name ?? '')
 const [countryCode, setCountryCode] = useState(user?.country_code ?? '+966')
 const [phoneNumber, setPhoneNumber] = useState(() => {
  const phone = user?.phone ?? ''
  const cc = user?.country_code ?? '+966'
  return phone.startsWith(cc) ? phone.slice(cc.length) : phone
 })

 const handleAvatarApply = useCallback((imageUrl: string) => {
  if (!user) return
  setUser({ ...user, avatar_url: imageUrl })
 }, [user, setUser])

 const handleRemovePhoto = useCallback(() => {
  if (!user) return
  setUser({ ...user, avatar_url: null })
  toast.success(isRTL ? 'تم إزالة الصورة' : 'Photo removed')
 }, [user, setUser, isRTL])

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
     <Avatar className="size-16 border-2 border-primary/30 ring-4 ring-primary/10">
      <AvatarImage src={user?.avatar_url ?? ''} />
      <AvatarFallback className="bg-primary/20 text-accent text-xl">
       {user?.first_name?.[0] ?? user?.email?.[0] ?? '?'}
      </AvatarFallback>
     </Avatar>
     <div className="flex-1">
      <h3 className="text-foreground text-lg font-semibold font-display">
       {user?.first_name && user?.last_name
        ? `${user.first_name} ${user.last_name}`
        : user?.email ?? 'User'}
      </h3>
      <p className="text-muted-foreground text-sm">{user?.email}</p>
      <div className="flex items-center gap-2 mt-1">
       <Badge variant="outline" className="bg-primary/10 text-accent border-primary/20 text-[10px]">
        {t.settings.owner}
       </Badge>
      </div>
     </div>
     {!isEditing && (
      <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="text-primary">
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
       <Label className="text-foreground text-xs mb-1.5 block">
        {t.avatarGen.changePhoto}
       </Label>
       <div className="flex items-center gap-3">
        <Avatar className="size-14 border border-border">
         <AvatarImage src={user?.avatar_url ?? ''} />
         <AvatarFallback className="bg-primary/20 text-accent text-lg">
          {user?.first_name?.[0] ?? '?'}
         </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1.5">
         <Button
          variant="outline"
          size="sm"
          className="border-border bg-background text-foreground hover:bg-muted hover:border-border"
          onClick={() => setAvatarGenOpen(true)}
         >
          <Wand2 className="size-3.5 mr-1.5" />
          {t.avatarGen.changePhoto}
         </Button>
         {user?.avatar_url && (
          <Button
           variant="ghost"
           size="sm"
           className="text-[#EF4444]/70 hover:text-[#EF4444] hover:bg-[#EF4444]/10 h-7 text-xs"
           onClick={handleRemovePhoto}
          >
           {t.avatarGen.removePhoto}
          </Button>
         )}
        </div>
       </div>
      </div>

      <AvatarGenerator
       open={avatarGenOpen}
       onOpenChange={setAvatarGenOpen}
       onApply={handleAvatarApply}
       mode="full"
       context="user"
      />

      <Separator className="bg-muted" />

      {/* First Name & Last Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
       <div>
        <Label className="text-foreground text-xs mb-1.5 block">{t.auth.firstName}</Label>
        <Input
         value={firstName}
         onChange={(e) => setFirstName(e.target.value)}
         className="bg-background border-border text-foreground focus-visible:ring-primary/20 focus-visible:border-primary/50"
         placeholder={isRTL ? 'الاسم الأول' : 'First name'}
        />
       </div>
       <div>
        <Label className="text-foreground text-xs mb-1.5 block">{t.auth.lastName}</Label>
        <Input
         value={lastName}
         onChange={(e) => setLastName(e.target.value)}
         className="bg-background border-border text-foreground focus-visible:ring-primary/20 focus-visible:border-primary/50"
         placeholder={isRTL ? 'اسم العائلة' : 'Last name'}
        />
       </div>
      </div>

      {/* Email (read-only) */}
      <div>
       <Label className="text-foreground text-xs mb-1.5 block">{t.auth.email}</Label>
       <Input
        value={user?.email ?? ''}
        readOnly
        className="bg-background/60 border-border text-muted-foreground cursor-not-allowed focus-visible:ring-0"
       />
       <p className="text-[10px] text-muted-foreground mt-1">
        {isRTL ? 'لا يمكن تغيير البريد الإلكتروني من هنا' : 'Email cannot be changed here'}
       </p>
      </div>

      {/* Phone with country code */}
      <div>
       <Label className="text-foreground text-xs mb-1.5 block">{t.auth.phone}</Label>
       <div className="flex gap-2">
        <Select value={countryCode} onValueChange={setCountryCode}>
         <SelectTrigger className="w-[120px] bg-surface-variant border-outline-variant text-foreground focus:ring-primary/20 focus:border-primary/50 shrink-0 rounded-xl">
          <SelectValue />
         </SelectTrigger>
         <SelectContent className="bg-card border-border text-foreground max-h-64 rounded-xl shadow-[var(--elevation-2)]">
          {countryCodes.map((cc) => (
           <SelectItem
            key={cc.code}
            value={cc.code}
            className="focus:bg-primary-container focus:text-on-primary-container cursor-pointer rounded-lg"
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
         className="flex-1 bg-background border-border text-foreground focus-visible:ring-primary/20 focus-visible:border-primary/50"
         placeholder="501234567"
        />
       </div>
      </div>

      <Separator className="bg-muted" />

      {/* Save / Cancel */}
      <div className="flex gap-2">
       <Button
        size="sm"
        onClick={handleSave}
        disabled={saving}
        className="bg-primary hover:bg-primary/80 text-white"
       >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {t.common.save}
       </Button>
       <Button size="sm" variant="ghost" onClick={handleCancel} className="text-muted-foreground hover:text-foreground">
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
        <span className="text-muted-foreground text-xs">{t.auth.firstName}</span>
        <p className="text-foreground text-sm">{user?.first_name || 'Not set'}</p>
       </div>
       <div>
        <span className="text-muted-foreground text-xs">{t.auth.lastName}</span>
        <p className="text-foreground text-sm">{user?.last_name || 'Not set'}</p>
       </div>
      </div>
      <div>
       <span className="text-muted-foreground text-xs">{t.auth.email}</span>
       <p className="text-foreground text-sm">{user?.email || 'Not set'}</p>
      </div>
      <div>
       <span className="text-muted-foreground text-xs">{t.auth.phone}</span>
       <p className="text-foreground text-sm">{user?.phone || 'Not set'}</p>
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
        className="flex items-center gap-3 p-3 rounded-2xl bg-surface-variant/50 border border-outline-variant hover:bg-primary-container transition-all duration-150 cursor-pointer"
       >
        <div className="size-9 rounded-xl bg-primary-container flex items-center justify-center">
         <Users className="size-4 text-on-primary-container" />
        </div>
        <div className="flex-1 min-w-0">
         <p className="text-foreground text-sm font-medium truncate">{family.name}</p>
         <p className="text-muted-foreground text-xs truncate">{family.description || 'No description'}</p>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
       </div>
      ))}
     </div>
    ) : (
     <div className="text-center py-6">
      <Users className="size-8 text-muted-foreground mx-auto mb-2" />
      <p className="text-muted-foreground text-sm">No family memberships yet</p>
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
   // Sign out first, then clear local state
   await supabase.auth.signOut()
   useAuthStore.getState().logout()
   toast.success('Account deletion requested. You have been signed out.')
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

   {/* Password Change */}
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

// ─── Visual Effects Section ──────────────────────────────────────────────────

function AccentColorSection() {
 const { isRTL } = useI18n()
 const { accentColor, setAccentColor } = useUIPreferencesStore()

 return (
  <SectionCard>
   <SectionTitle>
    <span className="flex items-center gap-2">
     <Palette className="size-4 text-primary" />
     {isRTL ? 'لون التمييز' : 'Accent Color'}
    </span>
   </SectionTitle>
   <SectionDescription>
    {isRTL ? 'اختر لون التمييز الرئيسي للتطبيق' : 'Choose the primary accent color for the app'}
   </SectionDescription>

   <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 mt-2">
    {Object.values(ACCENT_COLORS).map((config) => (
     <button
      key={config.id}
      onClick={() => setAccentColor(config.id)}
      className={`group relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
       accentColor === config.id
        ? 'bg-primary/10 border-primary/30'
        : 'bg-muted/50 border-border hover:bg-muted hover:border-border'
      }`}
     >
      <div
       className={`w-8 h-8 rounded-full transition-transform ${
        accentColor === config.id ? 'scale-110 ring-2 ring-offset-2 ring-offset-card' : 'group-hover:scale-105'
       }`}
       style={{
        backgroundColor: config.primary,
        boxShadow: accentColor === config.id ? `0 0 12px rgba(${config.glow}, 0.4)` : 'none',
       }}
      />
      <span className={`text-[10px] font-medium leading-tight text-center ${
       accentColor === config.id ? 'text-foreground' : 'text-muted-foreground'
      }`}>
       {config.label}
      </span>
      {accentColor === config.id && (
       <Check
        className="absolute -top-1 -right-1 size-4 rounded-full p-0.5 text-white"
        style={{ backgroundColor: config.primary }}
       />
      )}
     </button>
    ))}
   </div>

   {/* Preview */}
   <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-muted border border-border">
    <button
     className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all"
     style={{ backgroundColor: ACCENT_COLORS[accentColor].primary }}
    >
     {isRTL ? 'معاينة الزر' : 'Button Preview'}
    </button>
    <div
     className="w-3 h-3 rounded-full"
     style={{ backgroundColor: ACCENT_COLORS[accentColor].primary, boxShadow: `0 0 8px rgba(${ACCENT_COLORS[accentColor].glow}, 0.5)` }}
    />
    <span className="text-xs text-muted-foreground">
     {isRTL ? 'هذا كيف سيبدو اللون' : 'This is how the color looks'}
    </span>
   </div>
  </SectionCard>
 )
}

function VisualEffectsSection() {
 const { isRTL } = useI18n()
 const { reflectionsEnabled, toggleReflections } = useUIPreferencesStore()

 return (
  <SectionCard>
   <SectionTitle>
    <span className="flex items-center gap-2">
     <Eye className="size-4 text-primary" />
     {isRTL ? 'تأثيرات بصرية' : 'Visual Effects'}
    </span>
   </SectionTitle>
   <SectionDescription>
    {isRTL ? 'تخصيص المظهر المرئي للتطبيق' : 'Customize the visual appearance of the app'}
   </SectionDescription>

   <SettingRow
    label={isRTL ? 'انعكاسات واجهة المستخدم' : 'UI Reflections'}
    description={isRTL ? 'انعكاسات زجاجية وتأثيرات انكسار الضوء' : 'Glass reflections and light refraction effects'}
   >
    <Switch checked={reflectionsEnabled} onCheckedChange={toggleReflections} />
   </SettingRow>

   {!reflectionsEnabled && (
    <div className="mt-2 rounded-lg border border-border bg-muted px-3 py-2">
     <p className="text-xs text-muted-foreground">
      {isRTL
       ? 'الوضع المسطّح Premium — بدون تأثيرات ضبابية أو انعكاسات زجاجية'
       : 'Flat Premium mode — no blur effects or glass reflections'}
     </p>
    </div>
   )}
  </SectionCard>
 )
}

// ─── Preferences Tab ────────────────────────────────────────────────────────

function PreferencesTab() {
 const { t, language, setLanguage, isRTL } = useI18n()
 const { user, setUser } = useAuthStore()
 const { theme, setTheme } = useAppStore()
 const [notifications, setNotifications] = useState<Record<Notification['type'], boolean>>({
  task: true,
  calendar: true,
  grocery: true,
  chat: true,
  family: true,
  system: true,
 })

 const handleThemeChange = useCallback(
  (newTheme: Theme) => {
   setTheme(newTheme)
   announce(`Switched to ${newTheme} mode`)
   if (user) {
    try {
     const supabase = createClient()
     supabase.from('profiles').update({ theme: newTheme }).eq('id', user.id).then(() => {}, (err) => { console.error('Failed to save theme:', err) })
    } catch {
     // silently fail - theme changed locally already
    }
    setUser({ ...user, theme: newTheme })
   }
  },
  [setTheme, user, setUser]
 )

 const handleLanguageChange = useCallback(
  async (lang: Language) => {
   setLanguage(lang)
   announce(`Switched to ${lang === 'ar' ? 'Arabic' : 'English'}`)
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
      <Globe className="size-4 text-primary" /> {t.settings.language}
     </span>
    </SectionTitle>
    <SectionDescription>Choose your preferred language</SectionDescription>

    <div className="grid grid-cols-2 gap-3">
     <button
      onClick={() => handleLanguageChange('en')}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
       language === 'en'
        ? 'bg-primary/10 border-primary/30 text-accent'
        : 'bg-muted border-border text-muted-foreground hover:bg-muted'
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
        ? 'bg-primary/10 border-primary/30 text-accent'
        : 'bg-muted border-border text-muted-foreground hover:bg-muted'
      }`}
     >
      <span className="text-lg">🇸🇦</span>
      <span className="text-sm font-medium">العربية</span>
      {language === 'ar' && <Check className="size-4 ml-auto" />}
     </button>
    </div>
   </SectionCard>

   {/* Theme */}
   <SectionCard data-tour="theme-toggle">
    <SectionTitle>
     <span className="flex items-center gap-2">
      {theme === 'dark' ? <Moon className="size-4 text-primary" /> : <Sun className="size-4 text-primary" />}
      {t.settings.theme}
     </span>
    </SectionTitle>
    <SectionDescription>{isRTL ? 'خصّص تجربتك البصرية' : 'Customize your visual experience'}</SectionDescription>

    <div className="flex items-center gap-3">
     <button
      onClick={() => handleThemeChange('dark')}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all flex-1 ${
       theme === 'dark'
        ? 'bg-primary/10 border-primary/30 text-accent'
        : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
      }`}
     >
      <Moon className={`size-5 ${theme === 'dark' ? 'theme-icon-animate' : ''}`} />
      <span className="text-sm font-medium">{isRTL ? 'داكن' : 'Dark'}</span>
      {theme === 'dark' && <Check className="size-4 ml-auto" />}
     </button>
     <button
      onClick={() => handleThemeChange('light')}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all flex-1 ${
       theme === 'light'
        ? 'bg-primary/10 border-primary/30 text-accent'
        : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
      }`}
     >
      <Sun className={`size-5 ${theme === 'light' ? 'theme-icon-animate' : ''}`} />
      <span className="text-sm font-medium">{isRTL ? 'فاتح' : 'Light'}</span>
      {theme === 'light' && <Check className="size-4 ml-auto" />}
     </button>
    </div>
   </SectionCard>

   {/* Accent Color */}
   <AccentColorSection />

   {/* Visual Effects */}
   <VisualEffectsSection />

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

   {/* Guided Tour */}
   <SectionCard>
    <SectionTitle>
     <span className="flex items-center gap-2">
      <Sparkles className="size-4 text-primary" />
      {isRTL ? 'جولة تطبيق' : 'App Tour'}
     </span>
    </SectionTitle>
    <SectionDescription>{isRTL ? 'أخذ جولة حول ميزات التطبيق' : 'Take a guided tour of the app features'}</SectionDescription>

    <Button
     onClick={async () => {
      const { useTourStore } = await import('@/stores/tour-store')
      useTourStore.getState().startTour()
     }}
     className="bg-primary hover:bg-primary/90 text-white rounded-xl"
    >
     <Sparkles className="size-4 mr-2" />
     {isRTL ? t.tour.restartTour : t.tour.startTour}
    </Button>
   </SectionCard>
  </div>
 )
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab() {
 const { t, isRTL } = useI18n()
 const pushEnabled = useNotificationPreferencesStore(s => s.pushEnabled)
 const emailEnabled = useNotificationPreferencesStore(s => s.emailEnabled)
 const inAppEnabled = useNotificationPreferencesStore(s => s.inAppEnabled)
 const quietHoursEnabled = useNotificationPreferencesStore(s => s.quietHoursEnabled)
 const quietHoursStart = useNotificationPreferencesStore(s => s.quietHoursStart)
 const quietHoursEnd = useNotificationPreferencesStore(s => s.quietHoursEnd)
 const reminderAdvanceMinutes = useNotificationPreferencesStore(s => s.reminderAdvanceMinutes)
 const soundEnabled = useNotificationPreferencesStore(s => s.soundEnabled)
 const vibrationEnabled = useNotificationPreferencesStore(s => s.vibrationEnabled)
 const taskAssigned = useNotificationPreferencesStore(s => s.taskAssigned)
 const taskCompleted = useNotificationPreferencesStore(s => s.taskCompleted)
 const taskDueReminder = useNotificationPreferencesStore(s => s.taskDueReminder)
 const eventReminder = useNotificationPreferencesStore(s => s.eventReminder)
 const eventStarting = useNotificationPreferencesStore(s => s.eventStarting)
 const groceryReminder = useNotificationPreferencesStore(s => s.groceryReminder)
 const groceryChecked = useNotificationPreferencesStore(s => s.groceryChecked)
 const familyMemberJoined = useNotificationPreferencesStore(s => s.familyMemberJoined)
 const familyMemberLeft = useNotificationPreferencesStore(s => s.familyMemberLeft)
 const chatMention = useNotificationPreferencesStore(s => s.chatMention)
 const chatMessage = useNotificationPreferencesStore(s => s.chatMessage)
 const setPreference = useNotificationPreferencesStore(s => s.setPreference)
 const setCategoryGroup = useNotificationPreferencesStore(s => s.setCategoryGroup)

 // Map for dynamic key access (store[item.key])
 const categoryPrefs: Record<string, boolean> = {
  taskAssigned, taskCompleted, taskDueReminder,
  eventReminder, eventStarting,
  groceryReminder, groceryChecked,
  familyMemberJoined, familyMemberLeft,
  chatMention, chatMessage,
 }

 const categoryGroups = [
  {
   id: 'tasks',
   icon: CheckCircle2,
   label: t.notifications.tasks,
   items: [
    { key: 'taskAssigned' as const, label: t.notifications.taskAssigned },
    { key: 'taskCompleted' as const, label: t.notifications.taskCompleted },
    { key: 'taskDueReminder' as const, label: t.notifications.taskDueReminder },
   ],
  },
  {
   id: 'calendar',
   icon: CalendarDays,
   label: t.notifications.calendar,
   items: [
    { key: 'eventReminder' as const, label: t.notifications.eventReminder },
    { key: 'eventStarting' as const, label: t.notifications.eventStarting },
   ],
  },
  {
   id: 'grocery',
   icon: ShoppingCart,
   label: t.notifications.grocery,
   items: [
    { key: 'groceryReminder' as const, label: t.notifications.groceryReminder },
    { key: 'groceryChecked' as const, label: t.notifications.groceryChecked },
   ],
  },
  {
   id: 'family',
   icon: UserPlus,
   label: t.notifications.family,
   items: [
    { key: 'familyMemberJoined' as const, label: t.notifications.memberJoined },
    { key: 'familyMemberLeft' as const, label: t.notifications.memberLeft },
   ],
  },
  {
   id: 'chat',
   icon: MessageCircle,
   label: t.notifications.chat,
   items: [
    { key: 'chatMention' as const, label: t.notifications.chatMention },
    { key: 'chatMessage' as const, label: t.notifications.chatMessage },
   ],
  },
 ]

 const reminderAdvanceOptions = [
  { value: 5, label: t.notifications.min5 },
  { value: 15, label: t.notifications.min15 },
  { value: 30, label: t.notifications.min30 },
  { value: 60, label: t.notifications.hour1 },
  { value: 1440, label: t.notifications.day1 },
 ]

 return (
  <div className="space-y-6">
   {/* Section 1: Channels */}
   <SectionCard>
    <h4 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-3">
     {t.notifications.channels}
    </h4>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
     {/* Push */}
     <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted border border-border">
      <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
       <Bell className="size-5 text-accent" />
      </div>
      <span className="text-foreground text-sm font-medium text-center">{t.notifications.pushNotifications}</span>
      <p className="text-muted-foreground text-xs text-center">{t.notifications.pushDesc}</p>
      <Switch
       checked={pushEnabled}
       onCheckedChange={(v) => setPreference('pushEnabled', v)}
       className="data-[state=checked]:bg-primary"
      />
     </div>
     {/* Email */}
     <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted border border-border">
      <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
       <Mail className="size-5 text-accent" />
      </div>
      <span className="text-foreground text-sm font-medium text-center">{t.notifications.emailNotifications}</span>
      <p className="text-muted-foreground text-xs text-center">{t.notifications.emailDesc}</p>
      <Switch
       checked={emailEnabled}
       onCheckedChange={(v) => setPreference('emailEnabled', v)}
       className="data-[state=checked]:bg-primary"
      />
     </div>
     {/* In-App */}
     <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted border border-border">
      <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
       <Monitor className="size-5 text-accent" />
      </div>
      <span className="text-foreground text-sm font-medium text-center">{t.notifications.inAppNotifications}</span>
      <p className="text-muted-foreground text-xs text-center">{t.notifications.inAppDesc}</p>
      <Switch
       checked={inAppEnabled}
       onCheckedChange={(v) => setPreference('inAppEnabled', v)}
       className="data-[state=checked]:bg-primary"
      />
     </div>
    </div>
   </SectionCard>

   {/* Section 2: Categories */}
   <SectionCard>
    <h4 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-3">
     {t.notifications.categories}
    </h4>
    <div className="space-y-4">
     {categoryGroups.map((group) => {
      const allEnabled = group.items.every((item) => categoryPrefs[item.key])
      return (
       <div key={group.id}>
        {/* Group Header */}
        <div className="flex items-center justify-between mb-2">
         <div className="flex items-center gap-2">
          <group.icon className="size-4 text-primary" />
          <span className="text-foreground text-sm font-semibold">{group.label}</span>
         </div>
         <div className="flex items-center gap-1">
          <button
           onClick={() => setCategoryGroup(group.id, true)}
           className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
            allEnabled
             ? 'text-primary bg-primary/10'
             : 'text-muted-foreground hover:text-accent hover:bg-muted'
           }`}
          >
           {t.notifications.enableAll}
          </button>
          <button
           onClick={() => setCategoryGroup(group.id, false)}
           className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
            !allEnabled
             ? 'text-[#EF4444] bg-[#EF4444]/10'
             : 'text-muted-foreground hover:text-[#EF4444] hover:bg-muted'
           }`}
          >
           {t.notifications.disableAll}
          </button>
         </div>
        </div>
        {/* Category Items */}
        <div className="space-y-0">
         {group.items.map((item, idx) => (
          <div
           key={item.key}
           className={`flex items-center justify-between py-3 ${idx < group.items.length - 1 ? 'border-b border-border' : ''}`}
          >
           <span className="text-foreground text-sm">{item.label}</span>
           <Switch
            checked={categoryPrefs[item.key]}
            onCheckedChange={(v) => setPreference(item.key, v)}
            className="data-[state=checked]:bg-primary"
           />
          </div>
         ))}
        </div>
       </div>
      )
     })}
    </div>
   </SectionCard>

   {/* Section 3: Schedule & Sound */}
   <SectionCard>
    <h4 className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider mb-3">
     {t.notifications.scheduleAndSound}
    </h4>

    <div className="space-y-0">
     {/* Quiet Hours */}
     <div className="flex items-center justify-between py-3 border-b border-border">
      <div className="flex-1 min-w-0">
       <p className="text-foreground text-sm font-medium">{t.notifications.quietHours}</p>
       <p className="text-muted-foreground text-xs mt-0.5">{t.notifications.quietHoursDesc}</p>
      </div>
      <Switch
       checked={quietHoursEnabled}
       onCheckedChange={(v) => setPreference('quietHoursEnabled', v)}
       className="data-[state=checked]:bg-primary"
      />
     </div>

     {/* Quiet Hours Time Pickers */}
     {quietHoursEnabled && (
      <motion.div
       initial={{ opacity: 0, height: 0 }}
       animate={{ opacity: 1, height: 'auto' }}
       exit={{ opacity: 0, height: 0 }}
       transition={{ duration: 0.2 }}
       className="flex items-center gap-4 py-3 border-b border-border pl-2"
      >
       <div className="flex-1">
        <Label className="text-muted-foreground text-xs mb-1 block">{t.notifications.startTime}</Label>
        <Input
         type="time"
         value={quietHoursStart}
         onChange={(e) => setPreference('quietHoursStart', e.target.value)}
         className="bg-background border-border text-foreground w-full"
        />
       </div>
       <div className="flex-1">
        <Label className="text-muted-foreground text-xs mb-1 block">{t.notifications.endTime}</Label>
        <Input
         type="time"
         value={quietHoursEnd}
         onChange={(e) => setPreference('quietHoursEnd', e.target.value)}
         className="bg-background border-border text-foreground w-full"
        />
       </div>
      </motion.div>
     )}

     {/* Reminder Advance */}
     <div className="flex items-center justify-between py-3 border-b border-border">
      <span className="text-foreground text-sm font-medium">{t.notifications.reminderAdvance}</span>
      <Select
       value={String(reminderAdvanceMinutes)}
       onValueChange={(v) => setPreference('reminderAdvanceMinutes', Number(v))}
      >
       <SelectTrigger className="w-[140px] bg-background border-border text-foreground text-sm">
        <SelectValue />
       </SelectTrigger>
       <SelectContent className="bg-card border-border">
        {reminderAdvanceOptions.map((option) => (
         <SelectItem
          key={option.value}
          value={String(option.value)}
          className="text-foreground text-sm focus:bg-primary/10 focus:text-accent"
         >
          {option.label}
         </SelectItem>
        ))}
       </SelectContent>
      </Select>
     </div>

     {/* Sound */}
     <div className="flex items-center justify-between py-3 border-b border-border">
      <div className="flex items-center gap-2">
       <Volume2 className="size-4 text-muted-foreground" />
       <span className="text-foreground text-sm font-medium">{t.notifications.sound}</span>
      </div>
      <Switch
       checked={soundEnabled}
       onCheckedChange={(v) => setPreference('soundEnabled', v)}
       className="data-[state=checked]:bg-primary"
      />
     </div>

     {/* Vibration */}
     <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2">
       <Vibrate className="size-4 text-muted-foreground" />
       <span className="text-foreground text-sm font-medium">{t.notifications.vibration}</span>
      </div>
      <Switch
       checked={vibrationEnabled}
       onCheckedChange={(v) => setPreference('vibrationEnabled', v)}
       className="data-[state=checked]:bg-primary"
      />
     </div>
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
      <Badge variant="outline" className="bg-amber-500/10 text-accent border-amber-500/20 text-xs">
       Coming Soon
      </Badge>
      <Switch
       checked={twoFactorEnabled}
       onCheckedChange={(checked) => {
        setTwoFactorEnabled(checked)
        toast.info('2FA setup coming soon!')
       }}
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
      <KeyRound className="size-4 text-primary" /> Change Password
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
      <Label className="text-foreground text-xs mb-1.5 block">Confirm New Password</Label>
      <div className="relative">
       <Input
        type={showConfirmPassword ? 'text' : 'password'}
        value={confirmNewPassword}
        onChange={(e) => setConfirmNewPassword(e.target.value)}
        className="bg-muted border-border text-foreground pr-10"
        placeholder="Confirm new password"
       />
       <button
        type="button"
        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
       >
        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
       </button>
      </div>
     </div>
     <Button
      size="sm"
      onClick={handleUpdatePassword}
      className="bg-primary hover:bg-primary/80 text-white"
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
  </div>
 )
}

// ─── Data Control Tab ────────────────────────────────────────────────────────

function DataControlTab() {
 const { t, isRTL } = useI18n()
 const [exporting, setExporting] = useState(false)
 const [importing, setImporting] = useState(false)
 const [clearing, setClearing] = useState(false)

 // Export state
 const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json')
 const [exportSelection, setExportSelection] = useState({
  tasks: true,
  events: true,
  grocery: true,
  messages: true,
 })

 // Import state
 const [importFile, setImportFile] = useState<File | null>(null)
 const [importPreview, setImportPreview] = useState<{
  tasks: number
  events: number
  grocery: number
  messages: number
  total: number
 } | null>(null)
 const [importData, setImportData] = useState<Record<string, unknown[]> | null>(null)
 const [importConfirmOpen, setImportConfirmOpen] = useState(false)
 const [isDragging, setIsDragging] = useState(false)

 // Clear state
 const [clearSelection, setClearSelection] = useState({
  tasks: true,
  events: true,
  grocery: true,
  messages: true,
 })
 const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

 // Data from stores
 const { tasks } = useTaskStore()
 const { events } = useCalendarStore()
 const { items: groceryItems } = useGroceryStore()
 const { messages } = useChatStore()

 // Counts for display
 const dataCounts = {
  tasks: tasks.length,
  events: events.length,
  grocery: groceryItems.length,
  messages: messages.length,
 }

 const toggleExport = useCallback((key: keyof typeof exportSelection) => {
  setExportSelection((prev) => ({ ...prev, [key]: !prev[key] }))
 }, [])

 const toggleClear = useCallback((key: keyof typeof clearSelection) => {
  setClearSelection((prev) => ({ ...prev, [key]: !prev[key] }))
 }, [])

 const isAllExportSelected = Object.values(exportSelection).every(Boolean)

 const toggleAllExport = useCallback(() => {
  const newVal = !isAllExportSelected
  setExportSelection({ tasks: newVal, events: newVal, grocery: newVal, messages: newVal })
 }, [isAllExportSelected])

 const isAllClearSelected = Object.values(clearSelection).every(Boolean)

 const toggleAllClear = useCallback(() => {
  const newVal = !isAllClearSelected
  setClearSelection({ tasks: newVal, events: newVal, grocery: newVal, messages: newVal })
 }, [isAllClearSelected])

 // ─── Export Logic ─────────────────────────────────────────────────────────

 const handleExport = useCallback(async () => {
  const hasSelection = Object.values(exportSelection).some(Boolean)
  if (!hasSelection) {
   toast.error(t.dataControl.noDataToExport)
   return
  }

  setExporting(true)
  try {
   const BOM = '\uFEFF'

   if (exportFormat === 'json') {
    const data: Record<string, unknown> = {
     exportedAt: new Date().toISOString(),
     version: '1.0',
     app: 'USRA PLUS',
    }

    if (exportSelection.tasks) {
     data.tasks = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigned_to: task.assigned_to,
      due_date: task.due_date,
      completed_at: task.completed_at,
      created_at: task.created_at,
     }))
    }

    if (exportSelection.events) {
     data.events = events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      start_time: event.start_time,
      end_time: event.end_time,
      all_day: event.all_day,
      color: event.color,
      created_at: event.created_at,
     }))
    }

    if (exportSelection.grocery) {
     data.groceryItems = groceryItems.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      checked: item.checked,
      created_at: item.created_at,
     }))
    }

    if (exportSelection.messages) {
     data.messages = messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      sender_id: msg.sender_id,
      message_type: msg.message_type,
      created_at: msg.created_at,
     }))
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `usra-plus-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
   } else {
    // CSV Export with UTF-8 BOM for Arabic support
    const sections: string[] = []

    if (exportSelection.tasks) {
     sections.push(
      isRTL ? '--- المهام ---' : '--- Tasks ---',
      ['Title', 'Status', 'Priority', 'Assignee', 'Due Date', 'Created At'].join(','),
      ...tasks.map((task) =>
       [
        `"${(task.title ?? '').replace(/"/g, '""')}"`,
        task.status ?? '',
        task.priority ?? '',
        task.assignee?.first_name ? `"${task.assignee.first_name} ${task.assignee.last_name ?? ''}".trim()` : '',
        task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : '',
        task.created_at ? new Date(task.created_at).toISOString().slice(0, 10) : '',
       ].join(',')
      )
     )
    }

    if (exportSelection.events) {
     sections.push(
      '',
      isRTL ? '--- أحداث التقويم ---' : '--- Calendar Events ---',
      ['Title', 'Description', 'Start Time', 'End Time', 'All Day', 'Color', 'Created At'].join(','),
      ...events.map((event) =>
       [
        `"${(event.title ?? '').replace(/"/g, '""')}"`,
        `"${(event.description ?? '').replace(/"/g, '""')}"`,
        event.start_time ?? '',
        event.end_time ?? '',
        event.all_day ? 'Yes' : 'No',
        event.color ?? '',
        event.created_at ? new Date(event.created_at).toISOString().slice(0, 10) : '',
       ].join(',')
      )
     )
    }

    if (exportSelection.grocery) {
     sections.push(
      '',
      isRTL ? '--- قائمة البقالة ---' : '--- Grocery List ---',
      ['Name', 'Category', 'Quantity', 'Checked', 'Created At'].join(','),
      ...groceryItems.map((item) =>
       [
        `"${(item.name ?? '').replace(/"/g, '""')}"`,
        `"${(item.category ?? '').replace(/"/g, '""')}"`,
        String(item.quantity ?? 1),
        item.checked ? 'Yes' : 'No',
        item.created_at ? new Date(item.created_at).toISOString().slice(0, 10) : '',
       ].join(',')
      )
     )
    }

    if (exportSelection.messages) {
     sections.push(
      '',
      isRTL ? '--- رسائل الدردشة ---' : '--- Chat Messages ---',
      ['Content', 'Sender', 'Type', 'Timestamp'].join(','),
      ...messages.map((msg) =>
       [
        `"${(msg.content ?? '').replace(/"/g, '""')}"`,
        msg.sender?.first_name ? `"${msg.sender.first_name}"` : msg.sender_id ?? '',
        msg.message_type ?? '',
        msg.created_at ? new Date(msg.created_at).toISOString() : '',
       ].join(',')
      )
     )
    }

    const csvContent = BOM + sections.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `usra-plus-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
   }

   toast.success(t.dataControl.exportSuccess)
  } catch {
   toast.error(t.common.error)
  } finally {
   setExporting(false)
  }
 }, [exportFormat, exportSelection, tasks, events, groceryItems, messages, t, isRTL])

 // ─── Import Logic ─────────────────────────────────────────────────────────

 const parseImportFile = useCallback(
  async (file: File) => {
   try {
    if (file.name.endsWith('.json')) {
     const text = await file.text()
     const parsed = JSON.parse(text)

     // Validate structure - must be an object with array values
     if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      toast.error(t.dataControl.invalidFile)
      return
     }

     // Count items per type
     const preview = {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks.length : 0,
      events: Array.isArray(parsed.events) ? parsed.events.length : 0,
      grocery: Array.isArray(parsed.groceryItems) ? parsed.groceryItems.length : 0,
      messages: Array.isArray(parsed.messages) ? parsed.messages.length : 0,
      total: 0,
     }
     preview.total = preview.tasks + preview.events + preview.grocery + preview.messages

     if (preview.total === 0) {
      toast.error(t.dataControl.importFailed)
      return
     }

     // Basic type validation on first item of each array
     if (preview.tasks > 0 && !parsed.tasks[0]?.title) {
      toast.error(t.dataControl.importFailed)
      return
     }
     if (preview.events > 0 && !parsed.events[0]?.title) {
      toast.error(t.dataControl.importFailed)
      return
     }
     if (preview.grocery > 0 && !parsed.groceryItems[0]?.name) {
      toast.error(t.dataControl.importFailed)
      return
     }
     if (preview.messages > 0 && !parsed.messages[0]?.content) {
      toast.error(t.dataControl.importFailed)
      return
     }

     setImportPreview(preview)
     setImportData(parsed)
    } else if (file.name.endsWith('.csv')) {
     // For CSV, we only support importing tasks from CSV
     const text = await file.text()
     const lines = text.split('\n').filter((l) => l.trim() && !l.startsWith('---'))

     // Find the tasks section header
     const taskStartIdx = lines.findIndex((l) =>
      l.toLowerCase().includes('title') && l.toLowerCase().includes('status')
     )

     if (taskStartIdx < 0) {
      toast.error(t.dataControl.importFailed)
      return
     }

     const taskLines = lines.slice(taskStartIdx + 1)
     const validTaskLines = taskLines.filter((l) => l.trim() && !l.startsWith('---') && !l.includes('Calendar') && !l.includes('Grocery') && !l.includes('Chat'))

     const preview = {
      tasks: validTaskLines.length,
      events: 0,
      grocery: 0,
      messages: 0,
      total: validTaskLines.length,
     }

     if (preview.total === 0) {
      toast.error(t.dataControl.importFailed)
      return
     }

     // Parse CSV into simplified task objects
     const taskObjects = validTaskLines.map((line, idx) => {
      const parts = line.split(',').map((p) => p.replace(/^"|"$/g, '').trim())
      return {
       id: `imported-task-${Date.now()}-${idx}`,
       title: parts[0] || `Task ${idx + 1}`,
       status: parts[1] || 'todo',
       priority: parts[2] || 'medium',
       due_date: parts[4] || null,
       created_at: new Date().toISOString(),
      }
     })

     setImportPreview(preview)
     setImportData({ tasks: taskObjects })
    } else {
     toast.error(t.dataControl.invalidFile)
     return
    }

    setImportFile(file)
   } catch {
    toast.error(t.dataControl.importFailed)
   }
  },
  [t]
 )

 const handleDragOver = useCallback((e: React.DragEvent) => {
  e.preventDefault()
  setIsDragging(true)
 }, [])

 const handleDragLeave = useCallback((e: React.DragEvent) => {
  e.preventDefault()
  setIsDragging(false)
 }, [])

 const handleDrop = useCallback(
  (e: React.DragEvent) => {
   e.preventDefault()
   setIsDragging(false)
   const file = e.dataTransfer.files[0]
   if (file) parseImportFile(file)
  },
  [parseImportFile]
 )

 const handleFileInput = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
   const file = e.target.files?.[0]
   if (file) parseImportFile(file)
  },
  [parseImportFile]
 )

 const handleImportConfirm = useCallback(async () => {
  if (!importData) return

  setImporting(true)
  try {
   // Merge strategy: add new items without overwriting existing data
   const taskStore = useTaskStore.getState()
   const groceryStore = useGroceryStore.getState()
   const calendarStore = useCalendarStore.getState()
   const chatStore = useChatStore.getState()

   if (Array.isArray(importData.tasks)) {
    const newTasks = (importData.tasks as Record<string, unknown>[]).map((task) => ({
     id: (task.id as string) || `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`,
     family_id: '',
     title: (task.title as string) || 'Untitled',
     description: (task.description as string) || null,
     status: (task.status as string) || 'todo',
     priority: (task.priority as string) || 'medium',
     assigned_to: (task.assigned_to as string) || null,
     created_by: '',
     due_date: (task.due_date as string) || null,
     completed_at: (task.completed_at as string) || null,
     created_at: (task.created_at as string) || new Date().toISOString(),
     updated_at: new Date().toISOString(),
    })) as Task[]
    taskStore.setTasks([...taskStore.tasks, ...newTasks])
   }

   if (Array.isArray(importData.events)) {
    const newEvents = (importData.events as Record<string, unknown>[]).map((event) => ({
     id: (event.id as string) || `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`,
     family_id: '',
     title: (event.title as string) || 'Untitled Event',
     description: (event.description as string) || null,
     start_time: (event.start_time as string) || new Date().toISOString(),
     end_time: (event.end_time as string) || null,
     all_day: (event.all_day as boolean) ?? false,
     color: (event.color as string) || null,
     created_by: '',
     created_at: (event.created_at as string) || new Date().toISOString(),
     updated_at: new Date().toISOString(),
    })) as CalendarEvent[]
    calendarStore.setEvents([...calendarStore.events, ...newEvents])
   }

   if (Array.isArray(importData.groceryItems)) {
    const newItems = (importData.groceryItems as Record<string, unknown>[]).map((item) => ({
     id: (item.id as string) || `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`,
     family_id: '',
     name: (item.name as string) || 'Unnamed Item',
     category: (item.category as string) || null,
     quantity: (item.quantity as number) ?? 1,
     checked: (item.checked as boolean) ?? false,
     added_by: '',
     created_at: (item.created_at as string) || new Date().toISOString(),
     updated_at: new Date().toISOString(),
    })) as GroceryItem[]
    groceryStore.setItems([...groceryStore.items, ...newItems])
   }

   if (Array.isArray(importData.messages)) {
    const newMessages = (importData.messages as Record<string, unknown>[]).map((msg) => ({
     id: (msg.id as string) || `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`,
     family_id: '',
     content: (msg.content as string) || '',
     sender_id: (msg.sender_id as string) || '',
     message_type: (msg.message_type as string) || 'text',
     reply_to: null,
     created_at: (msg.created_at as string) || new Date().toISOString(),
    })) as ChatMessage[]
    chatStore.setMessages([...chatStore.messages, ...newMessages])
   }

   // Reset import state
   setImportPreview(null)
   setImportData(null)
   setImportFile(null)
   setImportConfirmOpen(false)
   toast.success(t.dataControl.importSuccess)
  } catch {
   toast.error(t.dataControl.importFailed)
  } finally {
   setImporting(false)
  }
 }, [importData, t])

 const handleClearConfirm = useCallback(async () => {
  setClearing(true)
  try {
   const taskStore = useTaskStore.getState()
   const groceryStore = useGroceryStore.getState()
   const calendarStore = useCalendarStore.getState()
   const chatStore = useChatStore.getState()

   if (clearSelection.tasks) taskStore.setTasks([])
   if (clearSelection.events) calendarStore.setEvents([])
   if (clearSelection.grocery) groceryStore.setItems([])
   if (clearSelection.messages) chatStore.setMessages([])

   setClearConfirmOpen(false)
   toast.success(t.dataControl.clearSuccess)
  } catch {
   toast.error(t.common.error)
  } finally {
   setClearing(false)
  }
 }, [clearSelection, t])

 const dataTypeItems = [
  { key: 'tasks' as const, icon: CheckCircle2, label: t.dataControl.tasks, count: dataCounts.tasks },
  { key: 'events' as const, icon: CalendarDays, label: t.dataControl.events, count: dataCounts.events },
  { key: 'grocery' as const, icon: ShoppingCart, label: t.dataControl.grocery, count: dataCounts.grocery },
  { key: 'messages' as const, icon: MessageCircle, label: t.dataControl.messages, count: dataCounts.messages },
 ]

 return (
  <div className="space-y-6">
   {/* Storage */}
   <SectionCard>
    <SectionTitle>
     <span className="flex items-center gap-2">
      <HardDrive className="size-4 text-primary" /> {isRTL ? 'استخدام التخزين' : 'Storage Usage'}
     </span>
    </SectionTitle>
    <SectionDescription>{isRTL ? 'استهلاك التخزين الحالي' : 'Your current storage consumption'}</SectionDescription>

    <div className="space-y-4">
     <div>
      <div className="flex items-center justify-between mb-2">
       <span className="text-foreground text-sm">2.4 GB of 5 GB</span>
       <span className="text-accent text-sm font-medium">48%</span>
      </div>
      <Progress value={48} className="h-2 bg-muted [&>div]:bg-primary" />
     </div>

     <div className="grid grid-cols-2 gap-3">
      <div className="p-3 rounded-xl bg-muted border border-border">
       <p className="text-muted-foreground text-xs">{t.files.title}</p>
       <p className="text-foreground text-sm font-medium">1.8 GB</p>
      </div>
      <div className="p-3 rounded-xl bg-muted border border-border">
       <p className="text-muted-foreground text-xs">{t.chat.title}</p>
       <p className="text-foreground text-sm font-medium">0.4 GB</p>
      </div>
      <div className="p-3 rounded-xl bg-muted border border-border">
       <p className="text-muted-foreground text-xs">{t.tasks.title} & {t.calendar.title}</p>
       <p className="text-foreground text-sm font-medium">0.1 GB</p>
      </div>
      <div className="p-3 rounded-xl bg-muted border border-border">
       <p className="text-muted-foreground text-xs">{isRTL ? 'أخرى' : 'Other'}</p>
       <p className="text-foreground text-sm font-medium">0.1 GB</p>
      </div>
     </div>
    </div>
   </SectionCard>

   {/* ─── Export Section ─────────────────────────────────────────────────── */}
   <SectionCard>
    <SectionTitle>
     <span className="flex items-center gap-2">
      <Download className="size-4 text-primary" /> {t.dataControl.exportData}
     </span>
    </SectionTitle>
    <SectionDescription>
     {isRTL ? 'قم بتنزيل نسخة من بياناتك بالتنسيق المفضل لديك' : 'Download a copy of your data in your preferred format'}
    </SectionDescription>

    <div className="space-y-5">
     {/* Format Selection */}
     <div>
      <Label className="text-foreground text-xs mb-2 block">{t.dataControl.exportFormat}</Label>
      <div className="flex gap-2">
       <Button
        variant={exportFormat === 'json' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setExportFormat('json')}
        className={
         exportFormat === 'json'
          ? 'bg-primary text-white hover:bg-primary/80 gap-1.5'
          : 'border-border text-foreground hover:bg-muted gap-1.5'
        }
       >
        <FileJson className="size-4" />
        {t.dataControl.json}
       </Button>
       <Button
        variant={exportFormat === 'csv' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setExportFormat('csv')}
        className={
         exportFormat === 'csv'
          ? 'bg-primary text-white hover:bg-primary/80 gap-1.5'
          : 'border-border text-foreground hover:bg-muted gap-1.5'
        }
       >
        <FileSpreadsheet className="size-4" />
        {t.dataControl.csv}
       </Button>
      </div>
     </div>

     {/* Data Selection */}
     <div>
      <div className="flex items-center justify-between mb-2">
       <Label className="text-foreground text-xs">{t.dataControl.selectData}</Label>
       <Button
        variant="ghost"
        size="sm"
        onClick={toggleAllExport}
        className="text-accent text-xs h-6 px-2"
       >
        {isAllExportSelected ? t.dataControl.deselectAll : t.dataControl.selectAll}
       </Button>
      </div>

      <div className="space-y-2">
       {dataTypeItems.map(({ key, icon: Icon, label, count }) => (
        <div
         key={key}
         className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border cursor-pointer hover:bg-muted/80 transition-colors"
         onClick={() => toggleExport(key)}
        >
         <Checkbox
          checked={exportSelection[key]}
          onCheckedChange={() => toggleExport(key)}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
         />
         <Icon className="size-4 text-accent shrink-0" />
         <span className="text-foreground text-sm flex-1">{label}</span>
         <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
          {count}
         </Badge>
        </div>
       ))}
      </div>
     </div>

     {/* Export Button */}
     <Button
      onClick={handleExport}
      disabled={exporting || !Object.values(exportSelection).some(Boolean)}
      className="w-full bg-primary hover:bg-primary/80 text-white gap-2"
     >
      {exporting ? (
       <Loader2 className="size-4 animate-spin" />
      ) : (
       <Download className="size-4" />
      )}
      {exporting ? t.dataControl.exporting : t.dataControl.exportData}
     </Button>
    </div>
   </SectionCard>

   {/* ─── Import Section ─────────────────────────────────────────────────── */}
   <SectionCard>
    <SectionTitle>
     <span className="flex items-center gap-2">
      <Upload className="size-4 text-primary" /> {t.dataControl.importData}
     </span>
    </SectionTitle>
    <SectionDescription>
     {isRTL ? 'قم باستيراد البيانات من ملف JSON أو CSV' : 'Import data from a JSON or CSV file'}
    </SectionDescription>

    <div className="space-y-4">
     {/* Drop Zone */}
     <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
       relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer
       ${isDragging
        ? 'border-primary bg-primary/5 scale-[1.01]'
        : 'border-border bg-muted hover:border-primary/50 hover:bg-muted/80'
       }
      `}
      onClick={() => {
       const input = document.getElementById('import-file-input') as HTMLInputElement | null
       input?.click()
      }}
     >
      <input
       id="import-file-input"
       type="file"
       accept=".json,.csv"
       className="hidden"
       onChange={handleFileInput}
      />
      <motion.div
       animate={isDragging ? { scale: 1.05, y: -4 } : { scale: 1, y: 0 }}
       transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
       <Upload className={`size-10 mx-auto mb-3 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
       <p className="text-foreground text-sm font-medium mb-1">{t.dataControl.dropzone}</p>
       <p className="text-muted-foreground text-xs">{t.dataControl.supportedFormats}</p>
      </motion.div>
     </div>

     {/* File Selected Indicator */}
     {importFile && (
      <motion.div
       initial={{ opacity: 0, y: 8 }}
       animate={{ opacity: 1, y: 0 }}
       className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20"
      >
       <FileJson className="size-5 text-accent" />
       <div className="flex-1 min-w-0">
        <p className="text-foreground text-sm font-medium truncate">{importFile.name}</p>
        <p className="text-muted-foreground text-xs">
         {(importFile.size / 1024).toFixed(1)} KB
        </p>
       </div>
       <Button
        variant="ghost"
        size="sm"
        onClick={() => {
         setImportFile(null)
         setImportPreview(null)
         setImportData(null)
        }}
        className="text-muted-foreground hover:text-foreground shrink-0"
       >
        <X className="size-4" />
       </Button>
      </motion.div>
     )}

     {/* Import Preview */}
     {importPreview && (
      <motion.div
       initial={{ opacity: 0, y: 8 }}
       animate={{ opacity: 1, y: 0 }}
       className="p-4 rounded-xl bg-muted border border-border"
      >
       <h4 className="text-foreground text-sm font-semibold mb-3 flex items-center gap-2">
        <Eye className="size-4 text-accent" />
        {t.dataControl.importPreviewTitle}
       </h4>
       <div className="grid grid-cols-2 gap-2">
        {importPreview.tasks > 0 && (
         <div className="p-2.5 rounded-lg bg-background border border-border">
          <p className="text-muted-foreground text-xs">{t.dataControl.tasks}</p>
          <p className="text-foreground text-sm font-medium">
           {t.dataControl.itemCount.replace('{count}', String(importPreview.tasks))}
          </p>
         </div>
        )}
        {importPreview.events > 0 && (
         <div className="p-2.5 rounded-lg bg-background border border-border">
          <p className="text-muted-foreground text-xs">{t.dataControl.events}</p>
          <p className="text-foreground text-sm font-medium">
           {t.dataControl.itemCount.replace('{count}', String(importPreview.events))}
          </p>
         </div>
        )}
        {importPreview.grocery > 0 && (
         <div className="p-2.5 rounded-lg bg-background border border-border">
          <p className="text-muted-foreground text-xs">{t.dataControl.grocery}</p>
          <p className="text-foreground text-sm font-medium">
           {t.dataControl.itemCount.replace('{count}', String(importPreview.grocery))}
          </p>
         </div>
        )}
        {importPreview.messages > 0 && (
         <div className="p-2.5 rounded-lg bg-background border border-border">
          <p className="text-muted-foreground text-xs">{t.dataControl.messages}</p>
          <p className="text-foreground text-sm font-medium">
           {t.dataControl.itemCount.replace('{count}', String(importPreview.messages))}
          </p>
         </div>
        )}
       </div>
       <div className="mt-3 pt-3 border-t border-border">
        <p className="text-accent text-xs font-medium">
         {isRTL ? 'الإجمالي' : 'Total'}: {t.dataControl.itemCount.replace('{count}', String(importPreview.total))}
        </p>
       </div>
      </motion.div>
     )}

     {/* Import Button */}
     <Button
      onClick={() => setImportConfirmOpen(true)}
      disabled={!importPreview || importing}
      className="w-full bg-primary hover:bg-primary/80 text-white gap-2"
     >
      {importing ? (
       <Loader2 className="size-4 animate-spin" />
      ) : (
       <Upload className="size-4" />
      )}
      {importing ? t.dataControl.applying : t.dataControl.importData}
     </Button>

     {/* Import Confirmation Dialog */}
     <AlertDialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
      <AlertDialogContent className="bg-card border-border">
       <AlertDialogHeader>
        <AlertDialogTitle className="text-foreground">
         {t.dataControl.importData}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-muted-foreground">
         {t.dataControl.importWarning.replace('{count}', String(importPreview?.total ?? 0))}
        </AlertDialogDescription>
       </AlertDialogHeader>
       <AlertDialogFooter>
        <AlertDialogCancel className="bg-muted border-border text-foreground">
         {t.common.cancel}
        </AlertDialogCancel>
        <AlertDialogAction
         onClick={handleImportConfirm}
         className="bg-primary text-white hover:bg-primary/80"
        >
         {t.common.confirm}
        </AlertDialogAction>
       </AlertDialogFooter>
      </AlertDialogContent>
     </AlertDialog>
    </div>
   </SectionCard>

   {/* ─── Clear Data Section ─────────────────────────────────────────────── */}
   <SectionCard className="border-[#EF4444]/20">
    <SectionTitle className="text-[#EF4444]">
     <span className="flex items-center gap-2">
      <AlertTriangle className="size-4" /> {t.dataControl.clearData}
     </span>
    </SectionTitle>
    <SectionDescription>
     {isRTL ? 'إزالة البيانات نهائيًا من USRA PLUS' : 'Permanently remove data from USRA PLUS'}
    </SectionDescription>

    <div className="space-y-4">
     {/* Warning Alert */}
     <Alert className="bg-[#EF4444]/5 border-[#EF4444]/20">
      <AlertTriangle className="size-4 text-[#EF4444]" />
      <AlertDescription className="text-[#EF4444]/80 text-xs">
       {t.dataControl.clearWarning}
      </AlertDescription>
     </Alert>

     {/* Data Selection for Clear */}
     <div>
      <div className="flex items-center justify-between mb-2">
       <Label className="text-foreground text-xs">{t.dataControl.selectData}</Label>
       <Button
        variant="ghost"
        size="sm"
        onClick={toggleAllClear}
        className="text-[#EF4444]/70 text-xs h-6 px-2 hover:text-[#EF4444]"
       >
        {isAllClearSelected ? t.dataControl.deselectAll : t.dataControl.selectAll}
       </Button>
      </div>

      <div className="space-y-2">
       {dataTypeItems.map(({ key, icon: Icon, label, count }) => (
        <div
         key={key}
         className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border cursor-pointer hover:bg-muted/80 transition-colors"
         onClick={() => toggleClear(key)}
        >
         <Checkbox
          checked={clearSelection[key]}
          onCheckedChange={() => toggleClear(key)}
          className="data-[state=checked]:bg-[#EF4444] data-[state=checked]:border-[#EF4444]"
         />
         <Icon className="size-4 text-muted-foreground shrink-0" />
         <span className="text-foreground text-sm flex-1">{label}</span>
         <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
          {count}
         </Badge>
        </div>
       ))}
      </div>
     </div>

     {/* Clear Button */}
     <Button
      variant="destructive"
      onClick={() => setClearConfirmOpen(true)}
      disabled={!Object.values(clearSelection).some(Boolean) || clearing}
      className="w-full gap-2"
     >
      {clearing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      {clearing ? t.common.loading : t.dataControl.clearData}
     </Button>

     {/* Clear Confirmation Dialog */}
     <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
      <AlertDialogContent className="bg-card border-border">
       <AlertDialogHeader>
        <AlertDialogTitle className="text-[#EF4444]">
         {t.dataControl.clearData}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-muted-foreground">
         {t.dataControl.clearWarning}
        </AlertDialogDescription>
       </AlertDialogHeader>
       <AlertDialogFooter>
        <AlertDialogCancel className="bg-muted border-border text-foreground">
         {t.common.cancel}
        </AlertDialogCancel>
        <AlertDialogAction
         onClick={handleClearConfirm}
         className="bg-[#EF4444] text-white hover:bg-[#EF4444]/80"
        >
         {t.common.confirm}
        </AlertDialogAction>
       </AlertDialogFooter>
      </AlertDialogContent>
     </AlertDialog>
    </div>
   </SectionCard>
  </div>
 )
}

// ─── Integrations Tab ────────────────────────────────────────────────────────

function IntegrationsTab() {
 const { t, isRTL } = useI18n()
 const { currentFamily, setCurrentFamily } = useAppStore()
 const [copied, setCopied] = useState(false)
 const [regenerating, setRegenerating] = useState(false)

 const inviteCode = currentFamily?.invite_code ?? 'DEMO-CODE'
 const familyName = currentFamily?.name ?? (isRTL ? 'عائلتي' : 'My Family')

 const handleCopyCode = useCallback(() => {
  try {
   navigator.clipboard.writeText(inviteCode)
   setCopied(true)
   toast.success(t.integrations.copiedToClipboard)
   setTimeout(() => setCopied(false), 2000)
  } catch {
   toast.error(t.common.error)
  }
 }, [inviteCode, t.integrations.copiedToClipboard, t.common.error])

 const handleShareWhatsApp = useCallback(() => {
  const text = encodeURIComponent(`${t.integrations.shareWhatsAppText} ${inviteCode}`)
  window.open(`https://wa.me/?text=${text}`, '_blank')
 }, [inviteCode, t.integrations.shareWhatsAppText])

 const handleRegenerateCode = useCallback(async () => {
  if (!currentFamily) return
  setRegenerating(true)
  try {
   const newCode = `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
   const supabase = createClient()
   const { error } = await supabase
    .from('families')
    .update({ invite_code: newCode })
    .eq('id', currentFamily.id)
   if (error) throw error
   setCurrentFamily({ ...currentFamily, invite_code: newCode })
   toast.success(isRTL ? 'تم إعادة توليد رمز الدعوة' : 'Invite code regenerated')
  } catch {
   // Fallback for demo mode
   const newCode = `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
   setCurrentFamily({ ...currentFamily, invite_code: newCode } as NonNullable<typeof currentFamily>)
   toast.success(isRTL ? 'تم إعادة توليد رمز الدعوة' : 'Invite code regenerated')
  } finally {
   setRegenerating(false)
  }
 }, [currentFamily, setCurrentFamily, isRTL])

 const connectedApps = [
  {
   id: 'google-calendar',
   name: t.integrations.googleCalendar,
   description: t.integrations.googleCalendarDesc,
   icon: CalendarDays,
   color: 'text-primary',
   bgColor: 'bg-primary/10',
  },
  {
   id: 'apple-health',
   name: t.integrations.appleHealth,
   description: t.integrations.appleHealthDesc,
   icon: Heart,
   color: 'text-red-400',
   bgColor: 'bg-red-500/10',
  },
  {
   id: 'smart-home',
   name: t.integrations.smartHome,
   description: t.integrations.smartHomeDesc,
   icon: Home,
   color: 'text-accent',
   bgColor: 'bg-amber-500/10',
  },
 ]

 return (
  <div className="space-y-6">
   {/* Family Invite Card */}
   <SectionCard>
    <SectionTitle>
     <span className="flex items-center gap-2">
      <QrCode className="size-4 text-primary" /> {t.integrations.familyInvite}
     </span>
    </SectionTitle>
    <SectionDescription>{t.integrations.scanToJoin}</SectionDescription>

    {/* QR Code Component */}
    <div className="flex justify-center my-4">
     <FamilyQRCode
      inviteCode={inviteCode}
      familyName={familyName}
      size={180}
     />
    </div>

    <Separator className="my-4 bg-muted" />

    {/* Invite Code with Copy */}
    <div>
     <span className="text-muted-foreground text-xs block mb-2">{t.integrations.inviteCode}</span>
     <div className="flex items-center gap-2">
      <code className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-accent font-mono text-sm tracking-widest">
       {inviteCode}
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

    <Separator className="my-4 bg-muted" />

    {/* Share Options */}
    <div className="flex flex-col sm:flex-row gap-2">
     <Button
      variant="outline"
      size="sm"
      onClick={handleShareWhatsApp}
      className="flex-1 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded-xl border-[#25D366]/20"
     >
      <MessageSquare className="size-4" />
      {t.integrations.shareViaWhatsApp}
     </Button>

     <AlertDialog>
      <AlertDialogTrigger asChild>
       <Button
        variant="outline"
        size="sm"
        className="flex-1 border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
       >
        <RefreshCw className="size-4" />
        {t.integrations.regenerateCode}
       </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-card border-border">
       <AlertDialogHeader>
        <AlertDialogTitle className="text-foreground">
         {t.integrations.regenerateConfirmTitle}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-muted-foreground">
         {t.integrations.regenerateConfirmDesc}
        </AlertDialogDescription>
       </AlertDialogHeader>
       <AlertDialogFooter>
        <AlertDialogCancel className="bg-muted border-border text-foreground">
         {t.common.cancel}
        </AlertDialogCancel>
        <AlertDialogAction
         onClick={handleRegenerateCode}
         disabled={regenerating}
         className="bg-primary text-white hover:bg-primary/80"
        >
         {regenerating ? <Loader2 className="size-4 animate-spin" /> : t.integrations.regenerateCode}
        </AlertDialogAction>
       </AlertDialogFooter>
      </AlertDialogContent>
     </AlertDialog>
    </div>
   </SectionCard>

   {/* Connected Apps */}
   <SectionCard>
    <SectionTitle>
     <span className="flex items-center gap-2">
      <Plug className="size-4 text-primary" /> {t.integrations.connectedApps}
     </span>
    </SectionTitle>
    <SectionDescription>
     {isRTL ? 'تطبيقات خارجية متصلة بعائلتك' : 'External apps connected to your family'}
    </SectionDescription>

    <div className="space-y-3">
     {connectedApps.map((app) => (
      <div
       key={app.id}
       className="flex items-center gap-3 p-4 rounded-xl opacity-60 bg-muted border border-border"
      >
       <div className={`size-10 rounded-lg ${app.bgColor} flex items-center justify-center`}>
        <app.icon className={`size-5 ${app.color}`} />
       </div>
       <div className="flex-1 min-w-0">
        <p className="text-foreground text-sm font-medium">{app.name}</p>
        <p className="text-muted-foreground text-xs">{app.description}</p>
       </div>
       <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-amber-500/10 text-accent border-amber-500/20 text-xs">
         {t.integrations.comingSoon}
        </Badge>
        <Lock className="size-3.5 text-muted-foreground" />
       </div>
      </div>
     ))}
    </div>
   </SectionCard>

   <Alert className="bg-primary/5 border-primary/20">
    <Sparkles className="size-4 text-accent" />
    <AlertDescription className="text-accent text-sm">
     {isRTL
      ? 'المزيد من التكاملات قريبًا! ترقب دعم تقويم جوجل، وصحة أبل، والمنزل الذكي.'
      : 'More integrations are coming soon! Stay tuned for Google Calendar, Apple Health, and Smart Home support.'}
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
  async (targetPlan: SubscriptionPlan) => {
   if (targetPlan === subscriptionPlan) return
   // TODO: Integrate payment provider. For now, just re-fetch from server.
   if (user?.id) {
    try {
     const { useSubscriptionStore } = await import('@/stores/subscription-store')
     await useSubscriptionStore.getState().fetchPlanFromServer(user.id)
    } catch { /* ignore */ }
   }
   toast.info(isRTL ? 'إدارة الاشتراك قريبًا!' : 'Subscription management coming soon!')
  },
  [subscriptionPlan, user?.id, isRTL]
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
        <Crown className="size-4 text-accent" /> {t.settings.currentPlan}
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
      className={`relative bg-card border rounded-2xl p-5 flex flex-col ${
       plan.popular
        ? 'border-primary/50 shadow-[0_0_24px_-4px_rgba(229,9,20,0.15)]'
        : 'border-border'
      }`}
     >
      {plan.popular && (
       <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <Badge className="bg-primary text-white border-0 text-xs px-3">
         <Sparkles className="size-3 mr-1" /> {isRTL ? 'موصى به' : 'Popular'}
        </Badge>
       </div>
      )}

      <div className="mb-4">
       <h3 className="text-foreground text-lg font-semibold font-display">{plan.name}</h3>
       <div className="flex items-baseline gap-1 mt-1">
        <span className="text-2xl font-bold text-foreground">{plan.price}</span>
        <span className="text-muted-foreground text-sm">{plan.period}</span>
       </div>
      </div>

      <div className="flex-1 space-y-2 mb-5">
       {plan.features.map((feature) => (
        <div key={feature.label} className="flex items-center gap-2">
         {feature.included ? (
          <Check className="size-3.5 text-green-400 shrink-0" />
         ) : (
          <X className="size-3.5 text-muted-foreground/50 shrink-0" />
         )}
         <span
          className={`text-xs ${
           feature.included ? 'text-foreground' : 'text-muted-foreground/50'
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
        className="w-full border-border text-muted-foreground"
       >
        {isRTL ? 'الخطة الحالية' : 'Current Plan'}
       </Button>
      ) : (
       <Button
        onClick={() => handleUpgrade(plan.id)}
        className={`w-full ${
         plan.popular
          ? 'bg-primary hover:bg-primary/80 text-white'
          : 'bg-muted border border-border text-foreground hover:bg-border'
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
     <div className="p-3 rounded-xl bg-muted border border-border">
      <Infinity className="size-6 text-primary mb-2" />
      <p className="text-foreground text-sm font-medium">{isRTL ? 'مهام غير محدودة' : 'Unlimited Tasks'}</p>
      <p className="text-muted-foreground text-xs">{isRTL ? 'بدون حدود على إنشاء المهام' : 'No limits on task creation'}</p>
     </div>
     <div className="p-3 rounded-xl bg-muted border border-border">
      <Zap className="size-6 text-accent mb-2" />
      <p className="text-foreground text-sm font-medium">{isRTL ? 'مزامنة فورية' : 'Real-time Sync'}</p>
      <p className="text-muted-foreground text-xs">{isRTL ? 'تحديثات فورية عبر الأجهزة' : 'Instant updates across devices'}</p>
     </div>
     <div className="p-3 rounded-xl bg-muted border border-border">
      <BarChart3 className="size-6 text-accent mb-2" />
      <p className="text-foreground text-sm font-medium">{isRTL ? 'التحليلات' : 'Analytics'}</p>
      <p className="text-muted-foreground text-xs">{isRTL ? 'رؤى إنتاجية العائلة' : 'Family productivity insights'}</p>
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
  <div className="min-h-screen bg-background">
   <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
    {/* Page Header */}
    <div className="mb-8">
     <h1 className="text-foreground text-2xl sm:text-3xl font-bold font-display">{t.settings.title}</h1>
     <p className="text-muted-foreground text-sm mt-1">Manage your account, family, and preferences</p>
    </div>

    <div className="flex flex-col lg:flex-row gap-6">
     {/* Left Navigation - Desktop */}
     <div className="hidden lg:block w-64 shrink-0">
      <nav role="tablist" aria-label="Settings tabs" className="bg-card border border-border rounded-2xl p-2 sticky top-6">
       {settingsTabs.map((tab) => (
        <button
         key={tab.id}
         onClick={() => setActiveTab(tab.id)}
         role="tab"
         aria-selected={activeTab === tab.id}
         className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
          activeTab === tab.id
           ? 'bg-primary/15 text-primary border-b-2 border-primary'
           : 'text-muted-foreground hover:bg-muted hover:text-foreground'
         }`}
        >
         <tab.icon className={`size-4 ${activeTab === tab.id ? 'text-primary' : ''}`} />
         {t.settings[tab.labelKey]}
        </button>
       ))}
      </nav>
     </div>

     {/* Mobile Tabs - Horizontal Scroll */}
     <div className="lg:hidden w-full">
      <ScrollArea className="w-full">
       <div role="tablist" aria-label="Settings tabs" className="flex gap-1 pb-2 mb-4 border-b border-border">
        {settingsTabs.map((tab) => (
         <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
           activeTab === tab.id
            ? 'bg-primary/15 text-primary border-b-2 border-primary'
            : 'text-muted-foreground bg-muted border border-border hover:text-foreground'
          }`}
         >
          <tab.icon className={`size-3.5 ${activeTab === tab.id ? 'text-primary' : ''}`} />
          {t.settings[tab.labelKey]}
         </button>
        ))}
       </div>
      </ScrollArea>
     </div>

     {/* Content Area */}
     <div className="flex-1 min-w-0" role="tabpanel" aria-label={`${t.settings[settingsTabs.find(t => t.id === activeTab)?.labelKey || 'family']} settings`}>
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
        {activeTab === 'notifications' && <NotificationsTab />}
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
