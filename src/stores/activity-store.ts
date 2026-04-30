'use client'

import { create } from 'zustand'

export type ActivityType =
  | 'task_created'
  | 'task_completed'
  | 'event_created'
  | 'grocery_added'
  | 'grocery_checked'
  | 'member_joined'
  | 'message_sent'

export interface ActivityActor {
  id: string
  name: string
  avatar_url: string | null
}

export interface ActivityItem {
  id: string
  type: ActivityType
  actor: ActivityActor
  description: string
  metadata?: Record<string, unknown>
  created_at: string
}

interface ActivityState {
  activities: ActivityItem[]
  setActivities: (activities: ActivityItem[]) => void
  addActivity: (activity: ActivityItem) => void
  getRecentActivities: (count: number) => ActivityItem[]
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],

  setActivities: (activities) =>
    set({ activities }),

  addActivity: (activity) =>
    set((state) => ({
      activities: [activity, ...state.activities],
    })),

  getRecentActivities: (count) => {
    return get().activities.slice(0, count)
  },
}))
