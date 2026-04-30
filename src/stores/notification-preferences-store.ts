'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface NotificationPreferences {
  // Channel preferences
  pushEnabled: boolean
  emailEnabled: boolean
  inAppEnabled: boolean

  // Category preferences
  taskAssigned: boolean
  taskCompleted: boolean
  taskDueReminder: boolean
  eventReminder: boolean
  eventStarting: boolean
  groceryReminder: boolean
  groceryChecked: boolean
  familyMemberJoined: boolean
  familyMemberLeft: boolean
  chatMention: boolean
  chatMessage: boolean

  // Timing preferences
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
  reminderAdvanceMinutes: number

  // Sound
  soundEnabled: boolean
  vibrationEnabled: boolean
}

type NotificationPrefKey = keyof NotificationPreferences

interface NotificationPreferencesState extends NotificationPreferences {
  setPreference: <K extends NotificationPrefKey>(key: K, value: NotificationPreferences[K]) => void
  resetToDefaults: () => void
  setAll: (channel: 'push' | 'email' | 'inApp' | 'sound' | 'vibration', enabled: boolean) => void
  setCategoryGroup: (group: string, enabled: boolean) => void
}

const defaultPreferences: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: true,
  inAppEnabled: true,

  taskAssigned: true,
  taskCompleted: true,
  taskDueReminder: true,
  eventReminder: true,
  eventStarting: true,
  groceryReminder: true,
  groceryChecked: true,
  familyMemberJoined: true,
  familyMemberLeft: true,
  chatMention: true,
  chatMessage: true,

  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  reminderAdvanceMinutes: 15,

  soundEnabled: true,
  vibrationEnabled: true,
}

export const useNotificationPreferencesStore = create<NotificationPreferencesState>()(
  persist(
    (set) => ({
      ...defaultPreferences,

      setPreference: (key, value) => set({ [key]: value }),

      resetToDefaults: () => set({ ...defaultPreferences }),

      setAll: (channel, enabled) => {
        const keyMap: Record<string, NotificationPrefKey> = {
          push: 'pushEnabled',
          email: 'emailEnabled',
          inApp: 'inAppEnabled',
          sound: 'soundEnabled',
          vibration: 'vibrationEnabled',
        }
        const key = keyMap[channel]
        if (key) {
          set({ [key]: enabled })
        }
      },

      setCategoryGroup: (group, enabled) => {
        const groupMap: Record<string, NotificationPrefKey[]> = {
          tasks: ['taskAssigned', 'taskCompleted', 'taskDueReminder'],
          calendar: ['eventReminder', 'eventStarting'],
          grocery: ['groceryReminder', 'groceryChecked'],
          family: ['familyMemberJoined', 'familyMemberLeft'],
          chat: ['chatMention', 'chatMessage'],
        }
        const keys = groupMap[group]
        if (keys) {
          const updates: Partial<NotificationPreferences> = {}
          keys.forEach((key) => {
            updates[key] = enabled
          })
          set(updates)
        }
      },
    }),
    {
      name: 'usra-notification-preferences',
    }
  )
)
