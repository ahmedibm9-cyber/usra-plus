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

import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import FormControlLabel from '@mui/material/FormControlLabel'

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
          // silently fail
        }
      }
    },
    [setLanguage, user, setUser]
  )

  return (
    <Stack spacing={3}>
      {/* Profile Card */}
      <SectionCard>
        <Stack direction="row" alignItems="center" gap={2} sx={{ mb: 3 }}>
          <Avatar
            src={user?.avatar_url ?? ''}
            sx={{ width: 64, height: 64, border: 2, borderColor: 'primary.light', ring: 4, boxShadow: 2 }}
          >
            {user?.first_name?.[0] ?? user?.email?.[0] ?? '?'}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: '"Space Grotesk", system-ui, sans-serif' }}>
              {user?.first_name && user?.last_name
                ? `${user.first_name} ${user.last_name}`
                : user?.email ?? 'User'}
            </Typography>
            <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 0.5 }}>
              <Chip
                label={t.settings.owner}
                size="small"
                variant="outlined"
                color="primary"
                sx={{ fontSize: 10 }}
              />
            </Stack>
          </Box>
          {!isEditing && (
            <Button
              variant="text"
              size="small"
              color="primary"
              startIcon={<Pencil size={16} />}
              onClick={() => setIsEditing(true)}
            >
              {t.settings.editProfile}
            </Button>
          )}
        </Stack>

        {isEditing ? (
          <Stack spacing={2}>
            {/* Change Photo */}
            <Box>
              <Typography variant="caption" color="text.primary" sx={{ mb: 1, display: 'block' }}>
                {t.avatarGen.changePhoto}
              </Typography>
              <Stack direction="row" alignItems="center" gap={2}>
                <Avatar
                  src={user?.avatar_url ?? ''}
                  sx={{ width: 56, height: 56 }}
                >
                  {user?.first_name?.[0] ?? '?'}
                </Avatar>
                <Stack spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Wand2 size={14} />}
                    onClick={() => setAvatarGenOpen(true)}
                  >
                    {t.avatarGen.changePhoto}
                  </Button>
                  {user?.avatar_url && (
                    <Button
                      variant="text"
                      size="small"
                      color="error"
                      onClick={handleRemovePhoto}
                      sx={{ fontSize: 12, minHeight: 28 }}
                    >
                      {t.avatarGen.removePhoto}
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Box>

            <AvatarGenerator
              open={avatarGenOpen}
              onOpenChange={setAvatarGenOpen}
              onApply={handleAvatarApply}
              mode="full"
              context="user"
            />

            <Divider />

            {/* First Name & Last Name */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={t.auth.firstName}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={isRTL ? 'الاسم الأول' : 'First name'}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={t.auth.lastName}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={isRTL ? 'اسم العائلة' : 'Last name'}
                  fullWidth
                  size="small"
                />
              </Grid>
            </Grid>

            {/* Email (read-only) */}
            <TextField
              label={t.auth.email}
              value={user?.email ?? ''}
              InputProps={{ readOnly: true }}
              fullWidth
              size="small"
              helperText={isRTL ? 'لا يمكن تغيير البريد الإلكتروني من هنا' : 'Email cannot be changed here'}
            />

            {/* Phone with country code */}
            <Box>
              <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>{t.auth.phone}</Typography>
              <Stack direction="row" gap={1}>
                <TextField
                  select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  size="small"
                  sx={{ width: 120, flexShrink: 0 }}
                >
                  {countryCodes.map((cc) => (
                    <MenuItem key={cc.code} value={cc.code}>
                      {cc.flag} {cc.code}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="501234567"
                  fullWidth
                  size="small"
                />
              </Stack>
            </Box>

            <Divider />

            {/* Save / Cancel */}
            <Stack direction="row" gap={1}>
              <Button
                variant="contained"
                size="small"
                onClick={handleSave}
                disabled={saving}
                startIcon={saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              >
                {t.common.save}
              </Button>
              <Button
                variant="text"
                size="small"
                color="inherit"
                onClick={handleCancel}
                startIcon={<X size={16} />}
              >
                {t.common.cancel}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">{t.auth.firstName}</Typography>
                <Typography variant="body2">{user?.first_name || 'Not set'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">{t.auth.lastName}</Typography>
                <Typography variant="body2">{user?.last_name || 'Not set'}</Typography>
              </Grid>
            </Grid>
            <Box>
              <Typography variant="caption" color="text.secondary">{t.auth.email}</Typography>
              <Typography variant="body2">{user?.email || 'Not set'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">{t.auth.phone}</Typography>
              <Typography variant="body2">{user?.phone || 'Not set'}</Typography>
            </Box>
          </Stack>
        )}
      </SectionCard>

      {/* Language */}
      <SectionCard>
        <SectionTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <Globe size={16} color="primary" /> {t.settings.language}
          </Stack>
        </SectionTitle>
        <SectionDescription>Choose your preferred language</SectionDescription>

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 6 }}>
            <Button
              fullWidth
              variant={language === 'en' ? 'contained' : 'outlined'}
              onClick={() => handleLanguageChange('en')}
              sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
            >
              🇺🇸 English
              {language === 'en' && <Check size={16} style={{ marginLeft: 'auto' }} />}
            </Button>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Button
              fullWidth
              variant={language === 'ar' ? 'contained' : 'outlined'}
              onClick={() => handleLanguageChange('ar')}
              sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
            >
              🇸🇦 العربية
              {language === 'ar' && <Check size={16} style={{ marginLeft: 'auto' }} />}
            </Button>
          </Grid>
        </Grid>
      </SectionCard>

      {/* Theme */}
      <SectionCard>
        <SectionTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            {t.settings.theme}
          </Stack>
        </SectionTitle>
        <SectionDescription>{isRTL ? 'خصّص تجربتك البصرية' : 'Customize your visual experience'}</SectionDescription>

        <Stack direction="row" gap={1.5}>
          <Button
            fullWidth
            variant={theme === 'dark' ? 'contained' : 'outlined'}
            onClick={() => handleThemeChange('dark')}
            startIcon={<Moon size={18} />}
            sx={{ textTransform: 'none' }}
          >
            {isRTL ? 'داكن' : 'Dark'}
            {theme === 'dark' && <Check size={16} style={{ marginLeft: 'auto' }} />}
          </Button>
          <Button
            fullWidth
            variant={theme === 'light' ? 'contained' : 'outlined'}
            onClick={() => handleThemeChange('light')}
            startIcon={<Sun size={18} />}
            sx={{ textTransform: 'none' }}
          >
            {isRTL ? 'فاتح' : 'Light'}
            {theme === 'light' && <Check size={16} style={{ marginLeft: 'auto' }} />}
          </Button>
        </Stack>
      </SectionCard>

      {/* Family Memberships */}
      <SectionCard>
        <SectionTitle>Family Memberships</SectionTitle>
        <SectionDescription>Families you belong to</SectionDescription>

        {families.length > 0 ? (
          <Stack spacing={1}>
            {families.map((family) => (
              <Stack
                key={family.id}
                direction="row"
                alignItems="center"
                gap={1.5}
                sx={{
                  p: 1.5,
                  borderRadius: 3,
                  bgcolor: 'action.hover',
                  border: 1,
                  borderColor: 'divider',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  '&:hover': { bgcolor: 'primary.main', color: 'primary.contrastText' },
                }}
              >
                <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Users size={16} color="white" />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>{family.name}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{family.description || 'No description'}</Typography>
                </Box>
                <ChevronRight size={16} color="text.secondary" />
              </Stack>
            ))}
          </Stack>
        ) : (
          <Stack alignItems="center" sx={{ py: 3 }}>
            <Users size={32} color="text.secondary" />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No family memberships yet</Typography>
          </Stack>
        )}
      </SectionCard>
    </Stack>
  )
}
