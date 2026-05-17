'use client'

import React, { useCallback } from 'react'
import {
  Bell,
  CheckCircle2,
  CalendarDays,
  ShoppingCart,
  MessageCircle,
  UserPlus,
  Mail,
  Monitor,
  Volume2,
  Vibrate,
} from 'lucide-react'

import Stack from '@mui/material/Stack'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Switch from '@mui/material/Switch'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import FormControlLabel from '@mui/material/FormControlLabel'

import { useNotificationPreferencesStore } from '@/stores/notification-preferences-store'
import { useI18n } from '@/i18n/use-translation'

import { SectionCard } from '../settings-helpers'

export function NotificationsTab() {
  const { t } = useI18n()
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

  const channelCards = [
    { key: 'pushEnabled', icon: Bell, title: t.notifications.pushNotifications, desc: t.notifications.pushDesc, enabled: pushEnabled },
    { key: 'emailEnabled', icon: Mail, title: t.notifications.emailNotifications, desc: t.notifications.emailDesc, enabled: emailEnabled },
    { key: 'inAppEnabled', icon: Monitor, title: t.notifications.inAppNotifications, desc: t.notifications.inAppDesc, enabled: inAppEnabled },
  ]

  return (
    <Stack spacing={3}>
      {/* Section 1: Channels */}
      <SectionCard>
        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, mb: 2, display: 'block' }}>
          {t.notifications.channels}
        </Typography>
        <Grid container spacing={2}>
          {channelCards.map((channel) => {
            const Icon = channel.icon
            return (
              <Grid key={channel.key} size={{ xs: 12, sm: 4 }}>
                <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.main', opacity: 0.1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'center' }}>{channel.title}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }} sx={{ textAlign: 'center' }}>{channel.desc}</Typography>
                  <Switch
                    checked={channel.enabled}
                    onChange={(e) => setPreference(channel.key as 'pushEnabled' | 'emailEnabled' | 'inAppEnabled', e.target.checked)}
                  />
                </Paper>
              </Grid>
            )
          })}
        </Grid>
      </SectionCard>

      {/* Section 2: Categories */}
      <SectionCard>
        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, mb: 2, display: 'block' }}>
          {t.notifications.categories}
        </Typography>
        <Stack spacing={2}>
          {categoryGroups.map((group) => {
            const allEnabled = group.items.every((item) => categoryPrefs[item.key])
            const Icon = group.icon
            return (
              <Box key={group.id}>
                {/* Group Header */}
                <Stack sx={{ flexDirection: 'row' }} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                    <Icon size={16} sx={{ color: 'primary.main' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{group.label}</Typography>
                  </Stack>
                  <Stack sx={{ flexDirection: 'row', gap: 0.5 }}>
                    <Button
                      size="small"
                      variant={allEnabled ? 'contained' : 'text'}
                      onClick={() => setCategoryGroup(group.id, true)}
                      sx={{ fontSize: 11, minWidth: 0, px: 1.5, py: 0.25, textTransform: 'none' }}
                    >
                      {t.notifications.enableAll}
                    </Button>
                    <Button
                      size="small"
                      variant={!allEnabled ? 'outlined' : 'text'}
                      sx={{ color: 'error.main' }}
                      onClick={() => setCategoryGroup(group.id, false)}
                      sx={{ fontSize: 11, minWidth: 0, px: 1.5, py: 0.25, textTransform: 'none' }}
                    >
                      {t.notifications.disableAll}
                    </Button>
                  </Stack>
                </Stack>
                {/* Category Items */}
                <Stack>
                  {group.items.map((item, idx) => (
                    <Stack
                      key={item.key}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{
                        py: 1.5,
                        borderBottom: idx < group.items.length - 1 ? 1 : 0,
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2">{item.label}</Typography>
                      <Switch
                        checked={categoryPrefs[item.key]}
                        onChange={(e) => setPreference(item.key, e.target.checked)}
                        size="small"
                      />
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )
          })}
        </Stack>
      </SectionCard>

      {/* Section 3: Schedule & Sound */}
      <SectionCard>
        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, mb: 2, display: 'block' }}>
          {t.notifications.scheduleAndSound}
        </Typography>

        <Stack>
          {/* Quiet Hours */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider' }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{t.notifications.quietHours}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t.notifications.quietHoursDesc}</Typography>
            </Box>
            <Switch
              checked={quietHoursEnabled}
              onChange={(e) => setPreference('quietHoursEnabled', e.target.checked)}
              size="small"
            />
          </Stack>

          {/* Quiet Hours Time Pickers */}
          {quietHoursEnabled && (
            <Stack sx={{ flexDirection: 'row', gap: 2 }} sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider', pl: 1 }}>
              <TextField
                label={t.notifications.startTime}
                type="time"
                value={quietHoursStart}
                onChange={(e) => setPreference('quietHoursStart', e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label={t.notifications.endTime}
                type="time"
                value={quietHoursEnd}
                onChange={(e) => setPreference('quietHoursEnd', e.target.value)}
                size="small"
                fullWidth
              />
            </Stack>
          )}

          {/* Reminder Advance */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider' }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{t.notifications.reminderAdvance}</Typography>
            <TextField
              select
              value={String(reminderAdvanceMinutes)}
              onChange={(e) => setPreference('reminderAdvanceMinutes', Number(e.target.value))}
              size="small"
              sx={{ width: 140 }}
            >
              {reminderAdvanceOptions.map((option) => (
                <MenuItem key={option.value} value={String(option.value)}>{option.label}</MenuItem>
              ))}
            </TextField>
          </Stack>

          {/* Sound */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider' }}
          >
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
              <Volume2 size={16} sx={{ color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{t.notifications.sound}</Typography>
            </Stack>
            <Switch
              checked={soundEnabled}
              onChange={(e) => setPreference('soundEnabled', e.target.checked)}
              size="small"
            />
          </Stack>

          {/* Vibration */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ py: 1.5 }}
          >
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
              <Vibrate size={16} sx={{ color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{t.notifications.vibration}</Typography>
            </Stack>
            <Switch
              checked={vibrationEnabled}
              onChange={(e) => setPreference('vibrationEnabled', e.target.checked)}
              size="small"
            />
          </Stack>
        </Stack>
      </SectionCard>
    </Stack>
  )
}
