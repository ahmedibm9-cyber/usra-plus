'use client'

import React, { useState, useCallback } from 'react'
import {
  Users,
  Pencil,
  Save,
  X,
  Sun,
  Moon,
  Check,
  Wand2,
  Loader2,
  Globe,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { AvatarGenerator } from '@/components/shared/avatar-generator'
import { useI18n } from '@/i18n/use-translation'
import { createClient } from '@/lib/supabase/client'
import { announce } from '@/lib/live-announcer'
import type { Theme, Language } from '@/types'

import { SectionCard, SectionTitle, SectionDescription } from '../settings-helpers'

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

export function ProfileTab() {
  const { t, isRTL, language, setLanguage } = useI18n()
  const { user, setUser } = useAuthStore()
  const { families, theme, setTheme } = useAppStore()
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
