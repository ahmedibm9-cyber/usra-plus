'use client'

import { create } from 'zustand'

export type ActivityType =
  | 'task_completed'
  | 'task_created'
  | 'event_added'
  | 'event_created'
  | 'grocery_checked'
  | 'grocery_added'
  | 'message_sent'
  | 'member_joined'

export interface ActivityActor {
  id: string
  name: string
  avatar_url: string | null
}

export interface TimelineItem {
  id: string
  type: ActivityType
  actor: ActivityActor
  title: string
  description: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface ActivityItem {
  id: string
  type: ActivityType
  actor: ActivityActor
  description: string
  metadata?: Record<string, unknown>
  created_at: string
}

export type TimeGroup = 'today' | 'yesterday' | 'thisWeek'

export interface GroupedTimelineItems {
  today: TimelineItem[]
  yesterday: TimelineItem[]
  thisWeek: TimelineItem[]
}

const MAX_ACTIVITIES = 100
const MAX_TIMELINE_ITEMS = 100

interface ActivityState {
  activities: ActivityItem[]
  timelineItems: TimelineItem[]
  setActivities: (activities: ActivityItem[]) => void
  addActivity: (activity: ActivityItem) => void
  getRecentActivities: (count: number) => ActivityItem[]
  setTimelineItems: (items: TimelineItem[]) => void
  addTimelineItem: (item: TimelineItem) => void
  filterByType: (type: ActivityType | 'all') => TimelineItem[]
  getGroupedItems: () => GroupedTimelineItems
}

function getTimeGroup(dateStr: string): TimeGroup {
  const now = new Date()
  const date = new Date(dateStr)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  const weekStart = new Date(todayStart.getTime() - 6 * 86400000)

  if (date >= todayStart) return 'today'
  if (date >= yesterdayStart) return 'yesterday'
  if (date >= weekStart) return 'thisWeek'
  return 'thisWeek' // items older than a week still go in thisWeek group for now
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  timelineItems: [],

  setActivities: (activities) =>
    set({ activities }),

  addActivity: (activity) =>
    set((state) => {
      const updated = [activity, ...state.activities]
      return { activities: updated.length > MAX_ACTIVITIES ? updated.slice(0, MAX_ACTIVITIES) : updated }
    }),

  getRecentActivities: (count) => {
    return get().activities.slice(0, count)
  },

  setTimelineItems: (items) =>
    set({ timelineItems: items }),

  addTimelineItem: (item) =>
    set((state) => {
      const updated = [item, ...state.timelineItems]
      return { timelineItems: updated.length > MAX_TIMELINE_ITEMS ? updated.slice(0, MAX_TIMELINE_ITEMS) : updated }
    }),

  filterByType: (type) => {
    const items = get().timelineItems
    if (type === 'all') return items
    return items.filter((item) => item.type === type)
  },

  getGroupedItems: () => {
    const items = get().timelineItems
    const grouped: GroupedTimelineItems = {
      today: [],
      yesterday: [],
      thisWeek: [],
    }

    items.forEach((item) => {
      const group = getTimeGroup(item.created_at)
      grouped[group].push(item)
    })

    return grouped
  },
}))
