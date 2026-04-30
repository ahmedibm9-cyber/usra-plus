'use client'

import { create } from 'zustand'

export type MilestoneType = 'birthday' | 'anniversary' | 'graduation' | 'achievement' | 'custom'

export interface Milestone {
  id: string
  title: string
  date: string // ISO date string
  type: MilestoneType
  description?: string
  personId?: string
  personName?: string
  emoji?: string
  isRecurring: boolean
  notifyDaysBefore: number
  createdAt: string
}

interface MilestoneState {
  milestones: Milestone[]
  isLoading: boolean
  setMilestones: (milestones: Milestone[]) => void
  addMilestone: (milestone: Milestone) => void
  updateMilestone: (milestone: Milestone) => void
  removeMilestone: (id: string) => void
  setIsLoading: (loading: boolean) => void
  getUpcoming: (count: number) => Milestone[]
  getByType: (type: MilestoneType) => Milestone[]
  getThisMonth: () => Milestone[]
  getDaysUntil: (id: string) => number | null
}

export const useMilestoneStore = create<MilestoneState>((set, get) => ({
  milestones: [],
  isLoading: false,

  setMilestones: (milestones) => set({ milestones }),
  addMilestone: (milestone) => set((state) => ({ milestones: [...state.milestones, milestone] })),
  updateMilestone: (milestone) =>
    set((state) => ({
      milestones: state.milestones.map((m) => (m.id === milestone.id ? milestone : m)),
    })),
  removeMilestone: (id) =>
    set((state) => ({
      milestones: state.milestones.filter((m) => m.id !== id),
    })),
  setIsLoading: (isLoading) => set({ isLoading }),

  getUpcoming: (count) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thirtyDaysLater = new Date(today.getTime() + 30 * 86400000)

    return get()
      .milestones.filter((m) => {
        const milestoneDate = new Date(m.date)
        // For recurring, compare month/day in current year
        const thisYearDate = new Date(today.getFullYear(), milestoneDate.getMonth(), milestoneDate.getDate())
        return thisYearDate >= today && thisYearDate <= thirtyDaysLater
      })
      .sort((a, b) => {
        const aDate = new Date(a.date)
        const bDate = new Date(b.date)
        const aThisYear = new Date(today.getFullYear(), aDate.getMonth(), aDate.getDate())
        const bThisYear = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate())
        return aThisYear.getTime() - bThisYear.getTime()
      })
      .slice(0, count)
  },

  getByType: (type) => get().milestones.filter((m) => m.type === type),

  getThisMonth: () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    return get().milestones.filter((m) => {
      const d = new Date(m.date)
      return d.getMonth() === currentMonth
    })
  },

  getDaysUntil: (id) => {
    const milestone = get().milestones.find((m) => m.id === id)
    if (!milestone) return null
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const milestoneDate = new Date(milestone.date)
    const thisYearDate = new Date(today.getFullYear(), milestoneDate.getMonth(), milestoneDate.getDate())
    // If already passed this year, check next year
    if (thisYearDate < today) {
      thisYearDate.setFullYear(today.getFullYear() + 1)
    }
    const diffMs = thisYearDate.getTime() - today.getTime()
    return Math.ceil(diffMs / 86400000)
  },
}))
