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
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { useNotificationPreferencesStore } from '@/stores/notification-preferences-store'
import { useI18n } from '@/i18n/use-translation'
import type { Notification } from '@/types'

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
